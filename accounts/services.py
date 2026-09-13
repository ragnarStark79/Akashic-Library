"""
Accounts service layer — business logic for user identity operations.

Architectural contract:
  API View → Serializer (validation) → AccountService (business logic) → Model / Django auth

Keeping business rules here (rather than in views or serializers) makes
them independently testable and easy to extend without touching the HTTP layer.
"""

from django.contrib.auth import authenticate, login, logout
from rest_framework.exceptions import ValidationError

from .models import User, UserRole


class AccountService:
    """Encapsulates business operations for the Accounts domain."""

    # ── Registration ──────────────────────────────────────────────────────────

    @staticmethod
    def register_user(*, username: str, email: str, password: str) -> User:
        """Create a new user account with the default USER role.

        The role is NEVER accepted as a parameter — it is always USER.
        Password hashing is delegated entirely to Django's UserManager /
        AbstractBaseUser.set_password(), which uses Django's configured
        PASSWORD_HASHERS (PBKDF2 by default).

        Raises
        ------
        ValidationError
            If user creation fails for any unexpected model-level reason
            (field validation errors from serializers are raised before this).
        """
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                # role is intentionally not passed → defaults to UserRole.USER
            )
        except Exception as exc:
            raise ValidationError(
                {"detail": f"Account creation failed: {exc}"}
            ) from exc

        return user

    # ── Authentication ────────────────────────────────────────────────────────

    @staticmethod
    def authenticate_user(*, request, username: str, password: str) -> User:
        """Authenticate credentials and create a Django session.

        Uses Django's authenticate() which runs through all configured
        authentication backends (including ModelBackend by default).
        Never performs custom password comparison.

        Raises
        ------
        AuthenticationFailed
            If credentials are invalid or the account is inactive.
        """
        user = authenticate(request=request, username=username, password=password)

        if user is None:
            # Raise ValidationError (HTTP 400) rather than AuthenticationFailed
            # (HTTP 401) because this is a public endpoint with no auth classes.
            # AuthenticationFailed → 401 only when an auth class is active;
            # with @authentication_classes([]) DRF maps it to 403 instead.
            # A 400 response for bad credentials is acceptable on a login view
            # and avoids the DRF status-code ambiguity.
            raise ValidationError({"non_field_errors": ["Invalid username or password."]})

        if not user.is_active:
            raise ValidationError({"non_field_errors": ["This account is inactive."]})

        # Establish the session — Django handles session signing, cookie
        # rotation (session fixation protection), and secure storage.
        login(request, user)
        return user

    # ── Logout ────────────────────────────────────────────────────────────────

    @staticmethod
    def logout_user(*, request) -> None:
        """Invalidate the current session.

        Calls Django's logout() which flushes the session data and rotates
        the session key.  An unauthenticated call is a no-op.
        """
        logout(request)
