"""
Store views — HTTP boundary for commerce management.

Follows the thin-view pattern: request parsing and output formatting happens here,
but business logic and database interactions are delegated to the service layer.
"""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404

from .models import StoreProduct, StoreStatus
from .services import StoreService
from .serializers import (
    StoreProductSerializer,
    StoreProductDetailSerializer,
    StoreProductCreateSerializer,
    StoreProductUpdateSerializer,
    InventoryUpdateSerializer
)
from .permissions import IsStoreManagerOrAdmin


from Akashic_Library.pagination import StandardResultsSetPagination

class StoreProductListView(generics.ListAPIView):
    """
    Publicly list available products.
    """
    permission_classes = [AllowAny]
    serializer_class = StoreProductSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        return StoreProduct.objects.exclude(
            status=StoreStatus.DISCONTINUED
        ).order_by('-created_at')


class StoreProductDetailView(generics.RetrieveAPIView):
    """
    Publicly view product details.
    """
    permission_classes = [AllowAny]
    serializer_class = StoreProductDetailSerializer
    queryset = StoreProduct.objects.all()


class StoreProductManagementView(APIView):
    """
    Staff endpoint for creating and updating store products.
    """
    permission_classes = [IsStoreManagerOrAdmin]

    def post(self, request):
        serializer = StoreProductCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product = StoreService.create_store_product(**serializer.validated_data)
        except DjangoValidationError as e:
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_400_BAD_REQUEST)

        out_serializer = StoreProductDetailSerializer(product)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class StoreProductUpdateView(APIView):
    """
    Staff endpoint to patch a store product.
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
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_400_BAD_REQUEST)

        out_serializer = StoreProductDetailSerializer(product)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class InventoryManagementView(APIView):
    """
    Staff endpoint for managing product inventory.
    """
    permission_classes = [IsStoreManagerOrAdmin]

    def patch(self, request, pk):
        product = get_object_or_404(StoreProduct, pk=pk)
        
        serializer = InventoryUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            StoreService.update_inventory(
                product,
                quantity=serializer.validated_data.get('quantity'),
                reserved_quantity=serializer.validated_data.get('reserved_quantity')
            )
        except DjangoValidationError as e:
            return Response(e.message_dict if hasattr(e, 'message_dict') else str(e), status=status.HTTP_400_BAD_REQUEST)

        # Re-fetch product to get updated status and inventory
        product.refresh_from_db()
        out_serializer = StoreProductDetailSerializer(product)
        return Response(out_serializer.data, status=status.HTTP_200_OK)
