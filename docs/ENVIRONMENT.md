# Environment Configuration

This document lists the environment variables required to run the Akashic Library backend.

> **IMPORTANT**: Never commit `.env` files containing actual secrets. Use `.env.example` as a template.

## Core Variables

| Variable | Description | Example / Default | Required |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | The secret key used for cryptographic signing. | `<your-secret-key>` | Yes |
| `DEBUG` | Enables Django debug mode. Should be `False` in production. | `True` (Dev) / `False` (Prod) | No (Defaults to `False`) |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated list of host/domain names that this site can serve. | `localhost,127.0.0.1` | Yes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of origins allowed to make cross-site HTTP requests. | `http://localhost:3000` | Yes |

## Database Configuration

### PostgreSQL (Relational Data, Commerce, Auth)
| Variable | Description | Example | Required |
|---|---|---|---|
| `DB_NAME` | PostgreSQL database name. | `akashic_db` | Yes |
| `DB_USER` | PostgreSQL user. | `akashic_user` | Yes |
| `DB_PASSWORD` | PostgreSQL password. | `<db-password>` | Yes |
| `DB_HOST` | PostgreSQL host. | `127.0.0.1` | Yes |
| `DB_PORT` | PostgreSQL port. | `5432` | Yes |

### MongoDB (Discovery, Documents, Community)
| Variable | Description | Example | Required |
|---|---|---|---|
| `MONGO_URI` | Full connection string for MongoDB. | `mongodb://localhost:27017/` | Yes |
| `MONGO_DB_NAME` | MongoDB database name. | `akashic_library` | Yes |

## External Providers

| Variable | Description | Example | Required |
|---|---|---|---|
| `GOOGLE_BOOKS_API_KEY` | API Key for the Google Books integration. | `<your-google-books-api-key>` | Yes |

---

## Environment Profiles

### Local Development
In local development, you should create a `.env` file at the project root (alongside `manage.py`). `DEBUG=True` is safe here. Production security settings (HTTPS redirects, secure cookies) are disabled by default when using `settings.py`.

### Testing
The test suite utilizes a separate settings file (`Akashic_Library.test_settings`). It uses an in-memory SQLite database and `mongomock` to avoid requiring external database infrastructure. You do not need to provide real `.env` secrets to run the tests.

### Production
In production, environment variables should be injected via the deployment platform (e.g., Docker ENV, Heroku Config Vars, Kubernetes Secrets).

**Production Security Settings to Enable:**
The following settings must be explicitly enabled via environment variables or a production settings override when deploying with HTTPS:
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`
- `SECURE_SSL_REDIRECT = True`
- `SECURE_HSTS_SECONDS = 31536000`
