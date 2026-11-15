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
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
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


# ─── Profile update ───────────────────────────────────────────────────────────


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating current user's profile (display_name, bio).

    Strict allowlist: only display_name and bio can be modified.
    Attempts to modify role, username, email, is_staff, is_superuser, id,
    or timestamps are rejected or dropped.
    """

    display_name = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        trim_whitespace=False,
    )
    bio = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = User
        fields = ["display_name", "bio"]

    def validate_display_name(self, value):
        stripped = value.strip()
        # If input has non-empty whitespace-only content, reject it per Part 4.2
        if value and not stripped:
            raise serializers.ValidationError("Display name cannot consist solely of whitespace.")
        return stripped

    def validate_bio(self, value):
        return value.strip() if value else ""


# ─── Password change ──────────────────────────────────────────────────────────


class PasswordChangeSerializer(serializers.Serializer):
    """Validates POST /api/auth/password/change/ request bodies."""

    current_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    confirm_new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_current_password(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        new_password = attrs.get("new_password")
        confirm_new_password = attrs.get("confirm_new_password")

        if new_password != confirm_new_password:
            raise serializers.ValidationError(
                {"confirm_new_password": ["New passwords do not match."]}
            )

        if user and user.check_password(new_password):
            raise serializers.ValidationError(
                {"new_password": ["New password cannot be the same as the current password."]}
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc

        return attrs


# ─── Password reset request ───────────────────────────────────────────────────


class PasswordResetRequestSerializer(serializers.Serializer):
    """Validates POST /api/auth/password/reset/ request bodies."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


# ─── Password reset confirm ───────────────────────────────────────────────────


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validates POST /api/auth/password/reset/confirm/ request bodies."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    confirm_new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        confirm_new_password = attrs.get("confirm_new_password")
        uid_b64 = attrs.get("uid")
        token = attrs.get("token")

        if new_password != confirm_new_password:
            raise serializers.ValidationError(
                {"confirm_new_password": ["New passwords do not match."]}
            )

        # Decode UID safely
        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError(
                {"detail": "Invalid or expired password reset token."}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account is inactive."}
            )

        # Validate token
        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError(
                {"detail": "Invalid or expired password reset token."}
            )

        # Validate password strength
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc

        attrs["user"] = user
        return attrs
