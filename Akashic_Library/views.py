"""
API health and readiness check views.

GET /api/health/        -> Process Liveness probe (no DB checks)
GET /api/health/ready/  -> Application Readiness probe (PostgreSQL & MongoDB connectivity)
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from discovery.repository import get_db

logger = logging.getLogger(__name__)


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


@api_view(["GET"])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Return application readiness verifying database availability.
    Strictly non-sensitive: Never leaks database hosts, URIs, or credentials.
    """
    pg_status = "connected"
    mongo_status = "connected"
    is_ready = True

    # 1. Check PostgreSQL connectivity
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
    except Exception as exc:
        logger.error("PostgreSQL readiness check failed: %s", exc)
        pg_status = "unavailable"
        is_ready = False

    # 2. Check MongoDB connectivity
    try:
        db = get_db()
        db.command("ping")
    except Exception as exc:
        logger.error("MongoDB readiness check failed: %s", exc)
        mongo_status = "unavailable"
        is_ready = False

    http_status = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(
        {
            "status": "ready" if is_ready else "unhealthy",
            "databases": {
                "relational": pg_status,
                "document": mongo_status,
            },
        },
        status=http_status,
    )
