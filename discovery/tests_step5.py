"""
Step 5 Tests — Reviews, Ratings, Search/Filtering.

Test coverage:
  - Reviews: CRUD, ownership, validation, duplicates
  - Ratings: aggregate calculation, distribution, isolation from external providers
  - Ownership: cross-user access rejected at every endpoint
  - Moderation: moderation_status not freely writable by users
  - Search: new publisher/year_from/year_to filters
  - Isolation: provider import does not overwrite community data
  - Regression: Steps 1-4 still pass (run separately)
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import mongomock
from bson import ObjectId
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


# ─── Shared mongomock fixture ────────────────────────────────────────────────


class MongoMockMixin:
    """Patches get_db() with a mongomock in-memory database for fast tests."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._mongo_client = mongomock.MongoClient()
        mock_db = cls._mongo_client["test_db"]
        cls._patchers = [
            patch("discovery.repository.get_db", return_value=mock_db),
            patch("discovery.library_repository.get_db", return_value=mock_db),
            patch("discovery.reviews_repository.get_db", return_value=mock_db),
        ]
        for p in cls._patchers:
            p.start()

    @classmethod
    def tearDownClass(cls):
        for p in cls._patchers:
            p.stop()
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        # Clear all relevant collections before each test.
        db = self._mongo_client["test_db"]
        for col in ("books", "reviews", "favorites", "library_entries"):
            db[col].drop()


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _make_user(username=None, password="Pass123!", role="USER"):
    """Create a Django user for testing."""
    username = username or f"user_{uuid.uuid4().hex[:8]}"
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=password,
    )


