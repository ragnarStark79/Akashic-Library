"""
Library Repository — data-access layer for user favorites and reading shelves.

All MongoDB operations for the favorites and library_entries collections are
contained here.  No business logic belongs in this module.

Collections:
  favorites      — (user_id, book_id) pairs representing favorited books.
  library_entries — (user_id, book_id, status) representing reading shelves.

Data ownership:
  user_id  = str(accounts.User.id)  — stable PostgreSQL UUID as a scalar string.
  book_id  = str(books._id)         — stable MongoDB ObjectId as a string.

  No cross-database foreign key constraint is created.  The application layer
  verifies book existence before writing.

Reading statuses:
  WANT_TO_READ, READING, READ

Indexes:
  favorites:
    - user_id + book_id (unique compound)
    - user_id

  library_entries:
    - user_id + book_id (unique compound)
    - user_id
"""

import logging
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError, PyMongoError

from .db import get_db
from .exceptions import MongoDBUnavailableError

logger = logging.getLogger(__name__)

# ─── Collection names ─────────────────────────────────────────────────────────

FAVORITES_COLLECTION = "favorites"
LIBRARY_COLLECTION = "library_entries"

# ─── Reading status constants ─────────────────────────────────────────────────

READING_STATUSES = ("WANT_TO_READ", "READING", "READ")
VALID_STATUSES = set(READING_STATUSES)

# ─── Pagination defaults ──────────────────────────────────────────────────────

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


# ─── Collection helpers ───────────────────────────────────────────────────────


def _get_favorites_col():
    return get_db()[FAVORITES_COLLECTION]


def _get_library_col():
    return get_db()[LIBRARY_COLLECTION]


# ─── Index management ─────────────────────────────────────────────────────────


def ensure_library_indexes() -> None:
    """Create MongoDB indexes for favorites and library_entries collections.

    Safe to call multiple times.
    """
    fav = _get_favorites_col()
    # Unique compound — prevents duplicate favorites.
    fav.create_index(
        [("user_id", ASCENDING), ("book_id", ASCENDING)],
        unique=True,
        name="favorites_user_book_unique",
    )
    fav.create_index([("user_id", ASCENDING)], name="favorites_user_id")

    lib = _get_library_col()
    # Unique compound — one shelf entry per user per book.
    lib.create_index(
        [("user_id", ASCENDING), ("book_id", ASCENDING)],
        unique=True,
        name="library_user_book_unique",
    )
    lib.create_index([("user_id", ASCENDING)], name="library_user_id")

    logger.info(
        "Library: MongoDB indexes ensured for '%s' and '%s' collections.",
        FAVORITES_COLLECTION,
        LIBRARY_COLLECTION,
    )


# ─── Favorites ─────────────────────────────────────────────────────────────────


def add_favorite(user_id: str, book_id: str) -> dict[str, Any] | None:
    """Add a favorite for the user.

    Returns the favorite document on success.
    Returns None if the favorite already exists (idempotent).

    Raises MongoDBUnavailableError on MongoDB failure.
    """
    col = _get_favorites_col()
    now = datetime.now(UTC)
    doc = {
        "user_id": user_id,
        "book_id": book_id,
        "created_at": now,
    }
    try:
        result = col.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        return doc
    except DuplicateKeyError:
        # Already favorited — return the existing document.
        existing = col.find_one({"user_id": user_id, "book_id": book_id})
        return _serialize_fav(existing) if existing else None
    except PyMongoError as exc:
        logger.error("add_favorite failed: %s", exc)
        raise MongoDBUnavailableError("Library is temporarily unavailable.") from exc


def remove_favorite(user_id: str, book_id: str) -> bool:
    """Remove a favorite.

    Returns True if deleted, False if it did not exist.
    Raises MongoDBUnavailableError on MongoDB failure.
    """
    col = _get_favorites_col()
    try:
        result = col.delete_one({"user_id": user_id, "book_id": book_id})
        return result.deleted_count > 0
    except PyMongoError as exc:
        logger.error("remove_favorite failed: %s", exc)
        raise MongoDBUnavailableError("Library is temporarily unavailable.") from exc


def is_favorited(user_id: str, book_id: str) -> bool:
    """Return True if the user has favorited the book."""
    col = _get_favorites_col()
    return col.count_documents({"user_id": user_id, "book_id": book_id}, limit=1) == 1


