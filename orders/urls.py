"""
Orders URLs
"""

from django.urls import path
from .views import (
    CheckoutView,
    OrderListView,
    OrderDetailView,
    OrderConfirmPaymentView,
    OrderInvoiceView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("checkout/<uuid:pk>/confirm-payment/", OrderConfirmPaymentView.as_view(), name="checkout-confirm-payment"),
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<uuid:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<uuid:pk>/confirm-payment/", OrderConfirmPaymentView.as_view(), name="order-confirm-payment"),
    path("orders/<uuid:pk>/invoice/", OrderInvoiceView.as_view(), name="order-invoice"),
]
