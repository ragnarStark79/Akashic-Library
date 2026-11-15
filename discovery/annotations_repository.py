"""
Annotations Repository — data-access layer for reading-room annotations and marginalia.

All MongoDB operations for the 'annotations' collection live in this module.
No business logic or view code belongs here.

Collection: annotations

Document shape:
  {
    "_id":               ObjectId,
    "book_id":           str  — str(books._id),
    "user_id":           str  — str(accounts.User.id),
    "content":           str  — reader reflection (1..5000 chars),
    "visibility":        str  — "PRIVATE" | "SHARED" (default: "PRIVATE"),
    "page_reference":    str | None — optional anchor (e.g. "Page 114"),
    "chapter_reference": str | None — optional chapter (e.g. "Chapter 3"),
    "passage_excerpt":   str | None — optional quote from folio,
    "created_at":        datetime (UTC),
    "updated_at":        datetime (UTC),
  }

Data ownership:
  user_id  = str(accounts.User.id)  — PostgreSQL UUID as scalar string.
  book_id  = str(books._id)         — MongoDB ObjectId as scalar string.

Privacy & visibility rules:
  - PRIVATE: Visible ONLY to its author (user_id). Never returned in public listings
    or accessible by any other user through direct ID retrieval.
  - SHARED: Explicitly made public by author. Visible in public reading-room listing
    and book details preview. Still editable/deletable ONLY by author.

Indexes:
  - (book_id, visibility, created_at) — fast per-book public shared listing
  - (book_id, user_id, created_at)   — fast owner listing per book
  - (user_id, created_at)            — fast user-wide retrieval
"""

import logging
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError

from .db import get_db
from .exceptions import (
    AnnotationNotFoundError,
    AnnotationPermissionError,
    MongoDBUnavailableError,
)

logger = logging.getLogger(__name__)

ANNOTATIONS_COLLECTION = "annotations"

VISIBILITY_PRIVATE = "PRIVATE"
VISIBILITY_SHARED = "SHARED"
VALID_VISIBILITIES = {VISIBILITY_PRIVATE, VISIBILITY_SHARED}

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50

# Sentinel for unset optional fields in update operations
_UNSET = object()


def _get_collection():
    """Return the annotations collection, raising MongoDBUnavailableError on connection failure."""
    try:
        db = get_db()
        return db[ANNOTATIONS_COLLECTION]
    except Exception as exc:
        raise MongoDBUnavailableError(f"Cannot access annotations collection: {exc}") from exc


def ensure_annotation_indexes() -> None:
    """Create indexes on the annotations collection idempotently."""
    try:
        col = _get_collection()
        col.create_index(
            [("book_id", ASCENDING), ("visibility", ASCENDING), ("created_at", DESCENDING)],
            name="idx_annotations_book_visibility_created",
            background=True,
        )
        col.create_index(
            [("book_id", ASCENDING), ("user_id", ASCENDING), ("created_at", DESCENDING)],
            name="idx_annotations_book_user_created",
            background=True,
        )
        col.create_index(
            [("user_id", ASCENDING), ("created_at", DESCENDING)],
            name="idx_annotations_user_created",
            background=True,
        )
    except Exception as exc:
        logger.warning("Failed to create annotation indexes (non-fatal): %s", exc)


