"""
Store permissions — Role-based access control for commerce management.

Enforces strict separation between Admin Console and Store Manager Portal:
- IsAdminRole: Exclusively for ADMIN accounts / superusers.
- IsApprovedStoreManager: Exclusively for approved and active STORE_MANAGER accounts.
  Explicitly denies ADMINs from accessing manager scoped endpoints.
"""

from rest_framework.permissions import BasePermission
from accounts.models import UserRole, ManagerStatus


class IsApprovedStoreManager(BasePermission):
    """
    Allows access EXCLUSIVELY to users with an approved, active STORE_MANAGER role.
    Explicitly denies ADMIN, USER, unapproved (PENDING/REJECTED), or suspended managers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        # Explicitly reject ADMIN / superusers to enforce strict portal separation
        if request.user.role == UserRole.ADMIN or request.user.is_superuser:
            return False
        if request.user.role == UserRole.STORE_MANAGER:
            status = getattr(request.user, "manager_status", None)
            return status == ManagerStatus.APPROVED
        return False


class IsAdminRole(BasePermission):
    """
    Allows access EXCLUSIVELY to users with the ADMIN role or superuser status.
    Account must be active.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )


class IsStoreManagerOrAdmin(BasePermission):
    """
    Legacy permission allowing either approved STORE_MANAGER or ADMIN.
    Retained for shared non-portal views if necessary.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.role == UserRole.ADMIN or request.user.is_superuser:
            return True
        if request.user.role == UserRole.STORE_MANAGER:
            status = getattr(request.user, "manager_status", None)
            return status == ManagerStatus.APPROVED
        return False


class IsStoreProductOwnerOrAdmin(BasePermission):
    """
    Object-level permission: Admins can modify any product;
    Store Managers can only modify products where created_by is themselves.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.role == UserRole.ADMIN or request.user.is_superuser:
            return True
        if request.user.role == UserRole.STORE_MANAGER:
            if getattr(request.user, "manager_status", None) != ManagerStatus.APPROVED:
                return False
            return obj.created_by == request.user
        return False
