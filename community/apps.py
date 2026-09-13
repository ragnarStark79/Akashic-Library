import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)

class CommunityConfig(AppConfig):
    name = 'community'
    verbose_name = "Community Discussions"

    def ready(self):
        import sys
        if "test" in sys.argv or "migrate" in sys.argv or "makemigrations" in sys.argv:
            return

        try:
            from community.repository import setup_indexes
            setup_indexes()
        except Exception as exc:
            logger.warning("Community: could not ensure MongoDB indexes at startup: %s", exc)
