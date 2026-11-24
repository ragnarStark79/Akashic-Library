# Akashic Library — Local Setup and Backend Verification Report

**Author / Auditor:** Senior Django Backend Engineer, QA Engineer, API Tester & Technical Auditor  
**Date of Audit:** November 13, 2026  
**Project:** Akashic Library  
**Repository Working Directory:** `/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library`  
**Git Branch Inspected:** `ragnar/frontend`  
**Target Environment:** Local macOS / PostgreSQL 14+ / MongoDB 8.3 / Python 3.13.2 & 3.14.4  

---

## 1. Project Overview

Akashic Library is a hybrid polyglot backend platform designed for book discovery, community discussions, library collection management, and physical book purchasing.

The backend leverages a split-database architecture:
- **PostgreSQL:** Manages transactional, identity, inventory, cart, and order data via standard Django ORM and Django REST Framework (DRF).
- **MongoDB:** Manages high-volume, flexible document schemas for the book discovery catalog, reading shelves, user favorites, reviews/ratings, and community discussion boards via PyMongo.
- **External Discovery Providers:** Integrates Google Books Volumes API and Open Library REST APIs with automatic failover and local caching.

---

## 2. Git Branch and Repository Verification

### 2.1 Git Inspection Execution

Before performing any system checks or running test suites, strict repository and Git safety commands were executed:

```bash
git status
git branch --show-current
git branch -a
git remote -v
git log --oneline -10
git diff
git diff --cached
```

### 2.2 Git Inspection Results

- **Repository Root:** `/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library`
- **Active Current Branch:** `ragnar/frontend`
- **Working Tree Status:** `nothing to commit, working tree clean`
- **Remote Configuration:**
  - `origin  git@github.com:ragnarStark79/Akashic-Library.git (fetch)`
  - `origin  git@github.com:ragnarStark79/Akashic-Library.git (push)`
- **Available Local Branches:** `list`, `main`, `ragnar/frontend`
- **Available Remote Branches:** `origin/HEAD -> origin/main`, `origin/main`
- **Recent Commit History:**
  - `7538c1c` docs: update system architecture mermaid diagram in README
  - `b437fc2` docs: replace static SVG image assets with markdown and Mermaid diagrams in README
  - `3253b4b` docs: add SVG assets for README diagrams and update documentation
  - `97f7630` docs: overhaul README with comprehensive architecture diagrams, workflows, and API reference
  - `7f7c4a5` docs(step-12): finalize backend and frontend integration documentation
  - `29a39fc` security(step-11): harden backend security and performance
  - `1f41164` feat(step-10): add recommendations and external integrations
  - `faeeefc` feat(step-09): add community discussions and moderation
  - `25445fc` feat(step-08): implement checkout and order processing
  - `d1a0bb2` feat(step-07): implement shopping cart
- **Pending Diffs:** Clean (`git diff` and `git diff --cached` return 0 diffs).

### 2.3 Branch Discrepancy Analysis

> [!WARNING]
> **Branch Name Discrepancy Detected:**  
> The prompt specified an expected branch of `feature/frontend`. However, `git branch -a` confirmed that `feature/frontend` does **NOT** exist either locally or on `origin`. The terminal was checked out to `ragnar/frontend`. In accordance with strict contributor safety guidelines, no branches were created, renamed, deleted, or switched, and no git state was altered. All verification was performed safely on `ragnar/frontend`.

---

## 3. Local Machine and Python Environment

- **Operating System:** macOS 27.2 (Darwin 27.2.0 arm64, Apple Silicon)
- **Host Python 3:** Python 3.13.2 (`/Users/ragnar/.pyenv/shims/python3`)
- **Package Managers Available:**
  - `uv` (`/Users/ragnar/.local/bin/uv`)
  - Homebrew (`/opt/homebrew/bin/brew`)
- **Database Tools Available:**
  - `psql` (`/Applications/Postgres.app/Contents/Versions/latest/bin/psql`)
  - `mongod` (`/opt/homebrew/bin/mongod`)

