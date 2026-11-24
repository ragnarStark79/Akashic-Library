"""
Step 5B.2 Tests — Reading Room, Annotations & Marginalia Persistence.

Covers:
  - POST /api/books/<book_id>/annotations/ (creation, private default, shared)
  - GET /api/books/<book_id>/annotations/ (public shared listing, never leaks private)
  - GET /api/books/<book_id>/my-annotations/ (authenticated owner's notes & tab counts)
  - GET /api/books/<book_id>/annotations/<annotation_id>/ (direct-ID retrieval & privacy isolation)
  - PATCH /api/books/<book_id>/annotations/<annotation_id>/ (update in place & ownership check)
  - DELETE /api/books/<book_id>/annotations/<annotation_id>/ (delete & ownership check)
  - Visibility transitions (Private -> Shared -> Private)
  - Authorization & security checks (401, 403, 404)
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
            patch("discovery.annotations_repository.get_db", return_value=mock_db),
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
        self.mock_db["annotations"].drop()


def _make_user(username: str) -> User:
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="TestPassword123!",
        display_name=f"Reader {username.capitalize()}",
    )


def _seed_book(db, title="Ficciones", authors=None) -> str:
    doc = {
        "title": title,
        "authors": authors or ["Jorge Luis Borges"],
        "cover_url": "https://example.com/cover.jpg",
        "provenance": {"source": "open_library"},
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    res = db["books"].insert_one(doc)
    return str(res.inserted_id)


class AnnotationPersistenceTests(MongoMockMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user_a = _make_user("patron_a")
        self.user_b = _make_user("patron_b")
        self.book_id = _seed_book(self.mock_db)

    # 1. Creation & Default Visibility
    def test_create_annotation_defaults_to_private(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {
                "content": "Solitary thought on labyrinthine bifurcations.",
                "page_reference": "Page 114",
                "chapter_reference": "Chapter 3",
                "passage_excerpt": "The labyrinth is temporal...",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["visibility"], "PRIVATE")
        self.assertEqual(data["content"], "Solitary thought on labyrinthine bifurcations.")
        self.assertEqual(data["page_reference"], "Page 114")
        self.assertEqual(data["chapter_reference"], "Chapter 3")
        self.assertEqual(data["passage_excerpt"], "The labyrinth is temporal...")
        self.assertEqual(data["user_id"], str(self.user_a.id))
        self.assertEqual(data["author"]["username"], "patron_a")

    def test_create_annotation_explicit_shared(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {
                "content": "A shared contemplation for fellow readers.",
                "visibility": "SHARED",
                "page_reference": "Page 42",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["visibility"], "SHARED")

    def test_create_annotation_unauthenticated_rejected(self):
        res = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Anonymous reflection."},
            format="json",
        )
        self.assertIn(res.status_code, (401, 403))

    def test_create_annotation_validation(self):
        self.client.force_authenticate(user=self.user_a)
        # Empty content
        res = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "   "},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        # Non-existent book
        fake_id = str(ObjectId())
        res_fake = self.client.post(
            f"/api/books/{fake_id}/annotations/",
            {"content": "Valid content."},
            format="json",
        )
        self.assertEqual(res_fake.status_code, 404)

    # 2. Public Shared Listing & Privacy Isolation
    def test_public_listing_returns_only_shared_notes(self):
        self.client.force_authenticate(user=self.user_a)
        # User A creates 1 private note and 1 shared note
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Private note A", "visibility": "PRIVATE"},
            format="json",
        )
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Shared note A", "visibility": "SHARED"},
            format="json",
        )

        # User B creates 1 shared note
        self.client.force_authenticate(user=self.user_b)
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Shared note B", "visibility": "SHARED"},
            format="json",
        )

        # Unauthenticated visitor requests public annotations
        self.client.logout()
        res = self.client.get(f"/api/books/{self.book_id}/annotations/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["count"], 2)
        contents = [item["content"] for item in data["results"]]
        self.assertIn("Shared note A", contents)
        self.assertIn("Shared note B", contents)
        self.assertNotIn("Private note A", contents)

    # 3. Owner's My-Annotations & Tab Counts
    def test_my_annotations_retrieval_and_tab_counts(self):
        # User A creates 2 private notes and 1 shared note
        self.client.force_authenticate(user=self.user_a)
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "A Private 1", "visibility": "PRIVATE"},
            format="json",
        )
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "A Private 2", "visibility": "PRIVATE"},
            format="json",
        )
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "A Shared 1", "visibility": "SHARED"},
            format="json",
        )

        # User B creates 1 shared note
        self.client.force_authenticate(user=self.user_b)
        self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "B Shared 1", "visibility": "SHARED"},
            format="json",
        )

        # User A requests my-annotations
        self.client.force_authenticate(user=self.user_a)
        res = self.client.get(f"/api/books/{self.book_id}/my-annotations/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["count"], 3)  # All 3 of user A's notes
        self.assertEqual(data["counts"]["my_private_count"], 2)
        self.assertEqual(data["counts"]["my_shared_count"], 1)
        self.assertEqual(data["counts"]["my_total_count"], 3)
        self.assertEqual(data["counts"]["shared_count"], 2)  # A Shared 1 + B Shared 1

        # User A filters by visibility=PRIVATE
        res_priv = self.client.get(f"/api/books/{self.book_id}/my-annotations/?visibility=PRIVATE")
        self.assertEqual(res_priv.status_code, 200)
        self.assertEqual(res_priv.json()["count"], 2)

    # 4. Direct-ID Retrieval & Privacy Leak Prevention
    def test_direct_id_retrieval_privacy_isolation(self):
        self.client.force_authenticate(user=self.user_a)
        res_create = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Top secret marginal observation.", "visibility": "PRIVATE"},
            format="json",
        )
        ann_id = res_create.json()["id"]

        # User A can retrieve it
        res_a = self.client.get(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.json()["content"], "Top secret marginal observation.")

        # User B attempts direct retrieval -> 404 (does NOT leak existence)
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.get(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_b.status_code, 404)

        # Anonymous visitor attempts direct retrieval -> 404
        self.client.logout()
        res_anon = self.client.get(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_anon.status_code, 404)

    # 5. Update in Place & Ownership Authorization
    def test_update_annotation_in_place(self):
        self.client.force_authenticate(user=self.user_a)
        res_create = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Initial text.", "page_reference": "Page 10"},
            format="json",
        )
        ann_id = res_create.json()["id"]

        # User A updates
        res_update = self.client.patch(
            f"/api/books/{self.book_id}/annotations/{ann_id}/",
            {"content": "Amended text.", "page_reference": "Page 12"},
            format="json",
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["id"], ann_id)  # Same ID preserved
        self.assertEqual(res_update.json()["content"], "Amended text.")
        self.assertEqual(res_update.json()["page_reference"], "Page 12")

        # User B attempts to update User A's annotation -> 403 Forbidden
        self.client.force_authenticate(user=self.user_b)
        res_b_update = self.client.patch(
            f"/api/books/{self.book_id}/annotations/{ann_id}/",
            {"content": "Malicious tampering."},
            format="json",
        )
        self.assertEqual(res_b_update.status_code, 403)

    # 6. Visibility Transition (Private -> Shared -> Private)
    def test_visibility_switching(self):
        self.client.force_authenticate(user=self.user_a)
        res_create = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Evolving observation.", "visibility": "PRIVATE"},
            format="json",
        )
        ann_id = res_create.json()["id"]

        # Initially not in public list
        res_pub = self.client.get(f"/api/books/{self.book_id}/annotations/")
        self.assertEqual(res_pub.json()["count"], 0)

        # Switch to SHARED
        self.client.patch(
            f"/api/books/{self.book_id}/annotations/{ann_id}/",
            {"visibility": "SHARED"},
            format="json",
        )

        # Now appears in public list
        res_pub2 = self.client.get(f"/api/books/{self.book_id}/annotations/")
        self.assertEqual(res_pub2.json()["count"], 1)

        # User B can view it now
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.get(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_b.status_code, 200)

        # Switch back to PRIVATE
        self.client.force_authenticate(user=self.user_a)
        self.client.patch(
            f"/api/books/{self.book_id}/annotations/{ann_id}/",
            {"visibility": "PRIVATE"},
            format="json",
        )

        # Disappears from public list
        res_pub3 = self.client.get(f"/api/books/{self.book_id}/annotations/")
        self.assertEqual(res_pub3.json()["count"], 0)

        # User B can no longer retrieve it (404)
        self.client.force_authenticate(user=self.user_b)
        res_b2 = self.client.get(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_b2.status_code, 404)

    # 7. Delete & Ownership Authorization
    def test_delete_annotation_and_boundaries(self):
        self.client.force_authenticate(user=self.user_a)
        res_create = self.client.post(
            f"/api/books/{self.book_id}/annotations/",
            {"content": "Note to be expunged."},
            format="json",
        )
        ann_id = res_create.json()["id"]

        # User B attempts deletion -> 403 Forbidden
        self.client.force_authenticate(user=self.user_b)
        res_b = self.client.delete(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_b.status_code, 403)

        # User A deletes -> 204 No Content
        self.client.force_authenticate(user=self.user_a)
        res_a = self.client.delete(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_a.status_code, 204)

        # Confirm deleted
        res_after = self.client.get(f"/api/books/{self.book_id}/annotations/{ann_id}/")
        self.assertEqual(res_after.status_code, 404)