def list_favorites(user_id: str) -> list[str]:
    """Return list of book_id strings favorited by the user."""
    col = _get_favorites_col()
    cursor = col.find({"user_id": user_id}, {"book_id": 1})
    return [doc["book_id"] for doc in cursor]


# ─── Library / shelves ─────────────────────────────────────────────────────────


def get_library_entry(user_id: str, book_id: str) -> dict[str, Any] | None:
    """Return the user's library entry for a book, or None if it doesn't exist."""
    col = _get_library_col()
    doc = col.find_one({"user_id": user_id, "book_id": book_id})
    return _serialize_lib(doc) if doc else None


def add_library_entry(user_id: str, book_id: str, status: str) -> dict[str, Any]:
    """Add a book to the user's reading shelf.

    Raises ValueError if status is invalid.
    Raises LibraryEntryExistsError if the book is already on the shelf.
    Raises MongoDBUnavailableError on MongoDB failure.
    """
    from .exceptions import LibraryEntryExistsError

    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid shelf status {status!r}. "
            f"Valid values: {sorted(VALID_STATUSES)}"
        )
    col = _get_library_col()

    # Check for existing entry before insert (handles both real MongoDB
    # unique-index enforcement and mongomock which doesn't enforce it).
    if col.count_documents({"user_id": user_id, "book_id": book_id}, limit=1) > 0:
        raise LibraryEntryExistsError(
            f"Book {book_id!r} is already in your library. Use PATCH to update."
        )

    now = datetime.now(UTC)
    doc = {
        "user_id": user_id,
        "book_id": book_id,
        "status": status,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = col.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        return doc
    except DuplicateKeyError:
        raise LibraryEntryExistsError(
            f"Book {book_id!r} is already in your library. Use PATCH to update."
        )
    except PyMongoError as exc:
        logger.error("add_library_entry failed: %s", exc)
        raise MongoDBUnavailableError("Library is temporarily unavailable.") from exc


def update_library_entry(user_id: str, book_id: str, status: str) -> dict[str, Any] | None:
    """Update the reading status of a library entry.

    Returns the updated document, or None if the entry doesn't exist.
    Raises ValueError if status is invalid.
    """
    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid shelf status {status!r}. "
            f"Valid values: {sorted(VALID_STATUSES)}"
        )
    col = _get_library_col()
    now = datetime.now(UTC)
    result = col.find_one_and_update(
        {"user_id": user_id, "book_id": book_id},
        {"$set": {"status": status, "updated_at": now}},
        return_document=True,  # Return the updated document.
    )
    return _serialize_lib(result) if result else None


def remove_library_entry(user_id: str, book_id: str) -> bool:
    """Remove a book from the user's library.

    Returns True if deleted, False if it did not exist.
    """
    col = _get_library_col()
    try:
        result = col.delete_one({"user_id": user_id, "book_id": book_id})
        return result.deleted_count > 0
    except PyMongoError as exc:
        logger.error("remove_library_entry failed: %s", exc)
        raise MongoDBUnavailableError("Library is temporarily unavailable.") from exc


def list_user_library(
    user_id: str,
    *,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> dict[str, Any]:
    """Return paginated library entries for a user.

    Returns:
        {
            "count": <total>,
            "page": <current>,
            "page_size": <size>,
            "results": [<entry>, ...]
        }
    """
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    page = max(1, page)
    skip = (page - 1) * page_size

    col = _get_library_col()
    fav_set = set(list_favorites(user_id))

    try:
        total = col.count_documents({"user_id": user_id})
        cursor = (
            col.find({"user_id": user_id})
            .sort("updated_at", -1)
            .skip(skip)
            .limit(page_size)
        )
        results = []
        for doc in cursor:
            entry = _serialize_lib(doc)
            entry["favorited"] = entry["book_id"] in fav_set
            results.append(entry)
    except PyMongoError as exc:
        logger.error("list_user_library failed: %s", exc)
        raise MongoDBUnavailableError("Library is temporarily unavailable.") from exc

    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


# ─── Serialization helpers ────────────────────────────────────────────────────


def _serialize_fav(doc: dict[str, Any]) -> dict[str, Any]:
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _serialize_lib(doc: dict[str, Any]) -> dict[str, Any]:
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
