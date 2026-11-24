"""
Tests for Stage 5: Multi-Store Catalogue, Multi-Store Cart, Store Selection per Book,
Checkout, Demo QR Payment, Atomic Inventory Deduction, and Revenue Integration.
"""

from decimal import Decimal
import uuid
from django.test import TestCase
from rest_framework.test import APIClient
from django.utils import timezone

from accounts.models import User, UserRole, ManagerStatus
from store.models import StoreProduct, Inventory, StoreProductDetail, StoreStatus
from cart.models import Cart, CartItem
from cart.services import CartService
from orders.models import Order, OrderItem, Payment, OrderStatus, PaymentStatus
from orders.services import CheckoutService


class Stage5BackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin = User.objects.create_superuser(
            username="test_admin",
            email="admin@test.library",
            password="AdminPassword123!",
        )

        # Create 3 Store Managers
        self.mgr_a = User.objects.create_user(
            username="curator_alexandria",
            email="alexandria@test.library",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            manager_status=ManagerStatus.APPROVED,
            business_name="Alexandria Rare Manuscripts",
        )

        self.mgr_b = User.objects.create_user(
            username="curator_byzantine",
            email="byzantine@test.library",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            manager_status=ManagerStatus.APPROVED,
            business_name="Byzantine Folio Guild",
        )

        self.mgr_c = User.objects.create_user(
            username="curator_carthage",
            email="carthage@test.library",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            manager_status=ManagerStatus.SUSPENDED,  # Suspended manager
            business_name="Carthage Antiquities",
        )

        # Create Patron User
        self.patron = User.objects.create_user(
            username="patron_reader",
            email="reader@test.library",
            password="PatronPassword123!",
            role=UserRole.USER,
        )

        # Canonical reference for shared book
        self.shared_book_ref = str(uuid.uuid4())

        # Seed discovery MongoDB documents for test references
        from discovery.repository import _get_collection
        self.mongo_col = _get_collection()
        self.mongo_col.update_one(
            {"_id": self.shared_book_ref},
            {"$set": {"title": "Frankenstein", "authors": [{"name": "Mary Shelley"}], "subjects": ["Horror", "Gothic Fiction"]}},
            upsert=True,
        )

        # Book 1: Frankenstein (Offered by Store A and Store B with different prices and stock)
        self.prod_a1 = StoreProduct.objects.create(
            book_reference=self.shared_book_ref,
            created_by=self.mgr_a,
            price=Decimal("20.00"),
            edition="Alexandria Clothbound",
            status=StoreStatus.IN_STOCK,
            custom_genres=["Horror", "Gothic Fiction"],
        )
        self.inv_a1 = Inventory.objects.create(product=self.prod_a1, quantity=15, reserved_quantity=0)

        self.prod_b1 = StoreProduct.objects.create(
            book_reference=self.shared_book_ref,
            created_by=self.mgr_b,
            price=Decimal("25.00"),
            edition="Byzantine Gold Leaf",
            status=StoreStatus.IN_STOCK,
            custom_genres=["Horror", "Gothic Fiction"],
        )
        self.inv_b1 = Inventory.objects.create(product=self.prod_b1, quantity=10, reserved_quantity=0)

        # Book 1 from suspended Store C (should be excluded from public catalogue)
        self.prod_c1 = StoreProduct.objects.create(
            book_reference=self.shared_book_ref,
            created_by=self.mgr_c,
            price=Decimal("15.00"),
            edition="Carthage Bootleg",
            status=StoreStatus.IN_STOCK,
            custom_genres=["Horror"],
        )
        self.inv_c1 = Inventory.objects.create(product=self.prod_c1, quantity=20, reserved_quantity=0)

        # Book 2: Dune (Offered only by Store A and Store B)
        self.dune_ref = str(uuid.uuid4())
        self.mongo_col.update_one(
            {"_id": self.dune_ref},
            {"$set": {"title": "Dune", "authors": [{"name": "Frank Herbert"}], "subjects": ["Science Fiction"]}},
            upsert=True,
        )
        self.prod_a2 = StoreProduct.objects.create(
            book_reference=self.dune_ref,
            created_by=self.mgr_a,
            price=Decimal("28.00"),
            edition="Alexandria Arrakis Edition",
            status=StoreStatus.IN_STOCK,
            custom_genres=["Science Fiction"],
        )
        self.inv_a2 = Inventory.objects.create(product=self.prod_a2, quantity=12, reserved_quantity=0)

        self.prod_b2 = StoreProduct.objects.create(
            book_reference=self.dune_ref,
            created_by=self.mgr_b,
            price=Decimal("30.00"),
            edition="Byzantine Spice Edition",
            status=StoreStatus.IN_STOCK,
            custom_genres=["Science Fiction"],
        )
        self.inv_b2 = Inventory.objects.create(product=self.prod_b2, quantity=8, reserved_quantity=0)

        # Book 3: Exclusive title offered ONLY by Store A
        self.exclusive_ref = str(uuid.uuid4())
        self.mongo_col.update_one(
            {"_id": self.exclusive_ref},
            {"$set": {"title": "The Name of the Wind", "authors": [{"name": "Patrick Rothfuss"}], "subjects": ["Fantasy"]}},
            upsert=True,
        )
        self.prod_a3 = StoreProduct.objects.create(
            book_reference=self.exclusive_ref,
            created_by=self.mgr_a,
            price=Decimal("35.00"),
            edition="Alexandria Exclusive Only",
            status=StoreStatus.IN_STOCK,
            custom_genres=["Fantasy"],
        )
        self.inv_a3 = Inventory.objects.create(product=self.prod_a3, quantity=5, reserved_quantity=0)

    def tearDown(self):
        self.mongo_col.delete_many({"_id": {"$in": [self.shared_book_ref, self.dune_ref, self.exclusive_ref]}})

    # ── 1. ALL BOOKS GLOBAL PRODUCT AGGREGATION & EXCLUSION TESTS ──────────────
    def test_01_public_catalogue_aggregates_all_approved_managers_and_excludes_suspended(self):
        """Public catalogue shows products from Manager A and B, but excludes suspended Manager C."""
        resp = self.client.get("/api/store/products/")
        self.assertEqual(resp.status_code, 200)
        p_ids = [p["id"] for p in resp.data["results"]]

        self.assertIn(str(self.prod_a1.id), p_ids)
        self.assertIn(str(self.prod_b1.id), p_ids)
        self.assertIn(str(self.prod_a2.id), p_ids)
        self.assertIn(str(self.prod_b2.id), p_ids)
        # Suspended manager product must NOT be in public catalogue
        self.assertNotIn(str(self.prod_c1.id), p_ids)

        # Store names must be attached
        first_item = next(p for p in resp.data["results"] if p["id"] == str(self.prod_a1.id))
        self.assertEqual(first_item["store_name"], "Alexandria Rare Manuscripts")
        self.assertEqual(first_item["store_id"], str(self.mgr_a.id))

    def test_02_offers_endpoint_returns_alternative_sellers(self):
        """GET /api/store/products/<id>/offers/ lists alternative sellers for the same book."""
        resp = self.client.get(f"/api/store/products/{self.prod_a1.id}/offers/")
        self.assertEqual(resp.status_code, 200)
        offers = resp.data["offers"]
        self.assertEqual(len(offers), 2)  # Store A and Store B (Store C excluded)

        offer_store_names = [o["store_name"] for o in offers]
        self.assertIn("Alexandria Rare Manuscripts", offer_store_names)
        self.assertIn("Byzantine Folio Guild", offer_store_names)

    # ── 2. MULTI-STORE CART & SUPPLIER SWITCHING TESTS ─────────────────────────
    def test_03_cart_items_have_seller_attribution_and_available_stores(self):
        """Cart items include seller store name and alternative store choices."""
        self.client.force_authenticate(self.patron)
        CartService.add_item(self.patron, str(self.prod_a1.id), 2)

        resp = self.client.get("/api/cart/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["items"]), 1)
        item = resp.data["items"][0]

        self.assertEqual(item["store_name"], "Alexandria Rare Manuscripts")
        self.assertEqual(item["store_id"], str(self.mgr_a.id))
        self.assertEqual(item["quantity"], 2)
        self.assertEqual(item["line_subtotal"], 40.0)

        # Alternative store offers list attached to item
        alt_stores = item["available_stores"]
        self.assertEqual(len(alt_stores), 2)
        b_offer = next(s for s in alt_stores if s["store_id"] == str(self.mgr_b.id))
        self.assertEqual(b_offer["price"], "25.00")
        self.assertEqual(b_offer["is_current"], False)

    def test_04_switch_store_per_item(self):
        """Customer can change the supplying store for a book to an alternative offer."""
        self.client.force_authenticate(self.patron)
        cart_item = CartService.add_item(self.patron, str(self.prod_a1.id), 2)

        # Switch from Store A ($20.00) to Store B ($25.00)
        resp = self.client.post(
            f"/api/cart/items/{cart_item.id}/switch-store/",
            {"product_id": str(self.prod_b1.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

        updated_items = resp.data["items"]
        self.assertEqual(len(updated_items), 1)
        self.assertEqual(updated_items[0]["store_name"], "Byzantine Folio Guild")
        self.assertEqual(updated_items[0]["product_id"], str(self.prod_b1.id))
        self.assertEqual(str(updated_items[0]["current_price"]), "25.00")
        self.assertEqual(updated_items[0]["line_subtotal"], 50.0)
        self.assertEqual(resp.data["cart_subtotal"], 50.0)

    def test_05_switch_store_rejects_incompatible_book_or_excessive_quantity(self):
        """Switching rejects products that do not share the exact same book reference or have insufficient stock."""
        self.client.force_authenticate(self.patron)
        cart_item = CartService.add_item(self.patron, str(self.prod_a1.id), 2)

        # Try switching to Dune (different book reference)
        resp = self.client.post(
            f"/api/cart/items/{cart_item.id}/switch-store/",
            {"product_id": str(self.prod_a2.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("canonical book edition", str(resp.data))

        # Try switching to suspended store
        resp = self.client.post(
            f"/api/cart/items/{cart_item.id}/switch-store/",
            {"product_id": str(self.prod_c1.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("not accepting orders", str(resp.data))

    def test_06_global_store_selection_success_and_failure(self):
        """Convenience feature: Apply single store to all cart items."""
        self.client.force_authenticate(self.patron)
        CartService.add_item(self.patron, str(self.prod_a1.id), 1)  # Frankenstein from A
        CartService.add_item(self.patron, str(self.prod_b2.id), 1)  # Dune from B

        # Check eligible global stores in Cart response
        cart_resp = self.client.get("/api/cart/")
        eligible_ids = [s["store_id"] for s in cart_resp.data["eligible_global_stores"]]
        self.assertIn(str(self.mgr_a.id), eligible_ids)
        self.assertIn(str(self.mgr_b.id), eligible_ids)

        # Switch everything to Store A
        resp = self.client.post(
            "/api/cart/select-global-store/",
            {"store_id": str(self.mgr_a.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        for it in resp.data["items"]:
            self.assertEqual(it["store_id"], str(self.mgr_a.id))

        # Now add Book 3 (exclusive to Store A)
        CartService.add_item(self.patron, str(self.prod_a3.id), 1)

        # Store B does not stock Book 3, so global selection for Store B must fail cleanly
        resp_fail = self.client.post(
            "/api/cart/select-global-store/",
            {"store_id": str(self.mgr_b.id)},
            format="json",
        )
        self.assertEqual(resp_fail.status_code, 400)
        self.assertIn("No single store currently supplies all items", str(resp_fail.data))

    # ── 3. CHECKOUT, MULTI-STORE ORDER GROUPING & QR PAYMENT ──────────────────
    def test_07_checkout_creates_pending_order_with_store_groups_and_qr_payload(self):
        """Checkout with payment_method=qr_demo creates pending order with store groups and does not deduct stock yet."""
        self.client.force_authenticate(self.patron)
        CartService.add_item(self.patron, str(self.prod_a1.id), 2)  # Store A: 2 x $20 = $40
        CartService.add_item(self.patron, str(self.prod_b2.id), 1)  # Store B: 1 x $30 = $30

        resp = self.client.post(
            "/api/checkout/",
            {
                "payment_method": "qr_demo",
                "customer_name": "Reader Patron",
                "customer_email": "patron@akashic.library",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.data

        self.assertEqual(data["status"], "PENDING")
        self.assertEqual(data["payment_status"], "PENDING")
        self.assertEqual(data["total"], "70.00")
        self.assertTrue(data["qr_payload"].startswith("akashic-demo-pay:"))

        # Check multi-store grouping in order response
        store_groups = data["store_groups"]
        self.assertEqual(len(store_groups), 2)
        group_names = [g["store_name"] for g in store_groups]
        self.assertIn("Alexandria Rare Manuscripts", group_names)
        self.assertIn("Byzantine Folio Guild", group_names)

        # Inventory must NOT be decremented before confirmation
        self.inv_a1.refresh_from_db()
        self.inv_b2.refresh_from_db()
        self.assertEqual(self.inv_a1.quantity, 15)
        self.assertEqual(self.inv_b2.quantity, 8)

    def test_08_confirm_demo_payment_atomically_deducts_inventory_and_is_idempotent(self):
        """Confirming demo payment decrements stock atomically, transitions status, and ignores duplicate confirms."""
        self.client.force_authenticate(self.patron)
        CartService.add_item(self.patron, str(self.prod_a1.id), 2)  # Store A: 2 units
        CartService.add_item(self.patron, str(self.prod_b2.id), 3)  # Store B: 3 units

        checkout_resp = self.client.post(
            "/api/checkout/",
            {"payment_method": "qr_demo", "customer_name": "Alex Buyer"},
            format="json",
        )
        order_id = checkout_resp.data["id"]

        # Confirm Payment (First call)
        confirm_resp = self.client.post(
            f"/api/orders/{order_id}/confirm-payment/",
            {"idempotency_key": "idemp-key-12345"},
            format="json",
        )
        self.assertEqual(confirm_resp.status_code, 200)
        self.assertEqual(confirm_resp.data["status"], "CONFIRMED")
        self.assertEqual(confirm_resp.data["payment_status"], "PAID")

        # Verify stock was decremented correctly
        self.inv_a1.refresh_from_db()
        self.inv_b2.refresh_from_db()
        self.assertEqual(self.inv_a1.quantity, 13)  # 15 - 2 = 13
        self.assertEqual(self.inv_b2.quantity, 5)   # 8 - 3 = 5

        # Verify other store stock was untouched
        self.inv_b1.refresh_from_db()
        self.inv_a2.refresh_from_db()
        self.assertEqual(self.inv_b1.quantity, 10)
        self.assertEqual(self.inv_a2.quantity, 12)

        # Cart should now be empty
        cart = Cart.objects.get(user=self.patron)
        self.assertEqual(cart.items.count(), 0)

        # Double Confirmation (Simulated Double-Click / Idempotency)
        repeat_resp = self.client.post(
            f"/api/orders/{order_id}/confirm-payment/",
            {"idempotency_key": "idemp-key-12345"},
            format="json",
        )
        self.assertEqual(repeat_resp.status_code, 200)
        self.assertEqual(repeat_resp.data["status"], "CONFIRMED")

        # Stock must NOT be decremented a second time!
        self.inv_a1.refresh_from_db()
        self.inv_b2.refresh_from_db()
        self.assertEqual(self.inv_a1.quantity, 13)
        self.assertEqual(self.inv_b2.quantity, 5)

    def test_09_invoice_endpoint_returns_immutable_purchase_snapshot(self):
        """GET /api/orders/<id>/invoice/ returns complete printable and downloadable bill."""
        self.client.force_authenticate(self.patron)
        CartService.add_item(self.patron, str(self.prod_a1.id), 1)

        checkout_resp = self.client.post(
            "/api/checkout/",
            {"payment_method": "qr_demo", "customer_name": "Lord Byron"},
            format="json",
        )
        order_id = checkout_resp.data["id"]
        self.client.post(f"/api/orders/{order_id}/confirm-payment/")

        # Fetch Invoice
        inv_resp = self.client.get(f"/api/orders/{order_id}/invoice/")
        self.assertEqual(inv_resp.status_code, 200)
        data = inv_resp.data

        self.assertIn("invoice_number", data)
        self.assertIn("issuer", data)
        self.assertEqual(data["issuer"]["name"], "Akashic Store")
        self.assertEqual(data["order"]["customer_name"], "Lord Byron")
        self.assertEqual(data["order"]["payment_status"], "PAID")
        self.assertEqual(len(data["order"]["items"]), 1)
        self.assertEqual(data["order"]["items"][0]["store_name"], "Alexandria Rare Manuscripts")

    # ── 4. REVENUE INTEGRATION ACCURACY TESTS ──────────────────────────────────
    def test_10_store_manager_and_admin_revenue_reflect_completed_orders(self):
        """Revenue updates only from PAID completed orders and attributes sales to the proper store manager."""
        self.client.force_authenticate(self.patron)
        CartService.add_item(self.patron, str(self.prod_a1.id), 2)  # Store A: 2 x $20 = $40
        CartService.add_item(self.patron, str(self.prod_b2.id), 1)  # Store B: 1 x $30 = $30

        checkout_resp = self.client.post(
            "/api/checkout/",
            {"payment_method": "qr_demo", "customer_name": "Lady Augusta"},
            format="json",
        )
        order_id = checkout_resp.data["id"]

        # Before payment confirmation, Manager A revenue must be $0.00
        self.client.force_authenticate(self.mgr_a)
        rev_before = self.client.get("/api/store/manager/revenue/")
        self.assertEqual(rev_before.data["gross_revenue"], "$0.00")
        self.assertEqual(rev_before.data["total_orders"], 0)

        # Admin revenue before payment confirmation must be 0.00
        self.client.force_authenticate(self.admin)
        admin_rev_before = self.client.get("/api/store/admin/revenue/")
        self.assertEqual(admin_rev_before.data["gross_revenue"], "0.00")
        self.assertEqual(admin_rev_before.data["total_orders"], 0)

        # Now confirm payment
        self.client.force_authenticate(self.patron)
        self.client.post(f"/api/orders/{order_id}/confirm-payment/")

        # Verify Manager A revenue (earned $40.00 gross from 2 units of Frankenstein)
        self.client.force_authenticate(self.mgr_a)
        rev_a = self.client.get("/api/store/manager/revenue/")
        self.assertEqual(rev_a.status_code, 200)
        self.assertEqual(rev_a.data["gross_revenue"], "$40.00")
        self.assertEqual(rev_a.data["net_payout"], "$34.00")  # 85%
        self.assertEqual(rev_a.data["total_orders"], 1)

        # Verify Manager B revenue (earned $30.00 gross from 1 unit of Dune)
        self.client.force_authenticate(self.mgr_b)
        rev_b = self.client.get("/api/store/manager/revenue/")
        self.assertEqual(rev_b.status_code, 200)
        self.assertEqual(rev_b.data["gross_revenue"], "$30.00")
        self.assertEqual(rev_b.data["net_payout"], "$25.50")
        self.assertEqual(rev_b.data["total_orders"], 1)

        # Verify Admin Global Revenue (aggregate $70.00 gross across both stores)
        self.client.force_authenticate(self.admin)
        admin_rev = self.client.get("/api/store/admin/revenue/")
        self.assertEqual(admin_rev.status_code, 200)
        self.assertEqual(admin_rev.data["gross_revenue"], "70.00")
        self.assertEqual(admin_rev.data["total_orders"], 1)
        self.assertEqual(admin_rev.data["average_order_value"], "70.00")
        self.assertEqual(len(admin_rev.data["top_performing_managers"]), 2)
