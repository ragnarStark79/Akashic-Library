"""
Discovery domain tests — Step 3.

Run with:
  python manage.py test discovery --settings=Akashic_Library.test_settings

All tests use a real in-process MongoDB (mongomock) OR a real local MongoDB.
External provider HTTP calls are always mocked via unittest.mock.patch.

Strategy:
  - MongoDB operations use mongomock to avoid requiring a live MongoDB.
  - Provider HTTP calls use unittest.mock to return deterministic payloads.
  - Each test is independent — setUp creates a fresh mock DB.
"""

import json
from unittest.mock import MagicMock, patch

from django.test import TestCase

from discovery.exceptions import (
    BookNotFoundError,
    MongoDBUnavailableError,
    ProviderError,
    ProviderTimeoutError,
)
from discovery.models import NormalizedBook
from discovery.providers.google_books import GoogleBooksProvider
from discovery.providers.open_library import OpenLibraryProvider

# ─── Fixtures ─────────────────────────────────────────────────────────────────

GOOGLE_BOOKS_VOLUME_ITEM = {
    "id": "gB_xwAEACAAJ",
    "volumeInfo": {
        "title": "Clean Code",
        "authors": ["Robert C. Martin"],
        "description": "A handbook of agile software craftsmanship.",
        "publisher": "Prentice Hall",
        "publishedDate": "2008-08-01",
        "pageCount": 431,
        "language": "en",
        "categories": ["Computers"],
        "industryIdentifiers": [
            {"type": "ISBN_13", "identifier": "9780132350884"},
            {"type": "ISBN_10", "identifier": "0132350882"},
        ],
        "imageLinks": {
            "thumbnail": "http://books.google.com/cover.jpg",
            "large": "http://books.google.com/cover-large.jpg",
        },
    },
}

GOOGLE_BOOKS_SEARCH_RESPONSE = {
    "items": [GOOGLE_BOOKS_VOLUME_ITEM]
}

OPEN_LIBRARY_SEARCH_DOC = {
    "key": "/works/OL1820770W",
    "title": "Refactoring",
    "author_name": ["Martin Fowler"],
    "first_publish_year": 1999,
    "publisher": ["Addison-Wesley"],
    "isbn": ["9780201485677", "0201485672"],
    "subject": ["Software engineering", "Refactoring"],
    "cover_i": 11223344,
    "language": ["eng"],
    "number_of_pages_median": 448,
}

OPEN_LIBRARY_SEARCH_RESPONSE = {
    "docs": [OPEN_LIBRARY_SEARCH_DOC],
    "num_found": 1,
}

OPEN_LIBRARY_WORK_RESPONSE = {
    "title": "Refactoring",
    "description": {
        "type": "/type/text",
        "value": "Classic refactoring guide.",
    },
    "subjects": ["Software engineering"],
    "covers": [11223344],
}


# ─── Helper: in-memory MongoDB via mongomock ──────────────────────────────────

def _make_mock_db():
    """Return a mongomock in-memory database."""
    try:
        import mongomock
        return mongomock.MongoClient()["test_discovery"]
    except ImportError:
        return None


# ─── Google Books Normalization ───────────────────────────────────────────────


