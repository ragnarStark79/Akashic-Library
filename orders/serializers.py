"""
Orders serializers — Represents historical order snapshots, multi-store seller
attribution, store groupings, payment state, and printable invoice data.
"""

from rest_framework import serializers
from decimal import Decimal
from .models import Order, OrderItem, Payment, PaymentStatus


class OrderItemOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for OrderItem. Retains immutable snapshots of title, author,
    cover, price, discount, and supplying store.
    """
    line_total = serializers.SerializerMethodField()
    store_manager_id = serializers.CharField(source="store_manager.id", read_only=True, allow_null=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "product_id", "title", "author", "cover_image", "edition",
            "quantity", "price", "original_price", "discount_percentage",
            "line_total", "store_manager_id", "store_name", "created_at"
        ]

    def get_line_total(self, obj) -> float:
        """Returns the total price for this line item based on snapshot price."""
        return float(obj.price * obj.quantity)


class OrderOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for Order, including its items, store-specific groupings,
    and demo QR payment status.
    """
    items = OrderItemOutputSerializer(many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_reference = serializers.CharField(read_only=True)
    order_number = serializers.CharField(read_only=True)
    qr_payload = serializers.SerializerMethodField()
    paid_at = serializers.SerializerMethodField()
    store_groups = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_status", "payment_reference",
            "subtotal", "total", "customer_name", "customer_email", "shipping_address",
            "items", "store_groups", "qr_payload", "paid_at", "created_at", "updated_at"
        ]

    def get_payment_status(self, obj) -> str:
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.status
        return PaymentStatus.PENDING

    def get_qr_payload(self, obj) -> str:
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.qr_payload
        return ""

    def get_paid_at(self, obj) -> str | None:
        if hasattr(obj, "payment") and obj.payment and obj.payment.paid_at:
            return obj.payment.paid_at.isoformat()
        return None

    def get_store_groups(self, obj) -> list:
        """
        Groups order items by supplying store curator for clear multi-store
        attribution in checkout, confirmation, and bills.
        """
        groups: dict[str, dict] = {}
        for item in obj.items.all():
            store_key = item.store_name or "Akashic Official Sanctuary"
            if store_key not in groups:
                groups[store_key] = {
                    "store_name": store_key,
                    "store_manager_id": str(item.store_manager.id) if item.store_manager else None,
                    "items": [],
                    "subtotal": Decimal("0.00"),
                    "item_count": 0,
                }
            groups[store_key]["items"].append(OrderItemOutputSerializer(item).data)
            groups[store_key]["subtotal"] += (item.price * item.quantity)
            groups[store_key]["item_count"] += item.quantity

        result = []
        for key, g in groups.items():
            result.append({
                "store_name": g["store_name"],
                "store_manager_id": g["store_manager_id"],
                "items": g["items"],
                "subtotal": float(g["subtotal"]),
                "item_count": g["item_count"],
            })
        return result


class CheckoutInputSerializer(serializers.Serializer):
    """Input validation for creating a checkout session."""
    payment_method = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    customer_name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    shipping_address = serializers.DictField(required=False)


class ConfirmPaymentInputSerializer(serializers.Serializer):
    """Input validation for confirming a demo payment."""
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=120)
