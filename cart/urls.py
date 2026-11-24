"""
Cart URL Configuration
"""

from django.urls import path
from .views import (
    CartView,
    CartItemListView,
    CartItemDetailView,
    CartItemSwitchStoreView,
    CartSelectGlobalStoreView,
)

urlpatterns = [
    # Cart details & global selection
    path("", CartView.as_view(), name="cart-detail"),
    path("select-global-store/", CartSelectGlobalStoreView.as_view(), name="cart-select-global-store"),
    
    # Cart items
    path("items/", CartItemListView.as_view(), name="cart-item-list"),
    path("items/<uuid:pk>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("items/<uuid:pk>/switch-store/", CartItemSwitchStoreView.as_view(), name="cart-item-switch-store"),
]
