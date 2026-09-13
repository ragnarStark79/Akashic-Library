"""
Tests for Step 7: Cart.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.utils import IntegrityError

from accounts.models import User, UserRole
from store.models import StoreProduct, Inventory, StoreStatus
from cart.models import Cart, CartItem, CartStatus
from cart.services import CartService


class CartModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u1", email="u1@test.com", password="pw")
        self.cart = Cart.objects.create(user=self.user)
        self.product = StoreProduct.objects.create(
            book_reference="book1",
            price=Decimal("10.00"),
            status=StoreStatus.IN_STOCK
        )

    def test_cart_item_quantity_constraint(self):
        """Cart item quantity must be > 0."""
        item = CartItem(cart=self.cart, product=self.product, quantity=0)
        with self.assertRaises(IntegrityError):
            item.save()

    def test_cart_item_unique_constraint(self):
        """Cannot have multiple cart items for same cart+product."""
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        with self.assertRaises(IntegrityError):
            CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)


class CartServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u2", email="u2@test.com", password="pw")
        self.product = StoreProduct.objects.create(
            book_reference="book2",
            price=Decimal("15.00"),
            status=StoreStatus.IN_STOCK
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            quantity=10,
            reserved_quantity=0
        )

    def test_get_or_create_cart(self):
        cart = CartService.get_or_create_active_cart(self.user)
        self.assertEqual(cart.user, self.user)
        cart2 = CartService.get_or_create_active_cart(self.user)
        self.assertEqual(cart.id, cart2.id)

    def test_add_item_valid(self):
        item = CartService.add_item(self.user, str(self.product.id), 2)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.product, self.product)
        
        # Add again increments
        item2 = CartService.add_item(self.user, str(self.product.id), 3)
        self.assertEqual(item.id, item2.id)
        self.assertEqual(item2.quantity, 5)

    def test_add_item_invalid_quantity(self):
        with self.assertRaises(DjangoValidationError):
            CartService.add_item(self.user, str(self.product.id), 0)

    def test_add_item_exceeds_inventory(self):
        with self.assertRaises(DjangoValidationError):
            CartService.add_item(self.user, str(self.product.id), 15)

    def test_add_item_discontinued(self):
        self.product.status = StoreStatus.DISCONTINUED
        self.product.save()
        with self.assertRaises(DjangoValidationError):
            CartService.add_item(self.user, str(self.product.id), 1)

    def test_update_item(self):
        item = CartService.add_item(self.user, str(self.product.id), 2)
        updated = CartService.update_item(self.user, str(item.id), 8)
        self.assertEqual(updated.quantity, 8)

    def test_update_item_exceeds_inventory(self):
        item = CartService.add_item(self.user, str(self.product.id), 2)
        with self.assertRaises(DjangoValidationError):
            CartService.update_item(self.user, str(item.id), 11)

    def test_remove_item(self):
        item = CartService.add_item(self.user, str(self.product.id), 2)
        CartService.remove_item(self.user, str(item.id))
        self.assertEqual(CartItem.objects.count(), 0)

    def test_clear_cart(self):
        CartService.add_item(self.user, str(self.product.id), 2)
        CartService.clear_cart(self.user)
        self.assertEqual(CartItem.objects.count(), 0)


class CartAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="u3", email="u3@test.com", password="pw")
        self.other_user = User.objects.create_user(username="u4", email="u4@test.com", password="pw")
        
        self.product = StoreProduct.objects.create(
            book_reference="book3",
            price=Decimal("20.00"),
            status=StoreStatus.IN_STOCK
        )
        Inventory.objects.create(product=self.product, quantity=5)

    def test_unauthenticated(self):
        resp = self.client.get("/api/cart/")
        self.assertIn(resp.status_code, [401, 403])
        resp = self.client.post("/api/cart/items/", {"product_id": str(self.product.id), "quantity": 1}, format="json")
        self.assertIn(resp.status_code, [401, 403])

    def test_get_cart_creates_active(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get("/api/cart/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "ACTIVE")
        self.assertEqual(resp.data["cart_subtotal"], 0.0)

    def test_add_and_get_cart(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post("/api/cart/items/", {
            "product_id": str(self.product.id),
            "quantity": 2
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        
        resp = self.client.get("/api/cart/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["items"]), 1)
        self.assertEqual(resp.data["items"][0]["current_price"], 20.00)
        self.assertEqual(resp.data["items"][0]["line_subtotal"], 40.00)
        self.assertEqual(resp.data["cart_subtotal"], 40.00)

    def test_idor_protection(self):
        # User adds an item
        item = CartService.add_item(self.user, str(self.product.id), 2)
        
        # Other user tries to modify it
        self.client.force_authenticate(self.other_user)
        resp = self.client.patch(f"/api/cart/items/{item.id}/", {"quantity": 1}, format="json")
        # Should return 400 because service throws ValidationError for "item does not exist in YOUR cart"
        # Since it's not their cart, it fails to find the item
        self.assertEqual(resp.status_code, 400)
        self.assertIn("CartItem does not exist", str(resp.data))

        # Other user tries to delete it
        resp = self.client.delete(f"/api/cart/items/{item.id}/")
        self.assertEqual(resp.status_code, 404)
