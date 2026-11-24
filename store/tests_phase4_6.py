"""
Unit and integration tests for Stage 4.6 — Strict Portal Separation, Scoped Ownership & User Governance.
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole, ManagerStatus
from store.models import StoreProduct, Inventory, StoreStatus


class Stage46SeparationAndGovernanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin User
        self.admin = User.objects.create_superuser(
            username="head_archivist",
            email="archivist@akashic.library",
            password="ArchivistPass123!",
            role=UserRole.ADMIN,
        )

        # Store Manager A (Approved)
        self.manager_a = User.objects.create_user(
            username="curator_alex",
            email="alex@curators.org",
            password="AlexPass123!",
            role=UserRole.STORE_MANAGER,
        )
        self.manager_a.manager_status = ManagerStatus.APPROVED
        self.manager_a.business_name = "Alex Antiquarian"
        self.manager_a.save()

        # Store Manager B (Approved)
        self.manager_b = User.objects.create_user(
            username="curator_bianca",
            email="bianca@curators.org",
            password="BiancaPass123!",
            role=UserRole.STORE_MANAGER,
        )
        self.manager_b.manager_status = ManagerStatus.APPROVED
        self.manager_b.business_name = "Bianca Rare Books"
        self.manager_b.save()

        # Store Manager (Pending)
        self.pending_mgr = User.objects.create_user(
            username="pending_curator",
            email="pending@curators.org",
            password="PendingPass123!",
            role=UserRole.STORE_MANAGER,
        )
        self.pending_mgr.manager_status = ManagerStatus.PENDING
        self.pending_mgr.save()

        # Store Manager (Suspended)
        self.suspended_mgr = User.objects.create_user(
            username="suspended_curator",
            email="suspended@curators.org",
            password="SuspendedPass123!",
            role=UserRole.STORE_MANAGER,
        )
        self.suspended_mgr.manager_status = ManagerStatus.SUSPENDED
        self.suspended_mgr.save()

        # Normal Patron User
        self.patron = User.objects.create_user(
            username="patron_reader",
            email="patron@gmail.com",
            password="PatronPass123!",
            role=UserRole.USER,
        )

        # Product A owned by Manager A
        self.product_a = StoreProduct.objects.create(
            book_reference="OL1001A",
            edition="Manager A Exclusive",
            price=Decimal("24.00"),
            status=StoreStatus.IN_STOCK,
            created_by=self.manager_a,
        )
        self.inventory_a = Inventory.objects.create(
            product=self.product_a,
            quantity=10,
            reserved_quantity=0,
        )

        # Product B owned by Manager B
        self.product_b = StoreProduct.objects.create(
            book_reference="OL2002B",
            edition="Manager B Exclusive",
            price=Decimal("35.00"),
            status=StoreStatus.IN_STOCK,
            created_by=self.manager_b,
        )
        self.inventory_b = Inventory.objects.create(
            product=self.product_b,
            quantity=20,
            reserved_quantity=0,
        )

    def test_01_admin_denied_access_to_manager_endpoints(self):
        """Admin must NOT access Store Manager endpoints or mutate inventory."""
        self.client.force_authenticate(user=self.admin)

        # Overview
        r1 = self.client.get("/api/store/manager/overview/")
        self.assertEqual(r1.status_code, 403)

        # Products
        r2 = self.client.get("/api/store/manager/products/")
        self.assertEqual(r2.status_code, 403)

        # Manager inventory adjustment
        r3 = self.client.post(
            "/api/store/manager/inventory/",
            {"product_id": str(self.product_a.id), "available_quantity": 99},
            format="json",
        )
        self.assertEqual(r3.status_code, 403)

        # Direct inventory patch
        r4 = self.client.patch(
            f"/api/store/products/{self.product_a.id}/inventory/",
            {"quantity": 99},
            format="json",
        )
        self.assertEqual(r4.status_code, 403)

        # Revenue
        r5 = self.client.get("/api/store/manager/revenue/")
        self.assertEqual(r5.status_code, 403)

    def test_02_manager_denied_access_to_admin_endpoints(self):
        """Store Managers must NOT access Admin endpoints."""
        self.client.force_authenticate(user=self.manager_a)

        r1 = self.client.get("/api/store/admin/overview/")
        self.assertEqual(r1.status_code, 403)

        r2 = self.client.get("/api/store/admin/managers/")
        self.assertEqual(r2.status_code, 403)

        r3 = self.client.get("/api/store/admin/users/")
        self.assertEqual(r3.status_code, 403)

        r4 = self.client.get("/api/store/admin/products/")
        self.assertEqual(r4.status_code, 403)

        r5 = self.client.get("/api/store/admin/revenue/")
        self.assertEqual(r5.status_code, 403)

        r6 = self.client.post(
            f"/api/store/admin/users/{self.patron.id}/action/",
            {"action": "suspend"},
            format="json",
        )
        self.assertEqual(r6.status_code, 403)

    def test_03_unapproved_and_regular_users_denied_both_portals(self):
        """Pending/Suspended managers and patrons cannot access manager or admin endpoints."""
        for user in [self.patron, self.pending_mgr, self.suspended_mgr]:
            self.client.force_authenticate(user=user)
            # Manager overview
            r_mgr = self.client.get("/api/store/manager/overview/")
            self.assertEqual(r_mgr.status_code, 403)
            # Admin overview
            r_adm = self.client.get("/api/store/admin/overview/")
            self.assertEqual(r_adm.status_code, 403)

    def test_04_scoped_manager_ownership_enforced(self):
        """Manager A can adjust Product A, but cannot adjust Manager B's Product B."""
        self.client.force_authenticate(user=self.manager_a)

        # Manager A updates their own product A
        r_own = self.client.post(
            "/api/store/manager/inventory/",
            {"product_id": str(self.product_a.id), "available_quantity": 18},
            format="json",
        )
        self.assertEqual(r_own.status_code, 200)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.available_quantity, 18)

        # Manager A attempts to adjust Manager B's product B -> 404
        r_other = self.client.post(
            "/api/store/manager/inventory/",
            {"product_id": str(self.product_b.id), "available_quantity": 999},
            format="json",
        )
        self.assertEqual(r_other.status_code, 404)
        self.inventory_b.refresh_from_db()
        self.assertEqual(self.inventory_b.available_quantity, 20)

    def test_05_admin_user_suspend_and_reactivate(self):
        """Admin can suspend and reactivate a patron account with strict safety checks."""
        self.client.force_authenticate(user=self.admin)

        # 1. Admin suspends patron
        r_suspend = self.client.post(
            f"/api/store/admin/users/{self.patron.id}/action/",
            {"action": "suspend"},
            format="json",
        )
        self.assertEqual(r_suspend.status_code, 200)
        self.patron.refresh_from_db()
        self.assertFalse(self.patron.is_active)

        # 2. Suspended patron cannot authenticate via login API (rejected with 400)
        unauth_client = APIClient()
        login_resp = unauth_client.post(
            "/api/auth/login/",
            {"username": "patron_reader", "password": "PatronPass123!"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, 400)
        self.assertIn("non_field_errors", login_resp.json())

        # 3. Admin reactivates patron
        r_reactivate = self.client.post(
            f"/api/store/admin/users/{self.patron.id}/action/",
            {"action": "reactivate"},
            format="json",
        )
        self.assertEqual(r_reactivate.status_code, 200)
        self.patron.refresh_from_db()
        self.assertTrue(self.patron.is_active)

        # 4. Reactivated patron can authenticate again
        login_resp_ok = unauth_client.post(
            "/api/auth/login/",
            {"username": "patron_reader", "password": "PatronPass123!"},
            format="json",
        )
        self.assertEqual(login_resp_ok.status_code, 200)

    def test_06_admin_self_suspension_prevented(self):
        """Admin cannot suspend their own account."""
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(
            f"/api/store/admin/users/{self.admin.id}/action/",
            {"action": "suspend"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot suspend their own account", resp.json()["detail"])
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_07_last_active_admin_suspension_prevented(self):
        """Cannot suspend the last active administrator account."""
        # Ensure only 1 active admin
        self.client.force_authenticate(user=self.admin)
        # Attempting to suspend this admin by another admin (simulated by same id or another)
        resp = self.client.post(
            f"/api/store/admin/users/{self.admin.id}/action/",
            {"action": "suspend"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
