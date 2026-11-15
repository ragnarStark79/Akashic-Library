# AKASHIC LIBRARY — PART I
# PHASE 6G: DEPLOYMENT ENVIRONMENT CONFIGURATION REFERENCE

**Document Version:** 1.0.0-phase6g  
**Target Milestone:** Part I Production Release Preparation  
**Security Classification:** Platform Operational Reference (Zero Tracked Secrets)  

---

## 1. PURPOSE & PRINCIPLES

This reference defines the complete environment variable contract for the Akashic Library platform across its backend (Django / DRF), frontend (React / Vite), and polyglot persistence tiers (PostgreSQL and MongoDB).

### Core Operational Invariants:
1. **Zero Secret Hardcoding:** No secret, private token, database password, or provider credential may be hardcoded in application source, Dockerfiles, or tracked documentation.
2. **Fail-Closed Verification:** Production settings (`Akashic_Library.production_settings`) refuse to boot if critical cryptographic or database connection variables are missing or insecure.
3. **Public vs. Private Variable Boundary:** All variables exposed through Vite's `VITE_` namespace are bundled into public client-side JavaScript. Only non-sensitive URLs and feature modes may use the `VITE_` prefix.

---

## 2. PRODUCTION ENVIRONMENT VARIABLES MATRIX

| Variable Name | Tier / Component | Required | Secret? | Default / Example Value | Operational Purpose |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | Backend | **Yes** | No | `Akashic_Library.production_settings` | Specifies the active Django configuration profile. |
| `DJANGO_SECRET_KEY` | Backend | **Yes** | **YES** | `[50+ character random string]` | Cryptographic signing key for sessions, CSRF tokens, and password reset HMACs. |
| `DJANGO_DEBUG` | Backend | **Yes** | No | `False` | Disables debug mode, error traces, and browsable API HTML in production. |
| `DJANGO_ALLOWED_HOSTS` | Backend | **Yes** | No | `akashic.example.com,www.akashic.example.com` | Comma-separated list of valid Host header domain names. Wildcards strictly forbidden in production. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Backend | **Yes** | No | `https://akashic.example.com` | Comma-separated list of origins trusted for unsafe HTTP mutations (POST/PUT/PATCH/DELETE). |
| `FRONTEND_URL` | Backend | **Yes** | No | `https://akashic.example.com` | Canonical web URL of the frontend SPA used to build password recovery links. |
| `POSTGRES_DB` | Backend (DB) | **Yes** | No | `akashic_library` | PostgreSQL database name for relational identity, user accounts, and catalog products. |
| `POSTGRES_USER` | Backend (DB) | **Yes** | No | `akashic_user` | PostgreSQL authenticated role name. |
| `POSTGRES_PASSWORD` | Backend (DB) | **Yes** | **YES** | `[database user password]` | PostgreSQL user authentication password. |
| `POSTGRES_HOST` | Backend (DB) | **Yes** | No | `127.0.0.1` (or internal VPC host) | PostgreSQL private network hostname or service address. |
| `POSTGRES_PORT` | Backend (DB) | **Yes** | No | `5432` | PostgreSQL network port. |
| `DB_CONN_MAX_AGE` | Backend (DB) | No | No | `600` | Database persistent connection lifetime in seconds. |
| `MONGODB_URI` | Backend (Doc DB)| **Yes** | **YES** | `mongodb://127.0.0.1:27017/` (or TLS replica set URI) | Authenticated MongoDB connection string. Never exposed in logs or diagnostics. |
| `MONGODB_NAME` | Backend (Doc DB)| **Yes** | No | `akashic_discovery` | MongoDB database name storing books, reviews, annotations, and community discussions. |
| `DJANGO_EMAIL_BACKEND` | Backend (Mail) | **Yes** | No | `django.core.mail.backends.smtp.EmailBackend` | Django email backend for dispatching password recovery messages. |
| `EMAIL_HOST` | Backend (Mail) | **Yes** | No | `smtp.sendgrid.net` (or SMTP provider) | SMTP server hostname. |
| `EMAIL_PORT` | Backend (Mail) | **Yes** | No | `587` (TLS) or `465` (SSL) | SMTP service port. |
| `EMAIL_HOST_USER` | Backend (Mail) | **Yes** | **YES** | `apikey` or `smtp_user` | Authenticated username for outbound SMTP gateway. |
| `EMAIL_HOST_PASSWORD` | Backend (Mail) | **Yes** | **YES** | `[smtp api key or secret]` | Outbound SMTP password or API token. |
| `EMAIL_USE_TLS` | Backend (Mail) | No | No | `True` | Enables STARTTLS encryption on port 587. |
| `EMAIL_USE_SSL` | Backend (Mail) | No | No | `False` | Enables explicit SSL encryption on port 465. |
| `DEFAULT_FROM_EMAIL` | Backend (Mail) | **Yes** | No | `Akashic Library <noreply@akashic.example.com>` | Sender display name and email address on outgoing correspondence. |
| `PASSWORD_RESET_TIMEOUT` | Backend (Auth) | No | No | `86400` | Password reset token expiration window in seconds (24 hours default). |
| `SECURE_SSL_REDIRECT` | Backend (Web) | No | No | `True` | Redirects all incoming non-HTTPS requests to HTTPS. |
| `SESSION_COOKIE_SECURE` | Backend (Web) | No | No | `True` | Enforces `Secure` flag on session cookies (transmitted only over HTTPS). |
| `CSRF_COOKIE_SECURE` | Backend (Web) | No | No | `True` | Enforces `Secure` flag on CSRF cookies (transmitted only over HTTPS). |
| `BEHIND_REVERSE_PROXY` | Backend (Web) | No | No | `True` | Configures `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")`. |
| `ENABLE_HSTS` | Backend (Web) | No | No | `False` (until HTTPS certified) | Enables HTTP Strict Transport Security header. |
| `SECURE_HSTS_SECONDS` | Backend (Web) | No | No | `31536000` | Duration for HSTS header (1 year default once enabled). |
| `CORS_ALLOWED_ORIGINS` | Backend (API) | No | No | `""` (Empty for same-origin proxy) | Comma-separated list of allowed origins. Leave empty if using same-origin `/api` proxy. |
| `GOOGLE_BOOKS_API_KEY` | Backend (Prov) | No | **YES** | `[optional provider key]` | Optional Google Books API key for higher upstream rate limits. |
| `VITE_API_BASE_URL` | Frontend | **Yes** | No | `/api` | Base path for frontend API calls. Same-origin `/api` avoids cross-origin CORS overhead. |
| `VITE_DISCOVERY_DATA_MODE` | Frontend | **Yes** | No | `api` | Data provider mode: `api` for live backend, `demo` only for static UI development. |

