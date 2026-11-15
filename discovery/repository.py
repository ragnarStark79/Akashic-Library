"""
MongoDB Book Repository — data-access layer for the discovery domain.

All MongoDB operations for the books collection are contained here.
No business logic or provider-specific code belongs in this module.

Collection: books

Indexes (created by ensure_indexes()):
  - title + description (text index for full-text search)
  - identifiers.isbn13 (unique-sparse)
  - identifiers.isbn10 (unique-sparse)
  - authors.name (ascending)
  - sources.google_books.id (sparse)
  - sources.open_library.work_id (sparse)
"""

import logging
import re
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING, TEXT
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, PyMongoError

from .db import get_db
from .exceptions import BookNotFoundError, MongoDBUnavailableError
from .genre_mappings import resolve_subject_aliases
from .models import NormalizedBook

logger = logging.getLogger(__name__)

COLLECTION_NAME = "books"
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def _get_collection() -> Collection:
    """Return the books collection, raising MongoDBUnavailableError if needed."""
    return get_db()[COLLECTION_NAME]


def ensure_indexes() -> None:
    """Create MongoDB indexes for the books collection.

    Safe to call multiple times — MongoDB ignores requests to create
    indexes that already exist with the same options.
    """
    col = _get_collection()
    # Full-text search on title and description.
    col.create_index([("title", TEXT), ("description", TEXT)], name="text_search")
    # ISBN lookups — sparse so documents without ISBNs are not indexed.
    col.create_index(
        [("identifiers.isbn13", ASCENDING)],
        unique=True,
        sparse=True,
        name="isbn13_unique",
    )
    col.create_index(
        [("identifiers.isbn10", ASCENDING)],
        unique=True,
        sparse=True,
        name="isbn10_unique",
    )
    # Author name for author-filter queries.
    col.create_index([("authors.name", ASCENDING)], name="authors_name")
    # Provider-specific IDs for deduplication upserts.
    col.create_index(
        [("sources.google_books.id", ASCENDING)],
        sparse=True,
        name="google_books_id",
    )
    col.create_index(
        [("sources.open_library.work_id", ASCENDING)],
        sparse=True,
        name="open_library_work_id",
    )
    # Publisher filter.
    col.create_index(
        [("publication.publisher", ASCENDING)],
        sparse=True,
        name="publication_publisher",
    )
    # Publication year/date filter.
    col.create_index(
        [("publication.published_date", ASCENDING)],
        sparse=True,
        name="publication_published_date",
    )
    logger.info("Discovery: MongoDB indexes ensured for '%s' collection.", COLLECTION_NAME)


# ─── Read operations ──────────────────────────────────────────────────────────


def get_book_by_id(book_id: str) -> dict[str, Any]:
    """Fetch a single book document by its MongoDB ObjectId string.

    Raises
    ------
    BookNotFoundError   If the ID is invalid or the document does not exist.
    MongoDBUnavailableError  If MongoDB cannot be reached.
    """
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        raise BookNotFoundError(f"Invalid book ID: {book_id!r}")

    col = _get_collection()
    doc = col.find_one({"_id": oid})
    if doc is None:
        raise BookNotFoundError(f"Book not found: {book_id!r}")
    return _serialize(doc)


def book_exists(book_id: str) -> bool:
    """Return True if a book with the given ObjectId string exists in the catalog.

    Does NOT raise — returns False for invalid IDs or missing documents.
    """
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return False
    col = _get_collection()
    return col.count_documents({"_id": oid}, limit=1) == 1


