"""
Step 4 tests — Book Import, Favorites, and Reading Shelves.

Run with:
  python manage.py test discovery.tests_step4 --settings=Akashic_Library.test_settings

Strategy:
  - MongoDB: mongomock patches discovery.repository.get_db and
    discovery.library_repository.get_db for in-memory test isolation.
  - Provider HTTP calls: mocked via unittest.mock.patch.
  - PostgreSQL: in-memory SQLite via test_settings.
  - Each test class gets its own fresh mongomock DB in setUp().
  - user_id is always taken from request.user, never from request body.
"""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from discovery.exceptions import (
    BookNotFoundError,
    LibraryEntryExistsError,
    MongoDBUnavailableError,
    ProviderError,
)
from discovery.models import NormalizedBook

User = get_user_model()


# ─── Shared fixtures ──────────────────────────────────────────────────────────

GOOGLE_VOLUME_ITEM = {
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
        },
    },
}

OL_WORK_ITEM = {
    "key": "/works/OL1820770W",
    "title": "Refactoring",
    "description": {"type": "/type/text", "value": "Classic refactoring guide."},
    "subjects": ["Software engineering"],
    "covers": [],
}


def _make_normalized_book(**kwargs):
    defaults = dict(
        title="Test Book",
        authors=["Test Author"],
        isbn13="9780000000001",
        source_name="google_books",
        source_id="test_vol_id",
    )
    defaults.update(kwargs)
    return NormalizedBook(**defaults)


def _make_mongomock_db():
    import mongomock
    return mongomock.MongoClient()["test_step4"]


# ─── Mixin: patch both repositories with mongomock ────────────────────────────

class MongoMockMixin:
    """Patches discovery.repository.get_db and discovery.library_repository.get_db
    to use the same in-memory mongomock database for the duration of each test."""

    def setUp(self):
        try:
            self._mock_db = _make_mongomock_db()
        except ImportError:
            self.skipTest("mongomock not installed")
        self._repo_patcher = patch("discovery.repository.get_db", return_value=self._mock_db)
        self._lib_patcher = patch("discovery.library_repository.get_db", return_value=self._mock_db)
        self._repo_patcher.start()
        self._lib_patcher.start()

    def tearDown(self):
        self._repo_patcher.stop()
        self._lib_patcher.stop()

    def _insert_book(self, **kwargs):
        """Insert a test book into the mock catalog and return its ID."""
        from discovery import repository
        book = _make_normalized_book(**kwargs)
        return repository.upsert_book(book)

    def _create_user(self, username="testuser", password="TestPass123!"):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password=password,
        )


# ─── 1. Book import — service layer ──────────────────────────────────────────