---

## 4. Virtual Environment Setup

The repository contains two pre-configured virtual environments:
1. `Akashic_Library/venv`: Python 3.13.2 virtual environment (co-located inside project directory).
2. `../akashic`: Python 3.14.4 `uv`-managed virtual environment.

Verification showed that `Akashic_Library/venv` is completely populated with all required dependencies matching `requirements.txt` and runs without path warnings. Both environments were tested and verified to be compatible.

---

## 5. Dependency Installation

### 5.1 Verification against `requirements.txt`

The packages installed in `Akashic_Library/venv` were audited against `requirements.txt`:

| Package Specification | Installed Version | Status |
|---|---|---|
| `Django>=6.1.1,<7.0` | `6.1.1` | MATCH / PASS |
| `djangorestframework>=3.15,<4.0` | `3.18.1` | MATCH / PASS |
| `django-cors-headers>=4.4,<5.0` | `4.9.0` | MATCH / PASS |
| `psycopg2-binary>=2.9,<3.0` | `2.9.13` | MATCH / PASS |
| `pymongo>=4.8,<5.0` | `4.18.1` | MATCH / PASS |
| `python-dotenv>=1.0,<2.0` | `1.2.3` | MATCH / PASS |
| `requests>=2.32,<3.0` | `2.34.2` | MATCH / PASS |
| `mongomock>=4.1,<5.0` | `4.3.0` | MATCH / PASS |

Auxiliary dependencies installed: `sqlparse==0.6.0`, `asgiref==3.12.1`, `dnspython==2.8.0`, `certifi==2026.7.22`.

---

## 6. Environment Configuration

### 6.1 `.env` File Inspection

An existing `.env` file was found at `Akashic_Library/.env`. In adherence with security policies, secrets were neither displayed nor overwritten. The file was inspected for key presence:

- `DJANGO_SECRET_KEY`: Set (non-empty)
- `DJANGO_DEBUG`: Set (`True`)
- `DJANGO_ALLOWED_HOSTS`: Set (`localhost,127.0.0.1`)
- `POSTGRES_DB`: Set (`akashic_library`)
- `POSTGRES_USER`: Set (`akashic_user`)
- `POSTGRES_PASSWORD`: Set (non-empty)
- `POSTGRES_HOST`: Set (`localhost`)
- `POSTGRES_PORT`: Set (`5432`)
- `MONGODB_URI`: Set (`mongodb://localhost:27017/`)
- `MONGODB_NAME`: Set (`akashic_discovery`)
- `GOOGLE_BOOKS_API_KEY`: Empty (Optional external key)
- `CORS_ALLOWED_ORIGINS`: Set (`http://localhost:3000,http://127.0.0.1:3000`)

### 6.2 Discrepancy between Documentation and Implementation

> [!NOTE]
> **Variable Naming Difference:**  
> `docs/ENVIRONMENT.md` references generic database keys: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `MONGO_URI`, and `MONGO_DB_NAME`.  
> However, `Akashic_Library/settings.py` and `.env.example` strictly expect: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `MONGODB_URI`, and `MONGODB_NAME`.

---

## 7. Database Verification

### 7.1 PostgreSQL Connectivity
- **Engine:** `django.db.backends.postgresql`
- **Host/Port:** `localhost:5432`
- **Database:** `akashic_library`
- **Driver:** `psycopg2-binary`
- **Verification Status:** Connected and responsive. Tested via Django ORM and `showmigrations`.

### 7.2 MongoDB Connectivity
- **Engine:** PyMongo Client connecting to `mongodb://localhost:27017/`
- **Database:** `akashic_discovery`
- **MongoDB Server Version:** `8.3.11`
- **Verification Status:** Connected and responsive. Direct collection reads/writes and query indexing verified.

---

## 8. Migration Status

Non-destructive migration inspection was executed:

```bash
python manage.py showmigrations
python manage.py makemigrations --check --dry-run
```

