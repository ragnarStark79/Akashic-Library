"""
Phase 6D Comprehensive Backend Tests:
- Legal Access Classifications (OUR_STORE, EXTERNAL_PURCHASE, PREVIEW, BORROW, PUBLIC_DOMAIN, INFORMATION)
- Multiple access options coexistence
- Safe URL scheme enforcement (rejection of javascript:, data:, etc.)
- BookDetailSerializer access_options integration
- Reading shelf ABANDONED status acceptance, updates, and persistence
- Personalized recommendation seed filtering (ABANDONED excluded from positive signal, excluded from results)
- Similar books endpoint behavior and target book exclusion
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from bson import ObjectId

from accounts.models import User
from discovery.db import get_db
from discovery.serializers import BookDetailSerializer
from recommendations.constants import AccessClassification
from recommendations.services import ExternalIntegrationService, RecommendationService
from store.models import StoreProduct, StoreStatus


class Phase6DRecommendationsAndAccessTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.db = get_db()
        cls.books_col = cls.db["books"]
        cls.fav_col = cls.db["favorites"]
        cls.lib_col = cls.db["library_entries"]

    def setUp(self):
        self.books_col.delete_many({})
        self.fav_col.delete_many({})
        self.lib_col.delete_many({})
        StoreProduct.objects.all().delete()

        self.user = User.objects.create_user(
            username="patron_6d",
            email="patron_6d@example.com",
            password="Password123!",
        )

        # Standard book fixture with multiple access attributes
        self.sample_book_id = str(self.books_col.insert_one({
            "title": "Ficciones",
            "authors": [{"name": "Jorge Luis Borges"}],
            "subjects": ["Philosophy", "Short Stories", "Labyrinths"],
            "sources": {
                "google_books": {"id": "gb_ficciones_123"},
                "open_library": {"id": "OL123W", "ia_id": "ficciones_borges_ia"},
                "internet_archive": {"id": "ficciones_borges_ia"},
            },
            "identifiers": {
                "isbn13": "9780811216999",
                "isbn10": "0811216993",
            },
            "external_links": {
                "purchase": "https://www.independentbookstore.com/ficciones",
                "merchant": "Independent Booksellers Guild",
            },
            "created_at": "2026-01-01T00:00:00Z",
        }).inserted_id)

    # ─── 1. Legal Access Classifications ─────────────────────────────────────

    def test_all_six_access_classifications(self):
        """Verify each of the 6 legal access classifications generates correctly."""
        # 1. OUR_STORE: Link a StoreProduct in PostgreSQL
        StoreProduct.objects.create(
            book_reference=self.sample_book_id,
            edition="Collector's Folio Edition",
            condition="New",
            price="28.50",
            status=StoreStatus.IN_STOCK,
        )

        # 2. Add PUBLIC_DOMAIN metadata to book
        self.books_col.update_one(
            {"_id": ObjectId(self.sample_book_id)},
            {"$set": {
                "public_domain": True,
                "public_domain_source": "Standard Ebooks Archive",
                "public_domain_url": "https://standardebooks.org/ebooks/borges/ficciones",
                "jurisdiction": "Worldwide",
            }}
        )

        options = ExternalIntegrationService.get_access_options(self.sample_book_id)
        types = [opt["type"] for opt in options]

        self.assertIn(AccessClassification.OUR_STORE, types)
        self.assertIn(AccessClassification.EXTERNAL_PURCHASE, types)
        self.assertIn(AccessClassification.PREVIEW, types)
        self.assertIn(AccessClassification.BORROW, types)
        self.assertIn(AccessClassification.PUBLIC_DOMAIN, types)
        self.assertIn(AccessClassification.INFORMATION, types)

        # Verify OUR_STORE has no dead route URL in Part I
        store_opt = next(opt for opt in options if opt["type"] == AccessClassification.OUR_STORE)
        self.assertIsNone(store_opt["url"])
        self.assertEqual(store_opt["provider"], "Akashic Store")
        self.assertEqual(store_opt["availability"], "In Stock")

        # Verify EXTERNAL_PURCHASE preserves merchant attribution and safe URL
        purchase_opt = next(opt for opt in options if opt["type"] == AccessClassification.EXTERNAL_PURCHASE)
        self.assertEqual(purchase_opt["provider"], "Independent Booksellers Guild")
        self.assertEqual(purchase_opt["url"], "https://www.independentbookstore.com/ficciones")

        # Verify PREVIEW preserves Google Books link
        preview_opt = next(opt for opt in options if opt["type"] == AccessClassification.PREVIEW)
        self.assertEqual(preview_opt["provider"], "Google Books")
        self.assertIn("books.google.com", preview_opt["url"])

        # Verify BORROW preserves Internet Archive link
        borrow_opt = next(opt for opt in options if opt["type"] == AccessClassification.BORROW)
        self.assertEqual(borrow_opt["provider"], "Internet Archive")
        self.assertEqual(borrow_opt["url"], "https://archive.org/details/ficciones_borges_ia")

        # Verify PUBLIC_DOMAIN includes attribution and jurisdiction
        pd_opt = next(opt for opt in options if opt["type"] == AccessClassification.PUBLIC_DOMAIN)
        self.assertEqual(pd_opt["provider"], "Standard Ebooks Archive")
        self.assertEqual(pd_opt["jurisdiction"], "Worldwide")
        self.assertEqual(pd_opt["availability"], "Public Domain")

        # Verify INFORMATION provides Open Library and Goodreads records
        info_opts = [opt for opt in options if opt["type"] == AccessClassification.INFORMATION]
        info_providers = [opt["provider"] for opt in info_opts]
        self.assertIn("Open Library", info_providers)
        self.assertIn("Goodreads", info_providers)

    def test_unsafe_url_schemes_rejected(self):
        """Unsafe schemes (javascript:, data:, etc.) must be rejected from access options."""
        malicious_book_id = str(self.books_col.insert_one({
            "title": "Malicious Links Book",
            "authors": [{"name": "Test Author"}],
            "external_links": {
                "purchase": "javascript:alert('xss')",
                "merchant": "Rogue Vendor",
            },
            "public_domain": True,
            "public_domain_url": "data:text/html,<script>alert(1)</script>",
        }).inserted_id)

        options = ExternalIntegrationService.get_access_options(malicious_book_id)
        # Purchase option must be rejected because URL is unsafe
        self.assertFalse(any(opt["type"] == AccessClassification.EXTERNAL_PURCHASE for opt in options))

        # Public domain option should have url=None rather than the malicious data: URI
        pd_opt = next((opt for opt in options if opt["type"] == AccessClassification.PUBLIC_DOMAIN), None)
        if pd_opt:
            self.assertIsNone(pd_opt["url"])

    def test_book_detail_serializer_includes_access_options(self):
        """BookDetailSerializer response must contain the access_options list."""
        doc = self.books_col.find_one({"_id": ObjectId(self.sample_book_id)})
        doc["id"] = str(doc["_id"])
        serializer = BookDetailSerializer(doc)
        data = serializer.data

        self.assertIn("access_options", data)
        self.assertIsInstance(data["access_options"], list)
        self.assertTrue(len(data["access_options"]) >= 3)

    # ─── 2. Reading Shelf ABANDONED Contract ─────────────────────────────────

    def test_shelf_status_abandoned_acceptance_and_persistence(self):
        """Verify ABANDONED shelf status is accepted on POST and PATCH."""
        self.client.force_authenticate(user=self.user)

        # 1. Add book directly to ABANDONED shelf
        add_url = f"/api/library/{self.sample_book_id}/add/"
        res = self.client.post(add_url, {"status": "ABANDONED"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "ABANDONED")

        # 2. Check persistence in Mongo
        entry = self.lib_col.find_one({
            "user_id": str(self.user.id),
            "book_id": self.sample_book_id
        })
        self.assertIsNotNone(entry)
        self.assertEqual(entry["status"], "ABANDONED")

        # 3. Update status to READING, then back to ABANDONED
        update_url = f"/api/library/{self.sample_book_id}/update/"
        patch_res = self.client.patch(update_url, {"status": "READING"}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["status"], "READING")

        patch_res2 = self.client.patch(update_url, {"status": "ABANDONED"}, format="json")
        self.assertEqual(patch_res2.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res2.data["status"], "ABANDONED")

    def test_abandoned_books_excluded_from_personalized_signals(self):
        """Abandoned books must not provide positive recommendation seeds."""
        # Book 1 (Abandoned by user)
        # Create Book 2 sharing author with Book 1
        book2_id = str(self.books_col.insert_one({
            "title": "Labyrinths",
            "authors": [{"name": "Jorge Luis Borges"}],
            "subjects": ["Philosophy"],
            "created_at": "2026-01-02T00:00:00Z",
        }).inserted_id)

        # Create Book 3 (unrelated)
        book3_id = str(self.books_col.insert_one({
            "title": "Cosmic Horizon",
            "authors": [{"name": "Carl Sagan"}],
            "subjects": ["Astronomy"],
            "created_at": "2026-01-03T00:00:00Z",
        }).inserted_id)

        # Mark Book 1 as ABANDONED in library
        self.lib_col.insert_one({
            "user_id": str(self.user.id),
            "book_id": self.sample_book_id,
            "status": "ABANDONED",
        })

        # Since only an ABANDONED book is in library and no favorites,
        # get_personalized_recommendations should fall back to cold start (popular/recent)
        # and exclude self.sample_book_id from the results
        self.client.force_authenticate(user=self.user)
        res = self.client.get(reverse("recommendations:personalized"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        rec_ids = [b["id"] for b in res.data["results"]]
        self.assertNotIn(self.sample_book_id, rec_ids)
        # Cold start reason applied
        for b in res.data["results"]:
            self.assertEqual(b["recommendation_reason"], "Popular in Akashic Library")

    # ─── 3. Similar Books Endpoint ───────────────────────────────────────────

    def test_similar_books_excludes_target_book(self):
        """Similar books endpoint must exclude the requested book itself."""
        # Insert similar book sharing subject "Philosophy"
        similar_book_id = str(self.books_col.insert_one({
            "title": "The Aleph",
            "authors": [{"name": "Jorge Luis Borges"}],
            "subjects": ["Philosophy"],
            "created_at": "2026-01-02T00:00:00Z",
        }).inserted_id)

        url = reverse("recommendations:similar-books", kwargs={"book_id": self.sample_book_id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        similar_ids = [b["id"] for b in res.data["results"]]
        self.assertNotIn(self.sample_book_id, similar_ids)
        self.assertIn(similar_book_id, similar_ids)
        for b in res.data["results"]:
            self.assertEqual(b["recommendation_reason"], "Similar to this book")

    def test_similar_books_nonexistent_returns_404(self):
        """Non-existent book ID must return 404 Not Found."""
        url = reverse("recommendations:similar-books", kwargs={"book_id": "000000000000000000000999"})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
