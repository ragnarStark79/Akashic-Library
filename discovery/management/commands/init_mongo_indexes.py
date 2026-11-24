"""Django management command to idempotently initialize and verify MongoDB indexes.

Applies compound indexes with proper field ordering (equality before sort/range)
across all primary persistent collections:
  - annotations
  - reviews & review_replies
  - library & favorites
  - books
  - discussions, replies, reports & moderation_audits

Usage:
    python manage.py init_mongo_indexes
    python manage.py init_mongo_indexes --collection=annotations
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from discovery.db import get_db
from discovery.annotations_repository import ensure_annotation_indexes, ANNOTATIONS_COLLECTION
from discovery.reviews_repository import ensure_review_indexes, REVIEWS_COLLECTION, REPLIES_COLLECTION
from discovery.library_repository import (
    ensure_library_indexes,
    FAVORITES_COLLECTION,
    LIBRARY_COLLECTION,
)
from discovery.repository import ensure_indexes as ensure_book_indexes, COLLECTION_NAME as BOOKS_COLLECTION
from community.repository import setup_indexes as setup_community_indexes

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Idempotently creates and verifies all required MongoDB collection indexes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--collection",
            type=str,
            default="all",
            help="Specific collection domain to index (annotations, reviews, library, books, community, or all).",
        )

    def handle(self, *args, **options):
        target = options.get("collection", "all").lower()
        self.stdout.write(self.style.NOTICE(f"Connecting to MongoDB database to initialize indexes (target: {target})..."))

        try:
            db = get_db()
        except Exception as exc:
            raise CommandError(f"Cannot establish connection to MongoDB: {exc}") from exc

        summary = {}

        # 1. Annotations
        if target in ("all", "annotations"):
            self.stdout.write("Initializing indexes on 'annotations' collection...")
            ensure_annotation_indexes()
            annot_col = db[ANNOTATIONS_COLLECTION]
            annot_indexes = list(annot_col.index_information().keys())
            summary[ANNOTATIONS_COLLECTION] = annot_indexes
            self.stdout.write(self.style.SUCCESS(f"  ✓ {ANNOTATIONS_COLLECTION}: {annot_indexes}"))

        # 2. Reviews & Review Replies
        if target in ("all", "reviews"):
            self.stdout.write("Initializing indexes on 'reviews' and 'review_replies' collections...")
            ensure_review_indexes()
            summary[REVIEWS_COLLECTION] = list(db[REVIEWS_COLLECTION].index_information().keys())
            summary[REPLIES_COLLECTION] = list(db[REPLIES_COLLECTION].index_information().keys())
            self.stdout.write(self.style.SUCCESS(f"  ✓ {REVIEWS_COLLECTION}: {summary[REVIEWS_COLLECTION]}"))
            self.stdout.write(self.style.SUCCESS(f"  ✓ {REPLIES_COLLECTION}: {summary[REPLIES_COLLECTION]}"))

        # 3. Personal Library & Favorites
        if target in ("all", "library"):
            self.stdout.write("Initializing indexes on 'library_entries' and 'favorites' collections...")
            ensure_library_indexes()
            summary[LIBRARY_COLLECTION] = list(db[LIBRARY_COLLECTION].index_information().keys())
            summary[FAVORITES_COLLECTION] = list(db[FAVORITES_COLLECTION].index_information().keys())
            self.stdout.write(self.style.SUCCESS(f"  ✓ {LIBRARY_COLLECTION}: {summary[LIBRARY_COLLECTION]}"))
            self.stdout.write(self.style.SUCCESS(f"  ✓ {FAVORITES_COLLECTION}: {summary[FAVORITES_COLLECTION]}"))

        # 4. Catalog Books
        if target in ("all", "books"):
            self.stdout.write("Initializing indexes on 'books' collection...")
            ensure_book_indexes()
            summary[BOOKS_COLLECTION] = list(db[BOOKS_COLLECTION].index_information().keys())
            self.stdout.write(self.style.SUCCESS(f"  ✓ {BOOKS_COLLECTION}: {summary[BOOKS_COLLECTION]}"))

        # 5. Community Discussions, Replies, Reports, Moderation Audits
        if target in ("all", "community"):
            self.stdout.write("Initializing indexes on community collections...")
            setup_community_indexes()
            for col_name in ("discussions", "replies", "reports", "moderation_audits"):
                summary[col_name] = list(db[col_name].index_information().keys())
                self.stdout.write(self.style.SUCCESS(f"  ✓ {col_name}: {summary[col_name]}"))

        self.stdout.write(self.style.SUCCESS("\nAll target MongoDB indexes have been successfully initialized and verified."))
        return "\n".join(f"{col}: {', '.join(idx)}" for col, idx in summary.items())