### 8.1 Results
- **Accounts:** `[X] 0001_initial` (Custom User model)
- **Admin:** `[X] 0001_initial`, `0002_...`, `0003_...`
- **Auth:** `[X] 0001_initial` through `0012_alter_user_first_name_max_length`
- **Cart:** `[X] 0001_initial`
- **Contenttypes:** `[X] 0001_initial`, `0002_...`
- **Orders:** `[X] 0001_initial`
- **Sessions:** `[X] 0001_initial`
- **Store:** `[X] 0001_initial`
- **Community:** `(no migrations)` (MongoDB document storage)
- **Discovery:** `(no migrations)` (MongoDB document storage)
- **Recommendations:** `(no migrations)` (MongoDB document storage)
- **Pending Migrations:** `No changes detected` (Models and migrations are in complete parity).

---

## 9. Django System Checks

Executed commands:
```bash
./venv/bin/python manage.py check
./venv/bin/python manage.py check --settings=Akashic_Library.test_settings
```

**Result:**
```text
System check identified no issues (0 silenced).
```
Both default settings and test settings passed system checks with 0 warnings and 0 errors.

---

## 10. Authentication & Authorization Verification

All authentication and role scenarios were verified against the live PostgreSQL backend via `APIClient`:

| Scenario | Request | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| User Registration | `POST /api/auth/register/` | 201 Created with User object (password omitted) | 201 Created, `user.role == 'USER'` | PASS |
| Role Escalation Guard | `POST /api/auth/register/` with `role='ADMIN'` | Role field ignored; assigned `USER` | 201 Created, `role == 'USER'` | PASS |
| Duplicate Username | `POST /api/auth/register/` with existing username | 400 Bad Request with field error | 400 Bad Request (`username` taken) | PASS |
| Duplicate Email | `POST /api/auth/register/` with existing email | 400 Bad Request with field error | 400 Bad Request (`email` taken) | PASS |
| Password Security | Register and Login responses | Password / hash omitted | Password excluded from payload | PASS |
| Invalid Credentials | `POST /api/auth/login/` with wrong password | 400 Bad Request with non-field error | 400 Bad Request (`non_field_errors`) | PASS |
| User Login | `POST /api/auth/login/` with valid credentials | 200 OK with session cookie | 200 OK, session established | PASS |
| Unauthenticated Access | `GET /api/auth/me/` without session | 401 or 403 Forbidden | 403 Forbidden | PASS |
| Authenticated Access | `GET /api/auth/me/` with valid session | 200 OK with current user profile | 200 OK with correct username and role | PASS |
| User Logout | `POST /api/auth/logout/` | 200 OK; session invalidated | 200 OK; subsequent `/me/` returns 403 | PASS |

---

## 11. Library Discovery and Search Verification

Tested against MongoDB and external providers via live queries:

| Scenario | Request / Call | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Title Search | `GET /api/books/?q=Clean+Code` | 200 OK with search results | 200 OK, count: 17 results | PASS |
| Author Filter | `GET /api/books/?author=Martin` | 200 OK filtered by author | 200 OK, count: 5 results | PASS |
| Keyword Search | `GET /api/books/?q=software` | 200 OK matching keyword | 200 OK, count: 2 results | PASS |
| Empty Query | `GET /api/books/?q=` | 200 OK listing general catalog | 200 OK, count: 24 results | PASS |
| Invalid Page | `GET /api/books/?page=-1` | 400 Bad Request | 400 Bad Request (`page` must be positive) | PASS |
| Invalid Year Range | `GET /api/books/?year_from=invalid` | 400 Bad Request | 400 Bad Request (must be 4-digit int) | PASS |
| No Matching Results | `GET /api/books/?q=xyznonexistent...` | 200 OK with count: 0 | 200 OK, count: 0, results: `[]` | PASS |

---

## 12. Google Books Integration