class GoogleBooksNormalizationTests(TestCase):
    """Test 5 — Google Books normalization."""

    def setUp(self):
        self.provider = GoogleBooksProvider()

    def test_normalize_valid_item(self):
        """Normalize a complete Google Books volume item."""
        book = self.provider.normalize(GOOGLE_BOOKS_VOLUME_ITEM)
        self.assertIsNotNone(book)
        self.assertEqual(book.title, "Clean Code")
        self.assertEqual(book.authors, ["Robert C. Martin"])
        self.assertEqual(book.isbn13, "9780132350884")
        self.assertEqual(book.isbn10, "0132350882")
        self.assertEqual(book.publisher, "Prentice Hall")
        self.assertEqual(book.published_date, "2008-08-01")
        self.assertEqual(book.page_count, 431)
        self.assertEqual(book.language, "en")
        self.assertIn("Computers", book.subjects)
        self.assertEqual(book.source_name, "google_books")
        self.assertEqual(book.source_id, "gB_xwAEACAAJ")
        self.assertEqual(book.description, "A handbook of agile software craftsmanship.")

    def test_normalize_cover_https_enforced(self):
        """HTTP cover URLs are upgraded to HTTPS."""
        book = self.provider.normalize(GOOGLE_BOOKS_VOLUME_ITEM)
        for url in book.cover_urls:
            self.assertTrue(url.startswith("https://"), f"Expected HTTPS, got: {url}")

    def test_normalize_cover_order(self):
        """Large covers should appear before thumbnails."""
        book = self.provider.normalize(GOOGLE_BOOKS_VOLUME_ITEM)
        self.assertGreater(len(book.cover_urls), 0)
        # large comes before thumbnail in the size priority list.
        urls = book.cover_urls
        if len(urls) >= 2:
            large_idx = next((i for i, u in enumerate(urls) if "large" in u), None)
            thumb_idx = next((i for i, u in enumerate(urls) if "cover.jpg" in u and "large" not in u), None)
            if large_idx is not None and thumb_idx is not None:
                self.assertLess(large_idx, thumb_idx)

    def test_normalize_missing_title_returns_none(self):
        """Items without a title must be skipped."""
        item = {"id": "abc", "volumeInfo": {"authors": ["Nobody"]}}
        result = self.provider.normalize(item)
        self.assertIsNone(result)

    def test_normalize_missing_optional_fields(self):
        """Normalization must succeed with only title present."""
        item = {"id": "xyz", "volumeInfo": {"title": "Bare Minimum Book"}}
        book = self.provider.normalize(item)
        self.assertIsNotNone(book)
        self.assertEqual(book.title, "Bare Minimum Book")
        self.assertEqual(book.authors, [])
        self.assertIsNone(book.isbn13)
        self.assertIsNone(book.description)

    def test_normalize_malformed_item_returns_none(self):
        """Malformed input must return None, not raise."""
        result = self.provider.normalize({"id": None, "volumeInfo": None})
        self.assertIsNone(result)


# ─── Open Library Normalization ───────────────────────────────────────────────


class OpenLibraryNormalizationTests(TestCase):
    """Test 6 — Open Library normalization."""

    def setUp(self):
        self.provider = OpenLibraryProvider()

    def test_normalize_search_doc(self):
        """Normalize a complete Open Library search document."""
        book = self.provider.normalize(OPEN_LIBRARY_SEARCH_DOC)
        self.assertIsNotNone(book)
        self.assertEqual(book.title, "Refactoring")
        self.assertEqual(book.authors, ["Martin Fowler"])
        self.assertEqual(book.isbn13, "9780201485677")
        self.assertEqual(book.isbn10, "0201485672")
        self.assertEqual(book.publisher, "Addison-Wesley")
        self.assertEqual(book.published_date, "1999")
        self.assertEqual(book.page_count, 448)
        self.assertIn("Software engineering", book.subjects)
        self.assertEqual(book.source_name, "open_library")
        self.assertEqual(book.source_id, "OL1820770W")

    def test_normalize_cover_url_constructed(self):
        """Cover URL must be constructed from cover_i."""
        book = self.provider.normalize(OPEN_LIBRARY_SEARCH_DOC)
        self.assertGreater(len(book.cover_urls), 0)
        self.assertIn("11223344", book.cover_urls[0])

    def test_normalize_missing_title_returns_none(self):
        book = self.provider.normalize({"key": "/works/OL1W", "author_name": ["Someone"]})
        self.assertIsNone(book)

    def test_normalize_work_description_string(self):
        """Work description as a plain string is extracted correctly."""
        raw = {"title": "A Book", "description": "Plain text description."}
        book = self.provider._normalize_work(raw, "OL999W")
        self.assertEqual(book.description, "Plain text description.")

    def test_normalize_work_description_dict(self):
        """Work description as a {type, value} dict is extracted correctly."""
        book = self.provider._normalize_work(OPEN_LIBRARY_WORK_RESPONSE, "OL1820770W")
        self.assertIsNotNone(book)
        self.assertEqual(book.description, "Classic refactoring guide.")

    def test_normalize_missing_optional_fields(self):
        """Normalization must succeed with only title present."""
        book = self.provider.normalize({"key": "/works/OL1W", "title": "Minimal Book"})
        self.assertIsNotNone(book)
        self.assertIsNone(book.isbn13)
        self.assertEqual(book.subjects, [])


# ─── Provider HTTP / error handling ──────────────────────────────────────────


