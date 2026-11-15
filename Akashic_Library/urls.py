"""
Root URL configuration for Akashic Library.

Only the foundation routes are defined here.  Domain-specific routes
(/api/auth/, /api/books/, etc.) will be added in later steps by
including the relevant app URLconfs.
"""

from django.contrib import admin
from django.urls import include, path

from .views import health_check, readiness_check

# ─── API v1 routes ────────────────────────────────────────────────────────────
api_urlpatterns = [
    path("health/", health_check, name="api-health"),
    path("health/ready/", readiness_check, name="api-health-ready"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include((api_urlpatterns, "api"))),
    path("api/auth/", include(("accounts.urls", "accounts"), namespace="accounts")),
    path("api/books/", include(("discovery.urls", "discovery"), namespace="discovery")),
    path("api/library/", include(("discovery.library_urls", "library"), namespace="library")),
    path("api/store/", include(("store.urls", "store"), namespace="store")),
    path("api/cart/", include(("cart.urls", "cart"), namespace="cart")),
    path("api/", include(("orders.urls", "orders"), namespace="orders")),
    path("api/community/", include(("community.urls", "community"), namespace="community")),
    path("api/recommendations/", include(("recommendations.urls", "recommendations"), namespace="recommendations")),
]