class BookImportServiceTests(MongoMockMixin, TestCase):
    """Tests 1-8: Book import service behavior."""

    def test_import_google_books_record(self):
        """Test 1 — Import a Google Books record via service."""
        from discovery.services import BookImportService
        from discovery.providers.google_books import GoogleBooksProvider
        mock_book = _make_normalized_book(
            title="Clean Code", isbn13="9780132350884", source_id="gB_xwAEACAAJ"
        )
        with patch.object(GoogleBooksProvider, "get_by_id", return_value=mock_book):
            result = BookImportService.import_from_provider("google_books", "gB_xwAEACAAJ")
        self.assertEqual(result["title"], "Clean Code")
        self.assertIn("id", result)

    def test_import_open_library_record(self):
        """Test 2 — Import an Open Library record via service."""
        from discovery.services import BookImportService
        from discovery.providers.open_library import OpenLibraryProvider
        mock_book = _make_normalized_book(
            title="Refactoring", isbn13="9780201485677",
            source_name="open_library", source_id="OL1820770W",
        )
        with patch.object(OpenLibraryProvider, "get_by_id", return_value=mock_book):
            result = BookImportService.import_from_provider("open_library", "OL1820770W")
        self.assertEqual(result["title"], "Refactoring")

    def test_invalid_provider_rejected(self):
        """Test 3 — Unknown provider raises InvalidQueryError."""
        from discovery.services import BookImportService
        from discovery.exceptions import InvalidQueryError
        with self.assertRaises(InvalidQueryError):
            BookImportService.import_from_provider("bad_provider", "some_id")

    def test_empty_provider_rejected(self):
        """Test 3b — Empty provider string raises InvalidQueryError."""
        from discovery.services import BookImportService
        from discovery.exceptions import InvalidQueryError
        with self.assertRaises(InvalidQueryError):
            BookImportService.import_from_provider("", "some_id")

    def test_empty_external_id_rejected(self):
        """Test 4 — Empty external_id raises InvalidQueryError."""
        from discovery.services import BookImportService
        from discovery.exceptions import InvalidQueryError
        with self.assertRaises(InvalidQueryError):
            BookImportService.import_from_provider("google_books", "")

    def test_provider_failure_raises_provider_error(self):
        """Test 5 — Provider HTTP failure is propagated as ProviderError."""
        from discovery.services import BookImportService
        from discovery.providers.google_books import GoogleBooksProvider
        with patch.object(GoogleBooksProvider, "get_by_id",
                          side_effect=ProviderError("API down")):
            with self.assertRaises(ProviderError):
                BookImportService.import_from_provider("google_books", "vol123")

    def test_existing_local_description_preserved(self):
        """Test 6 — Import does NOT overwrite existing description with null."""
        from discovery import repository
        from discovery.services import BookImportService
        from discovery.providers.google_books import GoogleBooksProvider

        # Insert book with a rich local description.
        book = _make_normalized_book(
            title="Existing Book",
            isbn13="9780000000099",
            source_id="existing_vol",
        )
        book.description = "Rich local description."
        book_id = repository.upsert_book(book)

        # Provider returns same ISBN but null description.
        sparse_book = _make_normalized_book(
            title="Existing Book",
            isbn13="9780000000099",
            source_id="existing_vol",
        )
        sparse_book.description = None  # Provider has no description.

        with patch.object(GoogleBooksProvider, "get_by_id", return_value=sparse_book):
            result = BookImportService.import_from_provider("google_books", "existing_vol")

        # Description must still be the original value.
        self.assertEqual(result.get("description"), "Rich local description.")

    def test_duplicate_import_does_not_create_duplicate(self):
        """Test 7 — Importing the same ISBN-13 twice uses one document."""
        from discovery import repository
        from discovery.services import BookImportService
        from discovery.providers.google_books import GoogleBooksProvider

        book = _make_normalized_book(isbn13="9780132350884", source_id="gB_xwAEACAAJ")
        with patch.object(GoogleBooksProvider, "get_by_id", return_value=book):
            id1 = BookImportService.import_from_provider("google_books", "gB_xwAEACAAJ")["id"]
        with patch.object(GoogleBooksProvider, "get_by_id", return_value=book):
            id2 = BookImportService.import_from_provider("google_books", "gB_xwAEACAAJ")["id"]

        self.assertEqual(id1, id2)
        col = self._mock_db["books"]
        self.assertEqual(col.count_documents({"identifiers.isbn13": "9780132350884"}), 1)

    def test_source_id_and_sync_timestamp_set(self):
        """Test 8 — Import records the provider source ID and sync timestamp."""
        from discovery import repository
        from discovery.services import BookImportService
        from discovery.providers.google_books import GoogleBooksProvider

        book = _make_normalized_book(isbn13="9780111111111", source_id="vol_sync_test")
        with patch.object(GoogleBooksProvider, "get_by_id", return_value=book):
            result = BookImportService.import_from_provider("google_books", "vol_sync_test")

        raw = self._mock_db["books"].find_one({"_id": __import__("bson").ObjectId(result["id"])})
        self.assertIn("google_books", raw.get("sources", {}))
        self.assertIn("last_synced", raw["sources"]["google_books"])


# ─── 2. Book import — API layer ───────────────────────────────────────────────


