"""
Reviews API views — thin HTTP layer for /api/books/<book_id>/reviews/ endpoints.

Endpoints:
  GET    /api/books/<book_id>/reviews/                    — list reviews (paginated)
  POST   /api/books/<book_id>/reviews/                    — create review (auth)
  GET    /api/books/<book_id>/reviews/<review_id>/        — get single review
  PATCH  /api/books/<book_id>/reviews/<review_id>/update/ — update own review (auth)
  DELETE /api/books/<book_id>/reviews/<review_id>/delete/ — delete own review (auth)
  GET    /api/books/<book_id>/rating/                     — aggregate rating

Security contract (this module enforces):
  - user_id is ALWAYS str(request.user.id) — NEVER from the request body.
  - book_id comes from the URL path parameter — validated against the catalog.
  - helpful_count and moderation_status are NEVER accepted from the client.
  - created_at and updated_at are NEVER accepted from the client.
  - Ownership: update/delete use repository queries scoped to (review_id, user_id).
  - Impersonation is architecturally impossible: user_id is derived from auth.

Views do NOT contain MongoDB queries or business logic.
"""

import logging

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from . import repository
from .exceptions import (
    BookNotFoundError,
    DuplicateReviewError,
    MongoDBUnavailableError,
    ReviewNotFoundError,
    ReviewPermissionError,
)
from . import reviews_repository
from .reviews_repository import _UNSET
from .reviews_serializers import (
    AggregateRatingSerializer,
    ReviewCreateSerializer,
    ReviewDetailSerializer,
    ReviewUpdateSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _user_id(request) -> str:
    """Return authenticated user's stable scalar ID."""
    return str(request.user.id)


def _get_author(user_id: str) -> dict | None:
    """Fetch safe author info from PostgreSQL by user_id string.

    Returns None if the user no longer exists.
    Only exposes: id, username, display_name.
    """
    try:
        user = User.objects.only("id", "username", "display_name").get(pk=user_id)
        return {"id": str(user.id), "username": user.username, "display_name": user.display_name}
    except (User.DoesNotExist, Exception):
        return None


def _enrich_review(review: dict) -> dict:
    """Attach safe author info to a review dict."""
    review["_author"] = _get_author(review.get("user_id", ""))
    return review


def _enrich_reviews(reviews: list[dict]) -> list[dict]:
    """Bulk-enrich reviews with author info.

    Fetches only unique user IDs to minimize DB queries.
    """
    unique_ids = {r.get("user_id") for r in reviews if r.get("user_id")}
    author_map: dict[str, dict | None] = {}
    for uid in unique_ids:
        author_map[uid] = _get_author(uid)
    for review in reviews:
        review["_author"] = author_map.get(review.get("user_id"))
    return reviews


def _paginate_params(request):
    """Parse page/page_size; return (page, page_size, error_response_or_None)."""
    try:
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        if page < 1 or page_size < 1:
            raise ValueError
    except (ValueError, TypeError):
        return None, None, Response(
            {"detail": "Invalid pagination parameters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return page, page_size, None


def _build_page_urls(request, page, page_size, total):
    """Build next/previous page URL strings."""
    base = request.build_absolute_uri(request.path)
    params = {k: v for k, v in request.query_params.items() if k != "page"}

    def url(p):
        qs = "&".join(f"{k}={v}" for k, v in {**params, "page": p}.items())
        return f"{base}?{qs}"

    has_next = (page * page_size) < total
    has_prev = page > 1
    return url(page + 1) if has_next else None, url(page - 1) if has_prev else None


# ─── Combined list + create (GET/POST) ───────────────────────────────────────


@api_view(["GET", "POST"])
def review_list_create(request, book_id: str):
    """GET/POST /api/books/<book_id>/reviews/

    GET  — list reviews (public)
    POST — create review (authentication required)
    """
    if request.method == "GET":
        return _review_list(request, book_id)
    # POST
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return _review_create(request, book_id)


# ─── List reviews ─────────────────────────────────────────────────────────────


def _review_list(request, book_id: str):
    """Internal: list approved reviews for a book (paginated, newest first)."""
    page, page_size, err = _paginate_params(request)
    if err:
        return err

    # Validate book exists.
    if not repository.book_exists(book_id):
        return Response(
            {"detail": f"Book {book_id!r} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        result = reviews_repository.list_reviews_for_book(
            book_id, page=page, page_size=page_size
        )
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Reviews are temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    enriched = _enrich_reviews(result["results"])
    serialized = ReviewDetailSerializer(enriched, many=True).data
    next_url, prev_url = _build_page_urls(request, page, result["page_size"], result["count"])

    return Response(
        {
            "count": result["count"],
            "next": next_url,
            "previous": prev_url,
            "results": serialized,
        },
        status=status.HTTP_200_OK,
    )


# ─── Create review ────────────────────────────────────────────────────────────


def _review_create(request, book_id: str):
    """Internal: create a review (called after auth check)."""
    # Validate book exists.
    if not repository.book_exists(book_id):
        return Response(
            {"detail": f"Book {book_id!r} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    ser = ReviewCreateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    user_id = _user_id(request)  # ALWAYS from authenticated user — never from body.
    d = ser.validated_data

    try:
        review = reviews_repository.create_review(
            user_id=user_id,
            book_id=book_id,
            rating=d["rating"],
            body=d["body"],
            title=d.get("title", _UNSET),
            contains_spoiler=d.get("contains_spoiler", False),
        )
    except DuplicateReviewError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Reviews are temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    review = _enrich_review(review)
    return Response(ReviewDetailSerializer(review).data, status=status.HTTP_201_CREATED)


# ─── Get single review ────────────────────────────────────────────────────────


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def review_detail(request, book_id: str, review_id: str):
    """GET /api/books/<book_id>/reviews/<review_id>/

    Get a single review. Public — no authentication required.
    """
    try:
        review = reviews_repository.get_review(review_id)
    except ReviewNotFoundError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Reviews are temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Ensure the review belongs to the requested book.
    if review.get("book_id") != book_id:
        return Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)

    review = _enrich_review(review)
    return Response(ReviewDetailSerializer(review).data, status=status.HTTP_200_OK)


# ─── Update review ────────────────────────────────────────────────────────────


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def review_update(request, book_id: str, review_id: str):
    """PATCH /api/books/<book_id>/reviews/<review_id>/update/

    Update the authenticated user's own review. All fields optional.

    NEVER accepted: user_id, helpful_count, moderation_status, timestamps.

    Errors:
      400 — invalid input
      403 — review belongs to another user
      404 — review not found
    """
    ser = ReviewUpdateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    user_id = _user_id(request)
    d = ser.validated_data

    # Use _UNSET sentinel: if 'title' key not in validated_data, keep as _UNSET
    # so the repository knows to skip updating it.
    title = d.get("title", _UNSET)

    try:
        updated = reviews_repository.update_review(
            review_id=review_id,
            user_id=user_id,
            rating=d.get("rating"),
            body=d.get("body"),
            title=title,
            contains_spoiler=d.get("contains_spoiler"),
        )
    except ReviewNotFoundError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except ReviewPermissionError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Reviews are temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    updated = _enrich_review(updated)
    return Response(ReviewDetailSerializer(updated).data, status=status.HTTP_200_OK)


# ─── Delete review ────────────────────────────────────────────────────────────


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def review_delete(request, book_id: str, review_id: str):
    """DELETE /api/books/<book_id>/reviews/<review_id>/delete/

    Delete the authenticated user's own review.

    Errors:
      403 — review belongs to another user
      404 — review not found
    """
    user_id = _user_id(request)

    try:
        deleted = reviews_repository.delete_review(review_id=review_id, user_id=user_id)
    except ReviewNotFoundError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except ReviewPermissionError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Reviews are temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not deleted:
        return Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Aggregate rating ─────────────────────────────────────────────────────────


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def book_rating(request, book_id: str):
    """GET /api/books/<book_id>/rating/

    Return aggregate community rating for a book.

    Calculated from AKASHIC LIBRARY community reviews ONLY.
    External provider ratings are NEVER included.

    Response: {average_rating, rating_count, distribution: {1..5: count}}
    """
    if not repository.book_exists(book_id):
        return Response(
            {"detail": f"Book {book_id!r} not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        agg = reviews_repository.get_aggregate_rating(book_id)
    except MongoDBUnavailableError:
        return Response(
            {"detail": "Ratings are temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(AggregateRatingSerializer(agg).data, status=status.HTTP_200_OK)
