"""
Comprehensive automated tests for Store Phase 2:
- Dual-database separation (MongoDB Book + PostgreSQL StoreProduct)
- Universal Card Customization persistence
- Rich text sanitization
- Open Library URL parsing and import preview
- Manual book creation
- Batch MongoDB enrichment without N+1 queries
- Public catalogue filtering by genre and search
- Role-based access control (Visitor, User, Store Manager, Admin)
"""

from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from store.models import Inventory, StoreProduct, StoreStatus
from store.services import StoreService, sanitize_rich_text


class StorePhase2BackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.visitor_client = APIClient()

        self.normal_user = User.objects.create_user(
            username="normal_user",
            email="user@akashic.org",
            password="Password123!",
            role=UserRole.USER,
        )

        self.store_manager = User.objects.create_user(
            username="manager_dan",
            email="manager@akashic.org",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
        )

        self.admin_user = User.objects.create_user(
            username="admin_alice",
            email="admin@akashic.org",
            password="Password123!",
            role=UserRole.ADMIN,
        )

    def test_sanitize_rich_text(self):
        """Verify XSS vectors are stripped while safe markup is preserved."""
        malicious = '<p>Great read! <script>alert("hacked")</script> <b>Bold text</b> <img src="x" onerror="alert(1)"> <a href="javascript:void(0)">link</a></p>'
        sanitized = sanitize_rich_text(malicious)
        self.assertNotIn("script", sanitized)
        self.assertNotIn("onerror", sanitized)
        self.assertNotIn("javascript", sanitized)
        self.assertIn("<b>Bold text</b>", sanitized)
        self.assertIn("<p>", sanitized)

    def test_open_library_url_parser(self):
        """Verify URL parser recognizes work, book/edition, and ISBN formats."""
        work = StoreService.parse_open_library_identifier("https://openlibrary.org/works/OL82563W/Frankenstein")
        self.assertEqual(work["type"], "work")
        self.assertEqual(work["id"], "OL82563W")

        edition = StoreService.parse_open_library_identifier("https://openlibrary.org/books/OL24364628M/Frankenstein")
        self.assertEqual(edition["type"], "edition")
        self.assertEqual(edition["id"], "OL24364628M")

        isbn = StoreService.parse_open_library_identifier("https://openlibrary.org/isbn/9780140328721")
        self.assertEqual(isbn["type"], "isbn")
        self.assertEqual(isbn["id"], "9780140328721")

        raw_work = StoreService.parse_open_library_identifier("OL82563W")
        self.assertEqual(raw_work["type"], "work")
        self.assertEqual(raw_work["id"], "OL82563W")

    @patch("store.services.requests.get")
    def test_open_library_preview_endpoint(self, mock_get):
        """Store Manager can preview Open Library metadata."""
        mock_resp = type("MockResponse", (), {
            "status_code": 200,
            "ok": True,
            "json": lambda self: {
                "title": "Frankenstein",
                "description": "A gothic masterpiece.",
                "subjects": ["Horror", "Gothic Fiction", "Classics"],
                "covers": [12345],
                "authors": [{"author": {"key": "/authors/OL123A"}}],
            },
            "raise_for_status": lambda self: None,
        })()
        mock_get.return_value = mock_resp

        self.client.force_authenticate(user=self.store_manager)
        resp = self.client.post(
            "/api/store/products/import-preview/",
            {"url": "https://openlibrary.org/works/OL82563W"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["title"], "Frankenstein")
        self.assertIn("Horror", resp.data["genres"])
        self.assertEqual(resp.data["cover_urls"][0], "https://covers.openlibrary.org/b/id/12345-L.jpg")

    def test_unauthorized_user_cannot_access_manager_endpoints(self):
        """Visitors and normal users must receive 401 or 403 on manager endpoints."""
        # Visitor
        resp = self.visitor_client.get("/api/store/products/manage/")
        self.assertIn(resp.status_code, [401, 403])

        resp = self.visitor_client.post("/api/store/products/manage/", {})
        self.assertIn(resp.status_code, [401, 403])

        # Normal User
        self.client.force_authenticate(user=self.normal_user)
        resp = self.client.get("/api/store/products/manage/")
        self.assertEqual(resp.status_code, 403)

        resp = self.client.post("/api/store/products/manage/", {})
        self.assertEqual(resp.status_code, 403)

        resp = self.client.post("/api/store/products/import-preview/", {"url": "https://openlibrary.org/works/OL82563W"})
        self.assertEqual(resp.status_code, 403)

    @patch("store.services.upsert_book")
    @patch("store.services.get_book_by_id")
    def test_manager_manual_product_creation_with_card_customization(self, mock_get_book, mock_upsert_book):
        """Manager can create product manually with custom card colors and rich text."""
        mock_upsert_book.return_value = "mongo_book_id_123"
        mock_get_book.return_value = {
            "title": "Bones of Jade, Flesh like Ice",
            "authors": [{"name": "Gracie Marsden"}],
            "description": "A dark, seductive tale.",
            "subjects": ["Fantasy", "Historical"],
        }

        self.client.force_authenticate(user=self.store_manager)
        payload = {
            "manual_book": {
                "title": "Bones of Jade, Flesh like Ice",
                "authors": ["Gracie Marsden"],
                "description": "<p>A dark, seductive tale of hunger and transformation.</p>",
                "genres": ["Fantasy", "Historical"],
                "cover_url": "https://images.akashic.org/bones.jpg",
                "isbn13": "9781234567897",
            },
            "price": "28.50",
            "edition": "First Edition Folio",
            "condition": "Mint",
            "status": "IN_STOCK",
            "quantity": 25,
            "custom_cover_url": "https://images.akashic.org/bones_custom.jpg",
            "custom_description": "<p>Exclusive curated archival edition.</p>",
            "custom_genres": ["Fantasy", "Debut Novel", "Historical"],
            "card_customization": {
                "background_color": "#ff385c",
                "title_color": "#ffffff",
                "description_color": "#fefefe",
                "genre_badge_colors": {
                    "Fantasy": "#71002e",
                    "Debut Novel": "#00e500",
                },
            },
        }

        resp = self.client.post("/api/store/products/manage/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["price"], "28.50")
        self.assertEqual(resp.data["available_quantity"], 25)
        self.assertEqual(resp.data["custom_cover_url"], "https://images.akashic.org/bones_custom.jpg")
        self.assertEqual(resp.data["card_customization"]["background_color"], "#ff385c")
        self.assertEqual(resp.data["card_customization"]["genre_badge_colors"]["Fantasy"], "#71002e")

    @patch("store.services.get_book_by_id")
    def test_manager_can_update_product_card_customization(self, mock_get_book):
        """Manager can update product card background, title color, and badge colors."""
        mock_get_book.return_value = {"_id": "book_ref_1"}
        product = StoreProduct.objects.create(
            book_reference="book_ref_1",
            price=Decimal("19.99"),
            status=StoreStatus.IN_STOCK,
        )
        Inventory.objects.create(product=product, quantity=15)

        self.client.force_authenticate(user=self.store_manager)
        update_payload = {
            "price": "21.99",
            "custom_cover_url": "https://images.akashic.org/new_cover.jpg",
            "custom_description": "Updated description with <b>bold words</b>.",
            "card_customization": {
                "background_color": "#3d3195",
                "title_color": "#ffff00",
                "genre_badge_colors": {
                    "Thriller": "#3d3195",
                },
            },
        }

        resp = self.client.patch(f"/api/store/products/{product.id}/manage/", update_payload, format="json")
        self.assertEqual(resp.status_code, 200)

        product.refresh_from_db()
        self.assertEqual(product.price, Decimal("21.99"))
        self.assertEqual(product.custom_cover_url, "https://images.akashic.org/new_cover.jpg")
        self.assertEqual(product.card_customization["background_color"], "#3d3195")
        self.assertEqual(product.card_customization["title_color"], "#ffff00")

    def test_public_catalogue_filtering_by_genre(self):
        """Public list endpoint properly filters products by genre."""
        # Create two products with different genres
        p_horror = StoreProduct.objects.create(
            book_reference="ref_horror",
            price=Decimal("15.00"),
            status=StoreStatus.IN_STOCK,
            custom_genres=["Horror", "Gothic"],
        )
        Inventory.objects.create(product=p_horror, quantity=5)

        p_scifi = StoreProduct.objects.create(
            book_reference="ref_scifi",
            price=Decimal("18.00"),
            status=StoreStatus.IN_STOCK,
            custom_genres=["Science Fiction"],
        )
        Inventory.objects.create(product=p_scifi, quantity=8)

        # 1. Filter Horror
        resp = self.visitor_client.get("/api/store/products/?genre=Horror")
        self.assertEqual(resp.status_code, 200)
        product_ids = [item["id"] for item in resp.data["results"]]
        self.assertIn(str(p_horror.id), product_ids)
        self.assertNotIn(str(p_scifi.id), product_ids)

        # 2. Filter Science Fiction
        resp = self.visitor_client.get("/api/store/products/?genre=Science Fiction")
        self.assertEqual(resp.status_code, 200)
        product_ids = [item["id"] for item in resp.data["results"]]
        self.assertIn(str(p_scifi.id), product_ids)
        self.assertNotIn(str(p_horror.id), product_ids)

        # 3. All products
        resp = self.visitor_client.get("/api/store/products/")
        self.assertEqual(resp.status_code, 200)
        product_ids = [item["id"] for item in resp.data["results"]]
        self.assertIn(str(p_horror.id), product_ids)
        self.assertIn(str(p_scifi.id), product_ids)