def search_books(
    *,
    query: str = "",
    title: str = "",
    author: str = "",
    isbn: str = "",
    subject: str = "",
    language: str = "",
    publisher: str = "",
    year_from: int | None = None,
    year_to: int | None = None,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    featured: bool = False,
) -> dict[str, Any]:
    """Search the local MongoDB books collection.

    Supported filters:
      query      All-fields search across title, authors, subjects, ISBNs, description.
      title      Case-insensitive match on book title.
      author     Case-insensitive substring match on author name.
      isbn       ISBN-10 or ISBN-13 (normalized, hyphens and whitespace removed).
      subject    Case-insensitive substring on subjects array (with editorial alias mapping).
      language   Exact BCP-47 code (e.g. "en").
      publisher  Case-insensitive substring on publication.publisher.
      year_from  Min publication year (inclusive, 4-digit).
      year_to    Max publication year (inclusive, 4-digit).
      featured   When True, filters exclusively for genuine provider records with covers.

    Returns a paginated result dict:
        {
            "count": <total matching>,
            "page": <current page>,
            "page_size": <items per page>,
            "results": [<doc>, ...]
        }
    """
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    page = max(1, page)
    skip = (page - 1) * page_size

    col = _get_collection()
    filter_doc: dict[str, Any] = {
        # Exclude non-discovery test-store artifacts or test dummy documents
        "title": {
            "$not": {"$regex": r"^(Test Store Book|Community Test Book|Fantasy Book [A-D])"}
        },
        "sources": {"$exists": True, "$ne": None},
    }

    if featured:
        filter_doc["sources.open_library"] = {"$exists": True}
        filter_doc["covers.0"] = {"$exists": True}
        filter_doc["title"] = {
            "$not": {
                "$regex": r"(?i)^(Test Store Book|Community Test Book|Fantasy Book [A-D]|Clean Code|C.digo Limpo|Clean Coding|Art of Clean Code|Hands-On Software|Czysty kod|The clean coder)"
            }
        }

    if title and title.strip():
        filter_doc["title"] = {"$regex": re.escape(title.strip()), "$options": "i"}

    if author and author.strip():
        filter_doc["authors.name"] = {"$regex": re.escape(author.strip()), "$options": "i"}

    if isbn and isbn.strip():
        clean_isbn = re.sub(r"[^0-9Xx]", "", isbn).strip().upper()
        if len(clean_isbn) == 13:
            filter_doc["identifiers.isbn13"] = clean_isbn
        elif len(clean_isbn) == 10:
            filter_doc["identifiers.isbn10"] = clean_isbn
        elif clean_isbn:
            # Try both fields for unknown-length ISBNs.
            filter_doc["$or"] = [
                {"identifiers.isbn13": clean_isbn},
                {"identifiers.isbn10": clean_isbn},
            ]

    if subject and subject.strip():
        aliases = resolve_subject_aliases(subject)
        if len(aliases) == 1:
            filter_doc["subjects"] = {"$regex": re.escape(aliases[0]), "$options": "i"}
        elif aliases:
            alias_pattern = "|".join(re.escape(a) for a in aliases)
            filter_doc["subjects"] = {"$regex": alias_pattern, "$options": "i"}

    if query and query.strip():
        clean_q = query.strip()
        escaped_q = re.escape(clean_q)
        clean_isbn_q = re.sub(r"[^0-9Xx]", "", clean_q).upper()

        everything_or: list[dict[str, Any]] = [
            {"title": {"$regex": escaped_q, "$options": "i"}},
            {"authors.name": {"$regex": escaped_q, "$options": "i"}},
            {"subjects": {"$regex": escaped_q, "$options": "i"}},
            {"description": {"$regex": escaped_q, "$options": "i"}},
        ]
        if clean_isbn_q and len(clean_isbn_q) in (10, 13):
            everything_or.extend([
                {"identifiers.isbn13": clean_isbn_q},
                {"identifiers.isbn10": clean_isbn_q},
            ])

        if "$or" in filter_doc:
            existing_or = filter_doc.pop("$or")
            filter_doc["$and"] = [{"$or": everything_or}, {"$or": existing_or}]
        else:
            filter_doc["$or"] = everything_or

    if language:
        filter_doc["publication.language"] = language
    if publisher:
        filter_doc["publication.publisher"] = {"$regex": publisher, "$options": "i"}
    if year_from or year_to:
        year_filter: dict[str, Any] = {}
        if year_from:
            year_filter["$gte"] = str(year_from)
        if year_to:
            year_filter["$lte"] = str(year_to) + "-99"  # Include any month in that year.
        filter_doc["publication.published_date"] = year_filter

    try:
        if featured:
            candidate_cursor = col.find(filter_doc, sort=[("_id", ASCENDING)]).limit(150)
            seen_stems: set[str] = set()
            seen_authors: set[str] = set()
            seen_tokens: set[str] = set()
            diverse_docs: list[dict[str, Any]] = []

            def _stem(t: str) -> str:
                w = re.sub(r"[^a-zA-Z0-9\s]", "", t.lower()).split()
                return " ".join(w[:2]) if len(w) >= 2 else (w[0] if w else "")

            for doc in candidate_cursor:
                t = doc.get("title", "").strip()
                s = _stem(t)
                authors = [a.get("name", "").strip() for a in doc.get("authors", []) if a.get("name")]
                if not authors:
                    continue
                primary_author = authors[0].lower()

                if s and s in seen_stems:
                    continue

                words = set(re.sub(r"[^a-zA-Z0-9\s]", "", t.lower()).split())
                title_key_tokens = {
                    w for w in words if len(w) > 3 and w not in {"with", "from", "other", "stories", "book", "edition", "volume"}
                }

                if any(tok in seen_tokens for tok in title_key_tokens):
                    continue

                author_collision = False
                for a in authors:
                    a_low = a.lower()
                    if a_low in seen_authors:
                        author_collision = True
                        break
                    for tok in a_low.split():
                        if len(tok) > 3 and tok in seen_tokens:
                            author_collision = True
                            break
                    if author_collision:
                        break

                if author_collision:
                    continue

                seen_stems.add(s)
                seen_authors.add(primary_author)
                seen_tokens.update(title_key_tokens)
                for a in authors:
                    for tok in a.lower().split():
                        if len(tok) > 3:
                            seen_tokens.add(tok)

                diverse_docs.append(doc)
                if len(diverse_docs) == page_size:
                    break

            results = [_serialize(doc) for doc in diverse_docs]
            total = len(results)
        else:
            total = col.count_documents(filter_doc)
            cursor = col.find(filter_doc, sort=[("_id", ASCENDING)]).skip(skip).limit(page_size)
            results = [_serialize(doc) for doc in cursor]
    except PyMongoError as exc:
        logger.error("MongoDB search failed: %s", exc)
        raise MongoDBUnavailableError("Search is temporarily unavailable.") from exc

    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