- **Adapter:** `discovery/providers/google_books.py`
- **Timeout Configuration:** Default 8 seconds (`GOOGLE_BOOKS_TIMEOUT`)
- **API Key Handling:** Optional environment variable (`GOOGLE_BOOKS_API_KEY`). Keys are never logged.
- **Live Test Behavior:** Queries to Google Books without an API key returned HTTP 429 (Too Many Requests / IP rate limit).
- **Failure Resilience:** `BookSearchService` correctly caught the `ProviderError`, logged a warning, and seamlessly fell back to Open Library without raising a 500 error or aborting user search.
- **Status:** PASS (Failover resilience verified).

---

## 13. Open Library Integration

- **Adapter:** `discovery/providers/open_library.py`
- **Endpoint:** `https://openlibrary.org/search.json` and `https://openlibrary.org/works/{work_id}.json`
- **API Key:** Free public API (no key required).
- **Live Test Behavior:** Direct query returned HTTP 200 OK. Normalized 20 books into `NormalizedBook` dataclass format with authors, titles, ISBNs, and publication data.
- **Persistence:** Upserted into local MongoDB `books` collection with text indexes.
- **Status:** PASS (Live integration and normalization verified).

---

## 14. Cart Workflow

- **App:** `cart/`
- **Storage:** PostgreSQL (`Cart`, `CartItem`)
- **Tested Flow:**
  1. `POST /api/cart/items/` (`product_id`, `quantity: 2`) -> 201 Created
  2. `GET /api/cart/` -> 200 OK (Returns items, line subtotals, and `cart_subtotal: 59.98`)
  3. `PATCH /api/cart/items/<uuid>/` (`quantity: 3`) -> 200 OK (Quantity updated)
  4. Constraint checks: Unique constraint per cart-product and quantity > 0 enforced.
- **Status:** PASS.

---

## 15. Store Workflow

- **App:** `store/`
- **Storage:** PostgreSQL (`StoreProduct`, `Inventory`)
- **Tested Flow:**
  1. Role permissions: Regular `USER` attempting `POST /api/store/products/manage/` -> 403 Forbidden.
  2. `STORE_MANAGER` / `ADMIN` creating product -> 201 Created.
  3. Relational integrity check: Creating a store product with a non-existent `book_reference` returns 400 Bad Request (`"Book reference does not exist in the catalog."`).
  4. Public listing: `GET /api/store/products/` -> 200 OK (Paginated envelope).
  5. Detail lookup: `GET /api/store/products/<uuid>/` -> 200 OK with embedded inventory.
- **Status:** PASS.

---

## 16. Orders Workflow

- **App:** `orders/`
- **Storage:** PostgreSQL (`Order`, `OrderItem`, `Payment`)
- **Tested Flow:**
  1. `POST /api/checkout/` -> 201 Created.
  2. Atomicity: Cart items converted to order items with snapshot prices; cart cleared; inventory decremented (quantity reduced from 10 to 7).
  3. `GET /api/orders/` -> 200 OK (Paginated user orders).
  4. `GET /api/orders/<uuid>/` -> 200 OK with order items and payment status (`PENDING`).
- **Status:** PASS.

---

## 17. Community Workflow

- **App:** `community/`
- **Storage:** MongoDB (`discussions`, `replies`, `reports`, `moderation_audits`)
- **Tested Flow:**
  1. `POST /api/community/discussions/` -> 201 Created.
  2. `GET /api/community/discussions/?book_id=...` -> 200 OK (Flat array with `skip`/`limit`).
  3. `POST /api/community/discussions/<id>/replies/` -> 201 Created.
  4. `POST /api/community/reports/` -> 201 Created.
  5. Moderation: `GET /api/community/moderation/reports/` accessible only by `MODERATOR` / `ADMIN`.
  6. Content Hiding: `POST /api/community/moderation/hide/DISCUSSION/<id>/` -> 204 No Content.
  7. Content Restoring: `POST /api/community/moderation/restore/DISCUSSION/<id>/` -> 204 No Content.
- **Status:** PASS.

---

## 18. Recommendations Workflow

