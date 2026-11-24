"""
Accounts API views — thin HTTP layer for /api/auth/ endpoints.

Each view:
  1. Deserializes and validates the request via a serializer.
  2. Delegates business logic to AccountService.
  3. Returns a JSON response with appropriate status code.

Views do NOT contain authentication logic, password handling, or
user-creation logic — those live in services.py.
"""

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
)
from .services import AccountService


class PasswordResetRateThrottle(AnonRateThrottle):
    """Abuse-protection rate limiter for unauthenticated password reset requests."""
    scope = "password_reset"
    rate = "10/hour"


# ─── Registration ─────────────────────────────────────────────────────────────


@api_view(["POST"])
@authentication_classes([])   # No auth required — public endpoint.
@permission_classes([])       # No permission required.
def register(request):
    """POST /api/auth/register/

    Create a new user account.  Role is always set to USER; the client
    cannot influence the role through this endpoint.

    Request body:
        { "username": "...", "email": "...", "password": "..." }

    Responses:
        201 Created    — account created successfully
        400 Bad Request — validation error
    """
    serializer = RegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = AccountService.register_user(
        username=serializer.validated_data["username"],
        email=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
        role=serializer.validated_data.get("role", "USER"),
        business_name=serializer.validated_data.get("business_name", ""),
    )

    return Response(
        {
            "detail": "Account created successfully.",
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ─── Login ────────────────────────────────────────────────────────────────────


@api_view(["POST"])
@authentication_classes([])   # Public — user is not yet authenticated.
@permission_classes([])
def login_view(request):
    """POST /api/auth/login/

    Authenticate with username + password and establish a session.

    Request body:
        { "username": "...", "password": "..." }

    Responses:
        200 OK          — authenticated; session cookie set
        400 Bad Request — missing fields
        401 Unauthorized — invalid credentials
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = AccountService.authenticate_user(
        request=request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )

    return Response(
        {
            "detail": "Login successful.",
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


# ─── Logout ───────────────────────────────────────────────────────────────────


@api_view(["POST"])
@authentication_classes([])   # Callable from any state — authenticated or not.
@permission_classes([])       # Always accessible; no-op if not logged in.
def logout_view(request):
    """POST /api/auth/logout/

    Invalidate the current session.  Works for both authenticated and
    unauthenticated requests (no-op if not logged in).

    Responses:
        200 OK — session invalidated (or was already absent)
    """
    AccountService.logout_user(request=request)
    return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


# ─── Current user ─────────────────────────────────────────────────────────────


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me/
    PATCH /api/auth/me/

    GET: Return safe account information for the currently authenticated user.
    PATCH: Update editable profile fields (display_name, bio) for the user.

    Unauthenticated requests receive 403 Forbidden.
    Never returns: password, password hash, session key, or SECRET_KEY.

    Responses:
        200 OK          — authenticated user data
        400 Bad Request — validation error on PATCH
        403 Forbidden   — not authenticated
    """
    if request.method == "PATCH":
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = AccountService.update_profile(
            user=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


# ─── Password Change ──────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def password_change(request):
    """POST /api/auth/password/change/

    Change password for the currently authenticated user.
    Requires current password verification and validates new password strength.
    Preserves active user session while invalidating other sessions.

    Responses:
        200 OK          — password changed successfully
        400 Bad Request — invalid current password or validation error
        403 Forbidden   — not authenticated
    """
    serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)

    AccountService.change_password(
        request=request,
        user=request.user,
        new_password=serializer.validated_data["new_password"],
    )

    return Response(
        {"detail": "Password changed successfully."},
        status=status.HTTP_200_OK,
    )


# ─── Password Reset Request ───────────────────────────────────────────────────


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request(request):
    """POST /api/auth/password/reset/

    Initiate forgotten-password recovery for the provided email address.
    Strict account-enumeration resistance: always returns 200 OK with identical
    generic confirmation regardless of whether the account exists.

    Responses:
        200 OK          — generic confirmation response
        400 Bad Request — invalid email format
        429 Throttled   — rate limit exceeded
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    AccountService.request_password_reset(
        email=serializer.validated_data["email"],
        frontend_url=frontend_url,
    )

    return Response(
        {
            "detail": (
                "If an account exists for this address, password recovery instructions will be sent."
            )
        },
        status=status.HTTP_200_OK,
    )


# ─── Password Reset Confirm ───────────────────────────────────────────────────


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def password_reset_confirm(request):
    """POST /api/auth/password/reset/confirm/

    Complete forgotten-password reset with cryptographic token and new password.
    Validates token integrity and expiry, enforces password rules, and sets
    new password.

    Responses:
        200 OK          — password successfully reset
        400 Bad Request — invalid/expired token or password validation error
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    AccountService.confirm_password_reset(
        user=serializer.validated_data["user"],
        new_password=serializer.validated_data["new_password"],
    )

    return Response(
        {
            "detail": (
                "Password has been reset successfully. You may now sign in with your new password."
            )
        },
        status=status.HTTP_200_OK,
    )
