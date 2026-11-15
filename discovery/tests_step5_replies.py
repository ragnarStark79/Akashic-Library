"""
Step 5B.1.1 Tests — Review Lifecycle, Editing, Deletion, and Reader Replies.

Covers:
  - GET /api/books/<book_id>/my-review/ (own-review retrieval)
  - PATCH /api/books/<book_id>/reviews/<review_id>/ & /update/ (review editing)
  - DELETE /api/books/<book_id>/reviews/<review_id>/ & /delete/ (review deletion & cascading replies)
  - GET /api/books/<book_id>/reviews/<review_id>/replies/ (reply listing)
  - POST /api/books/<book_id>/reviews/<review_id>/replies/ (reply creation)
  - DELETE /api/books/<book_id>/reviews/<review_id>/replies/<reply_id>/delete/ (reply deletion)
  - Ownership & authorization checks (401, 403, 404)
  - Aggregate rating recalculation upon review deletion
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import patch

import mongomock
from bson import ObjectId
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class MongoMockMixin:
    """Patches get_db() with a mongomock in-memory database."""

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
        for p in reversed(cls._patchers):
            p.stop()
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.mock_db = self._mongo_client["test_db"]
        self.mock_db["books"].drop()
        self.mock_db["reviews"].drop()
        self.mock_db["review_replies"].drop()


def _make_user(username: str) -> User:
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="TestPass123!",
        display_name=f"Reader {username.capitalize()}",
    )


def _seed_book(db, book_id: str | None = None) -> str:
    oid = ObjectId(book_id) if book_id else ObjectId()
    db["books"].insert_one({
        "_id": oid,
        "title": "Ficciones",
        "authors": ["Jorge Luis Borges"],
        "publication_year": 1944,
        "description": "A collection of labyrinthine tales.",
        "cover_url": "https://example.com/cover.jpg",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    })
    return str(oid)


class ReviewLifecycleTests(MongoMockMixin, TestCase):
    """Tests for my-review, review editing, review deletion, and cascading."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user_a = _make_user("alice")
        self.user_b = _make_user("bob")
        self.book_id = _seed_book(self.mock_db)

    def test_my_review_unauthenticated_rejected(self):
        url = f"/api/books/{self.book_id}/my-review/"
        res = self.client.get(url)
        self.assertIn(res.status_code, (401, 403))

    def test_my_review_nonexistent_returns_404(self):
        self.client.force_authenticate(user=self.user_a)
        url = f"/api/books/{self.book_id}/my-review/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 404)
        self.assertIn("No review found", res.data["detail"])

    def test_my_review_authenticated_returns_review(self):
        self.client.force_authenticate(user=self.user_a)
        # Create review
        post_url = f"/api/books/{self.book_id}/reviews/"
        create_res = self.client.post(post_url, {
            "rating": 5,
            "title": "A Masterpiece",
            "body": "Essential reading for modernists.",
            "contains_spoiler": False,
        }, format="json")
        self.assertEqual(create_res.status_code, 201)
        review_id = create_res.data["id"]

        # Fetch my-review
        my_url = f"/api/books/{self.book_id}/my-review/"
        res = self.client.get(my_url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], review_id)
        self.assertEqual(res.data["rating"], 5)
        self.assertEqual(res.data["title"], "A Masterpiece")
        self.assertEqual(res.data["author"]["username"], "alice")

        # User B should still get 404
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.get(my_url)
        self.assertEqual(res_b.status_code, 404)

    def test_edit_own_review_updates_in_place(self):
        self.client.force_authenticate(user=self.user_a)
        create_res = self.client.post(f"/api/books/{self.book_id}/reviews/", {
            "rating": 4,
            "title": "Original Headline",
            "body": "Original thought.",
        }, format="json")
        review_id = create_res.data["id"]

        # Update via /reviews/<id>/update/
        patch_res = self.client.patch(f"/api/books/{self.book_id}/reviews/{review_id}/update/", {
            "rating": 5,
            "title": "Revised Masterwork",
            "body": "Dramatically updated philosophical interpretation.",
            "contains_spoiler": True,
        }, format="json")
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data["id"], review_id)
        self.assertEqual(patch_res.data["rating"], 5)
        self.assertEqual(patch_res.data["title"], "Revised Masterwork")
        self.assertEqual(patch_res.data["body"], "Dramatically updated philosophical interpretation.")
        self.assertTrue(patch_res.data["contains_spoiler"])

        # Also verify alias endpoint /reviews/<id>/
        patch_alias_res = self.client.patch(f"/api/books/{self.book_id}/reviews/{review_id}/", {
            "title": "Final Headline",
        }, format="json")
        self.assertEqual(patch_alias_res.status_code, 200)
        self.assertEqual(patch_alias_res.data["title"], "Final Headline")

    def test_edit_other_user_review_forbidden(self):
        self.client.force_authenticate(user=self.user_a)
        create_res = self.client.post(f"/api/books/{self.book_id}/reviews/", {
            "rating": 4,
            "body": "Alice review.",
        }, format="json")
        review_id = create_res.data["id"]

        # User B attempts to edit Alice's review
        self.client.force_authenticate(user=self.user_b)
        patch_res = self.client.patch(f"/api/books/{self.book_id}/reviews/{review_id}/update/", {
            "rating": 1,
            "body": "Hacked review body.",
        }, format="json")
        self.assertEqual(patch_res.status_code, 403)

    def test_delete_own_review_and_cascade_replies(self):
        self.client.force_authenticate(user=self.user_a)
        create_res = self.client.post(f"/api/books/{self.book_id}/reviews/", {
            "rating": 5,
            "body": "Alice foundational review.",
        }, format="json")
        review_id = create_res.data["id"]

        # User B adds a reply to Alice's review
        self.client.force_authenticate(user=self.user_b)
        rep_res = self.client.post(f"/api/books/{self.book_id}/reviews/{review_id}/replies/", {
            "body": "I completely agree with this analysis.",
        }, format="json")
        self.assertEqual(rep_res.status_code, 201)

        # Confirm 1 reply exists
        replies_url = f"/api/books/{self.book_id}/reviews/{review_id}/replies/"
        rep_list = self.client.get(replies_url)
        self.assertEqual(len(rep_list.data), 1)

        # Alice deletes her own review
        self.client.force_authenticate(user=self.user_a)
        del_res = self.client.delete(f"/api/books/{self.book_id}/reviews/{review_id}/delete/")
        self.assertEqual(del_res.status_code, 204)

        # Review no longer exists
        self.assertEqual(self.client.get(f"/api/books/{self.book_id}/my-review/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/books/{self.book_id}/reviews/{review_id}/").status_code, 404)

        # Child replies were cascaded and are gone
        self.assertEqual(self.mock_db["review_replies"].count_documents({"review_id": review_id}), 0)

        # Rating aggregate reflects 0 reviews
        rating_res = self.client.get(f"/api/books/{self.book_id}/rating/")
        self.assertEqual(rating_res.data["rating_count"], 0)
        self.assertIsNone(rating_res.data["average_rating"])

    def test_delete_other_user_review_forbidden(self):
        self.client.force_authenticate(user=self.user_a)
        create_res = self.client.post(f"/api/books/{self.book_id}/reviews/", {
            "rating": 4,
            "body": "Alice review.",
        }, format="json")
        review_id = create_res.data["id"]

        # User B attempts to delete Alice's review
        self.client.force_authenticate(user=self.user_b)
        del_res = self.client.delete(f"/api/books/{self.book_id}/reviews/{review_id}/delete/")
        self.assertEqual(del_res.status_code, 403)
        self.assertEqual(self.mock_db["reviews"].count_documents({"_id": ObjectId(review_id)}), 1)


