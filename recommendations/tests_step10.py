"""
Unit tests for Step 10: Recommendations and External Integrations.
"""

from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from bson import ObjectId

from accounts.models import User
from discovery.db import get_db
from discovery.repository import _get_collection as get_discovery_collection

# Import repositories for testing insertion
from discovery.library_repository import _get_favorites_col, _get_library_col


class RecommendationsTestCase(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Setup Mongo DB
        cls.db = get_db()
        cls.books_col = cls.db["books"]
        cls.fav_col = cls.db["favorites"]
        cls.lib_col = cls.db["library_entries"]

    def setUp(self):
        self.books_col.delete_many({})
        self.fav_col.delete_many({})
        self.lib_col.delete_many({})

        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpassword123",
        )

        # Insert some books
        self.book1_id = self.books_col.insert_one({
            "title": "Fantasy Book A",
            "authors": [{"name": "Author One"}],
            "subjects": ["Fantasy", "Magic"],
            "sources": {
                "google_books": {"id": "gb123"},
            },
            "identifiers": {"isbn13": "9781234567890"},
            "created_at": "2024-01-01T00:00:00Z"
        }).inserted_id

        self.book2_id = self.books_col.insert_one({
            "title": "Fantasy Book B",
            "authors": [{"name": "Author Two"}],
            "subjects": ["Fantasy", "Adventure"],
            "created_at": "2024-01-02T00:00:00Z"
        }).inserted_id

        self.book3_id = self.books_col.insert_one({
            "title": "Sci-Fi Book C",
            "authors": [{"name": "Author Three"}],
            "subjects": ["Science Fiction", "Space"],
            "sources": {
                "open_library": {"id": "OL12345M"}
            },
            "identifiers": {"isbn10": "1234567890"},
            "created_at": "2024-01-03T00:00:00Z"
        }).inserted_id

        self.book4_id = self.books_col.insert_one({
            "title": "Fantasy Book D by Author One",
            "authors": [{"name": "Author One"}],
            "subjects": ["Fantasy", "Mystery"],
            "created_at": "2024-01-04T00:00:00Z"
        }).inserted_id

    def test_personalized_cold_start(self):
        """User with no history gets cold start (popular/recent) books."""
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data["results"]
        # Since no history, returns all books (most recent first due to sorting if created_at was a real datetime, 
        # but here it's string, we're just checking we get 4 books).
        self.assertEqual(len(results), 4)
        for b in results:
            self.assertEqual(b["recommendation_reason"], "Popular in Akashic Library")

    def test_personalized_with_history(self):
        """User with history gets recommendations based on subjects/authors, excluding already interacted books."""
        # User favors book1
        self.fav_col.insert_one({
            "user_id": str(self.user.id),
            "book_id": str(self.book1_id)
        })

        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data["results"]
        # Interacted: book1.
        # Authors: "Author One", Subjects: "Fantasy", "Magic".
        # Should match book2 (Fantasy), book4 (Author One, Fantasy).
        # Should exclude book1.
        
        ids = [b["id"] for b in results]
        self.assertNotIn(str(self.book1_id), ids)
        self.assertIn(str(self.book2_id), ids) # Matched Fantasy
        self.assertIn(str(self.book4_id), ids) # Matched Author One & Fantasy
        # book3 (Sci-Fi) might not be returned if we strictly filter, but wait, 
        # get_recommended_books filters strictly if there are authors/subjects.
        self.assertNotIn(str(self.book3_id), ids)

        # Check reasons
        for b in results:
            self.assertIn(b["recommendation_reason"], [
                "Because you like related subjects",
                "Because you like these authors",
                "Recommended for you"
            ])

    def test_personalized_unauthenticated(self):
        url = reverse("recommendations:personalized")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_personalized_pagination(self):
        """Verify pagination boundaries for personalized recommendations."""
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url, {"page_size": 2, "page": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["page_size"], 2)
        self.assertEqual(response.data["page"], 1)

        response2 = self.client.get(url, {"page_size": 2, "page": 2})
        self.assertEqual(len(response2.data["results"]), 2)
        # Verify no duplicates across pages
        ids_page1 = {b["id"] for b in response.data["results"]}
        ids_page2 = {b["id"] for b in response2.data["results"]}
        self.assertTrue(ids_page1.isdisjoint(ids_page2))

    def test_forged_user_id_impossible(self):
        """Security: Verify user cannot forge user_id to see another user's recommendations."""
        # This endpoint uses request.user.id directly, so passing user_id in params should be ignored.
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url, {"user_id": "forged_id_12345"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # If it crashed trying to use "forged_id_12345" as a UUID or ObjectId, it would be 500/400.
        # But it successfully used self.user.id.
        self.assertNotIn("forged_id_12345", str(response.content))

    def test_similar_books(self):
        """Similar books for book1 should return book2 and book4, excluding book1."""
        url = reverse("recommendations:similar-books", kwargs={"book_id": str(self.book1_id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data["results"]
        ids = [b["id"] for b in results]
        self.assertNotIn(str(self.book1_id), ids)
        self.assertIn(str(self.book2_id), ids) # Subject Fantasy
        self.assertIn(str(self.book4_id), ids) # Author One, Subject Fantasy
        self.assertNotIn(str(self.book3_id), ids) # No overlap
        
        for b in results:
            self.assertEqual(b["recommendation_reason"], "Similar to this book")

    def test_similar_books_not_found(self):
        url = reverse("recommendations:similar-books", kwargs={"book_id": str(ObjectId())})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_similar_books_malformed_id(self):
        url = reverse("recommendations:similar-books", kwargs={"book_id": "invalid-bson-id"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_similar_books_pagination(self):
        url = reverse("recommendations:similar-books", kwargs={"book_id": str(self.book1_id)})
        response = self.client.get(url, {"page_size": 1, "page": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_external_links_google_books(self):
        url = reverse("recommendations:external-links", kwargs={"book_id": str(self.book1_id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data.get("google_books"), "https://books.google.com/books?id=gb123")
        self.assertEqual(data.get("goodreads"), "https://www.goodreads.com/book/isbn/9781234567890")
        self.assertNotIn("open_library", data)

    def test_external_links_open_library(self):
        url = reverse("recommendations:external-links", kwargs={"book_id": str(self.book3_id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data.get("open_library"), "https://openlibrary.org/works/OL12345M")
        self.assertEqual(data.get("goodreads"), "https://www.goodreads.com/book/isbn/1234567890")
        self.assertNotIn("google_books", data)

    def test_external_links_not_found(self):
        url = reverse("recommendations:external-links", kwargs={"book_id": str(ObjectId())})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_external_links_malformed_id(self):
        url = reverse("recommendations:external-links", kwargs={"book_id": "invalid-bson-id"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_external_links_missing_identifiers(self):
        """Books without stored source identifiers return empty mapping without crashing."""
        url = reverse("recommendations:external-links", kwargs={"book_id": str(self.book2_id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {})

    @patch("recommendations.services.get_popular_books")
    def test_mongodb_unavailable_handling(self, mock_get_popular):
        from discovery.exceptions import MongoDBUnavailableError
        mock_get_popular.side_effect = MongoDBUnavailableError("Mongo down")
        
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_deterministic_ordering(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response1 = self.client.get(url)
        response2 = self.client.get(url)
        self.assertEqual(response1.data["results"], response2.data["results"])

    def test_personalized_with_library_entry_only(self):
        # User interacts via library_entries, not favorites
        self.lib_col.insert_one({
            "user_id": str(self.user.id),
            "book_id": str(self.book1_id)
        })
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url)
        ids = [b["id"] for b in response.data["results"]]
        # book1 excluded, book2 and book4 included
        self.assertNotIn(str(self.book1_id), ids)
        self.assertIn(str(self.book2_id), ids)
        self.assertIn(str(self.book4_id), ids)

    def test_multiple_user_personalization(self):
        user2 = User.objects.create_user(
            username="user2", email="u2@example.com", password="pwd"
        )
        self.fav_col.insert_one({"user_id": str(self.user.id), "book_id": str(self.book1_id)})
        self.fav_col.insert_one({"user_id": str(user2.id), "book_id": str(self.book3_id)})

        url = reverse("recommendations:personalized")
        
        self.client.force_authenticate(user=self.user)
        resp1 = self.client.get(url)
        
        self.client.force_authenticate(user=user2)
        resp2 = self.client.get(url)
        
        ids1 = [b["id"] for b in resp1.data["results"]]
        ids2 = [b["id"] for b in resp2.data["results"]]
        
        self.assertNotEqual(ids1, ids2)
        # User 1 gets fantasy, User 2 gets sci-fi (which might be empty or fallback)
        self.assertIn(str(self.book2_id), ids1)
        # Assuming book3 has no other sci-fi, user 2 might get empty or cold start if no matches?
        # Actually user 2 has no other sci-fi books to match, so it will fall back to cold start (popular).
        # We just assert ids1 != ids2.

    def test_similarity_author_only(self):
        # Let's test with book4, author is 'Author One'. Should match book1.
        url = reverse("recommendations:similar-books", kwargs={"book_id": str(self.book4_id)})
        response = self.client.get(url)
        ids = [b["id"] for b in response.data["results"]]
        self.assertIn(str(self.book1_id), ids)
        self.assertNotIn(str(self.book4_id), ids)

    def test_similarity_subject_only(self):
        # Let's test with book2, subject is 'Fantasy'. Should match book1 and book4.
        url = reverse("recommendations:similar-books", kwargs={"book_id": str(self.book2_id)})
        response = self.client.get(url)
        ids = [b["id"] for b in response.data["results"]]
        self.assertIn(str(self.book1_id), ids)
        self.assertIn(str(self.book4_id), ids)
        self.assertNotIn(str(self.book2_id), ids)

    @patch("urllib.request.urlopen")
    @patch("requests.get")
    def test_external_provider_isolation(self, mock_req_get, mock_urllib):
        # Verify no runtime HTTP request is made
        url = reverse("recommendations:external-links", kwargs={"book_id": str(self.book1_id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_req_get.assert_not_called()
        mock_urllib.assert_not_called()

    @patch("recommendations.services.get_book_by_id")
    def test_mongodb_error_similar_books(self, mock_get_book):
        from discovery.exceptions import MongoDBUnavailableError
        mock_get_book.side_effect = MongoDBUnavailableError("Mongo down")
        url = reverse("recommendations:similar-books", kwargs={"book_id": str(self.book1_id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_pagination_max_size(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("recommendations:personalized")
        response = self.client.get(url, {"page_size": 10000})
        # Usually frameworks cap at 100 or 50. Let's assert it is strictly less than 10000.
        self.assertTrue(response.data["page_size"] <= 100)