# ─── Write operations ─────────────────────────────────────────────────────────


def upsert_book(book: NormalizedBook) -> str:
    """Upsert a NormalizedBook into the books collection.

    Deduplication strategy (deterministic, in priority order):
      1. ISBN-13 (strongest canonical identifier)
      2. ISBN-10
      3. Provider-specific ID (e.g. Google Books volume ID or Open Library work key)
      4. Insert as new document (no match found)

    Returns the string ObjectId of the upserted/matched document.
    """
    col = _get_collection()
    doc = book.to_document()
    now = datetime.now(UTC)
    doc["updated_at"] = now

    # Match existing document in priority order:
    existing = None
    if book.isbn13:
        existing = col.find_one({"identifiers.isbn13": book.isbn13}, {"_id": 1})
    if not existing and book.isbn10:
        existing = col.find_one({"identifiers.isbn10": book.isbn10}, {"_id": 1})
    if not existing and not book.isbn13 and not book.isbn10 and book.source_name and book.source_id:
        existing = col.find_one({f"sources.{book.source_name}.id": book.source_id}, {"_id": 1})

    if existing:
        col.update_one({"_id": existing["_id"]}, {"$set": doc})
        return str(existing["_id"])

    # No existing document matched — insert as new document.
    try:
        doc["created_at"] = now
        result = col.insert_one(doc)
        return str(result.inserted_id)
    except DuplicateKeyError:
        # If another index key conflict occurred (e.g. isbn10 vs isbn13), recover gracefully
        conflicting = None
        if book.isbn13:
            conflicting = col.find_one({"identifiers.isbn13": book.isbn13}, {"_id": 1})
        if not conflicting and book.isbn10:
            conflicting = col.find_one({"identifiers.isbn10": book.isbn10}, {"_id": 1})
        if not conflicting and book.source_name and book.source_id:
            conflicting = col.find_one({f"sources.{book.source_name}.id": book.source_id}, {"_id": 1})
        if conflicting:
            col.update_one({"_id": conflicting["_id"]}, {"$set": doc})
            return str(conflicting["_id"])
        raise


