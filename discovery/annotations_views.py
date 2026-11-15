"""
Annotations API views — HTTP layer for /api/books/<book_id>/annotations/ endpoints.

Endpoints:
  GET    /api/books/<book_id>/annotations/                    — list shared public annotations
  POST   /api/books/<book_id>/annotations/                    — create annotation (auth)
  GET    /api/books/<book_id>/my-annotations/                 — list authenticated user's annotations (auth)
  GET    /api/books/<book_id>/annotations/<annotation_id>/    — get single annotation (auth-checked for private)
  PATCH  /api/books/<book_id>/annotations/<annotation_id>/    — update own annotation (auth)
  PATCH  /api/books/<book_id>/annotations/<annotation_id>/update/ — alias update (auth)
  DELETE /api/books/<book_id>/annotations/<annotation_id>/    — delete own annotation (auth)
  DELETE /api/books/<book_id>/annotations/<annotation_id>/delete/ — alias delete (auth)

Security & privacy rules:
  - user_id is ALWAYS str(request.user.id) — NEVER accepted from request body.
  - Private annotations are NEVER returned in public listings.
  - Direct retrieval of a private annotation by another user returns 404 Not Found.
  - Updates and deletes strictly check user ownership (403 Forbidden for non-owners).
"""

import logging

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from . import annotations_repository, repository
from .annotations_repository import _UNSET
from .annotations_serializers import (
    AnnotationCreateSerializer,
    AnnotationDetailSerializer,
    AnnotationUpdateSerializer,
)
from .exceptions import (
    AnnotationNotFoundError,
    AnnotationPermissionError,
    BookNotFoundError,
    MongoDBUnavailableError,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def _user_id(request) -> str:
    """Return authenticated user's stable scalar ID."""
    return str(request.user.id)


def _get_author(user_id: str) -> dict | None:
    """Fetch safe author info from PostgreSQL by user_id string."""
    try:
        user = User.objects.only("id", "username", "display_name").get(pk=user_id)
        return {
            "id": str(user.id),
            "username": user.username,
            "display_name": getattr(user, "display_name", "") or user.username,
        }
    except (User.DoesNotExist, Exception):
        return None


def _enrich_annotation(annotation: dict) -> dict:
    """Attach safe author info to an annotation dict."""
    annotation["_author"] = _get_author(annotation.get("user_id", ""))
    return annotation


def _enrich_annotations(annotations: list[dict]) -> list[dict]:
    """Bulk-enrich annotations with safe author metadata."""
    unique_ids = {a.get("user_id") for a in annotations if a.get("user_id")}
    author_map: dict[str, dict | None] = {}
    for uid in unique_ids:
        author_map[uid] = _get_author(uid)
    for a in annotations:
        a["_author"] = author_map.get(a.get("user_id", ""))
    return annotations


def _require_book(book_id: str):
    """Verify book exists in local catalogue, raising BookNotFoundError if absent."""
    try:
        book = repository.get_book_by_id(book_id)
        if not book:
            raise BookNotFoundError(f"Book {book_id} not found in catalogue.")
        return book
    except (BookNotFoundError, Exception) as exc:
        if isinstance(exc, BookNotFoundError):
            raise
        logger.warning("Error verifying book %s: %s", book_id, exc)
        raise BookNotFoundError(f"Book {book_id} not found in catalogue.") from exc


# ─── Public List & Create ────────────────────────────────────────────────────


@api_view(["GET", "POST"])
def annotation_list_create(request, book_id: str):
    """GET: List public SHARED annotations for book_id.

    POST: Create a new annotation (Authenticated only). Default visibility is PRIVATE.
    """
    try:
        _require_book(book_id)
    except BookNotFoundError:
        return Response({"error": f"Book {book_id} not found."}, status=status.HTTP_404_NOT_FOUND)
    except MongoDBUnavailableError:
        return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if request.method == "GET":
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", annotations_repository.DEFAULT_PAGE_SIZE))
        except (ValueError, TypeError):
            page = 1
            page_size = annotations_repository.DEFAULT_PAGE_SIZE

        sort = request.query_params.get("sort", "recent")

        try:
            results, total = annotations_repository.list_shared_annotations_for_book(
                book_id=book_id,
                sort=sort,
                page=page,
                page_size=page_size,
            )
            enriched = _enrich_annotations(results)
            data = AnnotationDetailSerializer(enriched, many=True).data
            return Response(
                {
                    "count": total,
                    "page": page,
                    "page_size": min(page_size, annotations_repository.MAX_PAGE_SIZE),
                    "results": data,
                },
                status=status.HTTP_200_OK,
            )
        except MongoDBUnavailableError:
            return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # POST (create)
    if not request.user or not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required to inscribe annotations."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = AnnotationCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = serializer.validated_data
    try:
        created = annotations_repository.create_annotation(
            book_id=book_id,
            user_id=_user_id(request),
            content=validated["content"],
            visibility=validated.get("visibility", annotations_repository.VISIBILITY_PRIVATE),
            page_reference=validated.get("page_reference"),
            chapter_reference=validated.get("chapter_reference"),
            passage_excerpt=validated.get("passage_excerpt"),
        )
        enriched = _enrich_annotation(created)
        return Response(AnnotationDetailSerializer(enriched).data, status=status.HTTP_201_CREATED)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except MongoDBUnavailableError:
        return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ─── Authenticated User's Annotations ─────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_book_annotations(request, book_id: str):
    """Retrieve all annotations authored by the authenticated patron for book_id.

    Returns both PRIVATE and SHARED notes owned by request.user.
    Also returns tab counts (shared_count, my_private_count, my_shared_count, my_total_count).
    """
    try:
        _require_book(book_id)
    except BookNotFoundError:
        return Response({"error": f"Book {book_id} not found."}, status=status.HTTP_404_NOT_FOUND)
    except MongoDBUnavailableError:
        return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    visibility = request.query_params.get("visibility")
    sort = request.query_params.get("sort", "recent")

    try:
        results = annotations_repository.list_user_annotations_for_book(
            book_id=book_id,
            user_id=_user_id(request),
            visibility=visibility,
            sort=sort,
        )
        counts = annotations_repository.get_annotation_counts_for_book(
            book_id=book_id,
            user_id=_user_id(request),
        )
        enriched = _enrich_annotations(results)
        data = AnnotationDetailSerializer(enriched, many=True).data
        return Response(
            {
                "count": len(results),
                "counts": counts,
                "results": data,
            },
            status=status.HTTP_200_OK,
        )
    except MongoDBUnavailableError:
        return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ─── Single Annotation Detail / Update / Delete ──────────────────────────────


@api_view(["GET", "PATCH", "DELETE"])
def annotation_detail(request, book_id: str, annotation_id: str):
    """GET: Retrieve single annotation. If private, only the owner may retrieve it.

    PATCH: Update own annotation.
    DELETE: Delete own annotation.
    """
    try:
        _require_book(book_id)
    except BookNotFoundError:
        return Response({"error": f"Book {book_id} not found."}, status=status.HTTP_404_NOT_FOUND)
    except MongoDBUnavailableError:
        return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if request.method == "GET":
        try:
            doc = annotations_repository.get_annotation(book_id=book_id, annotation_id=annotation_id)
            # Privacy enforcement: If private, author must match authenticated user
            if doc.get("visibility") == annotations_repository.VISIBILITY_PRIVATE:
                if not request.user or not request.user.is_authenticated or _user_id(request) != doc.get("user_id"):
                    # Return 404 to avoid leaking existence of private note
                    return Response({"error": "Annotation not found."}, status=status.HTTP_404_NOT_FOUND)

            # Moderation enforcement: If hidden or rejected, only author or moderator may view it
            if doc.get("moderation_status") in ["HIDDEN", "REJECTED"]:
                user = request.user
                is_mod = user.is_authenticated and getattr(user, "role", None) in ["MODERATOR", "ADMIN"]
                is_author = user.is_authenticated and str(user.id) == str(doc.get("user_id"))
                if not (is_mod or is_author):
                    return Response({"error": "Annotation not found."}, status=status.HTTP_404_NOT_FOUND)

            enriched = _enrich_annotation(doc)
            return Response(AnnotationDetailSerializer(enriched).data, status=status.HTTP_200_OK)
        except AnnotationNotFoundError:
            return Response({"error": "Annotation not found."}, status=status.HTTP_404_NOT_FOUND)
        except MongoDBUnavailableError:
            return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # For PATCH and DELETE, authentication is strictly required
    if not request.user or not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required to modify or delete annotations."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if request.method == "PATCH":
        serializer = AnnotationUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        try:
            updated = annotations_repository.update_annotation(
                book_id=book_id,
                annotation_id=annotation_id,
                user_id=_user_id(request),
                content=validated.get("content", _UNSET),
                visibility=validated.get("visibility", _UNSET),
                page_reference=validated.get("page_reference", _UNSET),
                chapter_reference=validated.get("chapter_reference", _UNSET),
                passage_excerpt=validated.get("passage_excerpt", _UNSET),
            )
            enriched = _enrich_annotation(updated)
            return Response(AnnotationDetailSerializer(enriched).data, status=status.HTTP_200_OK)
        except AnnotationNotFoundError:
            return Response({"error": "Annotation not found."}, status=status.HTTP_404_NOT_FOUND)
        except AnnotationPermissionError:
            return Response(
                {"error": "You do not have permission to modify this annotation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except MongoDBUnavailableError:
            return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if request.method == "DELETE":
        try:
            annotations_repository.delete_annotation(
                book_id=book_id,
                annotation_id=annotation_id,
                user_id=_user_id(request),
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except AnnotationNotFoundError:
            return Response({"error": "Annotation not found."}, status=status.HTTP_404_NOT_FOUND)
        except AnnotationPermissionError:
            return Response(
                {"error": "You do not have permission to delete this annotation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        except MongoDBUnavailableError:
            return Response({"error": "Database unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ─── Explicit Sub-path Aliases ────────────────────────────────────────────────


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def annotation_update(request, book_id: str, annotation_id: str):
    """Explicit PATCH /api/books/<book_id>/annotations/<annotation_id>/update/ alias."""
    return annotation_detail(request, book_id, annotation_id)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def annotation_delete(request, book_id: str, annotation_id: str):
    """Explicit DELETE /api/books/<book_id>/annotations/<annotation_id>/delete/ alias."""
    return annotation_detail(request, book_id, annotation_id)

