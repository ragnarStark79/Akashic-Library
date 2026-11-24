"""
Book Discovery Service — orchestrates local MongoDB and external providers.

Flow:
    API View
        ↓
    BookSearchService
        ↓
    repository.search_books()  (local MongoDB)
        ↓
    If insufficient results:
        ↓
    Provider adapters (Google Books → Open Library)
        ↓
    repository.upsert_book()  (persist normalized result)
        ↓
    Return stable response

Design decisions:
  - External providers are only called when the local catalog returns zero results.
    This keeps most requests fast and reduces external API dependency.
  - Provider failures are logged and do not surface as 500 errors.
  - If all providers fail, local results (even empty) are returned cleanly.
  - Provider order: Google Books first (richer metadata), Open Library fallback.
"""

import logging
from typing import Any

from . import repository
from .exceptions import BookNotFoundError, InvalidQueryError, MongoDBUnavailableError, ProviderError
from .genre_mappings import resolve_subject_aliases
from .providers.base import BookProvider
from .providers.google_books import GoogleBooksProvider
from .providers.open_library import OpenLibraryProvider

logger = logging.getLogger(__name__)

# Provider chain — order defines priority.
# Open Library is primary and currently active provider for Phase 2B.1.
# GoogleBooksProvider is retained for future optional fallback.
_PROVIDERS = [
    OpenLibraryProvider(),
]

_ALL_PROVIDERS = [
    OpenLibraryProvider(),
    GoogleBooksProvider(),
]

# Minimum local results before triggering external provider fallback.
_MIN_LOCAL_RESULTS = 1


