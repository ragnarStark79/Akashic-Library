"""
Stage 3 Backend Automated Tests:
- StoreProductDetail creation, retrieval, and 1-to-1 association with StoreProduct
- Strikethrough pricing and discount calculation
- Editorial content updates via Store Manager endpoint (PATCH /api/store/products/<id>/detail/)
- Permissions enforcement (Store Manager / Admin allowed, normal user / visitor blocked)
- Rich text sanitization on BDP fields (synopsis, description, excerpt, why we chose)
- Add-to-Box integration with stock validation and live cart item count
- Guest patron Add-to-Box stock validation
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from cart.models import Cart, CartItem
from store.models import Inventory, StoreProduct, StoreProductDetail, StoreStatus
from store.services import StoreService


class StorePhase3BackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.normal_user = User.objects.create_user(
            username="patron_user",
            email="patron@akashic.org",
            password="Password123!",
            role=UserRole.USER,
        )

        self.store_manager = User.objects.create_user(
            username="manager_sarah",
            email="manager_sarah@akashic.org",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
        )

        self.admin_user = User.objects.create_user(
            username="admin_bob",
            email="admin_bob@akashic.org",
            password="Password123!",
            role=UserRole.ADMIN,
        )

        # Baseline Store Product
        self.product = StoreProduct.objects.create(
            book_reference="ref-phase3-test",
            price=Decimal("24.00"),
            edition="Exclusive Illustrated Hardcover",
            condition="Brand New",
            status=StoreStatus.IN_STOCK,
            custom_cover_url="https://images.akashic.store/covers/sample.jpg",
            custom_description="An epic gothic fantasy novel.",
            custom_genres=["Fantasy", "Gothic Fiction", "Historical"],
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            quantity=15,
            reserved_quantity=0,
        )

    def test_default_detail_generation_and_retrieval(self):
        """Public endpoint should return fallback editorial details when no explicit detail record exists."""
        response = self.client.get(f"/api/store/products/{self.product.id}/")
        self.assertEqual(response.status_code, 200)
        data = response.data

        self.assertIn("detail", data)
        self.assertIn("at_a_glance", data["detail"])
        self.assertIn("synopsis", data["detail"])
        self.assertIn("why_we_chose", data["detail"])
        self.assertFalse(data["is_discounted"])
        self.assertIsNone(data["original_price"])

    def test_manager_updates_bdp_detail_and_pricing(self):
        """Store Manager can update all BDP editorial fields and discount pricing."""
        self.client.force_authenticate(user=self.store_manager)

        payload = {
            "original_price": "32.00",
            "hero_theme": {
                "background_color": "#FEE6D0",
                "wave_color": "#FDD7B5",
            },
            "at_a_glance": [
                {"icon": "🪄", "label": "Careful what you wish for", "bg_color": "#ff007a", "text_color": "#fff"},
                {"icon": "📜", "label": "Taiwanese folklore", "bg_color": "#a855f7", "text_color": "#fff"},
                {"icon": "⚔️", "label": "Tale of vengeance", "bg_color": "#eab308", "text_color": "#000"},
                {"icon": "🧙", "label": "Reads like a fable", "bg_color": "#3b82f6", "text_color": "#fff"},
            ],
            "synopsis": "<p>A young woman makes a bargain with a shapeshifting demon.</p>",
            "full_description": "<p>Eleventh century Kangzhu. In a small village, far from the political conflicts...</p>",
            "editorial_cards": [
                {
                    "heading": "An utterly transportive story",
                    "quote": "Love and loss is an old classic, but in Marsden's masterful hands it becomes electric.",
                    "attribution": "Booklist",
                    "bg_color": "#fff3b0",
                    "text_color": "#000",
                }
            ],
            "excerpt": "<p>The first time Yu’er saw a jing, she was fourteen years old.</p>",
            "why_we_chose": "<p>A stellar reinvention of folkloric archetypes with sumptuous worldbuilding.</p>",
            "content_warnings": ["Violence", "Bereavement", "Supernatural horror"],
        }

        response = self.client.patch(f"/api/store/products/{self.product.id}/detail/", data=payload, format="json")
        self.assertEqual(response.status_code, 200)

        data = response.data
        self.assertTrue(data["is_discounted"])
        self.assertEqual(data["original_price"], "32.00")
        self.assertEqual(data["discount_percentage"], 25) # (32-24)/32 = 25%

        detail = data["detail"]
        self.assertEqual(len(detail["at_a_glance"]), 4)
        self.assertEqual(len(detail["editorial_cards"]), 1)
        self.assertEqual(len(detail["content_warnings"]), 3)
        self.assertIn("shapeshifting demon", detail["synopsis"])
        self.assertIn("fourteen years old", detail["excerpt"])

    def test_normal_user_cannot_update_bdp_detail(self):
        """Regular users and visitors are forbidden from updating BDP editorial content."""
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.patch(f"/api/store/products/{self.product.id}/detail/", data={"synopsis": "Hacked"}, format="json")
        self.assertEqual(response.status_code, 403)

        self.client.logout()
        response = self.client.patch(f"/api/store/products/{self.product.id}/detail/", data={"synopsis": "Hacked"}, format="json")
        self.assertIn(response.status_code, [401, 403])

    def test_rich_text_sanitization_in_bdp_detail(self):
        """Malicious script tags and inline handlers are stripped from BDP editorial text."""
        self.client.force_authenticate(user=self.admin_user)

        payload = {
            "synopsis": 'Bold statement <script>alert("xss")</script> <b>clean</b>',
            "excerpt": '<p>Sample text <img src=x onerror="alert(1)"> <i>italics</i></p>',
        }

        response = self.client.patch(f"/api/store/products/{self.product.id}/detail/", data=payload, format="json")
        self.assertEqual(response.status_code, 200)

        detail = response.data["detail"]
        self.assertNotIn("script", detail["synopsis"])
        self.assertNotIn("onerror", detail["excerpt"])
        self.assertIn("<b>clean</b>", detail["synopsis"])
        self.assertIn("<i>italics</i>", detail["excerpt"])

    def test_add_to_box_authenticated_patron(self):
        """Authenticated patron adding to box creates/updates CartItem and returns total cart count."""
        self.client.force_authenticate(user=self.normal_user)

        response = self.client.post(f"/api/store/products/{self.product.id}/add-to-box/", data={"quantity": 2}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["cart_count"], 2)

        # Adding 1 more item should increase cart count to 3
        response2 = self.client.post(f"/api/store/products/{self.product.id}/add-to-box/", data={"quantity": 1}, format="json")
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response2.data["cart_count"], 3)

        # Verify PostgreSQL CartItem persisted
        cart = Cart.objects.get(user=self.normal_user)
        item = CartItem.objects.get(cart=cart, product=self.product)
        self.assertEqual(item.quantity, 3)

    def test_add_to_box_out_of_stock_fails(self):
        """Attempting to add out of stock product to box fails with HTTP 400."""
        self.product.status = StoreStatus.OUT_OF_STOCK
        self.product.save()

        response = self.client.post(f"/api/store/products/{self.product.id}/add-to-box/", data={"quantity": 1}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("out of stock", response.data["detail"].lower())

    def test_add_to_box_guest_user(self):
        """Unauthenticated guest can call add-to-box and receives valid stock validation."""
        response = self.client.post(f"/api/store/products/{self.product.id}/add-to-box/", data={"quantity": 1}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["cart_count"], 1)