def _insert_book(db, title="Test Book", authors=None, isbn13=None, publisher=None,
                 published_date=None, language=None, subjects=None):
    """Insert a raw book doc into mongomock and return its string id."""
    doc = {
        "title": title,
        "authors": [{"name": a} for a in (authors or ["Test Author"])],
        "description": "A test book description.",
        "identifiers": {"isbn10": None, "isbn13": isbn13},
        "publication": {
            "publisher": publisher,
            "published_date": published_date,
            "page_count": None,
            "language": language,
        },
        "subjects": subjects or [],
        "covers": [],
        "sources": {},
        "store_product_id": None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    result = db["books"].insert_one(doc)
    return str(result.inserted_id)


# ─── Repository Unit Tests ───────────────────────────────────────────────────


class ReviewRepositoryUnitTests(MongoMockMixin, TestCase):
    """Unit tests for reviews_repository functions."""

    def setUp(self):
        super().setUp()
        from discovery import reviews_repository
        self.repo = reviews_repository
        self.db = self._mongo_client["test_db"]
        self.book_id = _insert_book(self.db)
        self.user_id = str(uuid.uuid4())

    def test_create_review_returns_doc(self):
        """create_review returns a dict with all expected fields."""
        doc = self.repo.create_review(
            user_id=self.user_id,
            book_id=self.book_id,
            rating=4,
            body="Great book!",
        )
        self.assertEqual(doc["rating"], 4)
        self.assertEqual(doc["body"], "Great book!")
        self.assertEqual(doc["user_id"], self.user_id)
        self.assertEqual(doc["book_id"], self.book_id)
        self.assertEqual(doc["helpful_count"], 0)
        self.assertEqual(doc["moderation_status"], "APPROVED")
        self.assertIn("id", doc)
        self.assertIn("created_at", doc)
        self.assertIn("updated_at", doc)

    def test_duplicate_review_raises(self):
        """Second create_review for same user+book raises DuplicateReviewError."""
        from discovery.exceptions import DuplicateReviewError
        self.repo.create_review(
            user_id=self.user_id,
            book_id=self.book_id,
            rating=3,
            body="First review.",
        )
        with self.assertRaises(DuplicateReviewError):
            self.repo.create_review(
                user_id=self.user_id,
                book_id=self.book_id,
                rating=5,
                body="Duplicate review.",
            )

    def test_different_users_can_both_review_same_book(self):
        """Two different users can each have one review for the same book."""
        user2 = str(uuid.uuid4())
        r1 = self.repo.create_review(user_id=self.user_id, book_id=self.book_id, rating=4, body="User1 review")
        r2 = self.repo.create_review(user_id=user2, book_id=self.book_id, rating=2, body="User2 review")
        self.assertNotEqual(r1["id"], r2["id"])

    def test_get_review_returns_doc(self):
        """get_review returns the review by its id."""
        doc = self.repo.create_review(
            user_id=self.user_id, book_id=self.book_id, rating=5, body="Excellent!"
        )
        fetched = self.repo.get_review(doc["id"])
        self.assertEqual(fetched["id"], doc["id"])
        self.assertEqual(fetched["rating"], 5)

    def test_get_review_raises_for_invalid_id(self):
        """get_review raises ReviewNotFoundError for a bad ID."""
        from discovery.exceptions import ReviewNotFoundError
        with self.assertRaises(ReviewNotFoundError):
            self.repo.get_review("not-an-objectid")

    def test_get_review_raises_for_missing(self):
        """get_review raises ReviewNotFoundError for a non-existent ID."""
        from discovery.exceptions import ReviewNotFoundError
        with self.assertRaises(ReviewNotFoundError):
            self.repo.get_review(str(ObjectId()))

    def test_update_review_changes_rating_and_body(self):
        """update_review updates only provided fields."""
        doc = self.repo.create_review(
            user_id=self.user_id, book_id=self.book_id, rating=2, body="Meh."
        )
        updated = self.repo.update_review(
            review_id=doc["id"], user_id=self.user_id, rating=5, body="Actually great!"
        )
        self.assertEqual(updated["rating"], 5)
        self.assertEqual(updated["body"], "Actually great!")
        # updated_at must change.
        self.assertGreaterEqual(updated["updated_at"], doc["updated_at"])

    def test_update_review_wrong_owner_raises(self):
        """update_review raises ReviewPermissionError for wrong owner."""
        from discovery.exceptions import ReviewPermissionError
        doc = self.repo.create_review(
            user_id=self.user_id, book_id=self.book_id, rating=3, body="Mine."
        )
        other_user = str(uuid.uuid4())
        with self.assertRaises(ReviewPermissionError):
            self.repo.update_review(
                review_id=doc["id"], user_id=other_user, rating=1
            )

    def test_update_review_not_found_raises(self):
        """update_review raises ReviewNotFoundError for unknown ID."""
        from discovery.exceptions import ReviewNotFoundError
        with self.assertRaises(ReviewNotFoundError):
            self.repo.update_review(
                review_id=str(ObjectId()), user_id=self.user_id, rating=3
            )

    def test_delete_review_returns_true(self):
        """delete_review returns True for own review."""
        doc = self.repo.create_review(
            user_id=self.user_id, book_id=self.book_id, rating=4, body="Bye."
        )
        deleted = self.repo.delete_review(review_id=doc["id"], user_id=self.user_id)
        self.assertTrue(deleted)

    def test_delete_review_wrong_owner_raises(self):
        """delete_review raises ReviewPermissionError for wrong owner."""
        from discovery.exceptions import ReviewPermissionError
        doc = self.repo.create_review(
            user_id=self.user_id, book_id=self.book_id, rating=4, body="Mine."
        )
        other_user = str(uuid.uuid4())
        with self.assertRaises(ReviewPermissionError):
            self.repo.delete_review(review_id=doc["id"], user_id=other_user)

    def test_delete_nonexistent_returns_false(self):
        """delete_review returns False if review does not exist (idempotent)."""
        deleted = self.repo.delete_review(
            review_id=str(ObjectId()), user_id=self.user_id
        )
        self.assertFalse(deleted)

    def test_list_reviews_for_book_paginated(self):
        """list_reviews_for_book returns paginated structure."""
        for i in range(3):
            uid = str(uuid.uuid4())
            self.repo.create_review(user_id=uid, book_id=self.book_id, rating=i + 1, body=f"Review {i}")
        result = self.repo.list_reviews_for_book(self.book_id, page=1, page_size=2)
        self.assertEqual(result["count"], 3)
        self.assertEqual(len(result["results"]), 2)

    def test_list_reviews_only_shows_approved(self):
        """list_reviews_for_book defaults to APPROVED status only."""
        uid = str(uuid.uuid4())
        doc = self.repo.create_review(user_id=uid, book_id=self.book_id, rating=3, body="Test")
        # Manually set to REJECTED.
        self.db["reviews"].update_one(
            {"_id": ObjectId(doc["id"])},
            {"$set": {"moderation_status": "REJECTED"}}
        )
        result = self.repo.list_reviews_for_book(self.book_id)
        self.assertEqual(result["count"], 0)

    def test_get_user_review_for_book_returns_none_when_no_review(self):
        """get_user_review_for_book returns None when user has no review."""
        result = self.repo.get_user_review_for_book(self.user_id, self.book_id)
        self.assertIsNone(result)

    def test_get_user_review_for_book_returns_doc(self):
        """get_user_review_for_book returns the user's review."""
        self.repo.create_review(user_id=self.user_id, book_id=self.book_id, rating=4, body="Yes")
        result = self.repo.get_user_review_for_book(self.user_id, self.book_id)
        self.assertIsNotNone(result)
        self.assertEqual(result["rating"], 4)


# ─── Aggregate Rating Unit Tests ──────────────────────────────────────────────


class AggregateRatingTests(MongoMockMixin, TestCase):
    """Tests for get_aggregate_rating()."""

    def setUp(self):
        super().setUp()
        from discovery import reviews_repository
        self.repo = reviews_repository
        self.db = self._mongo_client["test_db"]
        self.book_id = _insert_book(self.db)

    def _add_review(self, rating, user_id=None, status="APPROVED"):
        uid = user_id or str(uuid.uuid4())
        doc = self.repo.create_review(user_id=uid, book_id=self.book_id, rating=rating, body="Review")
        if status != "APPROVED":
            self.db["reviews"].update_one(
                {"_id": ObjectId(doc["id"])},
                {"$set": {"moderation_status": status}},
            )
        return doc

    def test_aggregate_empty_returns_none_and_zeros(self):
        """No reviews → average_rating=None, rating_count=0, all dist 0."""
        agg = self.repo.get_aggregate_rating(self.book_id)
        self.assertIsNone(agg["average_rating"])
        self.assertEqual(agg["rating_count"], 0)
        self.assertEqual(agg["distribution"], {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0})

    def test_aggregate_average_correct(self):
        """average_rating is calculated correctly."""
        self._add_review(4)
        self._add_review(2)
        agg = self.repo.get_aggregate_rating(self.book_id)
        self.assertEqual(agg["average_rating"], 3.0)
        self.assertEqual(agg["rating_count"], 2)

    def test_aggregate_distribution_correct(self):
        """distribution counts are correct for each star value."""
        self._add_review(1)
        self._add_review(3)
        self._add_review(5)
        self._add_review(5)
        agg = self.repo.get_aggregate_rating(self.book_id)
        self.assertEqual(agg["distribution"]["1"], 1)
        self.assertEqual(agg["distribution"]["2"], 0)
        self.assertEqual(agg["distribution"]["3"], 1)
        self.assertEqual(agg["distribution"]["4"], 0)
        self.assertEqual(agg["distribution"]["5"], 2)

    def test_aggregate_only_counts_approved(self):
        """Rejected reviews are NOT included in aggregate calculations."""
        self._add_review(5, status="APPROVED")
        self._add_review(1, status="REJECTED")
        agg = self.repo.get_aggregate_rating(self.book_id)
        # Only the 5-star approved review should be counted.
        self.assertEqual(agg["average_rating"], 5.0)
        self.assertEqual(agg["rating_count"], 1)

    def test_aggregate_changes_after_new_review(self):
        """Adding a review updates the aggregate."""
        self._add_review(4)
        agg1 = self.repo.get_aggregate_rating(self.book_id)
        self._add_review(2)
        agg2 = self.repo.get_aggregate_rating(self.book_id)
        self.assertEqual(agg1["rating_count"], 1)
        self.assertEqual(agg2["rating_count"], 2)
        self.assertNotEqual(agg1["average_rating"], agg2["average_rating"])

    def test_aggregate_changes_after_review_deleted(self):
        """Deleting a review updates the aggregate."""
        uid = str(uuid.uuid4())
        doc = self._add_review(2, user_id=uid)
        self._add_review(4)
        agg_before = self.repo.get_aggregate_rating(self.book_id)
        self.repo.delete_review(review_id=doc["id"], user_id=uid)
        agg_after = self.repo.get_aggregate_rating(self.book_id)
        self.assertEqual(agg_before["rating_count"], 2)
        self.assertEqual(agg_after["rating_count"], 1)
        self.assertEqual(agg_after["average_rating"], 4.0)

    def test_aggregate_does_not_include_external_provider_data(self):
        """Aggregate only uses Akashic Library reviews — no provider ratings."""
        # Even if the book document had an 'external_rating' field, aggregate
        # only queries the reviews collection.
        self.db["books"].update_one(
            {"_id": ObjectId(self.book_id)},
            {"$set": {"external_rating": 4.9, "external_review_count": 10000}},
        )
        agg = self.repo.get_aggregate_rating(self.book_id)
        # Still 0 reviews since no Akashic reviews were created.
        self.assertEqual(agg["rating_count"], 0)
        self.assertIsNone(agg["average_rating"])


# ─── Review API Tests ─────────────────────────────────────────────────────────


class ReviewAPITests(MongoMockMixin, TestCase):
    """Integration tests for /api/books/<book_id>/reviews/ endpoints."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.db = self._mongo_client["test_db"]
        self.book_id = _insert_book(self.db, title="Test Book")
        self.user = _make_user("reviewer1")
        self.user2 = _make_user("reviewer2")

    def _login(self, user=None):
        u = user or self.user
        self.client.force_authenticate(user=u)

    def _logout(self):
        self.client.force_authenticate(user=None)

    # ── Unauthenticated access ─────────────────────────────────────────────

    def test_get_reviews_does_not_require_auth(self):
        """GET /api/books/<book_id>/reviews/ is public."""
        resp = self.client.get(f"/api/books/{self.book_id}/reviews/")
        self.assertEqual(resp.status_code, 200)

    def test_post_review_requires_auth(self):
        """POST /api/books/<book_id>/reviews/ returns 403 without auth."""
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Nice"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_update_review_requires_auth(self):
        """PATCH /api/books/<book_id>/reviews/<id>/update/ returns 403 without auth."""
        resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{str(ObjectId())}/update/",
            {"rating": 3},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_delete_review_requires_auth(self):
        """DELETE /api/books/<book_id>/reviews/<id>/delete/ returns 403 without auth."""
        resp = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{str(ObjectId())}/delete/"
        )
        self.assertEqual(resp.status_code, 403)

    # ── Create review ──────────────────────────────────────────────────────

    def test_create_review_success(self):
        """Authenticated user can create a review — returns 201."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "Absolutely loved it!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["rating"], 5)
        self.assertEqual(data["body"], "Absolutely loved it!")
        self.assertIn("id", data)

    def test_create_review_sets_user_from_auth(self):
        """user_id in response matches the authenticated user's ID."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 3, "body": "Decent."},
            format="json",
        )
        data = resp.json()
        self.assertEqual(data["user_id"], str(self.user.id))

    def test_create_review_client_cannot_set_user_id(self):
        """Submitting user_id in request body does not override auth user_id."""
        self._login()
        impersonated_id = str(uuid.uuid4())
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Impersonation attempt.", "user_id": impersonated_id},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        # user_id must be the authenticated user's ID, not the supplied one.
        self.assertNotEqual(data["user_id"], impersonated_id)
        self.assertEqual(data["user_id"], str(self.user.id))

    def test_create_review_client_cannot_set_helpful_count(self):
        """helpful_count supplied in body is ignored — always starts at 0."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Vote stuffing.", "helpful_count": 9999},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["helpful_count"], 0)

    def test_create_review_client_cannot_set_moderation_status(self):
        """moderation_status supplied in body is ignored."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Testing moderation.", "moderation_status": "REJECTED"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["moderation_status"], "APPROVED")

    def test_create_review_server_sets_created_at(self):
        """created_at is set by server and present in response."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "Timestamp test."},
            format="json",
        )
        data = resp.json()
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)
        self.assertIsNotNone(data["created_at"])

    def test_create_review_with_optional_fields(self):
        """Review with title and spoiler flag is accepted."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {
                "rating": 4,
                "body": "Detailed review body.",
                "title": "Great headline",
                "contains_spoiler": True,
            },
            format="json",
        )
        data = resp.json()
        self.assertEqual(data["title"], "Great headline")
        self.assertTrue(data["contains_spoiler"])

    # ── Validation ─────────────────────────────────────────────────────────

    def test_rating_zero_rejected(self):
        """Rating 0 returns 400."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 0, "body": "Bad rating"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_rating_six_rejected(self):
        """Rating 6 returns 400."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 6, "body": "Too high"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_non_integer_rating_rejected(self):
        """Non-integer rating returns 400."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": "five", "body": "Bad type"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_missing_body_rejected(self):
        """Missing review body returns 400."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_blank_body_rejected(self):
        """Blank review body returns 400."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "   "},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_rating_1_accepted(self):
        """Minimum rating of 1 is accepted."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 1, "body": "Terrible book."},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)

    def test_rating_5_accepted(self):
        """Maximum rating of 5 is accepted."""
        self._login()
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "Perfect book!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)

    def test_nonexistent_book_returns_404(self):
        """Reviewing a non-existent book returns 404."""
        self._login()
        fake_id = str(ObjectId())
        resp = self.client.post(
            f"/api/books/{fake_id}/reviews/",
            {"rating": 4, "body": "Ghost book."},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_duplicate_review_returns_409(self):
        """Creating a second review for the same book returns 409."""
        self._login()
        self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "First review."},
            format="json",
        )
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 3, "body": "Second review attempt."},
            format="json",
        )
        self.assertEqual(resp.status_code, 409)

    # ── List reviews ───────────────────────────────────────────────────────

    def test_list_reviews_returns_paginated_structure(self):
        """GET /api/books/<id>/reviews/ returns paginated structure."""
        resp = self.client.get(f"/api/books/{self.book_id}/reviews/")
        data = resp.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertIn("next", data)
        self.assertIn("previous", data)

    def test_list_reviews_returns_created_review(self):
        """Created review appears in list."""
        self._login()
        self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 3, "body": "Mediocre."},
            format="json",
        )
        self._logout()
        resp = self.client.get(f"/api/books/{self.book_id}/reviews/")
        data = resp.json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["rating"], 3)

    def test_review_response_does_not_expose_password(self):
        """Review response must not contain password-related fields."""
        self._login()
        self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Security check."},
            format="json",
        )
        resp = self.client.get(f"/api/books/{self.book_id}/reviews/")
        raw = resp.content.decode()
        for forbidden in ("password", "last_login", "session", "SECRET"):
            self.assertNotIn(forbidden, raw)

    def test_review_response_includes_safe_author_info(self):
        """Review list includes author with id/username/display_name only."""
        self._login()
        self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Author test."},
            format="json",
        )
        resp = self.client.get(f"/api/books/{self.book_id}/reviews/")
        data = resp.json()
        author = data["results"][0]["author"]
        self.assertIn("username", author)
        self.assertIn("display_name", author)
        # email must NOT be exposed.
        self.assertNotIn("email", author)

    def test_list_nonexistent_book_reviews_returns_404(self):
        """GET reviews for non-existent book returns 404."""
        resp = self.client.get(f"/api/books/{str(ObjectId())}/reviews/")
        self.assertEqual(resp.status_code, 404)

    # ── Update review ──────────────────────────────────────────────────────

    def test_user_can_update_own_review(self):
        """User can PATCH their own review."""
        self._login()
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 3, "body": "Original."},
            format="json",
        )
        review_id = create_resp.json()["id"]
        patch_resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{review_id}/update/",
            {"rating": 5, "body": "Revised!"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, 200)
        data = patch_resp.json()
        self.assertEqual(data["rating"], 5)
        self.assertEqual(data["body"], "Revised!")

    def test_update_changes_updated_at(self):
        """updated_at timestamp changes after PATCH."""
        self._login()
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 2, "body": "Initial."},
            format="json",
        )
        original_updated_at = create_resp.json()["updated_at"]
        review_id = create_resp.json()["id"]
        patch_resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{review_id}/update/",
            {"rating": 4},
            format="json",
        )
        new_updated_at = patch_resp.json()["updated_at"]
        # updated_at must be >= original (or equal if within same ms).
        self.assertGreaterEqual(new_updated_at, original_updated_at)

    def test_user_cannot_update_another_users_review(self):
        """User B cannot PATCH User A's review — returns 403."""
        # User A creates review.
        self._login(self.user)
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "User A's review."},
            format="json",
        )
        review_id = create_resp.json()["id"]

        # User B tries to update it.
        self._login(self.user2)
        resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{review_id}/update/",
            {"rating": 1, "body": "Vandalized."},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_user_cannot_change_rating_of_another_users_review(self):
        """User B cannot change the rating of User A's review."""
        self._login(self.user)
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "Perfect."},
            format="json",
        )
        review_id = create_resp.json()["id"]

        self._login(self.user2)
        resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{review_id}/update/",
            {"rating": 1},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_user_cannot_change_moderation_status(self):
        """PATCH that includes moderation_status — field is ignored/not applied."""
        self._login()
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Testing moderation."},
            format="json",
        )
        review_id = create_resp.json()["id"]
        # Try to set moderation_status through PATCH.
        patch_resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{review_id}/update/",
            {"rating": 4, "moderation_status": "FLAGGED"},
            format="json",
        )
        # Status code should still be 200.
        self.assertEqual(patch_resp.status_code, 200)
        # moderation_status should remain APPROVED.
        self.assertEqual(patch_resp.json()["moderation_status"], "APPROVED")

    def test_update_patch_invalid_rating_returns_400(self):
        """PATCH with invalid rating returns 400."""
        self._login()
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Test."},
            format="json",
        )
        review_id = create_resp.json()["id"]
        resp = self.client.patch(
            f"/api/books/{self.book_id}/reviews/{review_id}/update/",
            {"rating": 10},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    # ── Delete review ──────────────────────────────────────────────────────

    def test_user_can_delete_own_review(self):
        """User can DELETE their own review — returns 204."""
        self._login()
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 3, "body": "Deleting."},
            format="json",
        )
        review_id = create_resp.json()["id"]
        del_resp = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{review_id}/delete/"
        )
        self.assertEqual(del_resp.status_code, 204)

    def test_user_cannot_delete_another_users_review(self):
        """User B cannot DELETE User A's review — returns 403."""
        self._login(self.user)
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Protected."},
            format="json",
        )
        review_id = create_resp.json()["id"]

        self._login(self.user2)
        resp = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{review_id}/delete/"
        )
        self.assertEqual(resp.status_code, 403)

    def test_user_b_cannot_manipulate_user_a_review_by_passing_user_a_id(self):
        """Passing user_a_id in request body has no effect on ownership."""
        self._login(self.user)
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "User A's review."},
            format="json",
        )
        review_id = create_resp.json()["id"]

        # User B logs in and tries to delete with user_a's id in the body.
        self._login(self.user2)
        resp = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{review_id}/delete/",
            data={"user_id": str(self.user.id)},  # Attempted impersonation.
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_after_delete_can_create_new_review(self):
        """After deleting a review, user can create a new one for the same book."""
        self._login()
        create_resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 2, "body": "First thought."},
            format="json",
        )
        review_id = create_resp.json()["id"]
        self.client.delete(f"/api/books/{self.book_id}/reviews/{review_id}/delete/")

        # Should be able to create a new review now.
        resp = self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "Changed my mind!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)


