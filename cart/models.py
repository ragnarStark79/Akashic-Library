"""
Cart models — Manages the user's shopping cart.

Design decisions:
  - Cart strictly references PostgreSQL User and StoreProduct. It does not
    reference MongoDB documents directly.
  - CartItem enforces positive quantities and uniqueness per cart.
"""

import uuid
from django.db import models
from django.db.models import CheckConstraint, UniqueConstraint, Q
from django.conf import settings

from store.models import StoreProduct


class CartStatus(models.TextChoices):
    """Lifecycle statuses for a shopping cart."""
    ACTIVE = "ACTIVE", "Active"
    ABANDONED = "ABANDONED", "Abandoned"
    # Note: COMPLETED or CHECKED_OUT might be added when Orders are implemented,
    # or the cart might simply be cleared. For now, ACTIVE is the primary state.


class Cart(models.Model):
    """
    Represents a user's active shopping session.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart"
    )
    status = models.CharField(
        max_length=50,
        choices=CartStatus.choices,
        default=CartStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart {self.id} for {self.user}"


class CartItem(models.Model):
    """
    An individual product and its selected quantity within a Cart.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name="+"
    )
    quantity = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["cart", "product"],
                name="unique_cart_product"
            ),
            CheckConstraint(
                condition=Q(quantity__gt=0),
                name="quantity_gt_zero"
            )
        ]

    def __str__(self):
        return f"{self.quantity} x {self.product.book_reference} in Cart {self.cart.id}"
