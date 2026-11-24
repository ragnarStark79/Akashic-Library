from decimal import Decimal
import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole, ManagerStatus
from store.models import StoreProduct, StoreProductDetail, StoreStatus
from store.services import StoreService


class StoreProductEditorialDetailPersistenceTests(TestCase):
    """
    Tests for Stage 6.1 BDP Editorial Data Persistence:
    Validates sample_excerpt, excerpt, content_warnings, data integrity,
    and non-destructive field updating.
    """

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            username="curator_jane",
            email="jane@akashic.store",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            manager_status=ManagerStatus.APPROVED,
            business_name="Jane's Curated Codex",
        )
        self.other_manager = User.objects.create_user(
            username="curator_bob",
            email="bob@akashic.store",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            manager_status=ManagerStatus.APPROVED,
            business_name="Bob's Stacks",
        )
        self.customer = User.objects.create_user(
            username="reader_alice",
            email="alice@readers.org",
            password="Password123!",
            role=UserRole.USER,
        )

        self.product = StoreProduct.objects.create(
            created_by=self.manager,
            book_reference="book_test_61",
            edition="Curated First Edition",
            condition="Fine",
            price=Decimal("28.00"),
            status=StoreStatus.IN_STOCK,
            card_customization={
                "background_color": "#FBF6EE",
                "title_color": "#111827",
            },
        )

        # Baseline detail
        self.detail = StoreProductDetail.objects.create(
            product=self.product,
            original_price=Decimal("35.00"),
            hero_theme={
                "background_color": "#FEE6D0",
                "wave_color": "#FDD7B5",
                "title_color": "#111827",
            },
            at_a_glance=[
                {"icon": "🪄", "label": "Gothic", "bg_color": "#3b1c54", "text_color": "#fff"},
                {"icon": "📜", "label": "Mystery", "bg_color": "#1e3a5f", "text_color": "#fff"},
            ],
            synopsis="A spine-chilling atmospheric story set in late-Victorian Yorkshire.",
            full_description="Deep within the moors, secrets sleep beneath the weathered heather.",
            editorial_cards=[
                {
                    "heading": "Masterpiece",
                    "quote": "An unforgettable modern gothic standard.",
                    "attribution": "Akashic Curators",
                }
            ],
            why_we_chose="Selected for its luminous prose and haunting psychological intimacy.",
            excerpt="Original sample excerpt line.",
            content_warnings=["Violence"],
        )

    def test_update_detail_with_sample_excerpt_and_content_warnings(self):
        """Manager updates both sample_excerpt and content_warnings via PATCH."""
        self.client.force_authenticate(user=self.manager)
        url = reverse("store:product-detail-update", kwargs={"pk": self.product.id})

        multi_paragraph_excerpt = (
            "The fog rose from the black tarn like breath from an open mouth.\n\n"
            "Margaret tightened her woolen shawl against the damp chill, listening for "
            "the faint sound of carriage wheels that should have arrived at dusk.\n\n"
            "No sound came—only the relentless cry of the wind across the gorse."
        )
        warnings = ["Gothic Horror", "Supernatural Elements", "Isolation", "Grief"]

        response = self.client.patch(
            url,
            {
                "sample_excerpt": multi_paragraph_excerpt,
                "content_warnings": warnings,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify from fresh database fetch
        fresh_detail = StoreProductDetail.objects.get(product=self.product)
        self.assertEqual(fresh_detail.excerpt, multi_paragraph_excerpt)
        self.assertEqual(fresh_detail.sample_excerpt, multi_paragraph_excerpt)
        self.assertEqual(fresh_detail.content_warnings, warnings)

        # Verify other fields remain completely intact
        self.assertEqual(fresh_detail.original_price, Decimal("35.00"))
        self.assertEqual(fresh_detail.hero_theme.get("background_color"), "#FEE6D0")
        self.assertEqual(fresh_detail.hero_theme.get("title_color"), "#111827")
        self.assertEqual(len(fresh_detail.at_a_glance), 2)
        self.assertEqual(fresh_detail.synopsis, "A spine-chilling atmospheric story set in late-Victorian Yorkshire.")
        self.assertEqual(len(fresh_detail.editorial_cards), 1)

    def test_update_detail_clearing_content_warnings(self):
        """Manager can safely clear content warnings by passing an empty list."""
        self.client.force_authenticate(user=self.manager)
        url = reverse("store:product-detail-update", kwargs={"pk": self.product.id})

        response = self.client.patch(
            url,
            {
                "content_warnings": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        fresh_detail = StoreProductDetail.objects.get(product=self.product)
        self.assertEqual(fresh_detail.content_warnings, [])
        # Excerpt should still be present
        self.assertEqual(fresh_detail.excerpt, "Original sample excerpt line.")

    def test_content_warnings_normalization_and_deduplication(self):
        """Ensure whitespace is stripped, empty items removed, and duplicates deduplicated while preserving order."""
        self.client.force_authenticate(user=self.manager)
        url = reverse("store:product-detail-update", kwargs={"pk": self.product.id})

        response = self.client.patch(
            url,
            {
                "content_warnings": ["  Blood  ", "Violence", "", "Blood", "  Violence  ", "Loss"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        fresh_detail = StoreProductDetail.objects.get(product=self.product)
        self.assertEqual(fresh_detail.content_warnings, ["Blood", "Violence", "Loss"])

    def test_public_product_detail_endpoint_returns_both_fields(self):
        """Public GET /api/store/products/<id>/ returns sample_excerpt, excerpt, and content_warnings."""
        url = reverse("store:product-detail", kwargs={"pk": self.product.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        detail = data.get("detail", {})
        self.assertIn("excerpt", detail)
        self.assertIn("sample_excerpt", detail)
        self.assertEqual(detail["excerpt"], "Original sample excerpt line.")
        self.assertEqual(detail["sample_excerpt"], "Original sample excerpt line.")
        self.assertEqual(detail["content_warnings"], ["Violence"])

    def test_nonexistent_product_returns_404(self):
        """Accessing a random non-existent UUID must return 404, never fallback."""
        random_uuid = uuid.uuid4()
        url = reverse("store:product-detail", kwargs={"pk": random_uuid})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_or_customer_cannot_patch_detail(self):
        """Non-managers / non-admins cannot update detail content."""
        url = reverse("store:product-detail-update", kwargs={"pk": self.product.id})

        # Unauthenticated
        res1 = self.client.patch(url, {"excerpt": "Hacked excerpt"}, format="json")
        self.assertIn(res1.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Customer user
        self.client.force_authenticate(user=self.customer)
        res2 = self.client.patch(url, {"excerpt": "Hacked excerpt"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)