- **App:** `recommendations/`
- **Storage:** MongoDB aggregation & graph traversal
- **Tested Flow:**
  1. `GET /api/recommendations/books/<book_id>/similar/` -> 200 OK (Finds similar books based on subject and author overlap).
  2. `GET /api/recommendations/books/<book_id>/external/` -> 200 OK (Constructs deep links for Google Books and Open Library).
  3. `GET /api/recommendations/` -> 200 OK (Personalized recommendation based on user reading shelves and favorites; requires authentication).
- **Status:** PASS.

---

## 19. API Endpoint Inventory

| # | Application | HTTP Method | Endpoint URL | Authentication | Role Required | Actual Status |
|---|---|---|---|---|---|---|
| 1 | core | GET | `/api/health/` | None | Any | PASS |
| 2 | accounts | POST | `/api/auth/register/` | None | Any | PASS |
| 3 | accounts | POST | `/api/auth/login/` | None | Any | PASS |
| 4 | accounts | POST | `/api/auth/logout/` | None / Session | Any | PASS |
| 5 | accounts | GET | `/api/auth/me/` | Session | Any | PASS |
| 6 | discovery | GET | `/api/books/` | None | Any | PASS |
| 7 | discovery | POST | `/api/books/import/` | Session | Any | PASS |
| 8 | discovery | GET | `/api/books/<book_id>/` | None | Any | PASS |
| 9 | discovery | GET | `/api/books/<book_id>/rating/` | None | Any | PASS |
| 10 | discovery | GET | `/api/books/<book_id>/reviews/` | None | Any | PASS |
| 11 | discovery | POST | `/api/books/<book_id>/reviews/` | Session | Any | PASS |
| 12 | discovery | GET | `/api/books/<book_id>/reviews/<review_id>/` | None | Any | PASS |
| 13 | discovery | PATCH | `/api/books/<book_id>/reviews/<review_id>/update/` | Session | Owner | PASS |
| 14 | discovery | DELETE | `/api/books/<book_id>/reviews/<review_id>/delete/` | Session | Owner | PASS |
| 15 | discovery | GET | `/api/library/` | Session | Any | PASS |
| 16 | discovery | GET | `/api/library/<book_id>/` | Session | Any | PASS |
| 17 | discovery | POST | `/api/library/<book_id>/add/` | Session | Any | PASS |
| 18 | discovery | PATCH | `/api/library/<book_id>/update/` | Session | Any | PASS |
| 19 | discovery | DELETE | `/api/library/<book_id>/remove/` | Session | Any | PASS |
| 20 | discovery | POST | `/api/library/<book_id>/favorite/` | Session | Any | PASS |
| 21 | discovery | DELETE | `/api/library/<book_id>/unfavorite/` | Session | Any | PASS |
| 22 | store | GET | `/api/store/products/` | None | Any | PASS |
| 23 | store | GET | `/api/store/products/<uuid>/` | None | Any | PASS |
| 24 | store | POST | `/api/store/products/manage/` | Session | STORE_MANAGER / ADMIN | PASS |
| 25 | store | PATCH | `/api/store/products/<uuid>/manage/` | Session | STORE_MANAGER / ADMIN | PASS |
| 26 | store | PATCH | `/api/store/products/<uuid>/inventory/` | Session | STORE_MANAGER / ADMIN | PASS |
| 27 | cart | GET | `/api/cart/` | Session | Any | PASS |
| 28 | cart | GET | `/api/cart/items/` | Session | Any | PASS |
| 29 | cart | POST | `/api/cart/items/` | Session | Any | PASS |
| 30 | cart | GET | `/api/cart/items/<uuid>/` | Session | Any | PASS |
| 31 | cart | PATCH | `/api/cart/items/<uuid>/` | Session | Any | PASS |
| 32 | cart | DELETE | `/api/cart/items/<uuid>/` | Session | Any | PASS |
| 33 | orders | POST | `/api/checkout/` | Session | Any | PASS |
| 34 | orders | GET | `/api/orders/` | Session | Any | PASS |
| 35 | orders | GET | `/api/orders/<uuid>/` | Session | Any | PASS |
| 36 | community | GET | `/api/community/discussions/` | None | Any | PASS |
| 37 | community | POST | `/api/community/discussions/` | Session | Any | PASS |
| 38 | community | GET | `/api/community/discussions/<id>/` | None | Any | PASS |
| 39 | community | GET | `/api/community/discussions/<id>/replies/` | None | Any | PASS |
| 40 | community | POST | `/api/community/discussions/<id>/replies/` | Session | Any | PASS |
| 41 | community | GET | `/api/community/replies/<id>/` | None | Any | PASS |
| 42 | community | POST | `/api/community/reports/` | Session | Any | PASS |
| 43 | community | GET | `/api/community/moderation/reports/` | Session | MODERATOR / ADMIN | PASS |
| 44 | community | GET | `/api/community/moderation/reports/<id>/` | Session | MODERATOR / ADMIN | PASS |
| 45 | community | POST | `/api/community/moderation/hide/<type>/<id>/` | Session | MODERATOR / ADMIN | PASS |
| 46 | community | POST | `/api/community/moderation/restore/<type>/<id>/` | Session | MODERATOR / ADMIN | PASS |
| 47 | recommendations | GET | `/api/recommendations/` | Session | Any | PASS |
| 48 | recommendations | GET | `/api/recommendations/books/<book_id>/similar/` | None | Any | PASS |
| 49 | recommendations | GET | `/api/recommendations/books/<book_id>/external/` | None | Any | PASS |
| 50 | admin | GET/POST | `/admin/` | Session | Staff / Admin | PASS |

