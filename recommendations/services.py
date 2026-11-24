"""
Recommendations Services — business logic for book recommendations and external integrations.
"""

from typing import Any
from urllib.parse import urlparse

from discovery.exceptions import BookNotFoundError
from discovery.repository import get_book_by_id
from discovery.library_repository import list_favorites, list_user_library
from recommendations.constants import AccessClassification
from recommendations.repository import get_recommended_books, get_popular_books


def _is_safe_url(url: Any) -> bool:
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


class RecommendationService:
    """Service for generating book recommendations."""

    @classmethod
    def get_personalized_recommendations(
        cls, user_id: str, limit: int = 20, skip: int = 0
    ) -> list[dict[str, Any]]:
        """Return personalized recommendations for a user.
        
        Extracts subjects and authors from the user's favorites and reading shelves,
        then queries for similar books. Fallback to popular books if no history.
        """
        favorites = list_favorites(user_id)
        
        # Get library entries (reading, read, want_to_read, abandoned)
        library_data = list_user_library(user_id, page_size=100)
        library_entries = library_data.get("results", [])
        
        # Exclude ABANDONED books from positive recommendation seed signals
        positive_entries = [entry["book_id"] for entry in library_entries if entry.get("status") != "ABANDONED"]
        interacted_book_ids = set(favorites + [entry["book_id"] for entry in library_entries])
        preferred_seed_ids = set(favorites + positive_entries)
        
        if not preferred_seed_ids:
            # Cold start
            books = get_popular_books(limit=limit, skip=skip, exclude_book_ids=interacted_book_ids)
            for b in books:
                b["recommendation_reason"] = "Popular in Akashic Library"
            return books

        # Extract authors and subjects from interacted books that were not abandoned
        authors = set()
        subjects = set()
        
        # We cap the number of books we inspect to avoid massive queries
        sample_ids = list(preferred_seed_ids)[:20]
        
        for bid in sample_ids:
            try:
                book = get_book_by_id(bid)
                for author in book.get("authors", []):
                    authors.add(author.get("name", ""))
                for subject in book.get("subjects", []):
                    subjects.add(subject)
            except BookNotFoundError:
                continue

        # Clean empty strings
        authors.discard("")
        subjects.discard("")

        if not authors and not subjects:
            books = get_popular_books(limit=limit, skip=skip, exclude_book_ids=interacted_book_ids)
            for b in books:
                b["recommendation_reason"] = "Popular in Akashic Library"
            return books

        books = get_recommended_books(
            authors=list(authors),
            subjects=list(subjects),
            exclude_book_ids=interacted_book_ids,
            limit=limit,
            skip=skip
        )
        
        # Tag reasons
        for b in books:
            b_authors = {a.get("name") for a in b.get("authors", [])}
            b_subjects = set(b.get("subjects", []))
            
            if b_subjects.intersection(subjects):
                b["recommendation_reason"] = "Because you like related subjects"
            elif b_authors.intersection(authors):
                b["recommendation_reason"] = "Because you like these authors"
            else:
                b["recommendation_reason"] = "Recommended for you"
                
        return books

    @classmethod
    def get_similar_books(
        cls, book_id: str, limit: int = 20, skip: int = 0
    ) -> list[dict[str, Any]]:
        """Return books similar to a target book."""
        book = get_book_by_id(book_id)
        
        authors = [a.get("name", "") for a in book.get("authors", []) if a.get("name")]
        subjects = book.get("subjects", [])
        
        books = get_recommended_books(
            authors=authors,
            subjects=subjects,
            exclude_book_ids={book_id},
            limit=limit,
            skip=skip
        )
        
        for b in books:
            b["recommendation_reason"] = "Similar to this book"
            
        return books


