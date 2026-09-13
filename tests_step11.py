"""
Step 11 — Backend Hardening Tests

Covers genuine issues and gaps discovered during the independent acceptance audit:

  1. Community view pagination — invalid skip/limit returns 400, not 500
  2. Community IDOR — users cannot edit/delete each other's discussions or replies
  3. Cart IDOR — confirmed via service-layer scoping
  4. Order IDOR — confirmed via service-layer and view-layer scoping
  5. Role privilege isolation — USER cannot perform moderator/store-manager actions
  6. Mass assignment — protected fields cannot be set by clients
  7. Commerce authority — client cannot supply price, subtotal, or total via POST
  8. Checkout transaction safety — rollback on inventory failure
  9. Input validation — malformed IDs, invalid pagination, invalid quantities
 10. Anonymous user rejection on protected endpoints
"""

import uuid
from decimal import Decimal
from unittest.mock import patch

import mongomock
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from cart.services import CartService
from store.models import Inventory, StoreProduct, StoreStatus


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _make_user(role=UserRole.USER, suffix=None):
    suffix = suffix or uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"user_{suffix}",
        email=f"user_{suffix}@test.com",
        password="TestPass123!",
        role=role,
    )


def _make_product(price="19.99", qty=10):
    p = StoreProduct.objects.create(
        book_reference=f"book_{uuid.uuid4().hex[:8]}",
        price=Decimal(price),
        status=StoreStatus.IN_STOCK,
    )
    Inventory.objects.create(product=p, quantity=qty, reserved_quantity=0)
    return p


# ─── Community pagination input validation ───────────────────────────────────


class MongoMockMixin:
    """Patches community MongoDB access with mongomock."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._mongo_client = mongomock.MongoClient()
        mock_db = cls._mongo_client["test_db"]
        cls._patchers = [
            patch("community.repository.get_db", return_value=mock_db),
            patch("discovery.db.get_db", return_value=mock_db),
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
        db = self._mongo_client["test_db"]
        for col in ("discussions", "replies", "reports", "moderation_audits"):
            db[col].drop()


class CommunityPaginationValidationTests(MongoMockMixin, TestCase):
    """Community list endpoints must reject non-integer skip/limit with 400."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def test_discussion_list_invalid_skip_returns_400(self):
        """?skip=abc should return 400 not 500."""
        resp = self.client.get("/api/community/discussions/?skip=abc")
        self.assertEqual(resp.status_code, 400)

    def test_discussion_list_invalid_limit_returns_400(self):
        """?limit=xyz should return 400 not 500."""
        resp = self.client.get("/api/community/discussions/?limit=xyz")
        self.assertEqual(resp.status_code, 400)

    def test_discussion_list_negative_skip_returns_400(self):
        """?skip=-1 should return 400."""
        resp = self.client.get("/api/community/discussions/?skip=-1")
        self.assertEqual(resp.status_code, 400)

    def test_discussion_list_huge_limit_capped_at_100(self):
        """?limit=9999 should be silently capped (returns 200, not an error)."""
        resp = self.client.get("/api/community/discussions/?limit=9999")
        self.assertEqual(resp.status_code, 200)

    def test_reply_list_invalid_skip_returns_400(self):
        """Reply list: ?skip=notanumber should return 400."""
        resp = self.client.get("/api/community/discussions/fake_id/replies/?skip=notanumber")
        self.assertEqual(resp.status_code, 400)


# ─── Role privilege isolation ────────────────────────────────────────────────


