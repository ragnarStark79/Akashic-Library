"""
Dedicated E2E testing settings for Akashic Library.

Explicitly isolates End-to-End browser test execution from standard development
and production databases. Enforces separate PostgreSQL and MongoDB test databases.
"""

import os
from .settings import *  # noqa: F401, F403

# Explicit E2E environment flag to prevent running test fixture commands against dev or prod
IS_E2E_ENVIRONMENT = True
E2E_ENVIRONMENT_MARKER = "akashic_e2e_verified"

# Dedicated PostgreSQL E2E database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("E2E_POSTGRES_DB", "akashic_library_e2e"),
        "USER": os.getenv("POSTGRES_USER", "akashic_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# Dedicated MongoDB E2E database
MONGODB_NAME = os.getenv("E2E_MONGODB_NAME", "akashic_discovery_e2e")

# E2E Test Credentials loaded from environment or secure disposable default
E2E_TEST_PASSWORD = os.getenv("E2E_TEST_PASSWORD", "E2eDisposablePass_2026!")

# Ensure cookie security is relaxed for local HTTP test runner
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Email backend: in-memory for E2E verification
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_FROM_EMAIL = "Akashic Library E2E <noreply@akashic.local>"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")
