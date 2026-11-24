"""
Store serializers — Input validation and safe frontend representation.
"""

from rest_framework import serializers
from .models import StoreProduct, Inventory, StoreStatus


class CardCustomizationSerializer(serializers.Serializer):
    """Validation for universal BookCard presentation customization."""
    background_color = serializers.CharField(max_length=50, required=False, allow_blank=True)
    title_color = serializers.CharField(max_length=50, required=False, allow_blank=True)
    description_color = serializers.CharField(max_length=50, required=False, allow_blank=True)
    genre_badge_colors = serializers.DictField(
        child=serializers.CharField(max_length=50),
        required=False
    )


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


class OpenLibraryImportPreviewSerializer(serializers.Serializer):
    """Input serializer for previewing an Open Library URL or identifier."""
    url = serializers.CharField(max_length=1000, required=True, trim_whitespace=True)


class StoreProductDetailContentSerializer(serializers.Serializer):
    """Input validation and serialization for Book Detail Page (BDP) editorial content."""
    original_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    hero_theme = serializers.DictField(required=False)
    hero_title_color = serializers.CharField(max_length=50, required=False, allow_blank=True)
    at_a_glance = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    synopsis = serializers.CharField(required=False, allow_blank=True)
    full_description = serializers.CharField(required=False, allow_blank=True)
    editorial_cards = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    excerpt = serializers.CharField(required=False, allow_blank=True)
    sample_excerpt = serializers.CharField(required=False, allow_blank=True)
    why_we_chose = serializers.CharField(required=False, allow_blank=True)
    content_warnings = serializers.ListField(
        child=serializers.CharField(max_length=200, allow_blank=True), required=False
    )


class StoreProductAddToBoxSerializer(serializers.Serializer):
    """Input validation for adding or updating a StoreProduct in the patron's box / bag."""
    action = serializers.ChoiceField(
        choices=["increment", "decrement", "set", "get"],
        default="increment",
        required=False,
    )
    quantity = serializers.IntegerField(min_value=0, default=1, required=False)


class StoreProductSerializer(serializers.Serializer):
    """
    Unified output serializer for StoreProducts.
    Includes both transactional commerce fields and enriched bibliographic metadata
    for the universal BookCard, catalogue carousels, and Book Detail Page (BDP).
    """
    id = serializers.CharField(read_only=True)
    book_reference = serializers.CharField(read_only=True)
    edition = serializers.CharField(read_only=True)
    condition = serializers.CharField(read_only=True)
    price = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    
    # Pricing & Discounts
    original_price = serializers.CharField(read_only=True, allow_null=True)
    is_discounted = serializers.BooleanField(read_only=True, default=False)
    discount_percentage = serializers.IntegerField(read_only=True, allow_null=True)

    # Enriched bibliographic data
    title = serializers.CharField(read_only=True)
    authors = serializers.ListField(child=serializers.CharField(), read_only=True)
    cover_image = serializers.CharField(read_only=True, allow_blank=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    genres = serializers.ListField(child=serializers.CharField(), read_only=True)
    isbn = serializers.CharField(read_only=True, allow_null=True)

    # Seller / Store Curator Attribution
    store_id = serializers.CharField(read_only=True, allow_null=True)
    store_name = serializers.CharField(read_only=True, allow_null=True)
    manager_username = serializers.CharField(read_only=True, allow_null=True)

    # Manager custom fields & card customization
    custom_cover_url = serializers.CharField(read_only=True, allow_blank=True)
    custom_description = serializers.CharField(read_only=True, allow_blank=True)
    custom_genres = serializers.ListField(child=serializers.CharField(), read_only=True)
    card_customization = serializers.DictField(read_only=True)

    # Rich BDP Editorial Detail
    detail = serializers.DictField(read_only=True)

    # Inventory
    quantity = serializers.IntegerField(read_only=True)
    reserved_quantity = serializers.IntegerField(read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)
    inventory = serializers.DictField(read_only=True)

    created_at = serializers.CharField(read_only=True)
    updated_at = serializers.CharField(read_only=True)


class StoreProductCreateSerializer(serializers.Serializer):
    """Input validation for creating a StoreProduct."""
    book_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)
    manual_book = serializers.DictField(required=False)
    open_library_data = serializers.DictField(required=False)

    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    edition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    condition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=StoreStatus.choices, default=StoreStatus.OUT_OF_STOCK)
    quantity = serializers.IntegerField(min_value=0, default=0)
    reserved_quantity = serializers.IntegerField(min_value=0, default=0)

    # Visual customizations
    custom_cover_url = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    custom_description = serializers.CharField(required=False, allow_blank=True)
    custom_genres = serializers.ListField(child=serializers.CharField(max_length=100), required=False)
    card_customization = serializers.DictField(required=False)

    def validate(self, attrs):
        if not attrs.get("book_reference") and not attrs.get("manual_book") and not attrs.get("open_library_data"):
            raise serializers.ValidationError(
                "Either book_reference, manual_book, or open_library_data must be provided."
            )
        return attrs


class StoreProductUpdateSerializer(serializers.Serializer):
    """Input validation for updating a StoreProduct."""
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    edition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    condition = serializers.CharField(max_length=255, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=StoreStatus.choices, required=False)

    # Visual customizations
    custom_cover_url = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    custom_description = serializers.CharField(required=False, allow_blank=True)
    custom_genres = serializers.ListField(child=serializers.CharField(max_length=100), required=False)
    card_customization = serializers.DictField(required=False)
