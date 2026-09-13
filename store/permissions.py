"""
Store permissions — Role-based access control for commerce management.
"""

from rest_framework.permissions import BasePermission
from accounts.models import UserRole

class IsStoreManagerOrAdmin(BasePermission):
    """
    Allows access only to users with STORE_MANAGER or ADMIN roles.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.STORE_MANAGER, UserRole.ADMIN]
        )
