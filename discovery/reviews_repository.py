"""
Reviews Repository — data-access layer for book reviews and ratings.

All MongoDB operations for the 'reviews' collection are here.
No business logic belongs in this module.

Collection: reviews

Document shape:
  {
    "_id":               ObjectId,
    "book_id":           str  — str(books._id),
    "user_id":           str  — str(accounts.User.id),
    "rating":            int  — 1..5,
    "title":             str | None,
    "body":              str,
    "contains_spoiler":  bool,
    "helpful_count":     int  — server-controlled, always 0 on creation,
    "moderation_status": str  — PENDING | APPROVED | REJECTED | FLAGGED,
    "created_at":        datetime,
    "updated_at":        datetime,
  }

Data ownership:
  user_id  = str(accounts.User.id)  — PostgreSQL UUID as scalar string.
  book_id  = str(books._id)         — MongoDB ObjectId as scalar string.

  No cross-database foreign keys.  The view layer checks book existence
  before writing a review.

Moderation statuses:
  PENDING   — awaiting moderation review (reserved for future community step)
  APPROVED  — visible to all users
  REJECTED  — hidden; only the author and moderators can see
  FLAGGED   — marked for review by a moderator

  For the Step 5 initial release, newly created reviews default to APPROVED.
  Moderation escalation is reserved for the Community step.

Indexes:
  reviews:
    - (user_id, book_id)  unique compound — one review per user per book
    - book_id             — fast per-book listing
    - moderation_status   — moderator dashboard (future)
    - created_at          — chronological order
"""

import logging
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError, PyMongoError

from .db import get_db
from .exceptions import (
    DuplicateReviewError,
    MongoDBUnavailableError,
    ReviewNotFoundError,
    ReviewPermissionError,
)

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

REVIEWS_COLLECTION = "reviews"

MODERATION_STATUSES = ("PENDING", "APPROVED", "REJECTED", "FLAGGED")
DEFAULT_MODERATION_STATUS = "APPROVED"

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

MIN_RATING = 1
MAX_RATING = 5

# Sentinel for detecting "not provided" in PATCH operations.
_UNSET = object()


# ─── Collection helper ────────────────────────────────────────────────────────


def _get_col():
    return get_db()[REVIEWS_COLLECTION]


# ─── Index management ─────────────────────────────────────────────────────────


def ensure_review_indexes() -> None:
    """Create MongoDB indexes for the reviews collection.

    Safe to call multiple times.
    """
    col = _get_col()

    # Unique compound — one active review per user per book.
    col.create_index(
        [("user_id", ASCENDING), ("book_id", ASCENDING)],
        unique=True,
        name="reviews_user_book_unique",
    )
    # Fast per-book listing (most common query pattern).
    col.create_index([("book_id", ASCENDING)], name="reviews_book_id")
    # Moderation dashboard — future use.
    col.create_index([("moderation_status", ASCENDING)], name="reviews_moderation_status")
    # Chronological listing.
    col.create_index([("created_at", DESCENDING)], name="reviews_created_at_desc")

    logger.info(
        "Reviews: MongoDB indexes ensured for '%s' collection.", REVIEWS_COLLECTION
    )


# ─── Write operations ─────────────────────────────────────────────────────────


