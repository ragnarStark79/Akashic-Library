"""
Cart views — HTTP boundary for shopping cart management.

Ensures only authenticated users can access, and delegates to CartService.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404

from .services import CartService
from .serializers import (
    CartOutputSerializer,
    CartItemOutputSerializer,
    AddItemInputSerializer,
    UpdateItemInputSerializer
)


class CartView(APIView):
    """
    GET: Retrieve the active cart for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = CartService.get_or_create_active_cart(request.user)
        # Prefetch to avoid N+1 queries during serialization
        cart = CartService.get_cart(request.user) # Re-fetch just to use prefetch_related if needed, actually we can just prefetch on the queryset
        
        # We can optimize the single fetch here
        from .models import Cart
        cart = Cart.objects.prefetch_related(
            'items__product__inventory'
        ).get(pk=cart.pk)

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
        items = cart.items.select_related('product__inventory').all()
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

        out_serializer = CartItemOutputSerializer(item)
        return Response(out_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            CartService.remove_item(user=request.user, item_id=pk)
        except DjangoValidationError as e:
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_404_NOT_FOUND)
            
        return Response(status=status.HTTP_204_NO_CONTENT)