class ExternalIntegrationService:
    """Service for safely resolving external provider links without runtime API requests."""

    @classmethod
    def get_access_options(cls, book_or_id: str | dict[str, Any]) -> list[dict[str, Any]]:
        """Return a structured list of verified legal access options for a book.
        
        Evaluates the six authoritative legal access classifications:
        1. OUR_STORE: Product stocked in the project bookstore.
        2. EXTERNAL_PURCHASE: Legitimate retailer or publisher purchase link.
        3. PREVIEW: Publisher/provider sample preview.
        4. BORROW: Library or controlled borrowing service.
        5. PUBLIC_DOMAIN: Legitimate public-domain reading/download source.
        6. INFORMATION: Supplementary bibliographic or informational record.
        """
        if isinstance(book_or_id, dict):
            book = book_or_id
            book_id = str(book.get("id") or book.get("_id", ""))
        else:
            book_id = str(book_or_id)
            book = get_book_by_id(book_id)

        options: list[dict[str, Any]] = []

        # 1. OUR_STORE
        store_info = book.get("store")
        if store_info is None and book_id:
            try:
                from store.services import StoreService
                avail = StoreService.get_bulk_store_availability([book_id])
                store_info = avail.get(book_id)
            except Exception:
                store_info = None

        if store_info and (store_info.get("available") or store_info.get("product_id")):
            options.append({
                "type": AccessClassification.OUR_STORE,
                "label": "Available in Akashic Store",
                "provider": "Akashic Store",
                "url": None,  # Informational only in Part I; real cart in Part II
                "availability": "In Stock" if store_info.get("available") else "Store Folio",
                "jurisdiction": None,
                "description": "Genuine physical edition catalogued in the Akashic Store.",
            })

        # 2. EXTERNAL_PURCHASE
        ext_links = book.get("external_links") or {}
        purchase_url = ext_links.get("purchase") or book.get("external_metadata", {}).get("purchase_url")
        sources = book.get("sources") or {}

        if not purchase_url and "google_books" in sources:
            gb_buy = sources["google_books"].get("buy_link")
            if gb_buy:
                purchase_url = gb_buy

        if purchase_url and _is_safe_url(purchase_url):
            merchant = ext_links.get("merchant") or "Verified Retailer"
            options.append({
                "type": AccessClassification.EXTERNAL_PURCHASE,
                "label": f"Purchase via {merchant}",
                "provider": merchant,
                "url": purchase_url,
                "availability": "Available for Purchase",
                "jurisdiction": None,
                "description": "Legitimate publisher or external bookseller purchasing option.",
            })

        # 3. PREVIEW
        preview_url = ext_links.get("preview") or book.get("external_metadata", {}).get("preview_url")
        if not preview_url and "google_books" in sources:
            gb_id = sources["google_books"].get("id")
            if gb_id:
                preview_url = f"https://books.google.com/books?id={gb_id}"

        if preview_url and _is_safe_url(preview_url):
            provider_name = "Google Books" if "books.google.com" in preview_url else "Publisher Preview"
            options.append({
                "type": AccessClassification.PREVIEW,
                "label": f"{provider_name} Digital Preview",
                "provider": provider_name,
                "url": preview_url,
                "availability": "Sample Preview",
                "jurisdiction": None,
                "description": "Publisher and library sample pages provided digitally.",
            })

        # 4. BORROW
        borrow_url = ext_links.get("borrow") or book.get("external_metadata", {}).get("borrow_url")
        if not borrow_url and "internet_archive" in sources:
            ia_id = sources["internet_archive"].get("id")
            if ia_id:
                borrow_url = f"https://archive.org/details/{ia_id}"
        elif not borrow_url and "open_library" in sources and sources["open_library"].get("ia_id"):
            borrow_url = f"https://archive.org/details/{sources['open_library']['ia_id']}"

        if borrow_url and _is_safe_url(borrow_url):
            provider_name = "Internet Archive" if "archive.org" in borrow_url else "Open Library Lending"
            options.append({
                "type": AccessClassification.BORROW,
                "label": "Borrow Digital Edition",
                "provider": provider_name,
                "url": borrow_url,
                "availability": "Controlled Digital Lending",
                "jurisdiction": None,
                "description": "Controlled digital lending via participating public library archives.",
            })

        # 5. PUBLIC_DOMAIN
        is_pd = (
            book.get("public_domain") is True
            or book.get("availability") == "PUBLIC_DOMAIN"
            or book.get("external_metadata", {}).get("public_domain") is True
            or "gutenberg" in sources
        )
        if is_pd:
            pd_url = book.get("public_domain_url") or ext_links.get("public_domain")
            if not pd_url and "gutenberg" in sources:
                g_id = sources["gutenberg"].get("id")
                if g_id:
                    pd_url = f"https://www.gutenberg.org/ebooks/{g_id}"

            pd_provider = book.get("public_domain_source") or ("Project Gutenberg" if "gutenberg" in sources else "Open Source Archive")
            options.append({
                "type": AccessClassification.PUBLIC_DOMAIN,
                "label": "Public Domain Digital Text",
                "provider": pd_provider,
                "url": pd_url if _is_safe_url(pd_url) else None,
                "availability": "Public Domain",
                "jurisdiction": book.get("jurisdiction") or "United States / International",
                "description": "Verified public-domain historical literary edition.",
            })

        # 6. INFORMATION
        # Open Library
        if "open_library" in sources:
            ol_id = sources["open_library"].get("id")
            if ol_id:
                ol_url = f"https://openlibrary.org/works/{ol_id}"
                if _is_safe_url(ol_url):
                    options.append({
                        "type": AccessClassification.INFORMATION,
                        "label": "Open Library Bibliographic Record",
                        "provider": "Open Library",
                        "url": ol_url,
                        "availability": "Open Bibliographic Record",
                        "jurisdiction": None,
                        "description": "Comprehensive community-curated bibliographic catalog entry.",
                    })

        # Goodreads
        identifiers = book.get("identifiers") or {}
        isbn13 = identifiers.get("isbn13")
        isbn10 = identifiers.get("isbn10")
        isbn = isbn13 or isbn10
        if isbn:
            gr_url = f"https://www.goodreads.com/book/isbn/{isbn}"
            if _is_safe_url(gr_url):
                options.append({
                    "type": AccessClassification.INFORMATION,
                    "label": "Goodreads Reference Record",
                    "provider": "Goodreads",
                    "url": gr_url,
                    "availability": "Reader Catalog Entry",
                    "jurisdiction": None,
                    "description": "Bibliographic reference and community reading catalog.",
                })

        return options

    @classmethod
    def get_external_links(cls, book_id: str) -> dict[str, Any]:
        """Return a mapping of provider names to their external URLs and access options.
        
        Relies purely on the stored `sources` and `identifiers` data in MongoDB,
        protecting the application from external API outages.
        """
        book = get_book_by_id(book_id)
        links: dict[str, Any] = {}
        
        # 1. Google Books
        sources = book.get("sources", {})
        if "google_books" in sources:
            gb_id = sources["google_books"].get("id")
            if gb_id:
                links["google_books"] = f"https://books.google.com/books?id={gb_id}"
                
        # 2. Open Library
        if "open_library" in sources:
            ol_id = sources["open_library"].get("id")
            if ol_id:
                links["open_library"] = f"https://openlibrary.org/works/{ol_id}"
                
        # 3. Goodreads (via ISBN fallback)
        identifiers = book.get("identifiers", {})
        isbn13 = identifiers.get("isbn13")
        if isbn13:
            links["goodreads"] = f"https://www.goodreads.com/book/isbn/{isbn13}"
        elif identifiers.get("isbn10"):
            links["goodreads"] = f"https://www.goodreads.com/book/isbn/{identifiers.get('isbn10')}"
            
        # 4. Structured legal access options
        links["access_options"] = cls.get_access_options(book)
        return links