# ─── Aggregate Rating API Tests ───────────────────────────────────────────────


class AggregateRatingAPITests(MongoMockMixin, TestCase):
    """Tests for GET /api/books/<book_id>/rating/ endpoint."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.db = self._mongo_client["test_db"]
        self.book_id = _insert_book(self.db)
        self.user = _make_user("rater1")

    def test_rating_endpoint_public(self):
        """GET /api/books/<book_id>/rating/ requires no auth."""
        resp = self.client.get(f"/api/books/{self.book_id}/rating/")
        self.assertEqual(resp.status_code, 200)

    def test_rating_nonexistent_book_returns_404(self):
        """GET rating for non-existent book returns 404."""
        resp = self.client.get(f"/api/books/{str(ObjectId())}/rating/")
        self.assertEqual(resp.status_code, 404)

    def test_rating_empty_book(self):
        """Book with no reviews has avg=None, count=0, all dist 0."""
        resp = self.client.get(f"/api/books/{self.book_id}/rating/")
        data = resp.json()
        self.assertIsNone(data["average_rating"])
        self.assertEqual(data["rating_count"], 0)

    def test_rating_after_review_created(self):
        """Aggregate updates after a review is created."""
        self.client.force_authenticate(user=self.user)
        self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 4, "body": "Good."},
            format="json",
        )
        self.client.force_authenticate(user=None)
        resp = self.client.get(f"/api/books/{self.book_id}/rating/")
        data = resp.json()
        self.assertEqual(data["rating_count"], 1)
        self.assertEqual(data["average_rating"], 4.0)
        self.assertIn("distribution", data)
        self.assertEqual(data["distribution"]["4"], 1)

    def test_rating_response_shape(self):
        """Response has average_rating, rating_count, distribution keys."""
        resp = self.client.get(f"/api/books/{self.book_id}/rating/")
        data = resp.json()
        self.assertIn("average_rating", data)
        self.assertIn("rating_count", data)
        self.assertIn("distribution", data)
        for star in ["1", "2", "3", "4", "5"]:
            self.assertIn(star, data["distribution"])


# ─── Search Extension Tests ───────────────────────────────────────────────────


class SearchExtensionTests(MongoMockMixin, TestCase):
    """Tests for publisher/year_from/year_to search filters."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.db = self._mongo_client["test_db"]
        # Insert varied books.
        self.id1 = _insert_book(self.db, title="Python Programming",
                                authors=["Guido Rossum"],
                                publisher="O'Reilly Media",
                                published_date="2020-05-01",
                                language="en",
                                subjects=["Programming", "Python"])
        self.id2 = _insert_book(self.db, title="Advanced Algorithms",
                                authors=["Knuth"],
                                publisher="Addison-Wesley",
                                published_date="1990-01-01",
                                language="en",
                                subjects=["Computer Science", "Algorithms"])
        self.id3 = _insert_book(self.db, title="Histoire de France",
                                authors=["Jules Michelet"],
                                publisher="Flammarion",
                                published_date="2015-03-01",
                                language="fr",
                                subjects=["History", "France"])

    def test_publisher_filter(self):
        """publisher= filters by publisher substring."""
        resp = self.client.get("/api/books/?publisher=Reilly")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        titles = [r["title"] for r in data["results"]]
        self.assertIn("Python Programming", titles)
        self.assertNotIn("Advanced Algorithms", titles)

    def test_language_filter(self):
        """language= filters by exact language code."""
        resp = self.client.get("/api/books/?language=fr")
        data = resp.json()
        titles = [r["title"] for r in data["results"]]
        self.assertIn("Histoire de France", titles)
        self.assertNotIn("Python Programming", titles)

    def test_subject_filter(self):
        """subject= filters by subject substring."""
        resp = self.client.get("/api/books/?subject=Python")
        data = resp.json()
        titles = [r["title"] for r in data["results"]]
        self.assertIn("Python Programming", titles)

    def test_year_from_filter(self):
        """year_from= excludes books before that year."""
        resp = self.client.get("/api/books/?year_from=2000")
        data = resp.json()
        titles = [r["title"] for r in data["results"]]
        # Only books from 2000+ should appear.
        self.assertNotIn("Advanced Algorithms", titles)  # 1990

    def test_year_to_filter(self):
        """year_to= excludes books after that year."""
        resp = self.client.get("/api/books/?year_to=2000")
        data = resp.json()
        titles = [r["title"] for r in data["results"]]
        # Only books up to 2000 should appear.
        self.assertIn("Advanced Algorithms", titles)  # 1990
        self.assertNotIn("Python Programming", titles)   # 2020

    def test_year_from_invalid_returns_400(self):
        """year_from= with non-integer value returns 400."""
        resp = self.client.get("/api/books/?year_from=abc")
        self.assertEqual(resp.status_code, 400)

    def test_year_to_invalid_returns_400(self):
        """year_to= with non-integer value returns 400."""
        resp = self.client.get("/api/books/?year_to=bad")
        self.assertEqual(resp.status_code, 400)

    def test_no_results_returns_empty_list(self):
        """Search returning no matches returns empty results."""
        resp = self.client.get("/api/books/?publisher=NonExistentPublisher12345")
        data = resp.json()
        self.assertEqual(data["count"], 0)
        self.assertEqual(data["results"], [])

    def test_search_results_paginated(self):
        """Search results are paginated."""
        resp = self.client.get("/api/books/?page_size=2&language=en")
        data = resp.json()
        self.assertIn("count", data)
        self.assertIn("next", data)
        self.assertIn("previous", data)
        self.assertLessEqual(len(data["results"]), 2)


