"""
Store views — HTTP boundary for commerce and product management.

Follows the thin-view pattern: request parsing and output formatting happens here,
delegating business rules, inventory constraints, and MongoDB synchronization
to StoreService.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole
from .models import StoreProduct, StoreStatus
from .permissions import IsStoreManagerOrAdmin, IsApprovedStoreManager
from .serializers import (
    InventoryUpdateSerializer,
    OpenLibraryImportPreviewSerializer,
    StoreProductAddToBoxSerializer,
    StoreProductCreateSerializer,
    StoreProductDetailContentSerializer,
    StoreProductSerializer,
    StoreProductUpdateSerializer,
)
from .services import StoreService


class StoreProductListView(APIView):
    """
    Publicly list available products.
    Supports ?genre=..., ?search=..., ?status=...
    Batch-enriches results with MongoDB discovery metadata without N+1 queries.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        genre = request.query_params.get("genre")
        search = request.query_params.get("search")
        status_filter = request.query_params.get("status")

        enriched_products = StoreService.get_filtered_store_products(
            genre=genre,
            search=search,
            status_filter=status_filter,
            include_discontinued=False,
        )

        serializer = StoreProductSerializer(enriched_products, many=True)
        return Response({"results": serializer.data, "count": len(enriched_products)})


class StoreProductDetailView(APIView):
    """
    Publicly view a single product's enriched details including BDP editorial content.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        product = get_object_or_404(StoreProduct.objects.select_related("inventory", "detail"), pk=pk)
        enriched = StoreService.enrich_products_with_book_data([product])
        if not enriched:
            return Response({"detail": "Product data unavailable."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StoreProductSerializer(enriched[0])
        return Response(serializer.data)


class StoreProductDetailUpdateView(APIView):
    """
    Store Manager / Admin endpoint to author or update rich editorial content
    for the Book Detail Page (BDP).
    """
    permission_classes = [IsStoreManagerOrAdmin]

    def patch(self, request, pk):
        product = get_object_or_404(StoreProduct.objects.select_related("inventory", "detail"), pk=pk)

        serializer = StoreProductDetailContentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            StoreService.update_product_detail(product, **serializer.validated_data)
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)

        # Refresh and return enriched product with updated BDP detail
        product.refresh_from_db()
        enriched = StoreService.enrich_products_with_book_data([product])
        out_serializer = StoreProductSerializer(enriched[0] if enriched else product)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class StoreProductOffersView(APIView):
    """
    Publicly list all active StoreProduct offers from all approved curators
    for the same canonical book edition.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        offers = StoreService.get_store_product_offers(pk)
        serializer = StoreProductSerializer(offers, many=True)
        return Response({"offers": serializer.data, "count": len(offers)})


