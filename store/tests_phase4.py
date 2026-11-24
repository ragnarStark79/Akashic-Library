"""
Unit and integration tests for Stage 4 — Authentication, Role-based Dashboards, and Stepper Actions.
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, UserRole, ManagerStatus
from store.models import StoreProduct, Inventory, StoreStatus


class Stage4MasterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username="head_archivist",
            email="archivist@akashic.library",
            password="ArchivistPass123!",
        )

        # Store Manager (Approved)
        self.manager = User.objects.create_user(
            username="curator_elena",
            email="elena@books.org",
            password="CuratorPass123!",
            role=UserRole.STORE_MANAGER,
        )
        self.manager.manager_status = ManagerStatus.APPROVED
        self.manager.business_name = "Elena's Rare Editions"
        self.manager.save()

        # Store Manager (Pending)
        self.pending_manager = User.objects.create_user(
            username="curator_novice",
            email="novice@books.org",
            password="NovicePass123!",
            role=UserRole.STORE_MANAGER,
        )
        self.pending_manager.manager_status = ManagerStatus.PENDING
        self.pending_manager.save()

        # Regular Patron
        self.patron = User.objects.create_user(
            username="book_lover_sam",
            email="sam@gmail.com",
            password="SamPass123!",
            role=UserRole.USER,
        )

        # Sample StoreProduct
        self.product = StoreProduct.objects.create(
            book_reference="OL12345W",
            edition="1st Collector's Hardcover",
            price=Decimal("29.99"),
            status=StoreStatus.IN_STOCK,
            created_by=self.manager,
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            quantity=15,
            reserved_quantity=0,
        )

    def test_01_user_and_manager_registration(self):
        """Test registration allows selecting USER or STORE_MANAGER, setting correct manager_status."""
        # 1. Patron registration
        resp = self.client.post(
            "/api/auth/register/",
            {
                "username": "new_reader",
                "email": "reader@example.com",
                "password": "ReaderPass123!",
                "role": "USER",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["user"]["role"], "USER")
        self.assertEqual(resp.json()["user"]["manager_status"], "APPROVED")

        # 2. Store Manager registration
        resp_mgr = self.client.post(
            "/api/auth/register/",
            {
                "username": "new_curator",
                "email": "curator@example.com",
                "password": "CuratorPass123!",
                "role": "STORE_MANAGER",
                "business_name": "Gothic Antiquarian",
            },
            format="json",
        )
        self.assertEqual(resp_mgr.status_code, 201)
        self.assertEqual(resp_mgr.json()["user"]["role"], "STORE_MANAGER")
        self.assertEqual(resp_mgr.json()["user"]["manager_status"], "PENDING")
        self.assertEqual(resp_mgr.json()["user"]["business_name"], "Gothic Antiquarian")

    def test_02_admin_store_manager_approval_actions(self):
        """Admin can list and approve/reject/suspend store managers."""
        self.client.force_authenticate(user=self.admin)

        # List managers
        resp = self.client.get("/api/store/admin/managers/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.json()["managers"]) >= 2)

        # Approve pending manager
        approve_resp = self.client.post(
            f"/api/store/admin/managers/{self.pending_manager.id}/action/",
            {"action": "approve"},
            format="json",
        )
        self.assertEqual(approve_resp.status_code, 200)
        self.pending_manager.refresh_from_db()
        self.assertEqual(self.pending_manager.manager_status, ManagerStatus.APPROVED)
        self.assertEqual(self.pending_manager.approved_by, self.admin)

        # Suspend manager
        suspend_resp = self.client.post(
            f"/api/store/admin/managers/{self.pending_manager.id}/action/",
            {"action": "suspend"},
            format="json",
        )
        self.assertEqual(suspend_resp.status_code, 200)
        self.pending_manager.refresh_from_db()
        self.assertEqual(self.pending_manager.manager_status, ManagerStatus.SUSPENDED)

    def test_03_store_manager_scoped_overview_and_inventory(self):
        """Approved store manager can view their scoped overview and update inventory."""
        self.client.force_authenticate(user=self.manager)

        # Overview
        resp = self.client.get("/api/store/manager/overview/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["business_name"], "Elena's Rare Editions")
        self.assertEqual(resp.json()["metrics"]["total_products"], 1)

        # Inventory update
        inv_resp = self.client.post(
            "/api/store/manager/inventory/",
            {"product_id": str(self.product.id), "available_quantity": 42},
            format="json",
        )
        self.assertEqual(inv_resp.status_code, 200)
        self.product.inventory.refresh_from_db()
        self.assertEqual(self.product.inventory.available_quantity, 42)

    def test_04_add_to_box_stepper_actions(self):
        """Add to box endpoint supports increment, decrement, set, and get actions."""
        self.client.force_authenticate(user=self.patron)

        # 1. Increment from 0 -> 1
        res1 = self.client.post(
            f"/api/store/products/{self.product.id}/add-to-box/",
            {"action": "increment", "quantity": 1},
            format="json",
        )
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["item_quantity"], 1)
        self.assertEqual(res1.json()["cart_count"], 1)

        # 2. Increment from 1 -> 2
        res2 = self.client.post(
            f"/api/store/products/{self.product.id}/add-to-box/",
            {"action": "increment", "quantity": 1},
            format="json",
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["item_quantity"], 2)
        self.assertEqual(res2.json()["cart_count"], 2)

        # 3. Decrement from 2 -> 1
        res3 = self.client.post(
            f"/api/store/products/{self.product.id}/add-to-box/",
            {"action": "decrement", "quantity": 1},
            format="json",
        )
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json()["item_quantity"], 1)
        self.assertEqual(res3.json()["cart_count"], 1)

        # 4. Decrement from 1 -> 0 (removes item)
        res4 = self.client.post(
            f"/api/store/products/{self.product.id}/add-to-box/",
            {"action": "decrement", "quantity": 1},
            format="json",
        )
        self.assertEqual(res4.status_code, 200)
        self.assertEqual(res4.json()["item_quantity"], 0)
        self.assertEqual(res4.json()["cart_count"], 0)
