"""
Discovery app configuration.

The discovery app owns the Book discovery domain:
  - MongoDB book documents
  - External provider adapters (Google Books, Open Library)
  - Book search and retrieval services

This app has NO PostgreSQL models.  All persistence goes to MongoDB.
"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class DiscoveryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "discovery"
    verbose_name = "Book Discovery"

    def ready(self):
        """Ensure MongoDB indexes exist when the app starts.

        Called once after all models are loaded.  Failures are logged as
        warnings — a MongoDB outage at startup must not prevent Django from
        starting.  The indexes will be re-attempted on the next app restart.
        """
        # Skip during Django management command introspection (e.g. test collection).
        import sys
        if "test" in sys.argv or "migrate" in sys.argv or "makemigrations" in sys.argv:
            return

        try:
            from discovery.repository import ensure_indexes
            from discovery.library_repository import ensure_library_indexes
            from discovery.reviews_repository import ensure_review_indexes
            ensure_indexes()
            ensure_library_indexes()
            ensure_review_indexes()
        except Exception as exc:
            logger.warning(
                "Discovery: could not ensure MongoDB indexes at startup: %s. "
                "Indexes will be created on next restart or first DB access.",
                exc,
            )
