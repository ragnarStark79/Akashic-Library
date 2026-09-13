"""
Open Library API adapter.

Documentation:
  Search: https://openlibrary.org/dev/docs/api#anchor_searchapi
  Works:  https://openlibrary.org/works/{work_id}.json
  Covers: https://covers.openlibrary.org/b/id/{cover_id}-L.jpg

Open Library is a free public API — no API key required.

Configuration (via environment variables):
  OPEN_LIBRARY_TIMEOUT — HTTP timeout in seconds (default: 8).
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

OL_SEARCH_URL = "https://openlibrary.org/search.json"
OL_WORK_URL = "https://openlibrary.org/works/{work_id}.json"
OL_COVER_URL = "https://covers.openlibrary.org/b/id/{cover_id}-{size}.jpg"
DEFAULT_TIMEOUT = int(os.getenv("OPEN_LIBRARY_TIMEOUT", "8"))
PAGE_SIZE = 20


class OpenLibraryProvider(BookProvider):
    """Adapter for the Open Library Search and Works APIs."""

    name = "open_library"

    def search(self, query: str, *, page: int = 1) -> list[NormalizedBook]:
        """Search Open Library for books matching query."""
        params: dict[str, Any] = {
            "q": query,
            "fields": (
                "key,title,author_name,first_publish_year,publisher,"
                "isbn,subject,cover_i,language,number_of_pages_median"
            ),
            "limit": PAGE_SIZE,
            "offset": (page - 1) * PAGE_SIZE,
        }
        try:
            resp = requests.get(OL_SEARCH_URL, params=params, timeout=DEFAULT_TIMEOUT)
            resp.raise_for_status()
        except Timeout as exc:
            raise ProviderTimeoutError("Open Library request timed out.") from exc
        except RequestsConnectionError as exc:
            raise ProviderError("Could not connect to Open Library.") from exc
        except requests.HTTPError as exc:
            raise ProviderError(
                f"Open Library returned HTTP {exc.response.status_code}."
            ) from exc

        docs = resp.json().get("docs", [])
        results = []
        for doc in docs:
            normalized = self.normalize(doc)
            if normalized is not None:
                results.append(normalized)
        return results

    def get_by_id(self, external_id: str) -> NormalizedBook | None:
        """Fetch a work from Open Library by its work key (e.g. 'OL12345W')."""
        # Normalize: accept with or without /works/ prefix.
        work_id = external_id.lstrip("/")
        if not work_id.startswith("works/"):
            work_id = f"works/{work_id}"
        url = f"https://openlibrary.org/{work_id}.json"
        try:
            resp = requests.get(url, timeout=DEFAULT_TIMEOUT)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
        except Timeout as exc:
            raise ProviderTimeoutError("Open Library request timed out.") from exc
        except RequestsConnectionError as exc:
            raise ProviderError("Could not connect to Open Library.") from exc
        except requests.HTTPError as exc:
            raise ProviderError(
                f"Open Library returned HTTP {exc.response.status_code}."
            ) from exc

        raw = resp.json()
        # Works API has a different shape than search; adapt it.
        return self._normalize_work(raw, work_id)

    def normalize(self, raw: dict[str, Any]) -> NormalizedBook | None:
        """Normalize an Open Library search document."""
        try:
            title = (raw.get("title") or "").strip()
            if not title:
                return None

            # work key looks like "/works/OL12345W" — strip the prefix.
            key = raw.get("key", "")
            work_id = key.split("/works/")[-1] if "/works/" in key else key

            authors = raw.get("author_name") or []
            published_date = str(raw.get("first_publish_year")) if raw.get("first_publish_year") else None
            publishers = raw.get("publisher") or []
            publisher = publishers[0] if publishers else None
            subjects = (raw.get("subject") or [])[:20]  # Cap at 20 subjects.
            languages = raw.get("language") or []
            language = languages[0] if languages else None
            page_count = raw.get("number_of_pages_median")

            # ISBNs — search returns a flat list; split by length.
            isbn10, isbn13 = None, None
            for isbn in raw.get("isbn") or []:
                isbn_clean = isbn.replace("-", "").strip()
                if len(isbn_clean) == 13 and isbn13 is None:
                    isbn13 = isbn_clean
                elif len(isbn_clean) == 10 and isbn10 is None:
                    isbn10 = isbn_clean

            # Cover URL from cover_i (cover image ID).
            cover_urls = []
            cover_i = raw.get("cover_i")
            if cover_i:
                for size in ("L", "M"):
                    cover_urls.append(
                        OL_COVER_URL.format(cover_id=cover_i, size=size)
                    )

            return NormalizedBook(
                title=title,
                authors=authors,
                description=None,  # Not available in search; available in work detail.
                isbn10=isbn10,
                isbn13=isbn13,
                publisher=publisher,
                published_date=published_date,
                page_count=int(page_count) if page_count else None,
                language=language,
                subjects=subjects,
                cover_urls=cover_urls,
                source_name=self.name,
                source_id=work_id,
                raw_metadata={},
            )
        except Exception as exc:
            logger.warning("OpenLibraryProvider.normalize failed: %s", exc)
            return None

    def _normalize_work(self, raw: dict[str, Any], work_id: str) -> NormalizedBook | None:
        """Normalize a Works API response (different shape from search)."""
        try:
            title = (raw.get("title") or "").strip()
            if not title:
                return None

            # Description can be a string or {"type": "...", "value": "..."}.
            desc_raw = raw.get("description")
            if isinstance(desc_raw, dict):
                description = desc_raw.get("value") or None
            else:
                description = desc_raw or None

            subjects = (raw.get("subjects") or [])[:20]
            cover_ids = raw.get("covers") or []
            cover_urls = []
            for cid in cover_ids[:3]:  # Limit to first 3 covers.
                if cid and cid != -1:
                    cover_urls.append(OL_COVER_URL.format(cover_id=cid, size="L"))

            return NormalizedBook(
                title=title,
                authors=[],  # Author info not in work detail without additional requests.
                description=description,
                subjects=subjects,
                cover_urls=cover_urls,
                source_name=self.name,
                source_id=work_id,
                raw_metadata={},
            )
        except Exception as exc:
            logger.warning("OpenLibraryProvider._normalize_work failed: %s", exc)
            return None