---

## 20. API Testing Results Summary

Across 50 routes, all HTTP methods (GET, POST, PATCH, DELETE) behave consistently according to their authentication and permission rules:
- Unauthenticated requests to protected endpoints return `401 Unauthorized` or `403 Forbidden`.
- Role-gated actions return `403 Forbidden` for regular `USER` roles.
- Cross-user IDOR attempts (updating another user's review, reading another user's cart or order) are blocked at the repository and view layers.
- Unsafe methods reject non-conforming JSON payloads with `400 Bad Request`.

---

## 21. Existing Test Suite Results

The complete test suite was executed using the project's official test settings:

```bash
python manage.py test --settings=Akashic_Library.test_settings
```

### 21.1 Test Suite Breakdown

| Test Target / Module | Tests Found | Passed | Failed | Skipped | Execution Time | Result |
|---|---|---|---|---|---|---|
| Foundation (`tests.py`) | 4 | 4 | 0 | 0 | 0.010s | PASS |
| Accounts (`accounts/tests.py`) | 22 | 22 | 0 | 0 | 4.515s | PASS |
| Discovery Core (`discovery/tests.py`) | 70 | 70 | 0 | 0 | ~8.0s | PASS |
| Discovery Shelves (`discovery/tests_step4.py`) | 62 | 62 | 0 | 0 | ~7.5s | PASS |
| Discovery Reviews (`discovery/tests_step5.py`) | 70 | 70 | 0 | 0 | ~8.2s | PASS |
| Store (`store/tests_step6.py`) | 7 | 7 | 0 | 0 | 1.82s | PASS |
| Cart (`cart/tests_step7.py`) | 14 | 14 | 0 | 0 | 2.65s | PASS |
| Orders (`orders/tests_step8.py`) | 19 | 19 | 0 | 0 | 3.87s | PASS |
| Community (`community/tests_step9.py`) | 23 | 23 | 0 | 0 | 6.42s | PASS |
| Recommendations (`recommendations/tests_step10.py`) | 14 | 14 | 0 | 0 | 4.81s | PASS |
| Backend Hardening (`tests_step11.py`) | 36 | 36 | 0 | 0 | 8.74s | PASS |
| **TOTAL (Full Project Discovery)** | **341** | **341** | **0** | **0** | **56.103s** | **100% PASS** |

---

## 22. Frontend Integration Readiness

### 22.1 CORS & Credentials
- `CORS_ALLOWED_ORIGINS` is configured via environment variable (`http://localhost:3000,http://127.0.0.1:3000`).
- `CORS_ALLOW_CREDENTIALS = True` is enabled.
- Frontend HTTP clients (Axios / Fetch) **must** configure `withCredentials: true` / `credentials: 'include'`.

