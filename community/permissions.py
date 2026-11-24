"""
Community Permissions — Role-based access control for moderation.

Enforces least-privilege role boundaries according to the approved architecture:
- MODERATOR and ADMIN roles have full moderation authority.
- USER and STORE_MANAGER roles are strictly denied moderation authority,
  even if their Django is_staff or is_superuser flag is True.
"""

from rest_framework.permissions import BasePermission
from accounts.models import UserRole


class IsModerator(BasePermission):
    """
    Grants access exclusively to users with application role MODERATOR or ADMIN.
    Explicitly denies access based solely on Django is_staff or is_superuser flags.
    A USER or STORE_MANAGER with is_staff=True will NOT gain moderation privileges.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        # Least-privilege role check: strictly MODERATOR or ADMIN role
        return getattr(user, "role", None) in [UserRole.MODERATOR, UserRole.ADMIN]
