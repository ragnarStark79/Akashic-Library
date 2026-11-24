"""
Store URL Configuration
"""

from django.urls import path
from .views import (
    StoreProductListView,
    StoreProductDetailView,
    StoreProductDetailUpdateView,
    StoreProductOffersView,
    StoreProductAddToBoxView,
    StoreProductManagementView,
    OpenLibraryImportPreviewView,
    StoreProductUpdateView,
    InventoryManagementView,
)
from .views_admin import (
    AdminOverviewView,
    AdminStoreManagersView,
    AdminStoreManagerActionView,
    AdminUsersView,
    AdminUserActionView,
    AdminProductsView,
    AdminRevenueView,
)
from .views_manager import (
    StoreManagerOverviewView,
    StoreManagerProductsView,
    StoreManagerInventoryUpdateView,
    StoreManagerRevenueView,
)

urlpatterns = [
    # Public endpoints
    path("products/", StoreProductListView.as_view(), name="product-list"),
    path("products/<uuid:pk>/", StoreProductDetailView.as_view(), name="product-detail"),
    path("products/<uuid:pk>/offers/", StoreProductOffersView.as_view(), name="product-offers"),
    path("products/<uuid:pk>/add-to-box/", StoreProductAddToBoxView.as_view(), name="product-add-to-box"),
    
    # Store Manager catalogue endpoints
    path("products/manage/", StoreProductManagementView.as_view(), name="product-management"),
    path("products/import-preview/", OpenLibraryImportPreviewView.as_view(), name="product-import-preview"),
    path("products/<uuid:pk>/manage/", StoreProductUpdateView.as_view(), name="product-update"),
    path("products/<uuid:pk>/detail/", StoreProductDetailUpdateView.as_view(), name="product-detail-update"),
    path("products/<uuid:pk>/inventory/", InventoryManagementView.as_view(), name="inventory-update"),

    # Store Manager scoped dashboard endpoints
    path("manager/overview/", StoreManagerOverviewView.as_view(), name="manager-overview"),
    path("manager/products/", StoreManagerProductsView.as_view(), name="manager-products"),
    path("manager/inventory/", StoreManagerInventoryUpdateView.as_view(), name="manager-inventory-update"),
    path("manager/revenue/", StoreManagerRevenueView.as_view(), name="manager-revenue"),

    # Central Administrator console endpoints
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/managers/", AdminStoreManagersView.as_view(), name="admin-managers"),
    path("admin/managers/<uuid:pk>/action/", AdminStoreManagerActionView.as_view(), name="admin-manager-action"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/users/<uuid:pk>/action/", AdminUserActionView.as_view(), name="admin-user-action"),
    path("admin/products/", AdminProductsView.as_view(), name="admin-products"),
    path("admin/revenue/", AdminRevenueView.as_view(), name="admin-revenue"),
]