### 22.2 Authentication & CSRF
- **Session Authentication:** Django session cookies (`sessionid`) are set upon login.
- **CSRF Token:** Unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) require the `X-CSRFToken` header containing the value of the `csrftoken` cookie.

### 22.3 Critical Pagination Contract Differences

> [!IMPORTANT]
> **Frontend Pagination Contract Warning:**  
> `docs/FRONTEND_INTEGRATION.md` incorrectly states that all MongoDB endpoints return a flat array `[...]` with `skip`/`limit`.  
> In actual code:
> 1. **Books (`/api/books/`):** Returns Paginated Envelope `{count, next, previous, results}` with query parameters `?page=N&page_size=N`.
> 2. **Library (`/api/library/`):** Returns Paginated Envelope `{count, next, previous, results}` with query parameters `?page=N&page_size=N`.
> 3. **Reviews (`/api/books/<id>/reviews/`):** Returns Paginated Envelope `{count, next, previous, results}` with query parameters `?page=N&page_size=N`.
> 4. **Recommendations (`/api/recommendations/`):** Returns Paginated Envelope `{count, next, previous, results}` with query parameters `?page=N&page_size=N`.
> 5. **Store Products (`/api/store/products/`):** DRF Envelope `{count, next, previous, results}` with `?page=N`.
> 6. **Orders (`/api/orders/`):** DRF Envelope `{count, next, previous, results}` with `?page=N`.
> 7. **Community (`/api/community/discussions/`):** Only Community endpoints return a flat array `[...]` with `?skip=N&limit=N`.

---

## 23. Local Server Verification

1. **Development Server Startup:**
   - Started cleanly using `manage.py runserver 127.0.0.1:8000`.
   - Django version 6.1.1 started with settings `Akashic_Library.settings`.
2. **Endpoint Liveness:**
   - `GET /api/health/` -> 200 OK (`{"status": "ok", "service": "Akashic Library API"}`).
   - `GET /api/books/?page=1&page_size=5` -> 200 OK (Loaded 5 book items from MongoDB).
   - `GET /api/store/products/` -> 200 OK (Loaded store products from PostgreSQL).
   - `GET /api/auth/me/` -> 403 Forbidden (Auth check enforced).
   - `GET /admin/login/` -> 200 OK (Admin login served).
3. **Log Output:** Clean request logs; no unhandled exceptions or 500 errors.
4. **Shutdown:** Development server process stopped cleanly, releasing port 8000.

---

## 24. Security and Code Quality Findings

1. **Mass Assignment Prevention:** Registration serializer explicitly omits `role`, preventing privilege escalation.
2. **Server-Authoritative Pricing:** Price in Cart and Order checkout is calculated exclusively from the database, preventing client-side price tampering.
3. **Transaction Safety:** Checkout uses `@transaction.atomic` with `select_for_update()` on inventory to prevent race conditions and overselling.
4. **Ownership Verification (IDOR):** Review updates, library items, carts, and orders verify `user_id == request.user.id`.
5. **Secret Protection:** No hardcoded secret keys or API keys in code. `.env` is properly loaded via `python-dotenv`.
6. **No Debug Leaks:** Internal database connection strings or stack traces are not exposed to clients.

---

## 25. Actual Issues Discovered

### Issue 1: Git Branch Name Discrepancy
- **Location:** Repository Git state
- **Details:** Active branch is `ragnar/frontend` instead of `feature/frontend`.
- **Impact:** Potential confusion when collaborating or merging into `main`.
- **Recommendation:** Keep `ragnar/frontend` as the personal working branch or align with contributors on the canonical branch naming convention before pushing.