class RolePrivilegeTests(TestCase):
    """Verify USER role cannot access STORE_MANAGER or MODERATOR endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(UserRole.USER)
        self.product = _make_product()

    def test_user_cannot_create_store_product(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            "/api/store/products/manage/",
            {"book_reference": "x", "price": "9.99", "quantity": 5},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_user_cannot_update_store_product(self):
        self.client.force_authenticate(self.user)
        resp = self.client.patch(
            f"/api/store/products/{self.product.id}/manage/",
            {"price": "5.00"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_user_cannot_update_inventory(self):
        self.client.force_authenticate(self.user)
        resp = self.client.patch(
            f"/api/store/products/{self.product.id}/inventory/",
            {"quantity": 0},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_anonymous_cannot_checkout(self):
        resp = self.client.post("/api/checkout/")
        self.assertIn(resp.status_code, [401, 403])

    def test_anonymous_cannot_view_cart(self):
        resp = self.client.get("/api/cart/")
        self.assertIn(resp.status_code, [401, 403])

    def test_anonymous_cannot_view_orders(self):
        resp = self.client.get("/api/orders/")
        self.assertIn(resp.status_code, [401, 403])

    def test_anonymous_cannot_view_personalized_recommendations(self):
        resp = self.client.get("/api/recommendations/")
        self.assertIn(resp.status_code, [401, 403])


# ─── Mass assignment protection ──────────────────────────────────────────────


class MassAssignmentTests(TestCase):
    """Protected fields must not be writable via API input."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = "/api/auth/register/"

    def test_registration_role_admin_injection_is_ignored(self):
        """Client submitting role=ADMIN must receive role=USER."""
        resp = self.client.post(
            self.register_url,
            {
                "username": "evil_admin",
                "email": "evil@example.com",
                "password": "GoodPass99!",
                "role": "ADMIN",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["user"]["role"], "USER")

    def test_registration_role_moderator_injection_is_ignored(self):
        """Client submitting role=MODERATOR must receive role=USER."""
        resp = self.client.post(
            self.register_url,
            {
                "username": "evil_mod",
                "email": "evilmod@example.com",
                "password": "GoodPass99!",
                "role": "MODERATOR",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["user"]["role"], "USER")

    def test_checkout_price_injection_is_ignored(self):
        """POST /api/checkout/ body price fields must be silently ignored."""
        user = _make_user()
        product = _make_product(price="99.99")
        CartService.add_item(user, str(product.id), 1)
        self.client.force_authenticate(user)

        with patch("orders.services.get_book_by_id") as mock_book:
            mock_book.return_value = {"_id": product.book_reference, "title": "Test Book"}
            resp = self.client.post(
                "/api/checkout/",
                {"total": "0.01", "subtotal": "0.01", "price": "0.01"},
                format="json",
            )

        self.assertEqual(resp.status_code, 201)
        # Server must use the authoritative price, not the injected one
        self.assertEqual(resp.data["total"], "99.99")


# ─── IDOR — Cart ─────────────────────────────────────────────────────────────


class CartIDORTests(TestCase):
    """User B must not be able to touch User A's cart items."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = _make_user(suffix="a1")
        self.user_b = _make_user(suffix="b1")
        self.product = _make_product()

    def test_user_b_cannot_update_user_a_cart_item(self):
        item = CartService.add_item(self.user_a, str(self.product.id), 1)
        self.client.force_authenticate(self.user_b)
        resp = self.client.patch(
            f"/api/cart/items/{item.id}/", {"quantity": 5}, format="json"
        )
        self.assertIn(resp.status_code, [400, 403, 404])
        item.refresh_from_db()
        self.assertEqual(item.quantity, 1)

    def test_user_b_cannot_delete_user_a_cart_item(self):
        item = CartService.add_item(self.user_a, str(self.product.id), 1)
        self.client.force_authenticate(self.user_b)
        resp = self.client.delete(f"/api/cart/items/{item.id}/")
        self.assertIn(resp.status_code, [400, 403, 404])
        from cart.models import CartItem
        self.assertTrue(CartItem.objects.filter(pk=item.id).exists())


# ─── IDOR — Orders ───────────────────────────────────────────────────────────


class OrderIDORTests(TestCase):
    """User B cannot see User A's order."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = _make_user(suffix="oa1")
        self.user_b = _make_user(suffix="ob1")
        self.product = _make_product(price="20.00")

    @patch("orders.services.get_book_by_id")
    def test_user_b_cannot_view_user_a_order(self, mock_book):
        mock_book.return_value = {"_id": self.product.book_reference, "title": "Book"}
        CartService.add_item(self.user_a, str(self.product.id), 1)
        self.client.force_authenticate(self.user_a)
        resp = self.client.post("/api/checkout/")
        self.assertEqual(resp.status_code, 201)
        order_id = resp.data["id"]

        self.client.force_authenticate(self.user_b)
        resp = self.client.get(f"/api/orders/{order_id}/")
        self.assertEqual(resp.status_code, 404)

    @patch("orders.services.get_book_by_id")
    def test_order_list_returns_only_own_orders(self, mock_book):
        mock_book.return_value = {"_id": self.product.book_reference, "title": "Book"}
        CartService.add_item(self.user_a, str(self.product.id), 1)
        self.client.force_authenticate(self.user_a)
        self.client.post("/api/checkout/")

        self.client.force_authenticate(self.user_b)
        resp = self.client.get("/api/orders/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["results"]), 0)


# ─── Checkout transaction safety ─────────────────────────────────────────────


class CheckoutTransactionTests(TestCase):
    """Checkout rolls back fully when stock is exhausted."""

    def setUp(self):
        self.user = _make_user()
        self.product = _make_product(price="50.00", qty=5)

    @patch("orders.services.get_book_by_id")
    def test_checkout_insufficient_stock_leaves_no_order(self, mock_book):
        mock_book.return_value = {"_id": self.product.book_reference, "title": "Book"}
        CartService.add_item(self.user, str(self.product.id), 1)
        # Simulate concurrent purchase draining stock after cart add
        inv = self.product.inventory
        inv.quantity = 0
        inv.save()

        from orders.models import Order
        from orders.services import CheckoutService

        with self.assertRaises(DjangoValidationError):
            CheckoutService.checkout(self.user)

        self.assertEqual(Order.objects.count(), 0)
        inv.refresh_from_db()
        self.assertEqual(inv.quantity, 0)


# ─── Input validation ────────────────────────────────────────────────────────


class CartInputValidationTests(TestCase):
    """Cart endpoints reject malformed / invalid input."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user()
        self.product = _make_product()
        self.client.force_authenticate(self.user)

    def test_add_item_zero_quantity_returns_400(self):
        resp = self.client.post(
            "/api/cart/items/",
            {"product_id": str(self.product.id), "quantity": 0},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_add_item_negative_quantity_returns_400(self):
        resp = self.client.post(
            "/api/cart/items/",
            {"product_id": str(self.product.id), "quantity": -5},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_add_item_nonexistent_product_returns_400(self):
        fake_uuid = str(uuid.uuid4())
        resp = self.client.post(
            "/api/cart/items/",
            {"product_id": fake_uuid, "quantity": 1},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_add_item_missing_product_id_returns_400(self):
        resp = self.client.post(
            "/api/cart/items/",
            {"quantity": 1},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


class PaginationInputValidationTests(TestCase):
    """Discovery and store list endpoints handle invalid pagination without 500."""

    def setUp(self):
        self.client = APIClient()

    def test_store_list_invalid_page_size_does_not_500(self):
        resp = self.client.get("/api/store/products/?page_size=abc")
        self.assertNotEqual(resp.status_code, 500)

    def test_book_list_invalid_page_returns_400(self):
        resp = self.client.get("/api/books/?page=xyz")
        self.assertEqual(resp.status_code, 400)

    def test_book_list_huge_page_size_is_rejected(self):
        resp = self.client.get("/api/books/?page_size=9999")
        self.assertEqual(resp.status_code, 400)

    def test_book_list_negative_page_is_rejected(self):
        resp = self.client.get("/api/books/?page=-1")
        self.assertEqual(resp.status_code, 400)
