"""
Recommendations Repository — data-access layer for the recommendations domain.

Contains MongoDB operations for fetching recommended books and querying book sources.
"""

import logging
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import DESCENDING
from pymongo.errors import PyMongoError

from discovery.db import get_db
from discovery.exceptions import BookNotFoundError, MongoDBUnavailableError

logger = logging.getLogger(__name__)

BOOKS_COLLECTION = "books"

def _get_books_col():
    return get_db()[BOOKS_COLLECTION]

def get_recommended_books(
    *,
    authors: list[str],
    subjects: list[str],
    exclude_book_ids: set[str],
    limit: int = 20,
    skip: int = 0
) -> list[dict[str, Any]]:
    """Fetch books matching the given authors or subjects, excluding specific books.

    Sorted by creation date (descending) as a deterministic ranking fallback.
    """
    col = _get_books_col()
    
    exclude_oids = []
    for bid in exclude_book_ids:
        try:
            exclude_oids.append(ObjectId(bid))
        except InvalidId:
            pass

    filter_conditions = []
    if authors:
        # Match any of the authors
        filter_conditions.append({"authors.name": {"$in": authors}})
    if subjects:
        # Match any of the subjects
        filter_conditions.append({"subjects": {"$in": subjects}})
        
    if not filter_conditions:
        # Cold start: just fetch recent books
        query = {"_id": {"$nin": exclude_oids}} if exclude_oids else {}
    else:
        query = {
            "$and": [
                {"$or": filter_conditions},
                {"_id": {"$nin": exclude_oids}}
            ]
        }
        
    try:
        cursor = col.find(query).sort([("created_at", DESCENDING), ("_id", DESCENDING)]).skip(skip).limit(limit)
        return [_serialize(doc) for doc in cursor]
    except PyMongoError as exc:
        logger.error("get_recommended_books failed: %s", exc)
        raise MongoDBUnavailableError("Recommendations temporarily unavailable.") from exc

def get_popular_books(limit: int = 20, skip: int = 0, exclude_book_ids: set[str] = None) -> list[dict[str, Any]]:
    """Cold start strategy: fetch popular/recent books."""
    if exclude_book_ids is None:
        exclude_book_ids = set()
    return get_recommended_books(
        authors=[],
        subjects=[],
        exclude_book_ids=exclude_book_ids,
        limit=limit,
        skip=skip
    )

def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a raw MongoDB document to a JSON-safe dict."""
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