class GoogleBooksProviderHTTPTests(TestCase):
    """Test 7 — Provider failure handling (Google Books)."""

    def setUp(self):
        self.provider = GoogleBooksProvider()

    @patch("discovery.providers.google_books.requests.get")
    def test_search_success(self, mock_get):
        """Successful search returns list of NormalizedBooks."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = GOOGLE_BOOKS_SEARCH_RESPONSE
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        results = self.provider.search("clean code")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].title, "Clean Code")

    @patch("discovery.providers.google_books.requests.get")
    def test_search_empty_response(self, mock_get):
        """Provider with no items returns empty list."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        results = self.provider.search("zzz_no_results")
        self.assertEqual(results, [])

    @patch("discovery.providers.google_books.requests.get")
    def test_search_timeout_raises_provider_timeout_error(self, mock_get):
        """Timeout raises ProviderTimeoutError."""
        from requests.exceptions import Timeout
        mock_get.side_effect = Timeout()

        with self.assertRaises(ProviderTimeoutError):
            self.provider.search("anything")

    @patch("discovery.providers.google_books.requests.get")
    def test_search_connection_error_raises_provider_error(self, mock_get):
        """Connection error raises ProviderError."""
        from requests.exceptions import ConnectionError as RCE
        mock_get.side_effect = RCE()

        with self.assertRaises(ProviderError):
            self.provider.search("anything")

    @patch("discovery.providers.google_books.requests.get")
    def test_search_http_error_raises_provider_error(self, mock_get):
        """HTTP 500 from provider raises ProviderError."""
        import requests
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.HTTPError(
            response=MagicMock(status_code=500)
        )
        mock_get.return_value = mock_resp

        with self.assertRaises(ProviderError):
            self.provider.search("anything")


