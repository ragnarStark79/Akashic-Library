"""
Accounts admin — Django admin registration for User model.

UserAdmin is customised to:
  - Display password as a non-editable hash (never plaintext).
  - Use Django's built-in password change form for updates.
  - Allow role management from the admin side only.
  - Provide sensible list display and search functionality.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for the custom User model."""

    # ── List view ─────────────────────────────────────────────────────────────
    list_display = ("username", "email", "role", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("username", "email", "display_name")
    ordering = ("username",)

    # ── Detail view fieldsets ─────────────────────────────────────────────────
    # Overriding BaseUserAdmin.fieldsets to match our custom fields.
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("email", "display_name", "bio")}),
        (
            _("Role & permissions"),
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "created_at", "updated_at")}),
    )

    # Fields shown when creating a new user in the admin.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "password1", "password2", "role"),
            },
        ),
    )

    # auto_now_add / auto_now fields must be read-only in admin.
    readonly_fields = ("created_at", "updated_at", "last_login")