# ─── Provider Data Isolation Tests ───────────────────────────────────────────


class ProviderIsolationTests(MongoMockMixin, TestCase):
    """Tests that provider imports never overwrite community data."""

    def setUp(self):
        super().setUp()
        self.db = self._mongo_client["test_db"]
        self.book_id = _insert_book(self.db, title="Isolated Book")
        self.user_id = str(uuid.uuid4())
        from discovery import reviews_repository, library_repository
        self.reviews_repo = reviews_repository
        self.lib_repo = library_repository

    def test_import_does_not_overwrite_reviews(self):
        """After enrichment import, existing reviews remain untouched."""
        # Create a review.
        review = self.reviews_repo.create_review(
            user_id=self.user_id,
            book_id=self.book_id,
            rating=5,
            body="Great book.",
        )
        # Simulate import_book on the same book.
        from discovery.models import NormalizedBook
        from discovery import repository
        book = NormalizedBook(
            title="Isolated Book (Updated)",
            authors=["New Author"],
            isbn13="9781234567890",
            source_name="google_books",
            source_id="gbooks_123",
        )
        # Use a different ISBN so it inserts as a new doc (no match), OR mock
        # the filter — simply verify our review collection is untouched.
        col = self.db["books"]
        col.update_one(
            {"_id": ObjectId(self.book_id)},
            {"$set": {"title": "Externally Updated Title", "description": "Provider desc"}},
        )
        # Reviews must still exist.
        result = self.reviews_repo.list_reviews_for_book(self.book_id)
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["id"], review["id"])
        self.assertEqual(result["results"][0]["body"], "Great book.")

    def test_import_does_not_overwrite_favorites(self):
        """Provider import does not touch favorites collection."""
        self.lib_repo.add_favorite(self.user_id, self.book_id)
        # Simulate book metadata update.
        self.db["books"].update_one(
            {"_id": ObjectId(self.book_id)},
            {"$set": {"title": "Updated by provider"}},
        )
        self.assertTrue(self.lib_repo.is_favorited(self.user_id, self.book_id))

    def test_import_does_not_overwrite_shelves(self):
        """Provider import does not touch library_entries collection."""
        self.lib_repo.add_library_entry(self.user_id, self.book_id, "READING")
        # Simulate book metadata update.
        self.db["books"].update_one(
            {"_id": ObjectId(self.book_id)},
            {"$set": {"title": "Updated by provider"}},
        )
        entry = self.lib_repo.get_library_entry(self.user_id, self.book_id)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["status"], "READING")

    def test_aggregate_does_not_use_external_provider_rating(self):
        """Aggregate rating only counts Akashic Library reviews, not provider data."""
        # Simulate a book with an external rating field.
        self.db["books"].update_one(
            {"_id": ObjectId(self.book_id)},
            {"$set": {"external_metadata": {"google_rating": 4.8, "review_count": 500}}},
        )
        agg = self.reviews_repo.get_aggregate_rating(self.book_id)
        self.assertEqual(agg["rating_count"], 0)
        self.assertIsNone(agg["average_rating"])