class OpenLibraryProviderHTTPTests(TestCase):
    """Test 7 — Provider failure handling (Open Library)."""

    def setUp(self):
        self.provider = OpenLibraryProvider()

    @patch("discovery.providers.open_library.requests.get")
    def test_search_success(self, mock_get):
        """Successful search returns list of NormalizedBooks."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = OPEN_LIBRARY_SEARCH_RESPONSE
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        results = self.provider.search("refactoring")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].title, "Refactoring")

    @patch("discovery.providers.open_library.requests.get")
    def test_search_timeout_raises_provider_timeout_error(self, mock_get):
        from requests.exceptions import Timeout
        mock_get.side_effect = Timeout()
        with self.assertRaises(ProviderTimeoutError):
            self.provider.search("anything")

    @patch("discovery.providers.open_library.requests.get")
    def test_get_by_id_not_found_returns_none(self, mock_get):
        """get_by_id returns None on HTTP 404."""
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_get.return_value = mock_resp
        result = self.provider.get_by_id("OL9999W")
        self.assertIsNone(result)


# ─── NormalizedBook dataclass ─────────────────────────────────────────────────


class NormalizedBookTests(TestCase):
    """Test NormalizedBook contract and to_document() conversion."""

    def _make_book(self, **kwargs):
        defaults = dict(
            title="Test Book",
            authors=["Author One"],
            isbn13="9780132350884",
            source_name="google_books",
            source_id="abc123",
        )
        defaults.update(kwargs)
        return NormalizedBook(**defaults)

    def test_to_document_structure(self):
        """to_document() produces a correctly structured MongoDB dict."""
        book = self._make_book()
        doc = book.to_document()
        self.assertEqual(doc["title"], "Test Book")
        self.assertIn("identifiers", doc)
        self.assertEqual(doc["identifiers"]["isbn13"], "9780132350884")
        self.assertIn("publication", doc)
        self.assertIn("sources", doc)
        self.assertIn("google_books", doc["sources"])
        self.assertIsNone(doc["store_product_id"])

    def test_authors_converted_to_subdocs(self):
        """Authors list is converted to [{"name": ...}] subdocuments."""
        book = self._make_book(authors=["Alice", "Bob"])
        doc = book.to_document()
        self.assertEqual(doc["authors"], [{"name": "Alice"}, {"name": "Bob"}])

    def test_covers_include_source(self):
        """Cover list includes the source name."""
        book = self._make_book(cover_urls=["https://example.com/cover.jpg"])
        doc = book.to_document()
        self.assertEqual(doc["covers"][0]["source"], "google_books")


# ─── Repository (MongoDB) tests ───────────────────────────────────────────────


class RepositoryTests(TestCase):
    """Test 9 — MongoDB repository behavior.
    Test 10 — Duplicate/upsert behavior.

    Uses mongomock if available, otherwise skips gracefully.
    """

    def setUp(self):
        """Patch get_db to return an in-memory mongomock database."""
        try:
            import mongomock
            self._mock_client = mongomock.MongoClient()
            self._mock_db = self._mock_client["test_discovery"]
            self._patcher = patch("discovery.repository.get_db", return_value=self._mock_db)
            self._patcher.start()
            # Also patch the ping in get_db to avoid real MongoDB calls.
            import discovery.repository as repo
        except ImportError:
            self.skipTest("mongomock not installed — skipping repository tests")

    def tearDown(self):
        self._patcher.stop()

    def _insert_book(self, title="Test Book", isbn13="9780000000001", source_id="sid1"):
        from discovery import repository
        book = NormalizedBook(
            title=title,
            authors=["Test Author"],
            isbn13=isbn13,
            source_name="google_books",
            source_id=source_id,
        )
        return repository.upsert_book(book)

    def test_upsert_returns_id(self):
        """upsert_book() returns a non-empty string ID."""
        from discovery import repository
        book_id = self._insert_book()
        self.assertIsInstance(book_id, str)
        self.assertTrue(len(book_id) > 0)

    def test_get_by_id_returns_document(self):
        """get_book_by_id() fetches the inserted document."""
        from discovery import repository
        book_id = self._insert_book(title="Repository Test Book")
        doc = repository.get_book_by_id(book_id)
        self.assertEqual(doc["title"], "Repository Test Book")
        self.assertEqual(doc["id"], book_id)

    def test_get_by_invalid_id_raises_book_not_found(self):
        """Invalid ObjectId raises BookNotFoundError."""
        from discovery import repository
        with self.assertRaises(BookNotFoundError):
            repository.get_book_by_id("not-a-valid-objectid")

    def test_get_by_missing_id_raises_book_not_found(self):
        """Non-existent ObjectId raises BookNotFoundError."""
        from bson import ObjectId
        from discovery import repository
        with self.assertRaises(BookNotFoundError):
            repository.get_book_by_id(str(ObjectId()))

    def test_upsert_deduplicates_by_isbn13(self):
        """Upserting the same ISBN-13 twice does not create a duplicate."""
        from discovery import repository
        id1 = self._insert_book(isbn13="9780132350884", source_id="id1")
        id2 = self._insert_book(isbn13="9780132350884", source_id="id2")
        self.assertEqual(id1, id2)
        # Only one document should exist.
        col = self._mock_db["books"]
        count = col.count_documents({"identifiers.isbn13": "9780132350884"})
        self.assertEqual(count, 1)

    def test_upsert_new_book_without_isbn_inserts(self):
        """Books without ISBN get inserted (no deduplication filter)."""
        from discovery import repository
        book = NormalizedBook(
            title="No ISBN Book",
            authors=["Unknown"],
            source_name="open_library",
            source_id="OL12345W",
        )
        id1 = repository.upsert_book(book)
        # Second upsert with same source_id should match (provider ID fallback).
        id2 = repository.upsert_book(book)
        self.assertEqual(id1, id2)

    def test_search_returns_paginated_result(self):
        """search_books() returns expected structure."""
        from discovery import repository
        # Ensure the text index exists.
        try:
            repository.ensure_indexes()
        except Exception:
            pass  # mongomock may not support all index types.
        self._insert_book(title="Python Programming")
        result = repository.search_books(page=1, page_size=10)
        self.assertIn("count", result)
        self.assertIn("results", result)
        self.assertIn("page", result)
        self.assertIn("page_size", result)

    def test_search_pagination_page_2_empty(self):
        """Page 2 with only 1 document returns empty results."""
        from discovery import repository
        self._insert_book()
        result = repository.search_books(page=2, page_size=10)
        self.assertEqual(result["results"], [])


# ─── BookSearchService ────────────────────────────────────────────────────────


class BookSearchServiceTests(TestCase):
    """Test 8 — Provider fallback behavior via BookSearchService."""

    def setUp(self):
        try:
            import mongomock
            self._mock_client = mongomock.MongoClient()
            self._mock_db = self._mock_client["test_svc"]
            self._db_patcher = patch("discovery.repository.get_db", return_value=self._mock_db)
            self._db_patcher.start()
        except ImportError:
            self.skipTest("mongomock not installed — skipping service tests")

    def tearDown(self):
        self._db_patcher.stop()

    def _insert_local_book(self, title="Local Book", isbn13="9780000000001"):
        from discovery import repository
        book = NormalizedBook(
            title=title, authors=["Local Author"], isbn13=isbn13,
            source_name="google_books", source_id="local1",
        )
        return repository.upsert_book(book)

    @patch("discovery.services._PROVIDERS", [])
    def test_search_returns_local_results(self):
        """Service returns local results without calling providers."""
        from discovery.services import BookSearchService
        self._insert_local_book()
        # With no query the text-search filter is empty; use author to find.
        result = BookSearchService.search(page=1, page_size=20)
        self.assertIn("count", result)
        self.assertIn("results", result)

    @patch("discovery.repository.upsert_book")
    @patch("discovery.repository.search_books")
    @patch("discovery.providers.google_books.GoogleBooksProvider.search")
    def test_provider_called_when_no_local_results(self, mock_gb_search, mock_repo_search, mock_upsert):
        """Provider is called when local catalog is empty and query is given."""
        from discovery.services import BookSearchService

        # First call returns zero results (triggers provider fallback).
        # Second call (after upsert) returns one result.
        empty = {"count": 0, "page": 1, "page_size": 20, "results": []}
        one_result = {"count": 1, "page": 1, "page_size": 20, "results": [{"id": "abc", "title": "Provider Book"}]}
        mock_repo_search.side_effect = [empty, one_result]

        book = NormalizedBook(
            title="Provider Book", authors=["P Author"],
            source_name="google_books", source_id="prov1",
        )
        mock_gb_search.return_value = [book]

        result = BookSearchService.search(query="provider book", page=1)
        # Provider should have been called.
        mock_gb_search.assert_called_once()
        self.assertEqual(result["count"], 1)

    @patch("discovery.repository.upsert_book")
    @patch("discovery.repository.search_books")
    @patch("discovery.providers.google_books.GoogleBooksProvider.search")
    @patch("discovery.providers.open_library.OpenLibraryProvider.search")
    def test_all_providers_fail_returns_empty_results(self, mock_ol, mock_gb, mock_repo_search, mock_upsert):
        """When all providers fail, empty local results are returned cleanly."""
        from discovery.services import BookSearchService
        empty = {"count": 0, "page": 1, "page_size": 20, "results": []}
        mock_repo_search.return_value = empty
        mock_gb.side_effect = ProviderError("Google Books is down")
        mock_ol.side_effect = ProviderError("Open Library is down")

        result = BookSearchService.search(query="something", page=1)
        self.assertIn("results", result)
        # No exception raised — clean empty result.

    @patch("discovery.repository.upsert_book")
    @patch("discovery.repository.search_books")
    @patch("discovery.providers.google_books.GoogleBooksProvider.search")
    @patch("discovery.providers.open_library.OpenLibraryProvider.search")
    def test_first_provider_fails_second_called(self, mock_ol, mock_gb, mock_repo_search, mock_upsert):
        """When Google Books fails, Open Library is tried."""
        from discovery.services import BookSearchService
        empty = {"count": 0, "page": 1, "page_size": 20, "results": []}
        mock_repo_search.return_value = empty
        mock_gb.side_effect = ProviderError("Google Books is down")
        book = NormalizedBook(
            title="OL Book", authors=["OL Author"],
            source_name="open_library", source_id="OL999W",
        )
        mock_ol.return_value = [book]

        # Should not raise.
        BookSearchService.search(query="ol book", page=1)
        mock_ol.assert_called_once()


# ─── API View tests ───────────────────────────────────────────────────────────


class BookListAPITests(TestCase):
    """Test 1–4, 11, 12 — API response shape, pagination, not found, invalid query."""

    def setUp(self):
        try:
            import mongomock
            self._mock_client = mongomock.MongoClient()
            self._mock_db = self._mock_client["test_api"]
            self._db_patcher = patch("discovery.repository.get_db", return_value=self._mock_db)
            self._db_patcher.start()
        except ImportError:
            self.skipTest("mongomock not installed — skipping API view tests")

    def tearDown(self):
        self._db_patcher.stop()

    def _insert_book(self, title="API Test Book", isbn13=None, source_id="api1"):
        from discovery import repository
        book = NormalizedBook(
            title=title, authors=["API Author"],
            isbn13=isbn13, source_name="google_books", source_id=source_id,
        )
        return repository.upsert_book(book)

    @patch("discovery.services._PROVIDERS", [])
    def test_list_returns_200(self):
        """GET /api/books/ returns 200."""
        self._insert_book()
        resp = self.client.get("/api/books/")
        self.assertEqual(resp.status_code, 200)

    @patch("discovery.services._PROVIDERS", [])
    def test_list_response_shape(self):
        """GET /api/books/ response has expected keys."""
        resp = self.client.get("/api/books/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("count", data)
        self.assertIn("next", data)
        self.assertIn("previous", data)
        self.assertIn("results", data)

    @patch("discovery.services._PROVIDERS", [])
    def test_list_result_item_shape(self):
        """Each result item has expected fields."""
        self._insert_book(title="Shaped Book", source_id="shape1")
        resp = self.client.get("/api/books/")
        data = resp.json()
        self.assertGreater(len(data["results"]), 0)
        item = data["results"][0]
        for field in ("id", "title", "authors", "cover_url", "rating", "review_count", "in_store"):
            self.assertIn(field, item)

    def test_invalid_page_returns_400(self):
        """Invalid page parameter returns 400."""
        resp = self.client.get("/api/books/?page=abc")
        self.assertEqual(resp.status_code, 400)

    def test_invalid_page_size_returns_400(self):
        """Invalid page_size parameter returns 400."""
        resp = self.client.get("/api/books/?page_size=-1")
        self.assertEqual(resp.status_code, 400)

    @patch("discovery.services._PROVIDERS", [])
    def test_detail_returns_200(self):
        """GET /api/books/<id>/ returns 200 for existing book."""
        book_id = self._insert_book(title="Detail Book", source_id="det1")
        resp = self.client.get(f"/api/books/{book_id}/")
        self.assertEqual(resp.status_code, 200)

    @patch("discovery.services._PROVIDERS", [])
    def test_detail_response_shape(self):
        """Book detail response has all required fields."""
        book_id = self._insert_book(title="Full Detail", source_id="full1")
        resp = self.client.get(f"/api/books/{book_id}/")
        data = resp.json()
        for field in ("id", "title", "authors", "description", "identifiers",
                      "publication", "subjects", "community", "store"):
            self.assertIn(field, data)

    def test_detail_invalid_id_returns_404(self):
        """GET /api/books/<invalid-id>/ returns 404."""
        resp = self.client.get("/api/books/not-a-real-id/")
        self.assertEqual(resp.status_code, 404)

    def test_detail_nonexistent_objectid_returns_404(self):
        """GET /api/books/<valid-but-missing-id>/ returns 404."""
        from bson import ObjectId
        fake_id = str(ObjectId())
        resp = self.client.get(f"/api/books/{fake_id}/")
        self.assertEqual(resp.status_code, 404)

    @patch("discovery.services._PROVIDERS", [])
    def test_pagination_next_url_present(self):
        """When total > page_size, 'next' URL is not null."""
        for i in range(5):
            self._insert_book(title=f"Paginated Book {i}", source_id=f"pg{i}")
        resp = self.client.get("/api/books/?page=1&page_size=2")
        data = resp.json()
        self.assertIsNotNone(data["next"])

    @patch("discovery.services._PROVIDERS", [])
    def test_pagination_previous_null_on_first_page(self):
        """First page has null 'previous'."""
        resp = self.client.get("/api/books/?page=1")
        data = resp.json()
        self.assertIsNone(data["previous"])

    @patch("discovery.services._PROVIDERS", [])
    def test_community_placeholder_values(self):
        """Community rating is null and review_count is 0 (not yet implemented)."""
        book_id = self._insert_book(source_id="comm1")
        resp = self.client.get(f"/api/books/{book_id}/")
        data = resp.json()
        self.assertIsNone(data["community"]["average_rating"])
        self.assertEqual(data["community"]["rating_count"], 0)

    @patch("discovery.services._PROVIDERS", [])
    def test_store_placeholder_values(self):
        """Store available is False and product_id is null (not yet implemented)."""
        book_id = self._insert_book(source_id="store1")
        resp = self.client.get(f"/api/books/{book_id}/")
        data = resp.json()
        self.assertFalse(data["store"]["available"])
        self.assertIsNone(data["store"]["product_id"])


class BookListAPIMongoUnavailableTests(TestCase):
    """Test MongoDB unavailability error handling."""

    @patch("discovery.services.repository.search_books")
    def test_list_returns_503_when_mongodb_unavailable(self, mock_search):
        """MongoDB unavailable returns 503, not 500."""
        mock_search.side_effect = MongoDBUnavailableError("MongoDB is down")
        resp = self.client.get("/api/books/")
        self.assertEqual(resp.status_code, 503)

    @patch("discovery.services.repository.get_book_by_id")
    def test_detail_returns_503_when_mongodb_unavailable(self, mock_get):
        """MongoDB unavailable on detail returns 503."""
        from bson import ObjectId
        mock_get.side_effect = MongoDBUnavailableError("MongoDB is down")
        resp = self.client.get(f"/api/books/{str(ObjectId())}/")
        self.assertEqual(resp.status_code, 503)
