"""
Orders serializers — Represents historical order snapshots and totals.
"""

from rest_framework import serializers
from .models import Order, OrderItem, Payment


class OrderItemOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for OrderItem. Note that title and price are snapshots, 
    so they reflect the historical truth of the transaction, not necessarily 
    the current StoreProduct.
    """
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product_id", "title", "quantity", 
            "price", "line_total"
        ]

    def get_line_total(self, obj) -> float:
        """Returns the total price for this line item based on snapshot price."""
        return float(obj.price * obj.quantity)


class OrderOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for Order, including its items and payment status.
    """
    items = OrderItemOutputSerializer(many=True, read_only=True)
    payment_status = serializers.CharField(source="payment.status", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "status", "payment_status", "subtotal", "total", 
            "items", "created_at"
        ]