class StoreProductAddToBoxView(APIView):
    """
    Add, update, or remove a product in the patron's box / shopping bag.
    Supports authenticated users (persisted in PostgreSQL Cart & CartItem)
    as well as anonymous guest patrons with live stock validation.
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        product = get_object_or_404(StoreProduct.objects.select_related("inventory"), pk=pk)

        serializer = StoreProductAddToBoxSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data.get("action", "increment")
        qty_input = serializer.validated_data.get("quantity", 1)

        available_stock = product.inventory.available_quantity if hasattr(product, "inventory") else 0

        # Stock availability check (only if incrementing or setting > 0)
        if action in ["increment", "set"] and qty_input > 0:
            if product.status in [StoreStatus.DISCONTINUED, StoreStatus.OUT_OF_STOCK] or available_stock <= 0:
                return Response(
                    {"detail": f"This edition is currently {product.status.replace('_', ' ').lower()}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        item_quantity = 0
        cart_count = 0
        msg = "Updated shopping bag."

        if request.user.is_authenticated:
            from cart.services import CartService
            from cart.models import CartItem
            try:
                cart = CartService.get_or_create_active_cart(request.user)
                item = CartItem.objects.filter(cart=cart, product=product).first()
                current_qty = item.quantity if item else 0

                if action == "increment":
                    target_qty = current_qty + max(1, qty_input)
                    if target_qty > available_stock:
                        return Response(
                            {"detail": f"Only {available_stock} copies currently available."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if item:
                        item.quantity = target_qty
                        item.save(update_fields=["quantity", "updated_at"])
                    else:
                        item = CartItem.objects.create(cart=cart, product=product, quantity=target_qty)
                    item_quantity = target_qty
                    msg = "Added to your shopping bag!"

                elif action == "decrement":
                    target_qty = current_qty - max(1, qty_input)
                    if target_qty <= 0:
                        if item:
                            item.delete()
                        item_quantity = 0
                        msg = "Removed from your shopping bag."
                    else:
                        item.quantity = target_qty
                        item.save(update_fields=["quantity", "updated_at"])
                        item_quantity = target_qty
                        msg = f"Quantity updated to {target_qty}."

                elif action == "set":
                    if qty_input <= 0:
                        if item:
                            item.delete()
                        item_quantity = 0
                        msg = "Removed from your shopping bag."
                    else:
                        if qty_input > available_stock:
                            return Response(
                                {"detail": f"Only {available_stock} copies currently available."},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        if item:
                            item.quantity = qty_input
                            item.save(update_fields=["quantity", "updated_at"])
                        else:
                            item = CartItem.objects.create(cart=cart, product=product, quantity=qty_input)
                        item_quantity = qty_input
                        msg = f"Quantity updated to {qty_input}."

                elif action == "get":
                    item_quantity = current_qty
                    msg = "Cart item quantity retrieved."

                cart_count = sum(ci.quantity for ci in cart.items.all())
            except DjangoValidationError as e:
                err_msg = e.message_dict if hasattr(e, "message_dict") else str(e)
                return Response(err_msg, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Anonymous / Guest
            if action == "increment":
                item_quantity = max(1, qty_input)
                msg = "Added to your shopping bag!"
            elif action == "decrement":
                item_quantity = max(0, qty_input - 1)
                msg = f"Quantity updated to {item_quantity}." if item_quantity > 0 else "Removed from your shopping bag."
            elif action == "set":
                item_quantity = max(0, qty_input)
                msg = f"Quantity updated to {item_quantity}." if item_quantity > 0 else "Removed from your shopping bag."
            else:  # get
                item_quantity = 0
                msg = "Guest cart."
            cart_count = item_quantity

        return Response(
            {
                "success": True,
                "cart_count": cart_count,
                "item_quantity": item_quantity,
                "product_id": str(product.id),
                "quantity": item_quantity,
                "message": msg,
            },
            status=status.HTTP_200_OK,
        )


class OpenLibraryImportPreviewView(APIView):
    """
    Store Manager endpoint: preview book metadata from an Open Library URL,
    work key, edition key, or ISBN before confirming import.
    """
    permission_classes = [IsStoreManagerOrAdmin]

    def post(self, request):
        serializer = OpenLibraryImportPreviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        url = serializer.validated_data["url"]
        try:
            preview_data = StoreService.preview_open_library_import(url)
            return Response(preview_data, status=status.HTTP_200_OK)
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"url": f"Preview failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class StoreProductManagementView(APIView):
    """
    Store Manager / Admin endpoint:
    GET: list all products (including out-of-stock and discontinued) with inventory metrics.
    POST: create a new StoreProduct via manual entry or Open Library import.
    """
    permission_classes = [IsStoreManagerOrAdmin]

    def get(self, request):
        search = request.query_params.get("search")
        genre = request.query_params.get("genre")
        status_filter = request.query_params.get("status")

        is_admin = request.user.role == UserRole.ADMIN or request.user.is_superuser

        enriched = StoreService.get_filtered_store_products(
            genre=genre,
            search=search,
            status_filter=status_filter,
            include_discontinued=True,
        )

        if not is_admin:
            # Scope to manager's own products or unassigned
            my_product_ids = set(
                str(p.id)
                for p in StoreProduct.objects.filter(
                    Q(created_by=request.user) | Q(created_by__isnull=True)
                )
            )
            enriched = [p for p in enriched if str(p.get("id")) in my_product_ids]

        serializer = StoreProductSerializer(enriched, many=True)
        return Response({"results": serializer.data, "count": len(enriched)})

    def post(self, request):
        serializer = StoreProductCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = StoreService.create_store_product(**serializer.validated_data)
            if request.user.is_authenticated:
                product.created_by = request.user
                product.save(update_fields=["created_by"])
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)

        enriched = StoreService.enrich_products_with_book_data([product])
        out_serializer = StoreProductSerializer(enriched[0] if enriched else product)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class StoreProductUpdateView(APIView):
    """
    Store Manager / Admin endpoint to update product attributes,
    visual customizations, and metadata.
    """
    permission_classes = [IsStoreManagerOrAdmin]

    def patch(self, request, pk):
        product = get_object_or_404(StoreProduct, pk=pk)

        serializer = StoreProductUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = StoreService.update_store_product(product, **serializer.validated_data)
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)

        enriched = StoreService.enrich_products_with_book_data([product])
        out_serializer = StoreProductSerializer(enriched[0] if enriched else product)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class InventoryManagementView(APIView):
    """
    Store Manager endpoint for adjusting inventory quantities on products they own.
    Admins and non-owners cannot mutate stock through this endpoint.
    """
    permission_classes = [IsApprovedStoreManager]

    def patch(self, request, pk):
        product = get_object_or_404(
            StoreProduct,
            Q(created_by=request.user) | Q(created_by__isnull=True),
            pk=pk,
        )

        serializer = InventoryUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            inventory = StoreService.update_inventory(
                product,
                quantity=serializer.validated_data.get("quantity"),
                reserved_quantity=serializer.validated_data.get("reserved_quantity"),
            )
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)

        enriched = StoreService.enrich_products_with_book_data([product])
        out_serializer = StoreProductSerializer(enriched[0] if enriched else product)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
