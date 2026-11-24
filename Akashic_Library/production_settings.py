"""
Dedicated Production settings for Akashic Library.

Enforces production security invariants:
- DEBUG=False mandatory.
- Cryptographically strong secret key loaded from environment.
- Explicit ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS (no wildcards).
- HTTPS-aware security headers and secure cookie configuration.
- Fail-closed database connection enforcement (no fallback to dev/test DBs).
- Production SMTP email configuration for patron password recovery.
- Safe logging without credential, session, or token leakage.
"""

import os
from django.core.exceptions import ImproperlyConfigured
from .settings import *  # noqa: F401, F403

# ─── 1. Debug & Secret Key ────────────────────────────────────────────────────
DEBUG = False

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("CRITICAL SECURITY ERROR: DJANGO_SECRET_KEY environment variable is missing.")

if SECRET_KEY.startswith("django-insecure-") or len(SECRET_KEY) < 32:
    raise ImproperlyConfigured("CRITICAL SECURITY ERROR: DJANGO_SECRET_KEY must be a cryptographically secure key of at least 32 characters.")


# ─── 2. Host and Origin Security ──────────────────────────────────────────────
_raw_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "").strip()
if not _raw_hosts:
    raise ImproperlyConfigured("CRITICAL SECURITY ERROR: DJANGO_ALLOWED_HOSTS must be explicitly defined in production.")

ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(",") if h.strip()]
if "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("CRITICAL SECURITY ERROR: Wildcard '*' in ALLOWED_HOSTS is strictly forbidden in production.")

_raw_csrf = os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").strip()
if _raw_csrf:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _raw_csrf.split(",") if o.strip()]
    if "*" in CSRF_TRUSTED_ORIGINS or any("*" in o for o in CSRF_TRUSTED_ORIGINS):
        raise ImproperlyConfigured("CRITICAL SECURITY ERROR: Wildcard in CSRF_TRUSTED_ORIGINS is forbidden.")
else:
    # Same-origin reverse-proxy default: infer from ALLOWED_HOSTS
    CSRF_TRUSTED_ORIGINS = [f"https://{h}" for h in ALLOWED_HOSTS if not h.startswith(".")]

_raw_cors = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
if _raw_cors:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOWED_ORIGINS = []
    CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOW_CREDENTIALS = True


# ─── 3. Session & CSRF Cookie Security ────────────────────────────────────────
# In production with HTTPS, cookies must be marked SECURE
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True").strip().lower() in ("true", "1", "yes")
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True").strip().lower() in ("true", "1", "yes")

SESSION_COOKIE_HTTPONLY = True
# CSRF cookie must be readable by frontend JavaScript to populate X-CSRFToken header
CSRF_COOKIE_HTTPONLY = False

SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = int(os.getenv("SESSION_COOKIE_AGE", "1209600"))  # 2 weeks default


# ─── 4. HTTPS & Reverse Proxy Headers ─────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").strip().lower() in ("true", "1", "yes")

# Reverse proxy SSL header forwarding
if os.getenv("BEHIND_REVERSE_PROXY", "False").strip().lower() in ("true", "1", "yes"):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# HTTP Strict Transport Security (HSTS)
if os.getenv("ENABLE_HSTS", "False").strip().lower() in ("true", "1", "yes"):
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS", "False").strip().lower() in ("true", "1", "yes")
    SECURE_HSTS_PRELOAD = os.getenv("SECURE_HSTS_PRELOAD", "False").strip().lower() in ("true", "1", "yes")
else:
    SECURE_HSTS_SECONDS = 0


# ─── 5. Database Fail-Closed Verification ─────────────────────────────────────
POSTGRES_DB = os.environ.get("POSTGRES_DB", "akashic_library")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "akashic_user")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")

if POSTGRES_DB.endswith("_test") or POSTGRES_DB.endswith("_e2e"):
    raise ImproperlyConfigured(f"SAFETY ERROR: Production settings cannot target test/e2e PostgreSQL database '{POSTGRES_DB}'.")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": POSTGRES_DB,
        "USER": POSTGRES_USER,
        "PASSWORD": POSTGRES_PASSWORD,
        "HOST": POSTGRES_HOST,
        "PORT": POSTGRES_PORT,
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "600")),
    }
}

MONGODB_NAME = os.environ.get("MONGODB_NAME", "akashic_discovery")
if MONGODB_NAME.endswith("_test") or MONGODB_NAME.endswith("_e2e"):
    raise ImproperlyConfigured(f"SAFETY ERROR: Production settings cannot target test/e2e MongoDB database '{MONGODB_NAME}'.")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")


# ─── 6. Production Email Backend ──────────────────────────────────────────────
EMAIL_BACKEND = os.getenv("DJANGO_EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").strip().lower() in ("true", "1", "yes")
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").strip().lower() in ("true", "1", "yes")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Akashic Library <noreply@akashiclibrary.com>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://akashiclibrary.com")


# ─── 7. Safe Production Logging ───────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "[%(levelname)s] %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "accounts": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "discovery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "community": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
