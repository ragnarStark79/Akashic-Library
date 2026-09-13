"""
Store serializers — Input validation and safe frontend representation.
"""

from rest_framework import serializers
from .models import StoreProduct, Inventory, StoreStatus


class InventorySerializer(serializers.ModelSerializer):
    """Output serializer for Inventory."""
    available_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Inventory
        fields = ["quantity", "reserved_quantity", "available_quantity"]


class InventoryUpdateSerializer(serializers.Serializer):
    """Input validation for updating inventory."""
    quantity = serializers.IntegerField(min_value=0, required=False)
    reserved_quantity = serializers.IntegerField(min_value=0, required=False)
    
    def validate(self, attrs):
        """Cross-field validation could go here, but usually it depends on instance state."""
        return attrs


class StoreProductSerializer(serializers.ModelSerializer):
    """Output serializer for StoreProduct lists."""
    id = serializers.UUIDField(read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    
    class Meta:
        model = StoreProduct
        fields = [
            "id", "book_reference", "edition", "condition", 
            "price", "status", "created_at", "updated_at"
        ]


class StoreProductDetailSerializer(StoreProductSerializer):
    """Output serializer for StoreProduct details, embedding inventory."""
    inventory = InventorySerializer(read_only=True)

    class Meta(StoreProductSerializer.Meta):
        fields = StoreProductSerializer.Meta.fields + ["inventory"]


class StoreProductCreateSerializer(serializers.Serializer):
    """Input validation for creating a StoreProduct."""
    book_reference = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    edition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    condition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=StoreStatus.choices, default=StoreStatus.OUT_OF_STOCK)
    quantity = serializers.IntegerField(min_value=0, default=0)
    reserved_quantity = serializers.IntegerField(min_value=0, default=0)


class StoreProductUpdateSerializer(serializers.Serializer):
    """Input validation for updating a StoreProduct."""
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    edition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    condition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=StoreStatus.choices, required=False)
