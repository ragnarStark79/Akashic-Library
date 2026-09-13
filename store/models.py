"""
Store models — Transactional commerce catalog and inventory.

Design decisions:
  - StoreProduct is stored in PostgreSQL and references a MongoDB Book by ID
    via `book_reference`. There is no cross-database foreign key constraint.
  - Price is stored using DecimalField to avoid floating point errors.
  - Inventory maintains non-negative quantities safely.
  - available_quantity is always calculated dynamically as (quantity - reserved_quantity).
"""

import uuid
from decimal import Decimal

from django.db import models
from django.db.models import CheckConstraint, F, Q


class StoreStatus(models.TextChoices):
    """Inventory states for a product."""
    IN_STOCK = "IN_STOCK", "In Stock"
    LOW_STOCK = "LOW_STOCK", "Low Stock"
    OUT_OF_STOCK = "OUT_OF_STOCK", "Out of Stock"
    DISCONTINUED = "DISCONTINUED", "Discontinued"
    PREORDER = "PREORDER", "Preorder"


class StoreProduct(models.Model):
    """
    Sellable representation of a particular book edition/format.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Scalar reference to the MongoDB book document `_id` string
    book_reference = models.CharField(max_length=255, db_index=True)
    
    edition = models.CharField(max_length=255, blank=True, default="")
    condition = models.CharField(max_length=255, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(
        max_length=50,
        choices=StoreStatus.choices,
        default=StoreStatus.OUT_OF_STOCK,
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.book_reference} - {self.edition} - {self.price}"


class Inventory(models.Model):
    """
    Tracks stock quantities for a StoreProduct.
    """
    product = models.OneToOneField(
        StoreProduct, 
        on_delete=models.CASCADE, 
        related_name="inventory"
    )
    quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            CheckConstraint(
                condition=Q(quantity__gte=F('reserved_quantity')),
                name='quantity_gte_reserved'
            )
        ]

    @property
    def available_quantity(self):
        """Safely calculate available units."""
        return max(0, self.quantity - self.reserved_quantity)

    def __str__(self):
        return f"Stock for {self.product.id}: {self.available_quantity} available"
