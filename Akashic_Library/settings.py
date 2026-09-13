"""
Django settings for Akashic Library project.

Configuration is driven entirely by environment variables loaded from a .env
file (via python-dotenv).  No secrets should ever appear in this file.

Reference:
  https://docs.djangoproject.com/en/6.1/topics/settings/
  https://docs.djangoproject.com/en/6.1/ref/settings/
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file when present (ignored if absent; real env vars always win).
load_dotenv(BASE_DIR / ".env")


# ─── Security ─────────────────────────────────────────────────────────────────

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

DEBUG = os.getenv("DJANGO_DEBUG", "False").strip().lower() in ("true", "1", "yes")

# Parse ALLOWED_HOSTS from a comma-separated env variable.
_raw_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(",") if h.strip()]


# ─── Application definition ───────────────────────────────────────────────────

INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Project apps
    "accounts",
    "discovery",
    "store",
    "cart",
    "orders",
    "community",
    "recommendations",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CorsMiddleware must be placed as high as possible, before any middleware
    # that can generate responses (e.g. CommonMiddleware).
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "Akashic_Library.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "Akashic_Library.wsgi.application"


# ─── Database ─────────────────────────────────────────────────────────────────
#
# PostgreSQL is used for identity and transactional data.
# MongoDB will be configured separately when the discovery domain is introduced.
#
# NOTE: a running PostgreSQL instance is required.  If one is not available
# during local development, Django system checks and the dev server will still
# start, but any database query will fail.

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",  # uses psycopg2-binary
        "NAME": os.getenv("POSTGRES_DB", "akashic_library"),
        "USER": os.getenv("POSTGRES_USER", "akashic_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# MongoDB connection settings (used by future discovery/community apps).
# The actual PyMongo client is NOT initialised here to avoid eager connections;
# each consuming module will import and use MONGODB_URI / MONGODB_NAME directly.
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_NAME = os.getenv("MONGODB_NAME", "akashic_discovery")

# External book provider configuration.
# API keys are optional; providers work without them (at lower rate limits).
# NEVER log or expose these values.
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY", "")
GOOGLE_BOOKS_TIMEOUT = int(os.getenv("GOOGLE_BOOKS_TIMEOUT", "8"))
OPEN_LIBRARY_TIMEOUT = int(os.getenv("OPEN_LIBRARY_TIMEOUT", "8"))


# ─── Password validation ──────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ─── Internationalisation ─────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ─── Static & media files ─────────────────────────────────────────────────────

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ─── Default primary key ──────────────────────────────────────────────────────

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ─── Custom user model ────────────────────────────────────────────────────────
#
# Must be declared before the first migration.  All Django auth machinery
# (admin, authentication backends, password validation) uses this model.

AUTH_USER_MODEL = "accounts.User"


# ─── Django REST Framework ────────────────────────────────────────────────────

REST_FRAMEWORK = {
    # All views return JSON by default; no HTML browsable API in production.
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    # Browsable API is only available when DEBUG is on.
    **(
        {
            "DEFAULT_RENDERER_CLASSES": [
                "rest_framework.renderers.JSONRenderer",
                "rest_framework.renderers.BrowsableAPIRenderer",
            ]
        }
        if DEBUG
        else {}
    ),
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    # Session-based authentication integrates cleanly with Django's built-in
    # auth system and is the right choice for a React SPA that sends cookies
    # with credentials: 'include'.  CSRF enforcement is handled automatically
    # by SessionAuthentication for unsafe methods (POST/PUT/PATCH/DELETE).
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}


# ─── CORS ─────────────────────────────────────────────────────────────────────
#
# Explicit allowlist — do NOT use CORS_ALLOW_ALL_ORIGINS for authenticated
# requests.  Add React dev/staging origins via the env variable.

_raw_cors = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()]

# Allow credentials (session cookies) from explicitly listed React origins.
# Required for session-based authentication across the React/Django boundary.
CORS_ALLOW_CREDENTIALS = True