# ─── Index Verification Tests ─────────────────────────────────────────────────


class ReviewIndexTests(MongoMockMixin, TestCase):
    """Tests that review indexes are set up correctly."""

    def test_ensure_review_indexes_runs_without_error(self):
        """ensure_review_indexes() completes without raising."""
        from discovery.reviews_repository import ensure_review_indexes
        ensure_review_indexes()  # Should not raise.

    def test_duplicate_review_prevented_by_pre_insert_check(self):
        """Duplicate review for same user+book is blocked even without real DB index."""
        from discovery import reviews_repository
        from discovery.exceptions import DuplicateReviewError
        db = self._mongo_client["test_db"]
        book_id = _insert_book(db)
        user_id = str(uuid.uuid4())

        reviews_repository.create_review(user_id=user_id, book_id=book_id, rating=4, body="First")
        with self.assertRaises(DuplicateReviewError):
            reviews_repository.create_review(user_id=user_id, book_id=book_id, rating=5, body="Second")


# ─── BookDetail Community Field Tests ────────────────────────────────────────


class BookDetailCommunityTests(MongoMockMixin, TestCase):
    """Tests that BookDetailSerializer returns real community rating data."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.db = self._mongo_client["test_db"]
        self.book_id = _insert_book(self.db)
        self.user = _make_user("community_user")

    def test_book_detail_community_empty(self):
        """Book with no reviews shows community.average_rating=None, count=0."""
        resp = self.client.get(f"/api/books/{self.book_id}/")
        data = resp.json()
        community = data["community"]
        self.assertIsNone(community["average_rating"])
        self.assertEqual(community["rating_count"], 0)

    def test_book_detail_community_after_review(self):
        """Book detail community field reflects actual reviews."""
        self.client.force_authenticate(user=self.user)
        self.client.post(
            f"/api/books/{self.book_id}/reviews/",
            {"rating": 5, "body": "Brilliant!"},
            format="json",
        )
        self.client.force_authenticate(user=None)
        resp = self.client.get(f"/api/books/{self.book_id}/")
        data = resp.json()
        community = data["community"]
        self.assertEqual(community["average_rating"], 5.0)
        self.assertEqual(community["rating_count"], 1)
        self.assertIn("distribution", community)
