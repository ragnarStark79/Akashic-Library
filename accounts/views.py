"""
Accounts API views — thin HTTP layer for /api/auth/ endpoints.

Each view:
  1. Deserializes and validates the request via a serializer.
  2. Delegates business logic to AccountService.
  3. Returns a JSON response with appropriate status code.

Views do NOT contain authentication logic, password handling, or
user-creation logic — those live in services.py.
"""

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import LoginSerializer, RegistrationSerializer, UserSerializer
from .services import AccountService


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me/

    Return safe account information for the currently authenticated user.
    Unauthenticated requests receive 403 Forbidden (DRF default for
    SessionAuthentication without credentials).

    Never returns: password, password hash, session key, or SECRET_KEY.

    Responses:
        200 OK          — authenticated user data
        403 Forbidden   — not authenticated
    """
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
