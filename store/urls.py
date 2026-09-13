"""
Store URL Configuration
"""

from django.urls import path
from .views import (
    StoreProductListView,
    StoreProductDetailView,
    StoreProductManagementView,
    StoreProductUpdateView,
    InventoryManagementView
)

urlpatterns = [
    # Public endpoints
    path("products/", StoreProductListView.as_view(), name="product-list"),
    path("products/<uuid:pk>/", StoreProductDetailView.as_view(), name="product-detail"),
    
    # Staff management endpoints
    path("products/manage/", StoreProductManagementView.as_view(), name="product-create"),
    path("products/<uuid:pk>/manage/", StoreProductUpdateView.as_view(), name="product-update"),
    path("products/<uuid:pk>/inventory/", InventoryManagementView.as_view(), name="inventory-update"),
]
