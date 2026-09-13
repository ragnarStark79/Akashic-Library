"""
Cart URL Configuration
"""

from django.urls import path
from .views import (
    CartView,
    CartItemListView,
    CartItemDetailView
)

urlpatterns = [
    # Cart details
    path("", CartView.as_view(), name="cart-detail"),
    
    # Cart items
    path("items/", CartItemListView.as_view(), name="cart-item-list"),
    path("items/<uuid:pk>/", CartItemDetailView.as_view(), name="cart-item-detail"),
]
