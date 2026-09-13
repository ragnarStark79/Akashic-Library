"""
Cart serializers — Output representation and basic input validation.
"""

from rest_framework import serializers
from decimal import Decimal
from .models import Cart, CartItem


class CartItemOutputSerializer(serializers.ModelSerializer):
    """Output representation for a CartItem, extracting live product info."""
    product_id = serializers.UUIDField(source="product.id", read_only=True)
    book_reference = serializers.CharField(source="product.book_reference", read_only=True)
    edition = serializers.CharField(source="product.edition", read_only=True)
    condition = serializers.CharField(source="product.condition", read_only=True)
    
    # Server-authoritative real-time price
    current_price = serializers.DecimalField(
        source="product.price", 
        max_digits=10, 
        decimal_places=2, 
        read_only=True,
        coerce_to_string=False
    )
    
    available_quantity = serializers.IntegerField(
        source="product.inventory.available_quantity", 
        read_only=True
    )
    
    line_subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "product_id", "book_reference", "edition", "condition",
            "current_price", "quantity", "available_quantity", "line_subtotal",
            "created_at", "updated_at"
        ]

    def get_line_subtotal(self, obj) -> float:
        """Calculates line subtotal based on live product price."""
        return float(obj.product.price * obj.quantity)


class CartOutputSerializer(serializers.ModelSerializer):
    """Output representation for a user's Cart."""
    items = CartItemOutputSerializer(many=True, read_only=True)
    cart_subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "status", "cart_subtotal", "items", "created_at", "updated_at"]

    def get_cart_subtotal(self, obj) -> float:
        """Calculates overall cart subtotal based on live product prices."""
        total = Decimal("0.00")
        for item in obj.items.all():
            total += item.product.price * item.quantity
        return float(total)


class AddItemInputSerializer(serializers.Serializer):
    """Validates payload for adding an item."""
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class UpdateItemInputSerializer(serializers.Serializer):
    """Validates payload for updating an item's quantity."""
    quantity = serializers.IntegerField(min_value=1)