def create_review(
    *,
    user_id: str,
    book_id: str,
    rating: int,
    body: str,
    title: str | None = None,
    contains_spoiler: bool = False,
) -> dict[str, Any]:
    """Create a new review.

    Raises
    ------
    DuplicateReviewError    If the user already has a review for this book.
    MongoDBUnavailableError On MongoDB failure.
    """
    col = _get_col()

    # Pre-insert existence check (handles mongomock which ignores unique indexes).
    if col.count_documents({"user_id": user_id, "book_id": book_id}, limit=1) > 0:
        raise DuplicateReviewError(
            "You already have a review for this book. Use PATCH to update it."
        )

    now = datetime.now(UTC)
    doc = {
        "book_id": book_id,
        "user_id": user_id,
        "rating": int(rating),
        "title": title or None,
        "body": body,
        "contains_spoiler": bool(contains_spoiler),
        "helpful_count": 0,  # Server-controlled — never from client.
        "moderation_status": DEFAULT_MODERATION_STATUS,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = col.insert_one(doc)
        inserted_doc = col.find_one({"_id": result.inserted_id})
        return _serialize(inserted_doc)
    except DuplicateKeyError:
        raise DuplicateReviewError(
            "You already have a review for this book. Use PATCH to update it."
        )
    except PyMongoError as exc:
        logger.error("create_review failed: %s", exc)
        raise MongoDBUnavailableError("Reviews are temporarily unavailable.") from exc


def update_review(
    *,
    review_id: str,
    user_id: str,
    rating: int | None = None,
    body: str | None = None,
    title: Any = _UNSET,
    contains_spoiler: bool | None = None,
) -> dict[str, Any]:
    """Update the authenticated user's own review.

    Only fields that are explicitly provided are updated (PATCH semantics).
    moderation_status, helpful_count, created_at are NEVER changed here.

    Raises
    ------
    ReviewNotFoundError     If the review does not exist.
    ReviewPermissionError   If the review belongs to a different user.
    MongoDBUnavailableError On MongoDB failure.
    """
    col = _get_col()
    try:
        oid = ObjectId(review_id)
    except InvalidId:
        raise ReviewNotFoundError(f"Invalid review ID: {review_id!r}")

    # Fetch first to distinguish "not found" from "wrong owner".
    existing = col.find_one({"_id": oid})
    if existing is None:
        raise ReviewNotFoundError(f"Review not found: {review_id!r}")
    if existing.get("user_id") != user_id:
        raise ReviewPermissionError("You can only edit your own reviews.")

    set_ops: dict[str, Any] = {"updated_at": datetime.now(UTC)}
    if rating is not None:
        set_ops["rating"] = int(rating)
    if body is not None:
        set_ops["body"] = body
    # title uses _UNSET sentinel to distinguish "not provided" from explicit None.
    if title is not _UNSET:
        set_ops["title"] = title or None
    if contains_spoiler is not None:
        set_ops["contains_spoiler"] = bool(contains_spoiler)

    try:
        updated = col.find_one_and_update(
            {"_id": oid, "user_id": user_id},
            {"$set": set_ops},
            return_document=True,
        )
    except PyMongoError as exc:
        logger.error("update_review failed: %s", exc)
        raise MongoDBUnavailableError("Reviews are temporarily unavailable.") from exc

    if updated is None:
        raise ReviewPermissionError("You can only edit your own reviews.")
    return _serialize(updated)


def delete_review(*, review_id: str, user_id: str) -> bool:
    """Delete the authenticated user's own review.

    Returns True if deleted, False if the review did not exist.

    Raises
    ------
    ReviewPermissionError   If the review belongs to a different user.
    MongoDBUnavailableError On MongoDB failure.
    """
    col = _get_col()
    try:
        oid = ObjectId(review_id)
    except InvalidId:
        raise ReviewNotFoundError(f"Invalid review ID: {review_id!r}")

    # Fetch to distinguish "not found" vs "not owner".
    existing = col.find_one({"_id": oid}, {"user_id": 1})
    if existing is None:
        return False  # Idempotent — no error for non-existent.
    if existing.get("user_id") != user_id:
        raise ReviewPermissionError("You can only delete your own reviews.")

    try:
        result = col.delete_one({"_id": oid, "user_id": user_id})
        return result.deleted_count > 0
    except PyMongoError as exc:
        logger.error("delete_review failed: %s", exc)
        raise MongoDBUnavailableError("Reviews are temporarily unavailable.") from exc


# ─── Read operations ──────────────────────────────────────────────────────────


def get_review(review_id: str) -> dict[str, Any]:
    """Fetch a single review by its ObjectId string.

    Raises ReviewNotFoundError if not found.
    """
    col = _get_col()
    try:
        oid = ObjectId(review_id)
    except InvalidId:
        raise ReviewNotFoundError(f"Invalid review ID: {review_id!r}")

    doc = col.find_one({"_id": oid})
    if doc is None:
        raise ReviewNotFoundError(f"Review not found: {review_id!r}")
    return _serialize(doc)


def get_user_review_for_book(user_id: str, book_id: str) -> dict[str, Any] | None:
    """Return the user's review for a specific book, or None."""
    col = _get_col()
    doc = col.find_one({"user_id": user_id, "book_id": book_id})
    return _serialize(doc) if doc else None


def list_reviews_for_book(
    book_id: str,
    *,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    moderation_status: str = "APPROVED",
) -> dict[str, Any]:
    """Return paginated reviews for a book.

    By default, only APPROVED reviews are returned (public view).
    Moderators can pass moderation_status=None to see all.

    Returns:
        {
            "count": <total>,
            "page": <page>,
            "page_size": <size>,
            "results": [<review>, ...]
        }
    """
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    page = max(1, page)
    skip = (page - 1) * page_size

    col = _get_col()
    query: dict[str, Any] = {"book_id": book_id}
    if moderation_status:
        query["moderation_status"] = moderation_status

    try:
        total = col.count_documents(query)
        cursor = (
            col.find(query)
            .sort("created_at", DESCENDING)
            .skip(skip)
            .limit(page_size)
        )
        results = [_serialize(doc) for doc in cursor]
    except PyMongoError as exc:
        logger.error("list_reviews_for_book failed: %s", exc)
        raise MongoDBUnavailableError("Reviews are temporarily unavailable.") from exc

    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


def get_aggregate_rating(book_id: str) -> dict[str, Any]:
    """Calculate aggregate rating statistics for a book.

    Uses ONLY Akashic Library's own community reviews (APPROVED status).
    External provider data is NEVER included.

    Returns:
        {
            "average_rating": float | None,
            "rating_count": int,
            "distribution": {"1": int, "2": int, "3": int, "4": int, "5": int}
        }
    """
    col = _get_col()
    query = {"book_id": book_id, "moderation_status": "APPROVED"}

    try:
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "sum_ratings": {"$sum": "$rating"},
                    "dist_1": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
                    "dist_2": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
                    "dist_3": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
                    "dist_4": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
                    "dist_5": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
                }
            },
        ]
        rows = list(col.aggregate(pipeline))
    except PyMongoError as exc:
        logger.error("get_aggregate_rating failed: %s", exc)
        raise MongoDBUnavailableError("Ratings are temporarily unavailable.") from exc

    if not rows:
        return {
            "average_rating": None,
            "rating_count": 0,
            "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        }

    row = rows[0]
    total = row["total"]
    avg = round(row["sum_ratings"] / total, 2) if total else None
    return {
        "average_rating": avg,
        "rating_count": total,
        "distribution": {
            "1": row["dist_1"],
            "2": row["dist_2"],
            "3": row["dist_3"],
            "4": row["dist_4"],
            "5": row["dist_5"],
        },
    }


# ─── Moderator operations ─────────────────────────────────────────────────────


def set_moderation_status(
    review_id: str, moderation_status: str
) -> dict[str, Any] | None:
    """Set the moderation_status of a review.

    Only callable from moderator/admin code paths — NOT from user-facing views.
    Returns the updated document, or None if the review doesn't exist.
    """
    if moderation_status not in MODERATION_STATUSES:
        raise ValueError(f"Invalid moderation_status: {moderation_status!r}")
    col = _get_col()
    try:
        oid = ObjectId(review_id)
    except InvalidId:
        return None
    result = col.find_one_and_update(
        {"_id": oid},
        {"$set": {"moderation_status": moderation_status, "updated_at": datetime.now(UTC)}},
        return_document=True,
    )
    return _serialize(result) if result else None


# ─── Serialization ────────────────────────────────────────────────────────────


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert raw MongoDB document to a JSON-safe dict."""
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
