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
import re
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
DEFAULT_TIMEOUT = int(os.getenv("OPEN_LIBRARY_TIMEOUT", "15"))
PAGE_SIZE = 20

# ISO 639-2 (3-letter) to ISO 639-1 (2-letter) standard mapping.
ISO_639_2_TO_1: dict[str, str] = {
    "eng": "en",
    "spa": "es",
    "ita": "it",
    "fre": "fr",
    "fra": "fr",
    "ger": "de",
    "deu": "de",
    "pol": "pl",
    "rus": "ru",
    "lat": "la",
    "por": "pt",
    "zho": "zh",
    "chi": "zh",
    "jpn": "ja",
    "dut": "nl",
    "nld": "nl",
    "gre": "el",
    "ell": "el",
    "tur": "tr",
    "ara": "ar",
    "hin": "hi",
    "swe": "sv",
    "nor": "no",
    "dan": "da",
    "fin": "fi",
    "ces": "cs",
    "cze": "cs",
    "kor": "ko",
    "heb": "he",
    "ukr": "uk",
    "cat": "ca",
}

ISO_639_1_TO_2: dict[str, str] = {
    "en": "eng",
    "es": "spa",
    "it": "ita",
    "fr": "fre",
    "de": "ger",
    "pl": "pol",
    "ru": "rus",
    "la": "lat",
    "pt": "por",
    "zh": "chi",
    "ja": "jpn",
    "nl": "dut",
    "el": "gre",
    "tr": "tur",
    "ar": "ara",
    "hi": "hin",
    "sv": "swe",
    "no": "nor",
    "dan": "dan",
    "fi": "fin",
    "cs": "cze",
    "ko": "kor",
    "he": "heb",
    "uk": "ukr",
    "ca": "cat",
}


class OpenLibraryProvider(BookProvider):
    """Adapter for the Open Library Search and Works APIs."""

    name = "open_library"

    def __init__(self) -> None:
        self.last_num_found: int | None = None

    def search(
        self,
        query: str = "",
        *,
        title: str = "",
        author: str = "",
        isbn: str = "",
        subject: str = "",
        publisher: str = "",
        language: str = "",
        page: int = 1,
    ) -> list[NormalizedBook]:
        """Search Open Library for books matching query, title, author, isbn, subject, etc."""
        params: dict[str, Any] = {
            "fields": (
                "key,title,author_name,first_publish_year,publisher,"
                "isbn,subject,cover_i,language,number_of_pages_median"
            ),
            "limit": PAGE_SIZE,
            "offset": max(0, (page - 1) * PAGE_SIZE),
        }
        if query and query.strip():
            params["q"] = query.strip()
        if title and title.strip():
            params["title"] = title.strip()
        if author and author.strip():
            params["author"] = author.strip()
        if isbn and isbn.strip():
            clean_isbn = re.sub(r"[^0-9Xx]", "", isbn).strip().upper()
            params["isbn"] = clean_isbn
        if subject and subject.strip():
            params["subject"] = subject.strip().lower()
        if publisher and publisher.strip():
            params["publisher"] = publisher.strip()
        if language and language.strip():
            lang_clean = language.strip().lower()
            params["language"] = ISO_639_1_TO_2.get(lang_clean, lang_clean)

        if not any(params.get(k) for k in ("q", "title", "author", "isbn", "subject", "publisher")):
            self.last_num_found = 0
            return []

        try:
            resp = requests.get(OL_SEARCH_URL, params=params, timeout=DEFAULT_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            self.last_num_found = data.get("numFound")
            logger.warning(
                "OpenLibraryProvider outbound request: GET %s (status=%d, returned_docs=%d, numFound=%s)",
                resp.url,
                resp.status_code,
                len(data.get("docs", [])),
                str(self.last_num_found),
            )
        except Timeout as exc:
            raise ProviderTimeoutError("Open Library request timed out.") from exc
        except RequestsConnectionError as exc:
            raise ProviderError("Could not connect to Open Library.") from exc
        except requests.HTTPError as exc:
            raise ProviderError(
                f"Open Library returned HTTP {exc.response.status_code}."
            ) from exc

        docs = data.get("docs", [])
        results = []
        target_isbn = re.sub(r"[^0-9Xx]", "", isbn).strip().upper() if isbn else ""
        for doc in docs:
            normalized = self.normalize(doc, target_language=language, target_isbn=target_isbn)
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

    def normalize(
        self,
        raw: dict[str, Any],
        *,
        target_language: str = "",
        target_isbn: str = "",
    ) -> NormalizedBook | None:
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

            # Language normalization (ISO 639-2 3-letter to ISO 639-1 2-letter standard).
            raw_languages = raw.get("language") or []
            normalized_languages: list[str] = []
            for raw_lang in raw_languages:
                if raw_lang:
                    code = str(raw_lang).strip().lower()
                    norm = ISO_639_2_TO_1.get(code, code[:2] if len(code) >= 2 else code)
                    if norm and norm not in normalized_languages:
                        normalized_languages.append(norm)

            target_clean = target_language.strip().lower() if target_language else ""
            if target_clean and target_clean in normalized_languages:
                language = target_clean
            elif normalized_languages:
                language = normalized_languages[0]
            else:
                language = None

            page_count = raw.get("number_of_pages_median")

            # ISBNs — search returns a flat list; split by length.
            isbn10, isbn13 = None, None
            all_isbns = [re.sub(r"[^0-9Xx]", "", str(i)).strip().upper() for i in (raw.get("isbn") or [])]

            if target_isbn:
                clean_target = re.sub(r"[^0-9Xx]", "", target_isbn).strip().upper()
                if clean_target in all_isbns:
                    if len(clean_target) == 13:
                        isbn13 = clean_target
                    elif len(clean_target) == 10:
                        isbn10 = clean_target

            for isbn_clean in all_isbns:
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
