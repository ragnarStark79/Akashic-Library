"""
Orders views — HTTP boundaries for Checkout, Multi-Store Order Processing,
Demo QR Payment confirmation, Order History, and Purchase Invoices.
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
from .serializers import (
    OrderOutputSerializer,
    CheckoutInputSerializer,
    ConfirmPaymentInputSerializer,
)


class CheckoutView(APIView):
    """
    POST: Processes active cart. Supports creating a pending Demo QR Payment session
    as well as immediate confirmation for legacy clients.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutInputSerializer(data=request.data or {})
        serializer.is_valid()  # Allow empty payload for legacy checkout
        data = serializer.validated_data if hasattr(serializer, "validated_data") else {}

        payment_method = data.get("payment_method")

        try:
            if payment_method == "qr_demo":
                # Create pending order session with demo QR payload
                order = CheckoutService.create_order(
                    user=request.user,
                    customer_name=data.get("customer_name", ""),
                    customer_email=data.get("customer_email", ""),
                    shipping_address=data.get("shipping_address"),
                    payment_method="qr_demo",
                )
            else:
                # Legacy / direct checkout
                order = CheckoutService.checkout(request.user)
        except DjangoValidationError as e:
            err_msg = e.message if hasattr(e, "message") else (e.message_dict if hasattr(e, "message_dict") else str(e))
            return Response(
                {"error": err_msg, "detail": err_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.prefetch_related("items__product", "payment").get(pk=order.pk)
        out_serializer = OrderOutputSerializer(order)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class OrderConfirmPaymentView(APIView):
    """
    POST: Confirms a demo payment, atomically deducting inventory for all
    contributing store managers and finalizing order state.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = ConfirmPaymentInputSerializer(data=request.data or {})
        serializer.is_valid()
        idempotency_key = serializer.validated_data.get("idempotency_key") if hasattr(serializer, "validated_data") else None

        try:
            order = CheckoutService.confirm_demo_payment(
                order_id=pk,
                user=request.user,
                idempotency_key=idempotency_key,
            )
        except DjangoValidationError as e:
            err_msg = e.message if hasattr(e, "message") else (e.message_dict if hasattr(e, "message_dict") else str(e))
            return Response(
                {"error": err_msg, "detail": err_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.prefetch_related("items__product", "payment").get(pk=order.pk)
        out_serializer = OrderOutputSerializer(order)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class OrderListView(generics.ListAPIView):
    """
    GET: List all historical orders for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = OrderOutputSerializer
    from Akashic_Library.pagination import StandardResultsSetPagination
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("items__product", "payment")
            .order_by("-created_at")
        )


class OrderDetailView(APIView):
    """
    GET: Retrieve details for a specific order.
    Strictly isolated to the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related("items__product", "payment"),
            pk=pk,
            user=request.user,
        )
        serializer = OrderOutputSerializer(order)
        return Response(serializer.data)


class OrderInvoiceView(APIView):
    """
    GET: Retrieve complete printable and downloadable invoice snapshot
    for a completed purchase.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related("items__product", "payment"),
            pk=pk,
            user=request.user,
        )
        serializer = OrderOutputSerializer(order)

        invoice_data = {
            "invoice_number": f"INV-{order.order_number or str(order.id)[:8].upper()}",
            "order": serializer.data,
            "issuer": {
                "name": "Akashic Store",
                "tagline": "Curated Editions & Bibliographic Folios",
                "address": "404 Alexandria Way, Sanctuary Archives",
                "email": "concierge@akashic.library",
                "mode": "DEMONSTRATION E-COMMERCE RECEIPT",
            },
            "disclaimer": "This document is a certified demonstration purchase receipt for the Akashic Library project. No actual financial transfer occurred.",
        }
        return Response(invoice_data, status=status.HTTP_200_OK)
