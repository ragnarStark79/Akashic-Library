"""
Orders views — HTTP boundaries for Checkout and Order History.
"""

from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404

from .models import Order
from .services import CheckoutService
from .serializers import OrderOutputSerializer


class CheckoutView(APIView):
    """
    POST: Processes the user's active cart and creates an order.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            order = CheckoutService.checkout(request.user)
        except DjangoValidationError as e:
            return Response(
                {"error": e.message if hasattr(e, 'message') else str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Prefetch for serialization
        order = Order.objects.prefetch_related('items', 'payment').get(pk=order.pk)
        serializer = OrderOutputSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderListView(generics.ListAPIView):
    """
    GET: List all historical orders for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = OrderOutputSerializer
    from Akashic_Library.pagination import StandardResultsSetPagination
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'payment').order_by('-created_at')


class OrderDetailView(APIView):
    """
    GET: Retrieve details for a specific order.
    Strictly isolated to the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.prefetch_related('items', 'payment'), pk=pk, user=request.user)
        serializer = OrderOutputSerializer(order)
        return Response(serializer.data)
