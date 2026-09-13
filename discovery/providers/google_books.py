"""
Google Books API adapter.

Documentation: https://developers.google.com/books/docs/v1/reference/volumes/list

Configuration (via environment variables / Django settings):
  GOOGLE_BOOKS_API_KEY  — optional; raises query limit without it but works.
  GOOGLE_BOOKS_TIMEOUT  — HTTP timeout in seconds (default: 8).

The API key is NEVER logged or included in error messages.
"""

import logging
import os
from typing import Any

import requests
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import Timeout

from discovery.exceptions import ProviderError, ProviderTimeoutError
from discovery.models import NormalizedBook
from discovery.providers.base import BookProvider

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes"
DEFAULT_TIMEOUT = int(os.getenv("GOOGLE_BOOKS_TIMEOUT", "8"))
PAGE_SIZE = 20  # Google Books maxResults limit we use.


class GoogleBooksProvider(BookProvider):
    """Adapter for the Google Books Volumes API."""

    name = "google_books"

    def search(self, query: str, *, page: int = 1) -> list[NormalizedBook]:
        """Search Google Books.

        page is 1-indexed; internally translated to startIndex.
        """
        start_index = (page - 1) * PAGE_SIZE
        params: dict[str, Any] = {
            "q": query,
            "maxResults": PAGE_SIZE,
            "startIndex": start_index,
            "printType": "books",
            "fields": (
                "items(id,volumeInfo("
                "title,authors,description,publisher,publishedDate,"
                "pageCount,language,categories,"
                "industryIdentifiers,imageLinks))"
            ),
        }
        api_key = os.getenv("GOOGLE_BOOKS_API_KEY", "")
        if api_key:
            params["key"] = api_key

        try:
            resp = requests.get(GOOGLE_BOOKS_BASE_URL, params=params, timeout=DEFAULT_TIMEOUT)
            resp.raise_for_status()
        except Timeout as exc:
            raise ProviderTimeoutError("Google Books request timed out.") from exc
        except RequestsConnectionError as exc:
            raise ProviderError("Could not connect to Google Books.") from exc
        except requests.HTTPError as exc:
            raise ProviderError(
                f"Google Books returned HTTP {exc.response.status_code}."
            ) from exc

        items = resp.json().get("items", [])
        results = []
        for item in items:
            normalized = self.normalize(item)
            if normalized is not None:
                results.append(normalized)
        return results

    def get_by_id(self, external_id: str) -> NormalizedBook | None:
        """Fetch a single volume by its Google Books volume ID."""
        api_key = os.getenv("GOOGLE_BOOKS_API_KEY", "")
        params = {"key": api_key} if api_key else {}
        url = f"{GOOGLE_BOOKS_BASE_URL}/{external_id}"
        try:
            resp = requests.get(url, params=params, timeout=DEFAULT_TIMEOUT)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
        except Timeout as exc:
            raise ProviderTimeoutError("Google Books request timed out.") from exc
        except RequestsConnectionError as exc:
            raise ProviderError("Could not connect to Google Books.") from exc
        except requests.HTTPError as exc:
            raise ProviderError(
                f"Google Books returned HTTP {exc.response.status_code}."
            ) from exc
        return self.normalize(resp.json())

    def normalize(self, raw: dict[str, Any]) -> NormalizedBook | None:
        """Normalize a Google Books volume item into a NormalizedBook."""
        try:
            volume_id = raw.get("id", "")
            info = raw.get("volumeInfo", {})
            title = (info.get("title") or "").strip()
            if not title:
                return None  # Unusable without a title.

            authors = info.get("authors") or []
            description = info.get("description") or None
            publisher = info.get("publisher") or None
            published_date = info.get("publishedDate") or None
            page_count = info.get("pageCount") or None
            language = info.get("language") or None
            subjects = info.get("categories") or []

            # Extract ISBNs from industryIdentifiers list.
            isbn10, isbn13 = None, None
            for identifier in info.get("industryIdentifiers") or []:
                id_type = identifier.get("type", "")
                id_val = (identifier.get("identifier") or "").strip()
                if id_type == "ISBN_13":
                    isbn13 = id_val
                elif id_type == "ISBN_10":
                    isbn10 = id_val

            # Build cover URL list (largest to smallest).
            image_links = info.get("imageLinks") or {}
            cover_urls = []
            for size in ("extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"):
                url = image_links.get(size)
                if url:
                    # Replace http with https for security.
                    cover_urls.append(url.replace("http://", "https://"))

            return NormalizedBook(
                title=title,
                authors=authors,
                description=description,
                isbn10=isbn10,
                isbn13=isbn13,
                publisher=publisher,
                published_date=published_date,
                page_count=int(page_count) if page_count else None,
                language=language,
                subjects=subjects,
                cover_urls=cover_urls,
                source_name=self.name,
                source_id=volume_id,
                raw_metadata={},  # raw_metadata intentionally omitted from storage.
            )
        except Exception as exc:
            logger.warning("GoogleBooksProvider.normalize failed: %s", exc)
            return None
