"""
API health-check view.

GET /api/health/
Returns a simple JSON payload confirming the API is reachable.
No database queries are performed here — this endpoint must remain
available even when the database is temporarily unreachable.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Return a basic liveness signal for the Akashic Library API."""
    return Response(
        {
            "status": "ok",
            "service": "Akashic Library API",
        }
    )