def import_book(book: NormalizedBook) -> str:
    """Import/enrich a book from an external provider.

    This is the SAFE enrichment upsert used by the explicit import API.
    Unlike upsert_book() which replaces all provider fields, import_book()
    merges provider data with existing local data, following these rules:

    NEVER overwrites:
      - favorites, shelves, reading status  (owned by the library system)
      - reviews, ratings                     (owned by the community system)
      - store_product_id                     (owned by the store system)
      - created_at                           (set once on insert)

    ONLY sets non-null incoming values over existing null/missing values,
    except for fields the provider explicitly owns (source IDs, sync time).
    If the provider returns null for a field that has an existing value,
    the existing value is preserved.

    Returns the string ObjectId of the upserted/matched document.
    """
    col = _get_collection()
    now = datetime.now(UTC)
    upsert_filter = _build_upsert_filter(book)
    doc = book.to_document()

    # Build a $set that ONLY sets non-null values over existing data.
    # Use $setOnInsert for fields that should only be set on insert.
    # Use dotted paths so only leaves are touched, not subdocuments.
    set_ops: dict[str, Any] = {}

    # Always update the sync metadata — provider owns this.
    set_ops["updated_at"] = now
    if book.source_name and book.source_id:
        set_ops[f"sources.{book.source_name}.id"] = book.source_id
        set_ops[f"sources.{book.source_name}.last_synced"] = now

    # Merge non-null provider values into the document.
    if book.title:
        set_ops["title"] = book.title
    if book.authors:
        set_ops["authors"] = [{"name": a} for a in book.authors]
    if book.description:
        set_ops["description"] = book.description
    if book.isbn13:
        set_ops["identifiers.isbn13"] = book.isbn13
    if book.isbn10:
        set_ops["identifiers.isbn10"] = book.isbn10
    if book.publisher:
        set_ops["publication.publisher"] = book.publisher
    if book.published_date:
        set_ops["publication.published_date"] = book.published_date
    if book.page_count:
        set_ops["publication.page_count"] = book.page_count
    if book.language:
        set_ops["publication.language"] = book.language
    if book.subjects:
        set_ops["subjects"] = book.subjects
    if book.cover_urls:
        set_ops["covers"] = [{"url": u, "source": book.source_name} for u in book.cover_urls]

    if upsert_filter:
        result = col.update_one(
            upsert_filter,
            {
                "$set": set_ops,
                "$setOnInsert": {
                    "created_at": now,
                    "store_product_id": None,  # Only set on insert — never touch existing.
                },
            },
            upsert=True,
        )
        if result.upserted_id:
            return str(result.upserted_id)
        existing = col.find_one(upsert_filter, {"_id": 1})
        return str(existing["_id"]) if existing else ""
    else:
        # No stable ID — insert fresh (preserve all fields).
        doc["created_at"] = now
        doc["updated_at"] = now
        if book.source_name and book.source_id:
            doc.setdefault("sources", {})
            doc["sources"][book.source_name] = {
                "id": book.source_id,
                "last_synced": now,
            }
        result = col.insert_one(doc)
        return str(result.inserted_id)



def _build_upsert_filter(book: NormalizedBook) -> dict[str, Any] | None:
    """Build a MongoDB filter for deduplication, or None if no stable ID exists."""
    if book.isbn13:
        return {"identifiers.isbn13": book.isbn13}
    if book.isbn10:
        return {"identifiers.isbn10": book.isbn10}
    if book.source_name and book.source_id:
        return {f"sources.{book.source_name}.id": book.source_id}
    return None


# ─── Serialization ────────────────────────────────────────────────────────────


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a raw MongoDB document to a JSON-safe dict.

    ObjectId fields are converted to strings.
    """
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