def _serialize_annotation(doc: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw MongoDB annotation document for serialization."""
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    return d


def create_annotation(
    book_id: str,
    user_id: str,
    content: str,
    visibility: str = VISIBILITY_PRIVATE,
    page_reference: str | None = None,
    chapter_reference: str | None = None,
    passage_excerpt: str | None = None,
) -> dict[str, Any]:
    """Create a new reading annotation.

    Parameters
    ----------
    book_id : str
    user_id : str (derived from authenticated session)
    content : str
    visibility : str ("PRIVATE" or "SHARED", default "PRIVATE")
    page_reference : str | None
    chapter_reference : str | None
    passage_excerpt : str | None

    Returns
    -------
    dict: The created annotation document with 'id'.
    """
    if visibility not in VALID_VISIBILITIES:
        visibility = VISIBILITY_PRIVATE

    content_clean = (content or "").strip()
    if not content_clean:
        raise ValueError("Annotation content cannot be empty.")
    if len(content_clean) > 5000:
        raise ValueError("Annotation content cannot exceed 5000 characters.")

    page_ref_clean = (page_reference or "").strip() or None
    if page_ref_clean and len(page_ref_clean) > 100:
        page_ref_clean = page_ref_clean[:100]

    chapter_ref_clean = (chapter_reference or "").strip() or None
    if chapter_ref_clean and len(chapter_ref_clean) > 150:
        chapter_ref_clean = chapter_ref_clean[:150]

    passage_excerpt_clean = (passage_excerpt or "").strip() or None
    if passage_excerpt_clean and len(passage_excerpt_clean) > 1000:
        passage_excerpt_clean = passage_excerpt_clean[:1000]

    now = datetime.now(UTC)
    doc = {
        "book_id": str(book_id),
        "user_id": str(user_id),
        "content": content_clean,
        "visibility": visibility,
        "page_reference": page_ref_clean,
        "chapter_reference": chapter_ref_clean,
        "passage_excerpt": passage_excerpt_clean,
        "created_at": now,
        "updated_at": now,
    }

    try:
        col = _get_collection()
        res = col.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _serialize_annotation(doc)
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to create annotation: {exc}") from exc


def get_annotation(book_id: str, annotation_id: str) -> dict[str, Any]:
    """Retrieve a single annotation by book_id and annotation_id.

    Raises
    ------
    AnnotationNotFoundError
    """
    try:
        oid = ObjectId(annotation_id)
    except (InvalidId, TypeError):
        raise AnnotationNotFoundError(f"Invalid annotation ID: {annotation_id}")

    try:
        col = _get_collection()
        doc = col.find_one({"_id": oid, "book_id": str(book_id)})
        if not doc:
            raise AnnotationNotFoundError(f"Annotation {annotation_id} not found for book {book_id}")
        return _serialize_annotation(doc)
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to retrieve annotation: {exc}") from exc


def list_shared_annotations_for_book(
    book_id: str,
    sort: str = "recent",
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> tuple[list[dict[str, Any]], int]:
    """Retrieve paginated shared public annotations for a book.

    Never returns private annotations.

    Returns
    -------
    tuple: (list of serialized annotations, total count)
    """
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    page = max(1, page)
    skip = (page - 1) * page_size

    query = {
        "book_id": str(book_id),
        "visibility": VISIBILITY_SHARED,
        "moderation_status": {"$ne": "HIDDEN"}
    }

    if sort == "page":
        sort_fields = [("page_reference", ASCENDING), ("created_at", DESCENDING)]
    else:
        sort_fields = [("created_at", DESCENDING)]

    try:
        col = _get_collection()
        total = col.count_documents(query)
        cursor = col.find(query).sort(sort_fields).skip(skip).limit(page_size)
        results = [_serialize_annotation(doc) for doc in cursor]
        return results, total
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to list shared annotations: {exc}") from exc


def list_user_annotations_for_book(
    book_id: str,
    user_id: str,
    visibility: str | None = None,
    sort: str = "recent",
) -> list[dict[str, Any]]:
    """Retrieve all annotations belonging to user_id for book_id.

    Can be filtered by visibility ("PRIVATE" or "SHARED"). If visibility is None,
    returns both private and shared annotations belonging to that user.

    Returns
    -------
    list of serialized annotations
    """
    query: dict[str, Any] = {"book_id": str(book_id), "user_id": str(user_id)}
    if visibility in VALID_VISIBILITIES:
        query["visibility"] = visibility

    if sort == "page":
        sort_fields = [("page_reference", ASCENDING), ("created_at", DESCENDING)]
    else:
        sort_fields = [("created_at", DESCENDING)]

    try:
        col = _get_collection()
        cursor = col.find(query).sort(sort_fields)
        return [_serialize_annotation(doc) for doc in cursor]
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to list user annotations: {exc}") from exc


def update_annotation(
    book_id: str,
    annotation_id: str,
    user_id: str,
    content: Any = _UNSET,
    visibility: Any = _UNSET,
    page_reference: Any = _UNSET,
    chapter_reference: Any = _UNSET,
    passage_excerpt: Any = _UNSET,
) -> dict[str, Any]:
    """Update an annotation owned by user_id.

    Raises
    ------
    AnnotationNotFoundError: if annotation does not exist
    AnnotationPermissionError: if requesting user is not the author
    """
    try:
        oid = ObjectId(annotation_id)
    except (InvalidId, TypeError):
        raise AnnotationNotFoundError(f"Invalid annotation ID: {annotation_id}")

    try:
        col = _get_collection()
        existing = col.find_one({"_id": oid, "book_id": str(book_id)})
        if not existing:
            raise AnnotationNotFoundError(f"Annotation {annotation_id} not found for book {book_id}")

        if str(existing.get("user_id")) != str(user_id):
            raise AnnotationPermissionError("You do not have permission to modify this annotation.")

        updates: dict[str, Any] = {"updated_at": datetime.now(UTC)}

        if content is not _UNSET:
            content_clean = (content or "").strip()
            if not content_clean:
                raise ValueError("Annotation content cannot be empty.")
            if len(content_clean) > 5000:
                raise ValueError("Annotation content cannot exceed 5000 characters.")
            updates["content"] = content_clean

        if visibility is not _UNSET:
            if visibility not in VALID_VISIBILITIES:
                raise ValueError(f"Invalid visibility: {visibility}")
            updates["visibility"] = visibility

        if page_reference is not _UNSET:
            clean = (page_reference or "").strip() or None
            if clean and len(clean) > 100:
                clean = clean[:100]
            updates["page_reference"] = clean

        if chapter_reference is not _UNSET:
            clean = (chapter_reference or "").strip() or None
            if clean and len(clean) > 150:
                clean = clean[:150]
            updates["chapter_reference"] = clean

        if passage_excerpt is not _UNSET:
            clean = (passage_excerpt or "").strip() or None
            if clean and len(clean) > 1000:
                clean = clean[:1000]
            updates["passage_excerpt"] = clean

        col.update_one({"_id": oid}, {"$set": updates})
        updated_doc = col.find_one({"_id": oid})
        return _serialize_annotation(updated_doc)
    except (AnnotationNotFoundError, AnnotationPermissionError):
        raise
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to update annotation: {exc}") from exc


def delete_annotation(book_id: str, annotation_id: str, user_id: str) -> bool:
    """Delete an annotation owned by user_id.

    Raises
    ------
    AnnotationNotFoundError: if annotation does not exist
    AnnotationPermissionError: if requesting user is not the author
    """
    try:
        oid = ObjectId(annotation_id)
    except (InvalidId, TypeError):
        raise AnnotationNotFoundError(f"Invalid annotation ID: {annotation_id}")

    try:
        col = _get_collection()
        existing = col.find_one({"_id": oid, "book_id": str(book_id)})
        if not existing:
            raise AnnotationNotFoundError(f"Annotation {annotation_id} not found for book {book_id}")

        if str(existing.get("user_id")) != str(user_id):
            raise AnnotationPermissionError("You do not have permission to delete this annotation.")

        col.delete_one({"_id": oid})
        return True
    except (AnnotationNotFoundError, AnnotationPermissionError):
        raise
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to delete annotation: {exc}") from exc


def get_annotation_counts_for_book(book_id: str, user_id: str | None = None) -> dict[str, int]:
    """Retrieve annotation counts for tabs in the reading room.

    Returns:
      {
        "shared_count": int,
        "my_private_count": int,
        "my_shared_count": int,
        "my_total_count": int,
      }
    """
    try:
        col = _get_collection()
        shared_count = col.count_documents({
            "book_id": str(book_id),
            "visibility": VISIBILITY_SHARED,
            "moderation_status": {"$ne": "HIDDEN"}
        })

        my_private_count = 0
        my_shared_count = 0
        if user_id:
            my_private_count = col.count_documents(
                {"book_id": str(book_id), "user_id": str(user_id), "visibility": VISIBILITY_PRIVATE}
            )
            my_shared_count = col.count_documents(
                {"book_id": str(book_id), "user_id": str(user_id), "visibility": VISIBILITY_SHARED}
            )

        return {
            "shared_count": shared_count,
            "my_private_count": my_private_count,
            "my_shared_count": my_shared_count,
            "my_total_count": my_private_count + my_shared_count,
        }
    except PyMongoError as exc:
        raise MongoDBUnavailableError(f"Failed to count annotations: {exc}") from exc