class BookImportAPITests(MongoMockMixin, TestCase):
    """Book import endpoint — /api/books/import/"""

    def setUp(self):
        super().setUp()
        self.user = self._create_user()
        self.client.force_login(self.user)

    def test_import_valid_book_returns_201(self):
        """Test 1 (API) — POST /api/books/import/ returns 201 with book detail."""
        from discovery.services import BookImportService
        mock_book_doc = {
            "id": "aaaaaaaaaaaaaaaaaaaaaaaa",
            "title": "Clean Code",
            "authors": [{"name": "Robert C. Martin"}],
            "description": "A handbook.",
            "identifiers": {"isbn10": None, "isbn13": "9780132350884"},
            "publication": {"publisher": None, "published_date": None, "language": None, "page_count": None},
            "subjects": [],
            "covers": [],
        }
        with patch.object(BookImportService, "import_from_provider", return_value=mock_book_doc):
            resp = self.client.post(
                "/api/books/import/",
                {"provider": "google_books", "external_id": "gB_xwAEACAAJ"},
                content_type="application/json",
            )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["title"], "Clean Code")

    def test_unauthenticated_import_rejected(self):
        """Test — Unauthenticated POST /api/books/import/ returns 403."""
        self.client.logout()
        resp = self.client.post(
            "/api/books/import/",
            {"provider": "google_books", "external_id": "abc"},
            content_type="application/json",
        )
        self.assertIn(resp.status_code, [401, 403])

    def test_invalid_provider_returns_400(self):
        """Test — Invalid provider name returns 400."""
        resp = self.client.post(
            "/api/books/import/",
            {"provider": "nonexistent", "external_id": "abc"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_missing_external_id_returns_400(self):
        """Test — Missing external_id returns 400."""
        resp = self.client.post(
            "/api/books/import/",
            {"provider": "google_books"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_provider_not_found_returns_404(self):
        """Test — Provider returns nothing → 404."""
        from discovery.services import BookImportService
        with patch.object(BookImportService, "import_from_provider",
                          side_effect=BookNotFoundError("Not found")):
            resp = self.client.post(
                "/api/books/import/",
                {"provider": "google_books", "external_id": "missing_id"},
                content_type="application/json",
            )
        self.assertEqual(resp.status_code, 404)

    def test_provider_failure_returns_502(self):
        """Test — Provider HTTP error returns 502."""
        from discovery.services import BookImportService
        with patch.object(BookImportService, "import_from_provider",
                          side_effect=ProviderError("API down")):
            resp = self.client.post(
                "/api/books/import/",
                {"provider": "google_books", "external_id": "vol123"},
                content_type="application/json",
            )
        self.assertEqual(resp.status_code, 502)


# ─── 3. Book detail — existing behavior preserved ─────────────────────────────


class BookDetailStep4Tests(MongoMockMixin, TestCase):
    """Tests 9-11: Book detail API still works correctly."""

    def test_existing_book_detail_still_works(self):
        """Test 9 — GET /api/books/<id>/ returns 200."""
        book_id = self._insert_book(title="Detail Test Book", isbn13="9780111222333")
        resp = self.client.get(f"/api/books/{book_id}/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["title"], "Detail Test Book")

    def test_nonexistent_book_returns_404(self):
        """Test 10 — Non-existent book returns 404."""
        from bson import ObjectId
        resp = self.client.get(f"/api/books/{str(ObjectId())}/")
        self.assertEqual(resp.status_code, 404)

    def test_community_store_placeholders_correct(self):
        """Test 11 — community/store fields are safe placeholders."""
        book_id = self._insert_book(isbn13="9780999888777")
        resp = self.client.get(f"/api/books/{book_id}/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("community", data)
        self.assertIn("store", data)
        self.assertIsNone(data["community"]["average_rating"])
        self.assertEqual(data["community"]["rating_count"], 0)
        self.assertFalse(data["store"]["available"])
        self.assertIsNone(data["store"]["product_id"])

    def test_detail_has_required_fields(self):
        """Detail response contains all spec'd fields."""
        book_id = self._insert_book(isbn13="9780555444333")
        resp = self.client.get(f"/api/books/{book_id}/")
        data = resp.json()
        for field in ("id", "title", "authors", "description", "identifiers",
                      "publication", "subjects", "community", "store"):
            self.assertIn(field, data, f"Missing field: {field}")


# ─── 4. Favorites ─────────────────────────────────────────────────────────────


class FavoriteTests(MongoMockMixin, TestCase):
    """Tests 12-18: Favorites behavior."""

    def setUp(self):
        super().setUp()
        self.user = self._create_user("favuser")
        self.other_user = self._create_user("otheruser")
        self.book_id = self._insert_book(isbn13="9780000001001", title="Fav Book")

    def test_authenticated_user_can_favorite(self):
        """Test 12 — Authenticated user can favorite a book."""
        self.client.force_login(self.user)
        resp = self.client.post(f"/api/library/{self.book_id}/favorite/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["book_id"], self.book_id)

    def test_duplicate_favorite_returns_200(self):
        """Test 13 — Favoriting twice is idempotent (returns 200 both times)."""
        self.client.force_login(self.user)
        r1 = self.client.post(f"/api/library/{self.book_id}/favorite/")
        r2 = self.client.post(f"/api/library/{self.book_id}/favorite/")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)

    def test_user_can_remove_favorite(self):
        """Test 14 — User can unfavorite a book."""
        self.client.force_login(self.user)
        self.client.post(f"/api/library/{self.book_id}/favorite/")
        resp = self.client.delete(f"/api/library/{self.book_id}/unfavorite/")
        self.assertEqual(resp.status_code, 204)

    def test_unfavorite_nonexistent_is_idempotent(self):
        """Test 14b — Deleting a non-existent favorite returns 204 (not error)."""
        self.client.force_login(self.user)
        resp = self.client.delete(f"/api/library/{self.book_id}/unfavorite/")
        self.assertEqual(resp.status_code, 204)

    def test_unauthenticated_favorite_rejected(self):
        """Test 16 — Unauthenticated POST returns 403."""
        resp = self.client.post(f"/api/library/{self.book_id}/favorite/")
        self.assertIn(resp.status_code, [401, 403])

    def test_user_cannot_modify_another_users_favorites(self):
        """Test 17 — Users can only see their own favorites (isolation)."""
        from discovery.library_repository import add_favorite, is_favorited
        uid1 = str(self.user.id)
        uid2 = str(self.other_user.id)
        add_favorite(uid1, self.book_id)
        # other user has NOT favorited this book
        self.assertFalse(is_favorited(uid2, self.book_id))
        self.assertTrue(is_favorited(uid1, self.book_id))

    def test_unknown_book_cannot_be_favorited(self):
        """Test 18 — Favoriting an unknown book_id returns 404."""
        from bson import ObjectId
        fake_id = str(ObjectId())
        self.client.force_login(self.user)
        resp = self.client.post(f"/api/library/{fake_id}/favorite/")
        self.assertEqual(resp.status_code, 404)

    def test_favorite_invalid_book_id_returns_404(self):
        """Test 18b — Favoriting an invalid (non-ObjectId) book_id returns 404."""
        self.client.force_login(self.user)
        resp = self.client.post("/api/library/not-a-valid-id/favorite/")
        self.assertEqual(resp.status_code, 404)


# ─── 5. Reading shelves ───────────────────────────────────────────────────────


class ShelfTests(MongoMockMixin, TestCase):
    """Tests 19-26: Reading shelves behavior."""

    def setUp(self):
        super().setUp()
        self.user = self._create_user("shelfuser")
        self.other_user = self._create_user("shelfother")
        self.book_id = self._insert_book(isbn13="9780000002001", title="Shelf Book")

    def test_authenticated_user_can_add_to_shelf(self):
        """Test 19 — Authenticated user can add a book to their shelf."""
        self.client.force_login(self.user)
        resp = self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "WANT_TO_READ"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["status"], "WANT_TO_READ")
        self.assertEqual(data["book_id"], self.book_id)

    def test_valid_shelf_statuses_accepted(self):
        """Test 20 — All valid statuses are accepted."""
        for i, status_val in enumerate(["WANT_TO_READ", "READING", "READ"]):
            book_id = self._insert_book(isbn13=f"978000000300{i}", title=f"Book {i}")
            self.client.force_login(self.user)
            resp = self.client.post(
                f"/api/library/{book_id}/add/",
                {"status": status_val},
                content_type="application/json",
            )
            self.assertEqual(resp.status_code, 201, f"Status {status_val!r} should be accepted")

    def test_invalid_shelf_status_rejected(self):
        """Test 21 — Invalid shelf status returns 400."""
        self.client.force_login(self.user)
        resp = self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "MAYBE_LATER"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_user_can_change_shelf_status(self):
        """Test 22 — User can update reading status with PATCH."""
        self.client.force_login(self.user)
        self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "WANT_TO_READ"},
            content_type="application/json",
        )
        resp = self.client.patch(
            f"/api/library/{self.book_id}/update/",
            {"status": "READING"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "READING")

    def test_user_can_remove_library_entry(self):
        """Test 23 — DELETE /api/library/<id>/remove/ returns 204."""
        self.client.force_login(self.user)
        self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "READING"},
            content_type="application/json",
        )
        resp = self.client.delete(f"/api/library/{self.book_id}/remove/")
        self.assertEqual(resp.status_code, 204)

    def test_unauthenticated_shelf_operation_rejected(self):
        """Test 24 — Unauthenticated POST to library returns 403."""
        resp = self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "READING"},
            content_type="application/json",
        )
        self.assertIn(resp.status_code, [401, 403])

    def test_unknown_book_cannot_be_shelved(self):
        """Test 25 — Shelving an unknown book returns 404."""
        from bson import ObjectId
        fake_id = str(ObjectId())
        self.client.force_login(self.user)
        resp = self.client.post(
            f"/api/library/{fake_id}/add/",
            {"status": "WANT_TO_READ"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_user_cannot_modify_another_users_shelf(self):
        """Test 26 — Users cannot see or modify each other's library entries."""
        from discovery.library_repository import get_library_entry, add_library_entry
        uid1 = str(self.user.id)
        uid2 = str(self.other_user.id)
        # User 1 adds the book.
        add_library_entry(uid1, self.book_id, "WANT_TO_READ")
        # User 2 should not see user 1's entry.
        entry = get_library_entry(uid2, self.book_id)
        self.assertIsNone(entry)

    def test_duplicate_shelf_entry_returns_409(self):
        """Adding the same book twice returns 409 Conflict."""
        self.client.force_login(self.user)
        self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "WANT_TO_READ"},
            content_type="application/json",
        )
        resp = self.client.post(
            f"/api/library/{self.book_id}/add/",
            {"status": "READING"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 409)


# ─── 6. Library list ─────────────────────────────────────────────────────────


class LibraryListTests(MongoMockMixin, TestCase):
    """GET /api/library/ — list and pagination."""

    def setUp(self):
        super().setUp()
        self.user = self._create_user("listuser")

    def test_list_requires_authentication(self):
        """Unauthenticated GET /api/library/ returns 403."""
        resp = self.client.get("/api/library/")
        self.assertIn(resp.status_code, [401, 403])

    def test_list_returns_paginated_response(self):
        """GET /api/library/ returns paginated structure."""
        self.client.force_login(self.user)
        resp = self.client.get("/api/library/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertIn("next", data)
        self.assertIn("previous", data)

    def test_list_returns_user_entries_only(self):
        """Library list only contains the authenticated user's entries."""
        from discovery.library_repository import add_library_entry
        uid = str(self.user.id)
        book_id = self._insert_book(isbn13="9780123456789", title="My Book")
        add_library_entry(uid, book_id, "READING")

        other_user = self._create_user("listother")
        other_book_id = self._insert_book(isbn13="9780987654321", title="Other Book")
        add_library_entry(str(other_user.id), other_book_id, "READ")

        self.client.force_login(self.user)
        resp = self.client.get("/api/library/")
        data = resp.json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["book_id"], book_id)

    def test_list_shows_favorited_flag(self):
        """Library entry has favorited=True when book is favorited."""
        from discovery.library_repository import add_library_entry, add_favorite
        uid = str(self.user.id)
        book_id = self._insert_book(isbn13="9780222333444", title="Loved Book")
        add_library_entry(uid, book_id, "READ")
        add_favorite(uid, book_id)

        self.client.force_login(self.user)
        resp = self.client.get("/api/library/")
        data = resp.json()
        self.assertEqual(data["count"], 1)
        self.assertTrue(data["results"][0]["favorited"])

    def test_invalid_page_returns_400(self):
        """Invalid page parameter returns 400."""
        self.client.force_login(self.user)
        resp = self.client.get("/api/library/?page=abc")
        self.assertEqual(resp.status_code, 400)


# ─── 7. Library entry detail ─────────────────────────────────────────────────


class LibraryEntryDetailTests(MongoMockMixin, TestCase):
    """GET /api/library/<book_id>/ — single entry retrieval."""

    def setUp(self):
        super().setUp()
        self.user = self._create_user("detailuser")

    def test_get_existing_entry(self):
        """GET /api/library/<book_id>/ returns 200 with entry."""
        from discovery.library_repository import add_library_entry
        uid = str(self.user.id)
        book_id = self._insert_book(isbn13="9780111000001", title="Detail Book")
        add_library_entry(uid, book_id, "READING")

        self.client.force_login(self.user)
        resp = self.client.get(f"/api/library/{book_id}/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "READING")
        self.assertEqual(data["book_id"], book_id)

    def test_get_nonexistent_entry_returns_404(self):
        """GET /api/library/<book_id>/ returns 404 if book not in library."""
        book_id = self._insert_book(isbn13="9780222000001", title="Not-in-lib Book")
        self.client.force_login(self.user)
        resp = self.client.get(f"/api/library/{book_id}/")
        self.assertEqual(resp.status_code, 404)

    def test_entry_includes_book_snippet(self):
        """Library entry response includes book title and authors."""
        from discovery.library_repository import add_library_entry
        uid = str(self.user.id)
        book_id = self._insert_book(isbn13="9780333000001", title="Snippet Book")
        add_library_entry(uid, book_id, "WANT_TO_READ")

        self.client.force_login(self.user)
        resp = self.client.get(f"/api/library/{book_id}/")
        data = resp.json()
        self.assertIn("book", data)
        self.assertEqual(data["book"]["title"], "Snippet Book")

    def test_entry_shows_favorited_false_when_not_favorited(self):
        """favorited=False when book is not favorited."""
        from discovery.library_repository import add_library_entry
        uid = str(self.user.id)
        book_id = self._insert_book(isbn13="9780444000001", title="Unfaved Book")
        add_library_entry(uid, book_id, "READ")

        self.client.force_login(self.user)
        resp = self.client.get(f"/api/library/{book_id}/")
        self.assertFalse(resp.json()["favorited"])


# ─── 8. PATCH to update status ───────────────────────────────────────────────


class LibraryUpdateTests(MongoMockMixin, TestCase):
    """PATCH /api/library/<book_id>/update/"""

    def setUp(self):
        super().setUp()
        self.user = self._create_user("patchuser")
        self.book_id = self._insert_book(isbn13="9780555000001", title="Patch Book")

    def test_patch_nonexistent_entry_returns_404(self):
        """PATCH on entry not in library returns 404."""
        self.client.force_login(self.user)
        resp = self.client.patch(
            f"/api/library/{self.book_id}/update/",
            {"status": "READ"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_patch_invalid_status_returns_400(self):
        """PATCH with invalid status returns 400."""
        from discovery.library_repository import add_library_entry
        add_library_entry(str(self.user.id), self.book_id, "READING")
        self.client.force_login(self.user)
        resp = self.client.patch(
            f"/api/library/{self.book_id}/update/",
            {"status": "UNKNOWN_STATUS"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_patch_unauthenticated_returns_403(self):
        """PATCH without auth returns 403."""
        resp = self.client.patch(
            f"/api/library/{self.book_id}/update/",
            {"status": "READ"},
            content_type="application/json",
        )
        self.assertIn(resp.status_code, [401, 403])


# ─── 9. Favorites and shelves are independent ─────────────────────────────────


class FavoriteShelfIndependenceTests(MongoMockMixin, TestCase):
    """Favorite and shelf are separate — not linked."""

    def setUp(self):
        super().setUp()
        self.user = self._create_user("indepuser")
        self.book_id = self._insert_book(isbn13="9780666000001", title="Indep Book")

    def test_can_favorite_without_shelf(self):
        """User can favorite a book without adding it to shelf."""
        from discovery.library_repository import add_favorite, get_library_entry, is_favorited
        uid = str(self.user.id)
        add_favorite(uid, self.book_id)
        self.assertTrue(is_favorited(uid, self.book_id))
        self.assertIsNone(get_library_entry(uid, self.book_id))

    def test_can_shelve_without_favoriting(self):
        """User can shelf a book without favoriting it."""
        from discovery.library_repository import add_library_entry, is_favorited
        uid = str(self.user.id)
        add_library_entry(uid, self.book_id, "READING")
        self.assertFalse(is_favorited(uid, self.book_id))

    def test_removing_favorite_does_not_remove_shelf(self):
        """Removing a favorite does not affect the shelf entry."""
        from discovery.library_repository import (
            add_favorite, add_library_entry, remove_favorite, get_library_entry
        )
        uid = str(self.user.id)
        add_library_entry(uid, self.book_id, "READ")
        add_favorite(uid, self.book_id)
        remove_favorite(uid, self.book_id)
        entry = get_library_entry(uid, self.book_id)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["status"], "READ")


# ─── 10. Integration — existing systems still work ────────────────────────────


class IntegrationPreservationTests(MongoMockMixin, TestCase):
    """Tests 27-30: Existing Step 1-3 endpoints still work."""

    def test_health_endpoint_still_works(self):
        """Test 27 — GET /api/health/ still returns 200."""
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)

    def test_accounts_register_still_works(self):
        """Test 28 — POST /api/auth/register/ still works."""
        resp = self.client.post(
            "/api/auth/register/",
            {
                "username": "newreguser",
                "email": "newreg@example.com",
                "password": "SecurePass123!",
                "password2": "SecurePass123!",
            },
            content_type="application/json",
        )
        self.assertIn(resp.status_code, [200, 201])

    def test_book_search_still_works(self):
        """Test 29 — GET /api/books/ still returns paginated response."""
        resp = self.client.get("/api/books/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)

    def test_book_detail_still_works(self):
        """Test 30 — GET /api/books/<id>/ still returns book detail."""
        book_id = self._insert_book(isbn13="9780777000001", title="Integration Book")
        resp = self.client.get(f"/api/books/{book_id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "Integration Book")


# ─── 11. Library repository — unit tests ─────────────────────────────────────


class LibraryRepositoryUnitTests(MongoMockMixin, TestCase):
    """Direct unit tests of library_repository functions."""

    def setUp(self):
        super().setUp()
        self.book_id = self._insert_book(isbn13="9780888000001", title="Repo Unit Book")
        self.uid = "user-uuid-1234"

    def test_add_and_is_favorited(self):
        """add_favorite sets favorited; is_favorited returns True."""
        from discovery.library_repository import add_favorite, is_favorited
        add_favorite(self.uid, self.book_id)
        self.assertTrue(is_favorited(self.uid, self.book_id))

    def test_remove_favorite(self):
        """remove_favorite returns True if deleted."""
        from discovery.library_repository import add_favorite, remove_favorite, is_favorited
        add_favorite(self.uid, self.book_id)
        deleted = remove_favorite(self.uid, self.book_id)
        self.assertTrue(deleted)
        self.assertFalse(is_favorited(self.uid, self.book_id))

    def test_remove_nonexistent_favorite_returns_false(self):
        """remove_favorite returns False if it did not exist."""
        from discovery.library_repository import remove_favorite
        deleted = remove_favorite(self.uid, self.book_id)
        self.assertFalse(deleted)

    def test_list_favorites(self):
        """list_favorites returns book_ids for user."""
        from discovery.library_repository import add_favorite, list_favorites
        book2 = self._insert_book(isbn13="9780888000002", title="Book 2")
        add_favorite(self.uid, self.book_id)
        add_favorite(self.uid, book2)
        favs = list_favorites(self.uid)
        self.assertIn(self.book_id, favs)
        self.assertIn(book2, favs)

    def test_add_library_entry(self):
        """add_library_entry creates entry with correct status."""
        from discovery.library_repository import add_library_entry, get_library_entry
        add_library_entry(self.uid, self.book_id, "WANT_TO_READ")
        entry = get_library_entry(self.uid, self.book_id)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["status"], "WANT_TO_READ")

    def test_add_library_entry_invalid_status_raises(self):
        """add_library_entry with invalid status raises ValueError."""
        from discovery.library_repository import add_library_entry
        with self.assertRaises(ValueError):
            add_library_entry(self.uid, self.book_id, "MAYBE")

    def test_duplicate_library_entry_raises(self):
        """Second add_library_entry with same user/book raises LibraryEntryExistsError."""
        from discovery.library_repository import add_library_entry
        add_library_entry(self.uid, self.book_id, "READING")
        with self.assertRaises(LibraryEntryExistsError):
            add_library_entry(self.uid, self.book_id, "READ")

    def test_update_library_entry(self):
        """update_library_entry changes the status."""
        from discovery.library_repository import add_library_entry, update_library_entry
        add_library_entry(self.uid, self.book_id, "WANT_TO_READ")
        result = update_library_entry(self.uid, self.book_id, "READ")
        self.assertEqual(result["status"], "READ")

    def test_update_nonexistent_entry_returns_none(self):
        """update_library_entry returns None if entry doesn't exist."""
        from discovery.library_repository import update_library_entry
        result = update_library_entry(self.uid, self.book_id, "READ")
        self.assertIsNone(result)

    def test_remove_library_entry(self):
        """remove_library_entry deletes the entry."""
        from discovery.library_repository import add_library_entry, remove_library_entry, get_library_entry
        add_library_entry(self.uid, self.book_id, "READING")
        removed = remove_library_entry(self.uid, self.book_id)
        self.assertTrue(removed)
        self.assertIsNone(get_library_entry(self.uid, self.book_id))

    def test_list_user_library_paginated(self):
        """list_user_library returns paginated structure."""
        from discovery.library_repository import add_library_entry, list_user_library
        add_library_entry(self.uid, self.book_id, "READING")
        result = list_user_library(self.uid, page=1, page_size=10)
        self.assertEqual(result["count"], 1)
        self.assertEqual(len(result["results"]), 1)
        self.assertIn("page", result)


# ─── 12. Import — enrichment safety (repository layer) ───────────────────────


class ImportBookRepositoryTests(MongoMockMixin, TestCase):
    """import_book() enrichment-safe behavior."""

    def test_import_book_sets_sync_timestamp(self):
        """import_book stores last_synced timestamp in sources subdocument."""
        from discovery.repository import import_book
        book = _make_normalized_book(isbn13="9780900000001", source_id="vol_ts")
        book_id = import_book(book)
        raw = self._mock_db["books"].find_one({"_id": __import__("bson").ObjectId(book_id)})
        self.assertIn("last_synced", raw["sources"]["google_books"])

    def test_import_book_does_not_overwrite_null_description(self):
        """import_book preserves existing description when provider returns None."""
        from discovery import repository
        # Insert initial book with description.
        initial = _make_normalized_book(isbn13="9780900000002", source_id="v2")
        initial.description = "Existing description."
        book_id = repository.upsert_book(initial)

        # Import same book with null description.
        sparse = _make_normalized_book(isbn13="9780900000002", source_id="v2")
        sparse.description = None
        repository.import_book(sparse)

        raw = self._mock_db["books"].find_one({"_id": __import__("bson").ObjectId(book_id)})
        self.assertEqual(raw.get("description"), "Existing description.")

    def test_import_book_updates_title_from_provider(self):
        """import_book updates existing title with non-null provider value."""
        from discovery import repository
        initial = _make_normalized_book(isbn13="9780900000003", source_id="v3", title="Old Title")
        repository.upsert_book(initial)

        updated = _make_normalized_book(isbn13="9780900000003", source_id="v3", title="New Title")
        repository.import_book(updated)

        raw = self._mock_db["books"].find_one({"identifiers.isbn13": "9780900000003"})
        self.assertEqual(raw["title"], "New Title")

    def test_book_exists_returns_true(self):
        """book_exists() returns True for existing book."""
        from discovery.repository import book_exists
        book_id = self._insert_book(isbn13="9780900000004")
        self.assertTrue(book_exists(book_id))

    def test_book_exists_returns_false_for_unknown(self):
        """book_exists() returns False for unknown ID."""
        from discovery.repository import book_exists
        from bson import ObjectId
        self.assertFalse(book_exists(str(ObjectId())))

    def test_book_exists_returns_false_for_invalid_id(self):
        """book_exists() returns False for invalid (non-ObjectId) ID."""
        from discovery.repository import book_exists
        self.assertFalse(book_exists("not-an-objectid"))
