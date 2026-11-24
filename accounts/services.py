"""
Accounts service layer — business logic for user identity operations.

Architectural contract:
  API View → Serializer (validation) → AccountService (business logic) → Model / Django auth

Keeping business rules here (rather than in views or serializers) makes
them independently testable and easy to extend without touching the HTTP layer.
"""

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.exceptions import ValidationError

from .models import User, UserRole, ManagerStatus


class AccountService:
    """Encapsulates business operations for the Accounts domain."""

    # ── Registration ──────────────────────────────────────────────────────────

    @staticmethod
    def register_user(
        *,
        username: str,
        email: str,
        password: str,
        role: str = "USER",
        business_name: str = "",
    ) -> User:
        """Create a new user account with role selection (USER or STORE_MANAGER).

        Store Managers are created in PENDING status, requiring Administrator approval.
        ADMIN role cannot be requested through registration.

        Raises
        ------
        ValidationError
            If user creation fails for any unexpected model-level reason
            (field validation errors from serializers are raised before this).
        """
        try:
            target_role = UserRole.STORE_MANAGER if role == UserRole.STORE_MANAGER else UserRole.USER
            mgr_status = ManagerStatus.PENDING if target_role == UserRole.STORE_MANAGER else ManagerStatus.APPROVED

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=target_role,
            )
            if target_role == UserRole.STORE_MANAGER:
                user.manager_status = mgr_status
                user.business_name = business_name.strip()
                user.save(update_fields=["manager_status", "business_name"])
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

    # ── Profile Update ────────────────────────────────────────────────────────

    @staticmethod
    def update_profile(*, user: User, validated_data: dict) -> User:
        """Update safe profile attributes (display_name, bio) for the given user.

        Only editable profile fields are updated. Elevated fields (role,
        is_staff, is_superuser, email, username) are never altered here.
        """
        update_fields = []

        if "display_name" in validated_data:
            user.display_name = validated_data["display_name"]
            update_fields.append("display_name")

        if "bio" in validated_data:
            user.bio = validated_data["bio"]
            update_fields.append("bio")

        if update_fields:
            update_fields.append("updated_at")
            user.save(update_fields=update_fields)

        return user

    # ── Password Change ───────────────────────────────────────────────────────

    @staticmethod
    def change_password(*, request, user: User, new_password: str) -> None:
        """Change user password, update hash, and preserve current session.

        Validates the new password against Django's configured AUTH_PASSWORD_VALIDATORS.
        Uses update_session_auth_hash so the current caller remains authenticated,
        while invalidating concurrent sessions on other devices.
        """
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": list(exc.messages)}) from exc

        user.set_password(new_password)
        user.save()
        if request is not None:
            update_session_auth_hash(request, user)

    # ── Password Recovery ─────────────────────────────────────────────────────

    @staticmethod
    def request_password_reset(*, email: str, frontend_url: str = None) -> bool:
        """Initiate password recovery for the account matching the given email.

        Generates a secure cryptographic reset token and dispatches an archival
        recovery email via Django's configured EMAIL_BACKEND.

        Always returns True to prevent account enumeration timing or status leaks.
        """
        norm_email = email.strip().lower()
        user = User.objects.filter(email__iexact=norm_email, is_active=True).first()

        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            base_url = (frontend_url or getattr(settings, "FRONTEND_URL", "http://localhost:3000")).rstrip("/")
            reset_link = f"{base_url}/?view=auth&tab=reset&uid={uid}&token={token}"

            display = user.display_name or user.username
            subject = "Akashic Library — Folio Master Passphrase Reset"
            message = (
                f"Greetings, Patron {display}.\n\n"
                f"A request has been recorded to reset the master passphrase for your "
                f"Akashic Library account ({user.email}).\n\n"
                f"To establish a new passphrase, please visit the following secure archival link:\n"
                f"{reset_link}\n\n"
                f"This recovery folio link will remain valid for 24 hours.\n\n"
                f"If you did not initiate this request, you may safely disregard this correspondence. "
                f"Your existing credentials remain unaltered.\n\n"
                f"— Custodial Desk, Akashic Library"
            )
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "Akashic Library <noreply@akashiclibrary.local>")

            try:
                send_mail(subject, message, from_email, [user.email], fail_silently=False)
            except Exception:
                # Log or handle email delivery failure safely without exposing details to caller
                pass

        return True

    @staticmethod
    def confirm_password_reset(*, user: User, new_password: str) -> None:
        """Reset the user's password using a verified token.

        Validates the new password against Django's configured AUTH_PASSWORD_VALIDATORS.
        Changing the password hash automatically consumes and invalidates the token.
        """
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": list(exc.messages)}) from exc

        user.set_password(new_password)
        user.save()
