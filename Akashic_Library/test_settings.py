"""
Test-only settings override.

Uses an in-memory SQLite database so unit tests can run without a
PostgreSQL server.  All other settings inherit from the main settings module.

Usage:
  python manage.py test --settings=Akashic_Library.test_settings
  python manage.py test accounts --settings=Akashic_Library.test_settings
"""

from .settings import *  # noqa: F401, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Disable secure-cookie requirements in test environment.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Relax password validators for test user creation speed.
# Tests that exercise password validation explicitly will still work because
# they hit the full validator suite through the serializer.
AUTH_PASSWORD_VALIDATORS = []
