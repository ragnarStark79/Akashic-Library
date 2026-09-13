"""
Library API views — thin HTTP layer for /api/library/ endpoints.

Endpoints:
  GET    /api/library/                — list user's library (paginated)
  GET    /api/library/<book_id>/      — get single library entry + book snippet
  POST   /api/library/<book_id>/      — add book to shelf
  PATCH  /api/library/<book_id>/      — update shelf status
  DELETE /api/library/<book_id>/      — remove from library
  POST   /api/library/<book_id>/favorite/  — favorite a book
  DELETE /api/library/<book_id>/favorite/  — unfavorite a book

Import:
  POST   /api/books/import/           — import a book from external provider

All write operations require authentication.
user_id is ALWAYS derived from request.user — never from the request body.
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from . import repository
from .exceptions import (
    BookNotFoundError,
    InvalidQueryError,
    LibraryEntryExistsError,
    MongoDBUnavailableError,
    ProviderError,
)
from .library_repository import (
    add_favorite,
    add_library_entry,
    get_library_entry,
    is_favorited,
    list_favorites,
    list_user_library,
    remove_favorite,
    remove_library_entry,
    update_library_entry,
)
from .library_serializers import (
    FavoriteSerializer,
    ImportRequestSerializer,
    LibraryAddSerializer,
    LibraryEntrySerializer,
    LibraryUpdateSerializer,
)
from .serializers import BookDetailSerializer
from .services import BookImportService

logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_user_id(request) -> str:
    """Return the authenticated user's stable ID (UUID string)."""
    return str(request.user.id)


def _resolve_book_snippet(book_id: str) -> dict | None:
    """Fetch a compact book doc for embedding in library entries."""
    try:
        return repository.get_book_by_id(book_id)
    except Exception:
        return None


def _enrich_entry(entry: dict) -> dict:
    """Attach a compact book snippet to a library entry dict."""
    entry["_book"] = _resolve_book_snippet(entry.get("book_id", ""))
    return entry


