"""
Discovery API views — thin HTTP layer for /api/books/ endpoints.

Each view:
  1. Parses and validates query parameters.
  2. Delegates to BookSearchService.
  3. Serializes the result.
  4. Returns a clean JSON response.

Views do NOT contain MongoDB queries, provider calls, or business logic.
Internal exceptions are caught and converted to safe HTTP responses — no
tracebacks, credentials, or connection strings are returned to clients.
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .exceptions import BookNotFoundError, InvalidQueryError, MongoDBUnavailableError
from .serializers import BookDetailSerializer, BookListItemSerializer
from .services import BookSearchService

logger = logging.getLogger(__name__)


# ─── Book list / search ───────────────────────────────────────────────────────


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def book_list(request):
    """GET /api/books/

    Search and list books from the local catalog (with external provider
    fallback when the catalog has no matching results).

    Query parameters:
      q         Full-text search string.
      author    Filter by author name (case-insensitive substring).
      isbn      Filter by ISBN-10 or ISBN-13.
      subject   Filter by subject/category (case-insensitive substring).
      language  Filter by BCP-47 language code (e.g. "en").
      page      Page number (1-indexed, default 1).
      page_size Results per page (default 20, max 100).

    Response:
      {
        "count": <total matching>,
        "next": <next page URL or null>,
        "previous": <previous page URL or null>,
        "results": [<BookListItem>, ...]
      }
    """
    query = request.query_params.get("q", "").strip()
    author = request.query_params.get("author", "").strip()
    isbn = request.query_params.get("isbn", "").strip()
    subject = request.query_params.get("subject", "").strip()
    language = request.query_params.get("language", "").strip()
    publisher = request.query_params.get("publisher", "").strip()

    # Year range filters.
    year_from: int | None = None
    year_to: int | None = None
    try:
        if request.query_params.get("year_from"):
            year_from = int(request.query_params["year_from"])
        if request.query_params.get("year_to"):
            year_to = int(request.query_params["year_to"])
    except (ValueError, TypeError):
        return Response(
            {"detail": "'year_from' and 'year_to' must be 4-digit integers."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate and parse pagination params.
    try:
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        if page < 1 or page_size < 1 or page_size > 100:
            raise ValueError
    except (ValueError, TypeError):
        return Response(
            {"detail": "Invalid pagination parameters. 'page' and 'page_size' must be positive integers."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = BookSearchService.search(
            query=query,
            author=author,
            isbn=isbn,
            subject=subject,
            language=language,
            publisher=publisher,
            year_from=year_from,
            year_to=year_to,
            page=page,
            page_size=page_size,
        )
    except MongoDBUnavailableError:
        return Response(
            {"detail": "The book catalog is temporarily unavailable. Please try again later."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.error("Unexpected error in book_list: %s", exc)
        return Response(
            {"detail": "An unexpected error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serialized = BookListItemSerializer(result["results"], many=True).data

    # Build next/previous URLs.
    base_url = request.build_absolute_uri(request.path)
    params = {k: v for k, v in request.query_params.items() if k != "page"}

    def build_page_url(p):
        qs = "&".join(f"{k}={v}" for k, v in {**params, "page": p}.items())
        return f"{base_url}?{qs}"

    total = result["count"]
    actual_page_size = result["page_size"]
    has_next = (page * actual_page_size) < total
    has_prev = page > 1

    return Response(
        {
            "count": total,
            "next": build_page_url(page + 1) if has_next else None,
            "previous": build_page_url(page - 1) if has_prev else None,
            "results": serialized,
        },
        status=status.HTTP_200_OK,
    )


# ─── Book detail ─────────────────────────────────────────────────────────────


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def book_detail(request, book_id: str):
    """GET /api/books/<book_id>/

    Retrieve a single book by its local MongoDB ObjectId.

    Responses:
      200 OK            — book found
      400 Bad Request   — invalid ID format
      404 Not Found     — book does not exist
      503 Unavailable   — MongoDB unreachable
    """
    try:
        book = BookSearchService.get_book(book_id)
    except BookNotFoundError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "The book catalog is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.error("Unexpected error in book_detail(id=%r): %s", book_id, exc)
        return Response(
            {"detail": "An unexpected error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(BookDetailSerializer(book).data, status=status.HTTP_200_OK)
