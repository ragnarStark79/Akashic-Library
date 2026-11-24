"""
Orders models — Manages historical order snapshots, multi-store attribution,
and payment state.
"""

import uuid
from django.db import models
from django.conf import settings
from store.models import StoreProduct


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"


class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    status = models.CharField(
        max_length=50,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    payment_reference = models.CharField(max_length=100, blank=True, default="")

    # Customer & Delivery metadata snapshots
    customer_name = models.CharField(max_length=200, blank=True, default="")
    customer_email = models.EmailField(blank=True, default="")
    shipping_address = models.JSONField(blank=True, default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.order_number or self.id} for {self.user}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"AK-2026-{str(self.id)[:8].upper()}"
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """
    An immutable snapshot of a purchased product.
    Even if StoreProduct changes price, or the MongoDB Book changes its title,
    this item remains historically accurate.
    Also retains immutable store attribution for multi-seller revenue reporting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.SET_NULL,  # Don't delete order history if product is deleted
        null=True,
        blank=True,
        related_name="order_items"
    )

    # Multi-store seller snapshot
    store_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_order_items",
        help_text="Immutable snapshot of the store curator who supplied this book."
    )
    store_name = models.CharField(max_length=255, blank=True, default="")

    # Bibliographic & Price Snapshots
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255, blank=True, default="")
    cover_image = models.CharField(max_length=1000, blank=True, default="")
    edition = models.CharField(max_length=255, blank=True, default="")
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_percentage = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} x {self.title} ({self.store_name or 'Akashic'} - Order {self.order.id})"


class Payment(models.Model):
    """
    Simulated demonstration payment session and record.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="payment"
    )
    status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    qr_payload = models.TextField(blank=True, default="")
    idempotency_key = models.CharField(max_length=120, unique=True, null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.reference_id or self.id} ({self.status}) for Order {self.order.id}"

    def save(self, *args, **kwargs):
        if not self.reference_id:
            self.reference_id = f"DEMO-PAY-{str(self.id)[:8].upper()}"
        super().save(*args, **kwargs)