def _paginate(request, results_key="results"):
    """Parse and validate pagination from request.query_params."""
    try:
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        if page < 1 or page_size < 1 or page_size > 100:
            raise ValueError
    except (ValueError, TypeError):
        return None, None, Response(
            {"detail": "Invalid pagination parameters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return page, page_size, None


# ─── Book import ──────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def book_import(request):
    """POST /api/books/import/

    Import a specific book from an external provider into the local catalog.

    Request body:
      {
        "provider": "google_books",   // or "open_library"
        "external_id": "gB_xwAEACAAJ"
      }

    Authorization: Must be authenticated.
    Note: Any authenticated user can trigger explicit import.
    The admin-only gate is intentionally not applied here because
    explicit import is a normal discovery feature (user finds a result
    in a provider, imports it to the local catalog).  The Step 3 implicit
    import is already open; making explicit import auth-only is sufficient.

    Response:
      201 Created — book imported/enriched; returns full BookDetail.
      200 OK      — book already existed and was enriched in place.
    """
    ser = ImportRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    provider_name = ser.validated_data["provider"]
    external_id = ser.validated_data["external_id"]

    try:
        book = BookImportService.import_from_provider(provider_name, external_id)
    except InvalidQueryError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except BookNotFoundError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except ProviderError as exc:
        return Response(
            {"detail": f"Provider error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except MongoDBUnavailableError:
        return Response(
            {"detail": "The book catalog is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.error("Unexpected error in book_import: %s", exc)
        return Response(
            {"detail": "An unexpected error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(BookDetailSerializer(book).data, status=status.HTTP_201_CREATED)


# ─── Library list ─────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def library_list(request):
    """GET /api/library/

    Return the authenticated user's reading library (paginated).

    Query params: page, page_size

    Response:
      {
        "count": N,
        "next": "...",
        "previous": "...",
        "results": [
          {
            "id": "...",
            "book_id": "...",
            "status": "READING",
            "favorited": true,
            "created_at": "...",
            "updated_at": "...",
            "book": {"id": "...", "title": "...", "authors": [...], "cover_url": "..."}
          },
          ...
        ]
      }
    """
    page, page_size, err = _paginate(request)
    if err:
        return err

    user_id = _get_user_id(request)

    try:
        result = list_user_library(user_id, page=page, page_size=page_size)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Enrich each entry with a book snippet.
    entries = [_enrich_entry(e) for e in result["results"]]
    serialized = LibraryEntrySerializer(entries, many=True).data

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


# ─── Library entry detail / CRUD ──────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def library_entry_detail(request, book_id: str):
    """GET /api/library/<book_id>/

    Retrieve the authenticated user's library entry for a specific book.

    Response: 200 OK with LibraryEntry, or 404 if not in library.
    """
    user_id = _get_user_id(request)
    try:
        entry = get_library_entry(user_id, book_id)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if entry is None:
        return Response(
            {"detail": "This book is not in your library."},
            status=status.HTTP_404_NOT_FOUND,
        )

    entry["favorited"] = is_favorited(user_id, book_id)
    entry = _enrich_entry(entry)
    return Response(LibraryEntrySerializer(entry).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def library_entry_add(request, book_id: str):
    """POST /api/library/<book_id>/

    Add a book to the authenticated user's reading library.

    Body: {"status": "WANT_TO_READ"}
    Response: 201 Created with LibraryEntry.

    Errors:
      400 — invalid or missing status, or invalid book_id
      404 — book not found in catalog
      409 — already in library (use PATCH to update)
    """
    user_id = _get_user_id(request)

    # Validate book exists in catalog.
    if not repository.book_exists(book_id):
        return Response(
            {"detail": f"Book {book_id!r} does not exist in the catalog."},
            status=status.HTTP_404_NOT_FOUND,
        )

    ser = LibraryAddSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        entry = add_library_entry(user_id, book_id, ser.validated_data["status"])
    except LibraryEntryExistsError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    entry["favorited"] = is_favorited(user_id, book_id)
    entry = _enrich_entry(entry)
    return Response(LibraryEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def library_entry_update(request, book_id: str):
    """PATCH /api/library/<book_id>/

    Update the reading status of a library entry.

    Body: {"status": "READ"}
    Response: 200 OK with updated LibraryEntry.

    Errors:
      400 — invalid status
      404 — entry not found (book not in library)
    """
    user_id = _get_user_id(request)

    ser = LibraryUpdateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        entry = update_library_entry(user_id, book_id, ser.validated_data["status"])
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if entry is None:
        return Response(
            {"detail": "This book is not in your library. Use POST to add it first."},
            status=status.HTTP_404_NOT_FOUND,
        )

    entry["favorited"] = is_favorited(user_id, book_id)
    entry = _enrich_entry(entry)
    return Response(LibraryEntrySerializer(entry).data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def library_entry_remove(request, book_id: str):
    """DELETE /api/library/<book_id>/

    Remove a book from the authenticated user's reading library.
    The Book document itself is NOT deleted.

    Response: 204 No Content (even if entry did not exist — idempotent delete).
    """
    user_id = _get_user_id(request)
    try:
        remove_library_entry(user_id, book_id)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Favorites ───────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def favorite_add(request, book_id: str):
    """POST /api/library/<book_id>/favorite/

    Favorite a book.  Idempotent — favoriting an already-favorited book
    returns 200 (not 201).

    Errors:
      404 — book not found in catalog
    """
    user_id = _get_user_id(request)

    # Validate book exists.
    if not repository.book_exists(book_id):
        return Response(
            {"detail": f"Book {book_id!r} does not exist in the catalog."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        fav = add_favorite(user_id, book_id)
        already_existed = fav is None or fav.get("_newly_created") is not True
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Build response.
    fav = fav or {}
    fav["_book"] = _resolve_book_snippet(book_id)
    resp_data = FavoriteSerializer(fav).data
    return Response(resp_data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def favorite_remove(request, book_id: str):
    """DELETE /api/library/<book_id>/favorite/

    Remove a favorite.  Idempotent — deleting a non-existent favorite
    returns 204 (no error).

    The Book document is NOT deleted.
    """
    user_id = _get_user_id(request)
    try:
        remove_favorite(user_id, book_id)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Library is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)
