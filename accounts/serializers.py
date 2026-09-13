"""
Accounts serializers — request validation and response representation.

Serializers are responsible for:
  - Input validation (field types, constraints, uniqueness)
  - Password strength enforcement via Django's AUTH_PASSWORD_VALIDATORS
  - Safe output representation (never exposing passwords or hashes)

Business logic (user creation, authentication) is intentionally kept
out of serializers; it lives in accounts/services.py.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


# ─── Registration ─────────────────────────────────────────────────────────────


class RegistrationSerializer(serializers.Serializer):
    """Validates POST /api/auth/register/ request bodies.

    The ``role`` field is intentionally absent — it is always set to USER
    by the service layer regardless of any client input.
    """

    username = serializers.CharField(
        max_length=150,
        min_length=3,
        trim_whitespace=True,
    )
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,  # Never echoed back in any response.
        min_length=8,
        style={"input_type": "password"},
    )

    def validate_username(self, value):
        """Ensure username is not already taken (case-insensitive check)."""
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        """Ensure email is not already registered."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        """Run Django's full AUTH_PASSWORD_VALIDATORS suite on the raw password."""
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


# ─── Login ────────────────────────────────────────────────────────────────────


class LoginSerializer(serializers.Serializer):
    """Validates POST /api/auth/login/ request bodies."""

    username = serializers.CharField(trim_whitespace=True)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        """Authenticate credentials using Django's auth backend.

        We do NOT perform authentication here (that is the service's job).
        We only ensure both fields are present and non-empty.
        """
        username = attrs.get("username", "").strip()
        password = attrs.get("password", "")

        if not username or not password:
            raise serializers.ValidationError("Both username and password are required.")

        return attrs


# ─── User representation ──────────────────────────────────────────────────────


class UserSerializer(serializers.ModelSerializer):
    """Safe read-only representation of the authenticated user.

    Used by GET /api/auth/me/.

    Fields deliberately excluded: password, last_login (internal),
    is_staff, is_superuser, groups, user_permissions (internal Django fields).
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "display_name",
            "bio",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields  # All fields are read-only in this serializer.
