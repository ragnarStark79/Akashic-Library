"""
Cart services — Business logic for shopping cart operations.

Enforces inventory checks, valid quantities, and user isolation.
"""

from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Cart, CartItem, CartStatus
from store.models import StoreProduct, StoreStatus


class CartService:
    @staticmethod
    def get_or_create_active_cart(user) -> Cart:
        """Retrieve the user's active cart or create one if it doesn't exist."""
        cart, _ = Cart.objects.get_or_create(
            user=user,
            defaults={"status": CartStatus.ACTIVE}
        )
        return cart

    @staticmethod
    def get_cart(user) -> Cart | None:
        """Retrieve the user's active cart without creating one."""
        return Cart.objects.filter(user=user, status=CartStatus.ACTIVE).first()

    @staticmethod
    @transaction.atomic
    def add_item(user, product_id: str, quantity: int) -> CartItem:
        """
        Add a product to the user's cart or increment its quantity.
        Validates product status and inventory availability.
        """
        if quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        try:
            product = StoreProduct.objects.select_related("inventory").get(pk=product_id)
        except StoreProduct.DoesNotExist:
            raise ValidationError({"product_id": "StoreProduct does not exist."})

        if product.status in [StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK]:
            raise ValidationError({"product_id": f"Product is {product.status} and cannot be added."})

        cart = CartService.get_or_create_active_cart(user)
        
        # Check if it's already in the cart
        item = CartItem.objects.filter(cart=cart, product=product).first()
        
        new_quantity = quantity
        if item:
            new_quantity += item.quantity

        if new_quantity > product.inventory.available_quantity:
            raise ValidationError({
                "quantity": f"Requested quantity ({new_quantity}) exceeds available stock ({product.inventory.available_quantity})."
            })

        if item:
            item.quantity = new_quantity
            item.save(update_fields=["quantity", "updated_at"])
        else:
            item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=new_quantity
            )
            
        return item

    @staticmethod
    def update_item(user, item_id: str, quantity: int) -> CartItem:
        """
        Update the quantity of an existing cart item.
        """
        if quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        try:
            item = CartItem.objects.select_related("product__inventory").get(
                pk=item_id, cart__user=user
            )
        except CartItem.DoesNotExist:
            raise ValidationError({"item_id": "CartItem does not exist in your cart."})

        product = item.product
        if product.status == StoreStatus.DISCONTINUED:
            raise ValidationError({"product_id": "Product is DISCONTINUED."})

        if quantity > product.inventory.available_quantity:
            raise ValidationError({
                "quantity": f"Requested quantity ({quantity}) exceeds available stock ({product.inventory.available_quantity})."
            })

        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return item

    @staticmethod
    def remove_item(user, item_id: str) -> None:
        """Remove a specific item from the user's cart."""
        deleted_count, _ = CartItem.objects.filter(pk=item_id, cart__user=user).delete()
        if deleted_count == 0:
            raise ValidationError({"item_id": "CartItem does not exist in your cart."})

    @staticmethod
    def clear_cart(user) -> None:
        """Remove all items from the user's active cart."""
        cart = CartService.get_cart(user)
        if cart:
            cart.items.all().delete()