class ReviewReplyTests(MongoMockMixin, TestCase):
    """Tests for creating, listing, and deleting review replies."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user_a = _make_user("alice")
        self.user_b = _make_user("bob")
        self.user_c = _make_user("charlie")
        self.book_id = _seed_book(self.mock_db)

        # Create a parent review by Alice
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post(f"/api/books/{self.book_id}/reviews/", {
            "rating": 5,
            "title": "Borges' Paradoxes",
            "body": "Infinite labyrinths and mirrors.",
        }, format="json")
        self.review_id = res.data["id"]

    def test_reply_unauthenticated_rejected(self):
        self.client.logout()
        res = self.client.post(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/", {
            "body": "Anonymous reply attempt.",
        }, format="json")
        self.assertIn(res.status_code, (401, 403))

    def test_reply_blank_body_rejected(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.post(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/", {
            "body": "   ",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("body", res.data)

    def test_reply_nonexistent_review_rejected(self):
        self.client.force_authenticate(user=self.user_b)
        fake_id = str(ObjectId())
        res = self.client.post(f"/api/books/{self.book_id}/reviews/{fake_id}/replies/", {
            "body": "Reply to ghost review.",
        }, format="json")
        self.assertEqual(res.status_code, 404)

    def test_reply_creation_and_listing(self):
        # Bob replies
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.post(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/", {
            "body": "A magnificent insight into the Library of Babel.",
        }, format="json")
        self.assertEqual(res_b.status_code, 201)
        self.assertEqual(res_b.data["author"]["username"], "bob")
        self.assertEqual(res_b.data["author"]["display_name"], "Reader Bob")
        self.assertEqual(res_b.data["review_id"], self.review_id)
        reply_b_id = res_b.data["id"]

        # Charlie replies
        self.client.force_authenticate(user=self.user_c)
        res_c = self.client.post(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/", {
            "body": "Also consider Tlon, Uqbar, Orbis Tertius.",
        }, format="json")
        self.assertEqual(res_c.status_code, 201)
        self.assertEqual(res_c.data["author"]["username"], "charlie")
        reply_c_id = res_c.data["id"]

        # Public user lists replies
        self.client.logout()
        list_res = self.client.get(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/")
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.data), 2)
        self.assertEqual(list_res.data[0]["id"], reply_b_id)
        self.assertEqual(list_res.data[1]["id"], reply_c_id)

        # Check review detail contains reply_count == 2
        rev_detail = self.client.get(f"/api/books/{self.book_id}/reviews/{self.review_id}/")
        self.assertEqual(rev_detail.status_code, 200)
        self.assertEqual(rev_detail.data["reply_count"], 2)

    def test_reply_deletion_by_author(self):
        # Bob replies
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.post(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/", {
            "body": "Temporary reflection.",
        }, format="json")
        reply_id = res_b.data["id"]

        # Bob deletes his reply
        del_res = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/{reply_id}/delete/"
        )
        self.assertEqual(del_res.status_code, 204)

        # Reply is gone
        list_res = self.client.get(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/")
        self.assertEqual(len(list_res.data), 0)

        # Parent review is intact
        parent_res = self.client.get(f"/api/books/{self.book_id}/reviews/{self.review_id}/")
        self.assertEqual(parent_res.status_code, 200)
        self.assertEqual(parent_res.data["reply_count"], 0)

    def test_reply_deletion_unauthorized_rejected(self):
        # Bob replies
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.post(f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/", {
            "body": "Bob's genuine comment.",
        }, format="json")
        reply_id = res_b.data["id"]

        # Alice (review owner, but not reply author) tries to delete Bob's reply
        self.client.force_authenticate(user=self.user_a)
        del_res = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/{reply_id}/delete/"
        )
        self.assertEqual(del_res.status_code, 403)
        self.assertIn("own replies", del_res.data["detail"])

        # Anonymous tries to delete
        self.client.logout()
        anon_res = self.client.delete(
            f"/api/books/{self.book_id}/reviews/{self.review_id}/replies/{reply_id}/delete/"
        )
        self.assertIn(anon_res.status_code, (401, 403))
