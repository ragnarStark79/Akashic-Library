"""
Tests for Step 6: Store Products and Inventory.
"""

from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError

from accounts.models import User, UserRole
from store.models import StoreProduct, Inventory, StoreStatus
from store.services import StoreService


class StoreModelTests(TestCase):
    def test_inventory_check_constraint(self):
        """Inventory quantity must be >= reserved_quantity."""
        from django.db.utils import IntegrityError
        
        product = StoreProduct.objects.create(
            book_reference="book1",
            price=Decimal("10.00"),
            status=StoreStatus.IN_STOCK
        )
        
        # Valid
        inv = Inventory.objects.create(product=product, quantity=5, reserved_quantity=2)
        
        # Invalid
        inv.reserved_quantity = 10
        with self.assertRaises(IntegrityError):
            inv.save()

    def test_available_quantity_calculation(self):
        product = StoreProduct.objects.create(book_reference="book1", price=Decimal("10.00"))
        inv = Inventory.objects.create(product=product, quantity=10, reserved_quantity=3)
        self.assertEqual(inv.available_quantity, 7)


class StoreServiceTests(TestCase):
    @patch('store.services.get_book_by_id')
    def test_create_store_product_valid(self, mock_get_book):
        mock_get_book.return_value = {"_id": "book1"}
        
        product = StoreService.create_store_product(
            book_reference="book1",
            price=Decimal("15.99"),
            quantity=20
        )
        self.assertEqual(product.price, Decimal("15.99"))
        self.assertEqual(product.status, StoreStatus.IN_STOCK)
        self.assertEqual(product.inventory.quantity, 20)
        self.assertEqual(product.inventory.available_quantity, 20)

    @patch('store.services.get_book_by_id')
    def test_create_store_product_invalid_book(self, mock_get_book):
        from discovery.exceptions import BookNotFoundError
        mock_get_book.side_effect = BookNotFoundError("Not found")
        
        with self.assertRaises(DjangoValidationError):
            StoreService.create_store_product(book_reference="badbook", price=Decimal("15.99"))

    @patch('store.services.get_book_by_id')
    def test_negative_price_rejected(self, mock_get_book):
        mock_get_book.return_value = {"_id": "book1"}
        with self.assertRaises(DjangoValidationError):
            StoreService.create_store_product(book_reference="book1", price=Decimal("-5.00"))

    @patch('store.services.get_book_by_id')
    def test_inventory_auto_status_updates(self, mock_get_book):
        mock_get_book.return_value = {"_id": "book1"}
        product = StoreService.create_store_product(
            book_reference="book1",
            price=Decimal("15.99"),
            quantity=10,
            status=StoreStatus.IN_STOCK
        )
        self.assertEqual(product.status, StoreStatus.IN_STOCK)
        
        # Drop to low stock
        StoreService.update_inventory(product, quantity=4)
        self.assertEqual(product.status, StoreStatus.LOW_STOCK)
        
        # Drop to out of stock
        StoreService.update_inventory(product, quantity=0)
        self.assertEqual(product.status, StoreStatus.OUT_OF_STOCK)

        # Discontinued stays discontinued
        product.status = StoreStatus.DISCONTINUED
        product.save()
        StoreService.update_inventory(product, quantity=100)
        self.assertEqual(product.status, StoreStatus.DISCONTINUED)


class StoreAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="user1", email="u@test.com", password="pw", role=UserRole.USER)
        self.manager = User.objects.create_user(username="mgr", email="m@test.com", password="pw", role=UserRole.STORE_MANAGER)
        
        self.product = StoreProduct.objects.create(
            book_reference="book1",
            price=Decimal("20.00"),
            status=StoreStatus.IN_STOCK
        )
        Inventory.objects.create(product=self.product, quantity=10, reserved_quantity=0)

    def test_public_list(self):
        resp = self.client.get("/api/store/products/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["results"]), 1)

    def test_public_detail(self):
        resp = self.client.get(f"/api/store/products/{self.product.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["inventory"]["quantity"], 10)

    def test_user_cannot_update_product(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(f"/api/store/products/{self.product.id}/manage/", {"price": "25.00"})
        self.assertEqual(resp.status_code, 403)

    def test_manager_can_update_product(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.patch(f"/api/store/products/{self.product.id}/manage/", {"price": "25.00"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("25.00"))

    def test_manager_can_update_inventory(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.patch(f"/api/store/products/{self.product.id}/inventory/", {"quantity": 0}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, StoreStatus.OUT_OF_STOCK)

    @patch('store.services.get_book_by_id')
    def test_manager_can_create_product(self, mock_get_book):
        mock_get_book.return_value = {"_id": "newbook"}
        self.client.force_authenticate(user=self.manager)
        
        resp = self.client.post("/api/store/products/manage/", {
            "book_reference": "newbook",
            "price": "19.99",
            "quantity": 50
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        
        # Verify it persisted
        p = StoreProduct.objects.get(book_reference="newbook")
        self.assertEqual(p.price, Decimal("19.99"))
        self.assertEqual(p.inventory.quantity, 50)