class BookSearchService:
    """Orchestrates book discovery across local MongoDB and external providers."""

    # ── Book detail ───────────────────────────────────────────────────────────

    @staticmethod
    def get_book(book_id: str) -> dict[str, Any]:
        """Retrieve a single book by its local MongoDB ObjectId.

        Raises
        ------
        BookNotFoundError        If the book does not exist locally.
        MongoDBUnavailableError  If MongoDB cannot be reached.
        """
        book = repository.get_book_by_id(book_id)
        try:
            from store.services import StoreService
            availability = StoreService.get_bulk_store_availability([book_id])
            book["store"] = availability.get(book_id) or {"available": False, "product_id": None}
        except ImportError:
            pass
        return book

    # ── Search ────────────────────────────────────────────────────────────────

    @staticmethod
    def search(
        *,
        query: str = "",
        title: str = "",
        author: str = "",
        isbn: str = "",
        subject: str = "",
        language: str = "",
        publisher: str = "",
        year_from: int | None = None,
        year_to: int | None = None,
        page: int = 1,
        page_size: int = repository.DEFAULT_PAGE_SIZE,
        featured: bool = False,
    ) -> dict[str, Any]:
        """Search books — local first, external providers as fallback.

        External providers are queried only when:
          - Search criteria are provided (q, title, author, isbn, subject), AND
          - The local catalog returns fewer than _MIN_LOCAL_RESULTS.

        Returns the paginated search result dict from the repository.
        """
        # 1. Query local catalog.
        local = repository.search_books(
            query=query,
            title=title,
            author=author,
            isbn=isbn,
            subject=subject,
            language=language,
            publisher=publisher,
            year_from=year_from,
            year_to=year_to,
            page=page,
            page_size=page_size,
            featured=featured,
        )

        has_search_criteria = bool(
            query.strip()
            or title.strip()
            or author.strip()
            or isbn.strip()
            or subject.strip()
        )

        # 2. Determine if external provider fallback should be triggered:
        # - On page 1: when local catalog has fewer than _MIN_LOCAL_RESULTS (0 results).
        # - On page > 1: when local catalog does not have enough results to satisfy the requested page.
        should_fetch_from_provider = False
        if has_search_criteria:
            if page == 1 and local["count"] < _MIN_LOCAL_RESULTS:
                should_fetch_from_provider = True
            elif page > 1 and local["count"] < (page * page_size):
                should_fetch_from_provider = True

        if not should_fetch_from_provider:
            local["upstream_count"] = getattr(_PROVIDERS[0], "last_num_found", None) if _PROVIDERS else None
            return local

        # 3. Try external providers.
        target_items = page * page_size
        provider_batch_size = 20
        needed_batches = max(1, (target_items + provider_batch_size - 1) // provider_batch_size)
        if local["count"] == 0:
            start_batch = 1
            end_batch = min(needed_batches, 2)
        else:
            start_batch = max(2, (local["count"] + provider_batch_size - 1) // provider_batch_size)
            end_batch = max(start_batch, min(needed_batches, start_batch + 1))

        fetch_query = query.strip()

        for p in range(start_batch, end_batch + 1):
            BookSearchService._fetch_from_providers(
                query=fetch_query,
                title=title.strip(),
                author=author.strip(),
                isbn=isbn.strip(),
                subject=subject.strip(),
                language=language.strip(),
                publisher=publisher.strip(),
                page=p,
            )

        # 4. Re-query local after potential upsert from providers.
        result = repository.search_books(
            query=query,
            title=title,
            author=author,
            isbn=isbn,
            subject=subject,
            language=language,
            publisher=publisher,
            year_from=year_from,
            year_to=year_to,
            page=page,
            page_size=page_size,
            featured=featured,
        )

        upstream_count = getattr(_PROVIDERS[0], "last_num_found", None) if _PROVIDERS else None
        result["upstream_count"] = upstream_count

        try:
            from store.services import StoreService
            book_ids = [book["_id"] if "_id" in book else book.get("id") for book in result.get("books", [])]
            store_availability = StoreService.get_bulk_store_availability(book_ids)
            for book in result.get("books", []):
                bid = book["_id"] if "_id" in book else book.get("id")
                book["store"] = store_availability.get(bid) or {"available": False, "product_id": None}
        except ImportError:
            pass

        return result

    @staticmethod
    def _fetch_from_providers(
        *,
        query: str = "",
        title: str = "",
        author: str = "",
        isbn: str = "",
        subject: str = "",
        publisher: str = "",
        language: str = "",
        page: int = 1,
    ) -> None:
        """Try each provider in order; persist results; swallow provider failures."""
        subject_aliases = resolve_subject_aliases(subject) if subject else []
        if subject and subject_aliases and subject.strip().lower() in [a.lower() for a in subject_aliases]:
            primary_subject = subject.strip()
        elif subject_aliases:
            primary_subject = subject_aliases[0]
        else:
            primary_subject = subject

        for provider in _PROVIDERS:
            try:
                books = provider.search(
                    query=query,
                    title=title,
                    author=author,
                    isbn=isbn,
                    subject=primary_subject,
                    publisher=publisher,
                    language=language,
                    page=page,
                )
                # If subject search returned 0 and secondary aliases exist, try the second alias
                if not books and len(subject_aliases) > 1 and page == 1:
                    books = provider.search(
                        query=query,
                        title=title,
                        author=author,
                        isbn=isbn,
                        subject=subject_aliases[1],
                        publisher=publisher,
                        language=language,
                        page=page,
                    )
                if books:
                    for book in books:
                        try:
                            repository.upsert_book(book)
                        except Exception as exc:
                            logger.warning(
                                "Failed to upsert book from %s: %s", provider.name, exc
                            )
                    logger.info(
                        "Discovery: fetched %d books from %s for query=%r, title=%r, author=%r, isbn=%r, subject=%r, page=%d",
                        len(books),
                        provider.name,
                        query,
                        title,
                        author,
                        isbn,
                        primary_subject,
                        page,
                    )
                    # Stop after first successful provider to avoid duplicates.
                    return
            except ProviderError as exc:
                logger.warning("Provider %s failed: %s", provider.name, exc)
                continue
            except Exception as exc:
                logger.error(
                    "Unexpected error from provider %s: %s", provider.name, exc
                )
                continue


# ─── Provider registry ────────────────────────────────────────────────────────

_PROVIDER_REGISTRY: dict[str, "BookProvider"] = {p.name: p for p in _ALL_PROVIDERS}


def get_provider_by_name(name: str):
    """Return the provider instance for the given name, or None if not found."""
    return _PROVIDER_REGISTRY.get(name)


# ─── Book import service ──────────────────────────────────────────────────────


class BookImportService:
    """Explicit import of a selected provider result into the local catalog.

    This is the Step 4 explicit import flow:
      1. Client sends provider name + external ID.
      2. Service validates the provider name.
      3. Service fetches from the provider via get_by_id().
      4. Service normalizes via the provider's normalize().
      5. Service upserts using import_book() (enrichment-safe, never destroys
         existing library/community/store data).
      6. Returns the resulting local Book document.

    Authorization is enforced at the view layer (IsAuthenticated + staff check).
    """

    VALID_PROVIDERS = set(_PROVIDER_REGISTRY.keys())

    @staticmethod
    def import_from_provider(provider_name: str, external_id: str) -> dict[str, Any]:
        """Import a single book from an external provider into the local catalog.

        Parameters
        ----------
        provider_name : str
            Provider identifier — must be one of VALID_PROVIDERS.
        external_id : str
            Provider-specific book ID (e.g. Google Books volume ID).

        Returns
        -------
        dict
            The local Book document (serialized).

        Raises
        ------
        InvalidQueryError        If provider_name or external_id is invalid.
        ProviderError            If the provider request fails.
        ProviderTimeoutError     If the provider request times out.
        BookNotFoundError        If the provider returns no record for external_id.
        MongoDBUnavailableError  If MongoDB cannot be reached.
        """
        from .exceptions import InvalidQueryError, BookNotFoundError

        # 1. Validate provider.
        provider_name = (provider_name or "").strip().lower()
        if not provider_name:
            raise InvalidQueryError("'provider' is required.")
        provider = get_provider_by_name(provider_name)
        if provider is None:
            raise InvalidQueryError(
                f"Unknown provider {provider_name!r}. "
                f"Valid providers: {sorted(BookImportService.VALID_PROVIDERS)}"
            )

        # 2. Validate external_id.
        external_id = (external_id or "").strip()
        if not external_id:
            raise InvalidQueryError("'external_id' is required.")

        # 3. Fetch from provider.
        book = provider.get_by_id(external_id)
        if book is None:
            raise BookNotFoundError(
                f"No book found in {provider_name!r} with ID {external_id!r}."
            )

        # 4. Persist using enrichment-safe import (preserves existing data).
        book_id = repository.import_book(book)
        if not book_id:
            raise MongoDBUnavailableError("Failed to persist imported book.")

        # 5. Return the local document.
        return repository.get_book_by_id(book_id)
