"""
Accounts models — User identity and basic profile.

Design decisions:
  - UUID primary key provides a stable, database-agnostic identifier
    that future MongoDB documents can safely reference without coupling
    to a PostgreSQL sequence.
  - Roles are enforced as controlled choices; they cannot be freely
    supplied by a client during registration (enforced at the service layer).
  - Profile fields (display_name, bio) are intentionally minimal;
    social/shelf features belong in later steps.
  - Django's AbstractBaseUser + PermissionsMixin gives us full control
    over the user model while retaining Django admin compatibility and
    the built-in password hashing / authentication machinery.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


# ─── Role choices ─────────────────────────────────────────────────────────────


class UserRole(models.TextChoices):
    """Application-level roles.

    Role escalation (MODERATOR → STORE_MANAGER → ADMIN) is always performed
    through trusted backend / admin mechanisms, never through client input.
    """

    USER = "USER", "User"
    MODERATOR = "MODERATOR", "Moderator"
    STORE_MANAGER = "STORE_MANAGER", "Store Manager"
    ADMIN = "ADMIN", "Admin"


# ─── User manager ─────────────────────────────────────────────────────────────


class UserManager(BaseUserManager):
    """Manager for the custom User model.

    Provides create_user() and create_superuser() so that
    ``python manage.py createsuperuser`` continues to work normally.
    """

    def create_user(self, username, email, password, **extra_fields):
        """Create and return a regular user."""
        if not username:
            raise ValueError("A username is required.")
        if not email:
            raise ValueError("An email address is required.")
        if not password:
            raise ValueError("A password is required.")

        email = self.normalize_email(email)
        extra_fields.setdefault("role", UserRole.USER)
        extra_fields.setdefault("is_active", True)

        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)  # Django hashes the password; never stored plain.
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password, **extra_fields):
        """Create and return a superuser (Django admin access)."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username, email, password, **extra_fields)


# ─── User model ───────────────────────────────────────────────────────────────


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model — the single source of truth for identity in Akashic Library.

    PostgreSQL stores all authentication-sensitive data.
    MongoDB documents will reference ``user.id`` (UUID) as a scalar
    ``user_id`` field when cross-database linkage is needed (future step).

    Fields
    ------
    id              UUID primary key — stable, non-sequential, safe for
                    cross-database references.
    username        Unique display / login handle.
    email           Unique email address.
    role            One of UserRole; defaults to USER; controlled server-side.
    is_active       Standard Django flag; False = soft-deleted / suspended.
    is_staff        Grants Django admin site access.
    created_at      Account creation timestamp (UTC, auto-set).
    updated_at      Last modification timestamp (UTC, auto-updated).

    Profile fields (intentionally minimal for this foundation step)
    ---------------------------------------------------------------
    display_name    Optional friendly name shown in the UI.
    bio             Optional short biography.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Stable UUID identifier; referenced by MongoDB documents.",
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text="Required. 150 characters or fewer. Letters, digits, and @/./+/-/_ only.",
    )
    email = models.EmailField(
        unique=True,
        help_text="Required. A valid, unique email address.",
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.USER,
        help_text="Application-level role. Assign elevated roles through the admin interface only.",
    )

    # ── Django auth flags ─────────────────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active.",
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the Django admin site.",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Basic profile ─────────────────────────────────────────────────────────
    display_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Optional friendly name displayed in the UI.",
    )
    bio = models.TextField(
        blank=True,
        help_text="Optional short biography.",
    )

    # ── Manager ───────────────────────────────────────────────────────────────
    objects = UserManager()

    # ── Auth field configuration ──────────────────────────────────────────────
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]  # prompted by createsuperuser in addition to username

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["username"]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        """True if the user has the ADMIN role."""
        return self.role == UserRole.ADMIN

    @property
    def is_moderator(self):
        """True if the user has at least MODERATOR privileges."""
        return self.role in (UserRole.MODERATOR, UserRole.STORE_MANAGER, UserRole.ADMIN)