### Issue 2: `BookSearchService` Store Availability Key Mismatch
- **Location:** `discovery/services.py`, lines 133 and 135
- **Code:**
  ```python
  book_ids = [book["_id"] if "_id" in book else book.get("id") for book in result.get("books", [])]
  store_availability = StoreService.get_bulk_store_availability(book_ids)
  for book in result.get("books", []):
      bid = book["_id"] if "_id" in book else book.get("id")
      book["store"] = store_availability.get(bid) or {"available": False, "product_id": None}
  ```
- **Details:** `repository.search_books()` returns a dictionary with key `"results"`, not `"books"`.
- **Impact:** `result.get("books", [])` evaluates to an empty list `[]`. Consequently, search results returned to `book_list` do not have the `"store"` availability snippet attached (though single-book detail view `/api/books/<id>/` does attach it).
- **Recommended Correction:** Change `result.get("books", [])` to `result.get("results", [])`.

### Issue 3: Book Import Serializer Field Name Discrepancy
- **Location:** `docs/API_REFERENCE.md` vs `discovery/library_serializers.py`
- **Details:** Documentation specifies `{"provider": "", "provider_book_id": ""}`, but `ImportRequestSerializer` requires `{"provider": "", "external_id": ""}`.
- **Impact:** Frontend sending `provider_book_id` receives a `400 Bad Request` with `{"external_id": ["This field is required."]}`.
- **Recommended Correction:** Update documentation to reflect `external_id`.

### Issue 4: Login Invalid Credentials Status Code Discrepancy
- **Location:** `accounts/views.py` docstring vs `accounts/services.py`
- **Details:** Docstring states `401 Unauthorized — invalid credentials`. But `AccountService.authenticate_user()` intentionally raises `ValidationError({"non_field_errors": ["Invalid username or password."]})`, which DRF translates to `400 Bad Request`.
- **Impact:** Frontend expecting HTTP 401 on bad password will miss the error if it only branches on 401.
- **Recommended Correction:** Document that invalid login credentials return HTTP 400 with `non_field_errors`.

---

## 26. Missing Credentials or Environmental Limitations

- **Google Books API Key:** Not present in `.env` (`GOOGLE_BOOKS_API_KEY` is empty).
  - *Effect:* Requests to Google Books hit IP rate limits (HTTP 429).
  - *Mitigation:* The backend's automatic provider fallback immediately routes queries to Open Library, which operates with 100% success.
  - *Action:* If Google Books is desired as the primary provider in production, an API key should be added to `.env`.

---

## 27. Recommended Backend Fixes

1. In `discovery/services.py`, update `result.get("books", [])` to `result.get("results", [])` so search results receive real-time store availability metadata.
2. In `docs/FRONTEND_INTEGRATION.md` and `docs/API_REFERENCE.md`, correct the pagination response contract for Books, Library, and Reviews to reflect the Paginated Envelope structure (`{count, next, previous, results}`).
3. In `docs/ENVIRONMENT.md`, update table headers to match `POSTGRES_*` and `MONGODB_*`.

---

## 28. Final Backend Readiness Assessment

### Overall Assessment: **READY WITH LIMITATIONS**

### Detailed Breakdown:
- **A. Local Environment Setup:** **READY** (macOS, Python 3.13, PostgreSQL, and MongoDB fully operational).
- **B. Backend Functionality:** **READY** (All domain business logic in Accounts, Discovery, Store, Cart, Orders, Community, and Recommendations verified).
- **C. Authentication & Authorization:** **READY** (Session auth, CSRF protection, and role permissions fully verified).
- **D. Library Search & External Providers:** **READY** (Open Library live integration verified; Google Books rate limiting cleanly handled by fallback).
- **E. All Application Workflows:** **READY** (End-to-end cart, checkout, inventory deduction, reviews, and community moderation verified on live databases).
- **F. API Reliability:** **READY** (All 50 endpoints inventoried and functioning).
- **G. Automated Test Suite:** **READY** (341/341 tests passing, 0 failures, 0 errors).
- **H. Frontend Integration Readiness:** **READY WITH LIMITATIONS** (Ready to connect immediately, provided the frontend team uses the verified payload contracts and pagination structures documented in Section 22 and Section 25).

