"""
Normalized internal Book representation.

NormalizedBook is the stable internal contract between external providers
and the rest of the system.  Provider-specific response formats never
leave their adapter; they are always converted to NormalizedBook first.

This is a dataclass (not a Django model or DRF serializer) because it
represents an in-memory transfer object, not a persistence entity.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class NormalizedBook:
    """Canonical in-memory representation of a book from any provider.

    Fields
    ------
    title           Book title (required — providers without title are skipped).
    authors         List of author name strings.
    description     Synopsis or description text; None if unavailable.
    isbn10          10-digit ISBN; None if unavailable.
    isbn13          13-digit ISBN; None if unavailable.
    publisher       Publisher name; None if unavailable.
    published_date  Publication date string (format varies by provider).
    page_count      Number of pages; None if unavailable.
    language        BCP-47 language code (e.g. "en"); None if unavailable.
    subjects        List of category/subject strings.
    cover_urls      List of cover image URLs (largest first where applicable).
    source_name     Provider identifier — e.g. "google_books", "open_library".
    source_id       Provider-specific unique identifier for deduplication.
    raw_metadata    Original provider payload preserved for debugging/future use.
                    NEVER logged at INFO level — may contain PII or sensitive info.
    """

    title: str
    authors: list[str] = field(default_factory=list)
    description: str | None = None
    isbn10: str | None = None
    isbn13: str | None = None
    publisher: str | None = None
    published_date: str | None = None
    page_count: int | None = None
    language: str | None = None
    subjects: list[str] = field(default_factory=list)
    cover_urls: list[str] = field(default_factory=list)
    source_name: str = ""
    source_id: str = ""
    raw_metadata: dict[str, Any] = field(default_factory=dict)

    def to_document(self) -> dict[str, Any]:
        """Convert to a MongoDB document dict for upsert operations."""
        return {
            "title": self.title,
            "authors": [{"name": a} for a in self.authors],
            "description": self.description,
            "identifiers": {
                "isbn10": self.isbn10,
                "isbn13": self.isbn13,
            },
            "publication": {
                "publisher": self.publisher,
                "published_date": self.published_date,
                "page_count": self.page_count,
                "language": self.language,
            },
            "subjects": self.subjects,
            "covers": [{"url": u, "source": self.source_name} for u in self.cover_urls],
            "sources": {
                self.source_name: {
                    "id": self.source_id,
                }
            },
            "external_metadata": self.raw_metadata,
            "store_product_id": None,  # Populated in a future store step.
        }
