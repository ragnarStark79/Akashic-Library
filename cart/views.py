"""
Cart views — HTTP boundary for shopping cart management.

Ensures only authenticated users can access, and delegates to CartService.
Supports supplier switching per item and global store selection.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError

from .services import CartService
from .serializers import (
    CartOutputSerializer,
    CartItemOutputSerializer,
    AddItemInputSerializer,
    UpdateItemInputSerializer,
    SwitchStoreInputSerializer,
    SelectGlobalStoreInputSerializer,
)


class CartView(APIView):
    """
    GET: Retrieve the active cart for the authenticated user, enriched with seller
    options and live bibliographic data.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = CartService.get_or_create_active_cart(request.user)
        items = list(
            cart.items.select_related(
                "product__inventory", "product__created_by", "product__detail"
            ).all()
        )
        CartService.enrich_cart_items(items)
        cart._prefetched_objects_cache = {"items": items}

        serializer = CartOutputSerializer(cart)
        return Response(serializer.data)


class CartItemListView(APIView):
    """
    GET: List all items in the user's active cart.
    POST: Add an item to the user's active cart.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = CartService.get_or_create_active_cart(request.user)
        items = list(
            cart.items.select_related(
                "product__inventory", "product__created_by", "product__detail"
            ).all()
        )
        CartService.enrich_cart_items(items)
        serializer = CartItemOutputSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AddItemInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            item = CartService.add_item(
                user=request.user,
                product_id=serializer.validated_data["product_id"],
                quantity=serializer.validated_data["quantity"]
            )
        except DjangoValidationError as e:
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_400_BAD_REQUEST)

        # Refetch with relations for accurate output
        item.refresh_from_db()
        CartService.enrich_cart_items([item])
        out_serializer = CartItemOutputSerializer(item)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    """
    PATCH: Update an item's quantity.
    DELETE: Remove an item from the cart.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        serializer = UpdateItemInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            item = CartService.update_item(
                user=request.user,
                item_id=pk,
                quantity=serializer.validated_data["quantity"]
            )
        except DjangoValidationError as e:
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_400_BAD_REQUEST)

        CartService.enrich_cart_items([item])
        out_serializer = CartItemOutputSerializer(item)
        return Response(out_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            CartService.remove_item(user=request.user, item_id=pk)
        except DjangoValidationError as e:
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_404_NOT_FOUND)
            
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemSwitchStoreView(APIView):
    """
    POST: Switch the supplying store offer for a specific cart line item.
    Revalidates canonical book match, stock, seller approval, and recalculates totals.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = SwitchStoreInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = CartService.switch_item_store(
                user=request.user,
                item_id=pk,
                new_product_id=str(serializer.validated_data["product_id"]),
            )
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)

        cart = item.cart
        items = list(
            cart.items.select_related(
                "product__inventory", "product__created_by", "product__detail"
            ).all()
        )
        CartService.enrich_cart_items(items)
        cart._prefetched_objects_cache = {"items": items}
        out_serializer = CartOutputSerializer(cart)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class CartSelectGlobalStoreView(APIView):
    """
    POST: Apply a single selected store to all eligible items in the cart.
    Requires that the chosen store has active inventory for all titles in the bag.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SelectGlobalStoreInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = CartService.select_global_store(
                user=request.user,
                store_id=str(serializer.validated_data["store_id"]),
            )
        except DjangoValidationError as e:
            msg = e.message_dict if hasattr(e, "message_dict") else str(e)
            return Response(msg, status=status.HTTP_400_BAD_REQUEST)

        items = list(
            cart.items.select_related(
                "product__inventory", "product__created_by", "product__detail"
            ).all()
        )
        CartService.enrich_cart_items(items)
        cart._prefetched_objects_cache = {"items": items}
        out_serializer = CartOutputSerializer(cart)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