---

## 3. DEDICATED E2E TEST ISOLATION VARIABLES

When executing automated browser tests or fixture setup, the following variables must be configured with `Akashic_Library.e2e_settings`:

| Variable Name | Required | Default / Expected Value | Purpose |
| :--- | :---: | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | **Yes** | `Akashic_Library.e2e_settings` | Enforces explicit E2E isolation guards. |
| `E2E_POSTGRES_DB` | **Yes** | `akashic_library_e2e` | Dedicated PostgreSQL database strictly separated from development. |
| `E2E_MONGODB_NAME` | **Yes** | `akashic_discovery_e2e` | Dedicated MongoDB database strictly separated from development. |
| `E2E_TEST_PASSWORD` | **Yes** | Loaded from local runtime environment | Disposable patron passphrase for automated browser testing. |

---

## 4. LOCAL DEVELOPMENT VARIABLES TEMPLATE

For local workstation development, variables are loaded from `.env` in the repository root:

```ini
DJANGO_SETTINGS_MODULE=Akashic_Library.settings
DJANGO_SECRET_KEY=dev-insecure-local-workstation-key-for-testing-only-12345
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000

POSTGRES_DB=akashic_library
POSTGRES_USER=akashic_user
POSTGRES_PASSWORD=
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

MONGODB_URI=mongodb://localhost:27017/
MONGODB_NAME=akashic_discovery

DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=Akashic Library <noreply@akashiclibrary.local>
```
