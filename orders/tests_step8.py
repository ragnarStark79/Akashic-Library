"""
Tests for Step 8: Orders and Checkout.
"""
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from django.core.exceptions import ValidationError
from unittest.mock import patch, MagicMock

from accounts.models import User
from store.models import StoreProduct, Inventory, StoreStatus
from cart.models import Cart, CartItem
from cart.services import CartService
from orders.models import Order, OrderItem, Payment, OrderStatus, PaymentStatus
from orders.services import CheckoutService


class MockMongoRepo:
    def __init__(self, books_data):
        self.books_data = books_data
        
    def get_books_by_ids(self, book_ids):
        return [b for b in self.books_data if str(b["_id"]) in book_ids]


class CheckoutServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="checkout_user", email="co@test.com", password="pw")
        self.product = StoreProduct.objects.create(
            book_reference="book-123",
            price=Decimal("199.00"),
            status=StoreStatus.IN_STOCK
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            quantity=10,
            reserved_quantity=0
        )
        
        # Add to cart
        self.cart_item = CartService.add_item(self.user, str(self.product.id), 2)
        
        # Valid Mock Mongo data
        self.valid_mongo_data = [{"_id": "book-123", "title": "The Book of Testing"}]

    @patch("orders.services.get_book_by_id")
    def test_checkout_success(self, mock_get_book):
        mock_get_book.return_value = self.valid_mongo_data[0]
        
        order = CheckoutService.checkout(self.user)
        
        self.assertIsNotNone(order)
        self.assertEqual(order.status, OrderStatus.CONFIRMED)
        self.assertEqual(order.total, Decimal("398.00"))
        
        # Order items created
        items = order.items.all()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].title, "The Book of Testing")
        self.assertEqual(items[0].price, Decimal("199.00")) # snapshot
        self.assertEqual(items[0].quantity, 2)
        
        # Payment created
        self.assertEqual(order.payment.status, PaymentStatus.PAID)
        self.assertEqual(order.payment.amount, Decimal("398.00"))
        
        # Inventory decremented
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 8)
        
        # Cart cleared
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.count(), 0)
        
    @patch("orders.services.get_book_by_id")
    def test_checkout_missing_book(self, mock_get_book):
        from discovery.exceptions import BookNotFoundError
        mock_get_book.side_effect = BookNotFoundError("Missing")
        
        with self.assertRaises(ValidationError) as ctx:
            CheckoutService.checkout(self.user)
        
        self.assertIn("could not be resolved from Discovery", str(ctx.exception))
        
        # Cart intact
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.count(), 1)
        
        # Inventory intact
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10)
        
        # No order created
        self.assertEqual(Order.objects.count(), 0)

    @patch("orders.services.get_book_by_id")
    def test_checkout_insufficient_stock(self, mock_get_book):
        mock_get_book.return_value = self.valid_mongo_data[0]
        
        # Set quantity to 1
        self.inventory.quantity = 1
        self.inventory.save()
        
        with self.assertRaises(ValidationError) as ctx:
            CheckoutService.checkout(self.user)
            
        self.assertIn("Insufficient stock", str(ctx.exception))
        self.assertEqual(Order.objects.count(), 0)

    @patch("orders.services.get_book_by_id")
    def test_checkout_out_of_stock_status_update(self, mock_get_book):
        mock_get_book.return_value = self.valid_mongo_data[0]
        
        # Buy exactly what's available
        self.cart_item.quantity = 10
        self.cart_item.save()
        
        CheckoutService.checkout(self.user)
        
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 0)
        
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, StoreStatus.OUT_OF_STOCK)

    @patch("orders.services.get_book_by_id")
    def test_snapshot_integrity(self, mock_get_book):
        """Verify changing StoreProduct price doesn't affect old orders."""
        mock_get_book.return_value = self.valid_mongo_data[0]
        order = CheckoutService.checkout(self.user)
        item_id = order.items.first().id
        
        # Later, price increases
        self.product.price = Decimal("299.00")
        self.product.save()
        
        # The old order item must remain unchanged
        old_item = OrderItem.objects.get(id=item_id)
        self.assertEqual(old_item.price, Decimal("199.00"))

    @patch("orders.services.get_book_by_id")
    def test_checkout_inactive_cart(self, mock_get_book):
        mock_get_book.return_value = self.valid_mongo_data[0]
        cart = Cart.objects.get(user=self.user)
        cart.status = "MERGED" # or anything not ACTIVE
        cart.save()
        
        with self.assertRaises(ValidationError) as ctx:
            CheckoutService.checkout(self.user)
            
        self.assertIn("Cart is empty or does not exist", str(ctx.exception))

    @patch("orders.services.get_book_by_id")
    def test_checkout_low_stock_transition(self, mock_get_book):
        mock_get_book.return_value = self.valid_mongo_data[0]
        # inventory has 10, buy 5 -> remaining 5, which is <= 5 threshold
        self.cart_item.quantity = 5
        self.cart_item.save()
        
        CheckoutService.checkout(self.user)
        
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, StoreStatus.LOW_STOCK)

    @patch("orders.services.get_book_by_id")
    def test_checkout_multiple_cart_items(self, mock_get_book):
        def side_effect(ref):
            if ref == "book-123":
                return self.valid_mongo_data[0]
            elif ref == "book-456":
                return {"_id": "book-456", "title": "Book Two"}
            raise BookNotFoundError(f"Missing {ref}")
            
        mock_get_book.side_effect = side_effect
        
        product2 = StoreProduct.objects.create(
            book_reference="book-456",
            price=Decimal("50.00"),
            status=StoreStatus.IN_STOCK
        )
        Inventory.objects.create(product=product2, quantity=10)
        CartService.add_item(self.user, str(product2.id), 1)
        
        order = CheckoutService.checkout(self.user)
        
        self.assertEqual(order.items.count(), 2)
        # item 1: 199.00 * 2 = 398
        # item 2: 50.00 * 1 = 50
        self.assertEqual(order.total, Decimal("448.00"))


class OrderAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="api_user", email="au@test.com", password="pw")
        self.other_user = User.objects.create_user(username="other_user", email="ou@test.com", password="pw")
        
        self.product = StoreProduct.objects.create(
            book_reference="book-api",
            price=Decimal("100.00"),
            status=StoreStatus.IN_STOCK
        )
        Inventory.objects.create(product=self.product, quantity=5)
        
        self.valid_mongo_data = [{"_id": "book-api", "title": "API Book"}]

    def test_unauthenticated_checkout(self):
        resp = self.client.post("/api/checkout/")
        self.assertIn(resp.status_code, [401, 403])

    @patch("orders.services.get_book_by_id")
    def test_successful_checkout_api(self, mock_get_book):
        mock_get_book.return_value = self.valid_mongo_data[0]
        
        # Add to cart
        CartService.add_item(self.user, str(self.product.id), 2)
        
        self.client.force_authenticate(self.user)
        resp = self.client.post("/api/checkout/")
        
        self.assertEqual(resp.status_code, 201)
        self.assertIn("id", resp.data)
        self.assertEqual(resp.data["status"], "CONFIRMED")
        self.assertEqual(resp.data["payment_status"], "PAID")
        self.assertEqual(resp.data["total"], "200.00")
        self.assertEqual(len(resp.data["items"]), 1)
        self.assertEqual(resp.data["items"][0]["title"], "API Book")

    @patch("orders.services.get_book_by_id")
    def test_empty_cart_checkout(self, mock_get_book):
        self.client.force_authenticate(self.user)
        resp = self.client.post("/api/checkout/")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Cart is empty", str(resp.data))

    @patch("orders.services.get_book_by_id")
    def test_order_idor(self, mock_get_book):
        """User B cannot view User A's order."""
        mock_get_book.return_value = self.valid_mongo_data[0]
        CartService.add_item(self.user, str(self.product.id), 1)
        
        self.client.force_authenticate(self.user)
        resp = self.client.post("/api/checkout/")
        order_id = resp.data["id"]
        
        self.client.force_authenticate(self.other_user)
        resp = self.client.get(f"/api/orders/{order_id}/")
        self.assertEqual(resp.status_code, 404)
        
        # But User A can
        self.client.force_authenticate(self.user)
        resp = self.client.get(f"/api/orders/{order_id}/")
        self.assertEqual(resp.status_code, 200)

    @patch("orders.services.get_book_by_id")
    def test_order_list_isolation(self, mock_get_book):
        """List orders only returns my orders."""
        mock_get_book.return_value = self.valid_mongo_data[0]
        CartService.add_item(self.user, str(self.product.id), 1)
        
        self.client.force_authenticate(self.user)
        self.client.post("/api/checkout/")
        
        resp = self.client.get("/api/orders/")
        self.assertEqual(len(resp.data["results"]), 1)
        
        self.client.force_authenticate(self.other_user)
        resp = self.client.get("/api/orders/")
        self.assertEqual(len(resp.data["results"]), 0)
