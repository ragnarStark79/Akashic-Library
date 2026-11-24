"""
Cart serializers — Output representation and input validation.
Supports multi-store offer metadata, live pricing snapshots,
store switching, and global store selection.
"""

from rest_framework import serializers
from decimal import Decimal
from .models import Cart, CartItem
from discovery.repository import get_book_by_id
from discovery.exceptions import BookNotFoundError


class CartItemOutputSerializer(serializers.ModelSerializer):
    """Output representation for a CartItem, extracting live product info and seller attribution."""
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

    # Enriched bibliographic & store fields
    title = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    genres = serializers.SerializerMethodField()
    store_id = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    is_discounted = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    available_stores = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "product_id", "book_reference", "edition", "condition",
            "current_price", "quantity", "available_quantity", "line_subtotal",
            "title", "author", "cover_image", "genres",
            "store_id", "store_name", "is_discounted", "original_price", "discount_percentage",
            "available_stores", "created_at", "updated_at"
        ]

    def get_line_subtotal(self, obj) -> float:
        """Calculates line subtotal based on live product price."""
        return float(obj.product.price * obj.quantity)

    def get_title(self, obj) -> str:
        if hasattr(obj, "_book_title"):
            return obj._book_title
        try:
            book = get_book_by_id(obj.product.book_reference)
            return book.get("title", "Curated Edition")
        except Exception:
            return "Curated Edition"

    def get_author(self, obj) -> str:
        if hasattr(obj, "_book_author"):
            return obj._book_author
        try:
            book = get_book_by_id(obj.product.book_reference)
            raw = book.get("authors") or []
            names = [a.get("name") if isinstance(a, dict) else str(a) for a in raw]
            return ", ".join(names) if names else "Various Authors"
        except Exception:
            return "Various Authors"

    def get_cover_image(self, obj) -> str:
        if hasattr(obj, "_book_cover") and obj._book_cover:
            return obj._book_cover
        if obj.product.custom_cover_url:
            return obj.product.custom_cover_url
        try:
            book = get_book_by_id(obj.product.book_reference)
            if book.get("cover_urls"):
                return book["cover_urls"][0]
            if book.get("identifiers", {}).get("isbn13"):
                return f"https://covers.openlibrary.org/b/isbn/{book['identifiers']['isbn13']}-L.jpg"
        except Exception:
            pass
        return ""

    def get_genres(self, obj) -> list:
        if hasattr(obj, "_book_genres"):
            return obj._book_genres
        if obj.product.custom_genres:
            return obj.product.custom_genres
        try:
            book = get_book_by_id(obj.product.book_reference)
            return book.get("subjects") or book.get("genres") or []
        except Exception:
            return []

    def get_store_id(self, obj) -> str | None:
        return str(obj.product.created_by.id) if obj.product.created_by else None

    def get_store_name(self, obj) -> str:
        if obj.product.created_by:
            return (
                obj.product.created_by.business_name
                or obj.product.created_by.display_name
                or obj.product.created_by.username
            )
        return "Akashic Official Sanctuary"

    def get_is_discounted(self, obj) -> bool:
        detail = getattr(obj.product, "detail", None)
        return bool(detail and detail.original_price and detail.original_price > obj.product.price)

    def get_original_price(self, obj) -> str | None:
        detail = getattr(obj.product, "detail", None)
        return str(detail.original_price) if detail and detail.original_price else None

    def get_discount_percentage(self, obj) -> int | None:
        detail = getattr(obj.product, "detail", None)
        if detail and detail.original_price and detail.original_price > obj.product.price:
            return round(float((detail.original_price - obj.product.price) / detail.original_price) * 100)
        return None

    def get_available_stores(self, obj) -> list:
        return getattr(obj, "_available_stores", [])


class CartOutputSerializer(serializers.ModelSerializer):
    """Output representation for a user's Cart."""
    items = CartItemOutputSerializer(many=True, read_only=True)
    cart_subtotal = serializers.SerializerMethodField()
    eligible_global_stores = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id", "status", "cart_subtotal", "items",
            "eligible_global_stores", "created_at", "updated_at"
        ]

    def get_cart_subtotal(self, obj) -> float:
        """Calculates overall cart subtotal based on live product prices."""
        total = Decimal("0.00")
        for item in obj.items.all():
            total += item.product.price * item.quantity
        return float(total)

    def get_eligible_global_stores(self, obj) -> list:
        from .services import CartService
        return CartService.get_eligible_global_stores(obj)


class AddItemInputSerializer(serializers.Serializer):
    """Validates payload for adding an item."""
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class UpdateItemInputSerializer(serializers.Serializer):
    """Validates payload for updating an item's quantity."""
    quantity = serializers.IntegerField(min_value=1)


class SwitchStoreInputSerializer(serializers.Serializer):
    """Validates payload for switching an item to another store's offer."""
    product_id = serializers.UUIDField()


class SelectGlobalStoreInputSerializer(serializers.Serializer):
    """Validates payload for applying a single store to all cart items."""
    store_id = serializers.UUIDField()
