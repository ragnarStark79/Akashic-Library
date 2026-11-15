# AKASHIC LIBRARY — PHASE 2B: BACKEND PROVIDER AUDIT & DISCOVERY INTEGRATION REPORT

**Date:** 2026-11-13  
**Status:** Audited, Integrated & Verified  
**Branch:** `ragnar/frontend`  
**Frontend Application:** `Akashic_Library/frontend/`  
**Backend Application:** `Akashic_Library/discovery/`  

---

## 1. Executive Summary & Architecture Authority

Phase 2B audits the existing Django backend external discovery providers and aligns the React frontend to consume the live Django REST API at `/api/books/`.

### Architecture & Data Flow:
```text
React (TypeScript + Vite)
  │
  │  GET /api/books/?q={query}&subject={discipline}&page={page}
  ▼
Django REST API (discovery.views.book_list)
  │
  ▼
discovery.services.BookSearchService.search()
  │
  ├── 1. Query Local MongoDB Catalog (discovery.repository.search_books)
  │
  └── 2. If Local Results < 1 and Query String Present (Page 1):
        │
        ▼
      discovery.services.BookSearchService._fetch_from_providers()
        │
        ├── Provider 1: discovery.providers.google_books.GoogleBooksProvider
        │     (Evaluated first per _PROVIDERS list in services.py)
        │
        └── Provider 2: discovery.providers.open_library.OpenLibraryProvider
              │  GET https://openlibrary.org/search.json?q={query}&...
              ▼
            OpenLibraryProvider.normalize() → NormalizedBook
              ▼
            discovery.repository.upsert_book() → MongoDB 'books' collection
  │
  ├── 3. Re-query MongoDB Catalog with original filters
  ▼
discovery.serializers.BookListItemSerializer
  ▼
DRF Paginated Response:
  {
    "count": 42,
    "next": "http://localhost:8000/api/books/?q=...&page=2",
    "previous": null,
    "results": [ ... ]
  }
  ▼
React UI Rendering (BookCard 2:3 jacket format, FilterSidebar, Pagination)
```

**Key Architectural Invariant:**  
The React frontend **never calls Open Library or external APIs directly**. All external data ingestion, normalization, rate-limiting, and MongoDB persistence occur strictly on the Django backend behind the `/api/books/` interface.

---

## 2. Definitive Backend Provider Audit (12 Items)

### 1. Actual Django Endpoint for Book Searching
- **Catalog Search Endpoint:** `GET /api/books/`
  - Defined in `discovery/urls.py`: `path("", views.book_list, name="book-list")`. Mounted at `/api/books/` in root urlconf (`Akashic_Library/urls.py`).
- **Book Detail Endpoint:** `GET /api/books/<book_id>/`
  - Defined in `discovery/urls.py`: `path("<str:book_id>/", views.book_detail, name="book-detail")`.

### 2. HTTP Method
- **`GET`** (enforced by `@api_view(["GET"])` in `discovery/views.py`).

### 3. Supported Query Parameters
Validated directly in `discovery/views.py` (`book_list`) and `discovery/repository.py` (`search_books`):

| Parameter | Type | Validation / Behavior |
| :--- | :--- | :--- |
| `q` | `string` | Full-text query against MongoDB text index (`title` + `description`), or forwarded to external providers. |
| `author` | `string` | Case-insensitive substring regex against `authors.name`. |
| `isbn` | `string` | Cleans hyphens; matches `identifiers.isbn13` or `identifiers.isbn10`. |
| `subject` | `string` | Case-insensitive substring regex against MongoDB `subjects` array. |
| `language` | `string` | Exact match against `publication.language` (e.g. `"en"`, `"es"`, `"fr"`). |
| `publisher` | `string` | Case-insensitive substring regex against `publication.publisher`. |
| `year_from` | `integer` | 4-digit integer (inclusive min year). Returns HTTP 400 if malformed. |
| `year_to` | `integer` | 4-digit integer (inclusive max year). Returns HTTP 400 if malformed. |
| `page` | `integer` | 1-indexed page number (default: 1, min: 1). Returns HTTP 400 if invalid. |
| `page_size` | `integer` | Number of items per page (default: 20, min: 1, max: 100). |

*Note on Sorting:* The Django backend does not expose a `sort` query parameter; MongoDB repository results default to creation/update order (`sort=[("_id", DESCENDING)]`). The React frontend executes client-side sorting (`relevance`, `title`, `date`) over the returned page results.

### 4. How Search Queries are Forwarded to Open Library
When local MongoDB search returns zero results for a text query on page 1 (`local["count"] < 1 and query and page == 1`):
1. `BookSearchService._fetch_from_providers(query, page)` executes the provider chain.
2. In `OpenLibraryProvider.search()`:
   ```text
   GET https://openlibrary.org/search.json?q={query}&fields=key,title,author_name,first_publish_year,publisher,isbn,subject,cover_i,language,number_of_pages_median&limit=20&offset={(page-1)*20}
   ```
   with a strict 8-second timeout (`DEFAULT_TIMEOUT = 8`).
3. Returned records are parsed and mapped into `NormalizedBook` dataclass instances.
4. Each normalized book is upserted into the MongoDB `books` collection via `repository.upsert_book(book)`.
5. The local MongoDB catalog is re-queried, returning newly synchronized books to the client.

### 5. Subject & Category Filtering Mechanism
- In `discovery/repository.py`:
  `filter_doc["subjects"] = {"$regex": subject, "$options": "i"}`
- Substring regex is executed across the MongoDB `subjects` string array.
- Open Library subjects (e.g. `["Fiction", "Philosophy", "Science Fiction"]`) are normalized into the `subjects` array during ingestion.

### 6. Language Filtering Mechanism
- In `discovery/repository.py`:
  `filter_doc["publication.language"] = language` (exact string match).
- Open Library language codes (e.g. `"eng"`, `"spa"`, `"ita"`) are ingested into `publication.language`.

### 7. Supported Sorting Options
- Server-side sorting is fixed to `[("_id", DESCENDING)]`.
- The frontend provides in-memory sorting over active results for `relevance`, `title` (A–Z), and `date` (newest first).

### 8. Pagination Structure
- 1-indexed pagination (`page=1`, `page=2`).
- Offset calculation: `skip = (page - 1) * page_size`.
- Response contains DRF pagination metadata:
  - `count`: Total matching folios in MongoDB.
  - `next`: Fully-qualified URL with incremented page parameter, or `null`.
  - `previous`: Fully-qualified URL with decremented page parameter, or `null`.

### 9. Response Envelope Schema
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/books/?q=Borges&page=2",
  "previous": null,
  "results": [
    {
      "id": "67340b12c8a4b9123456789a",
      "title": "Ficciones",
      "authors": ["Jorge Luis Borges"],
      "cover_url": "https://covers.openlibrary.org/b/id/11223344-L.jpg",
      "language": "es",
      "published_date": "1944",
      "rating": 4.9,
      "review_count": 12,
      "in_store": false
    }
  ]
}
```

### 10. Provider Failure Resilience
- In `OpenLibraryProvider`:
  - Network timeouts trigger `ProviderTimeoutError`.
  - HTTP 4xx/5xx errors trigger `ProviderError`.
- In `BookSearchService._fetch_from_providers`:
  - All provider exceptions are caught and logged (`logger.warning`).
  - Provider failure **never throws an HTTP 500 error to the client**.
  - If external providers are offline, the local MongoDB catalog results (even if 0) are returned cleanly as HTTP 200 (`{ "count": 0, "results": [] }`).

### 11. Normalization of Missing Covers and Metadata
- If `title` is missing: The document is dropped during normalization (`return None`).
- If `cover_i` is missing: `cover_urls` is empty, and `BookListItemSerializer.cover_url` returns `null`.
- In the React frontend, `BookCard` checks for `!book.cover_url || imageError` and renders the stylized Akashic `.fallbackCover` element (editorial gradient, `BookOpen` icon, "AKASHIC" inscription, and spine depth gradient in 2:3 aspect ratio).

### 12. Provider Priority Finding
- **CRITICAL BACKEND CODEBASE AUDIT FINDING:**  
  In `Akashic_Library/discovery/services.py` lines 39–43:
  ```python
  # Provider chain — order defines priority. Google Books first.
  _PROVIDERS = [
      GoogleBooksProvider(),
      OpenLibraryProvider(),
  ]
  ```
  The existing Django backend lists `GoogleBooksProvider` **first** and `OpenLibraryProvider` **second**.
  When `_fetch_from_providers` executes, if Google Books returns results, the provider chain stops early and does not query Open Library. Open Library is invoked whenever Google Books fails or returns zero items.
  *Per repository safety rules, backend code was left 100% untouched. This finding is formally documented for project contributors.*

---

## 3. Frontend Integration & API Mode Hardening

### 3.1. Environment Configuration
Configured in `frontend/.env` (and documented in `frontend/.env.example`):
```env
VITE_API_BASE_URL=/api
VITE_DISCOVERY_DATA_MODE=api
```
- Mode `api` instructs `getDiscoveryDataMode()` to make real HTTP requests to the Django backend.
- Using relative `/api` leverages the Vite development and preview proxy (`/api` -> `http://127.0.0.1:8000`), completely bypassing browser CORS restrictions and origin mismatches.

### 3.2. Elimination of Silent Fallbacks
In `frontend/src/services/discoveryService.ts`:
- In `api` mode, when the backend returns 0 results or encounters an HTTP error, the service returns honest empty data (`{ count: 0, next: null, previous: null, results: [] }`).
- Demo fixtures are strictly isolated to `demo` mode; they are **never silently substituted** into live API responses.

### 3.3. Demo Badge Suppression in API Mode
- `SearchResultsPage` conditionally renders the `Demo Preview Fixtures` badge only when `getDiscoveryDataMode() === 'demo'`.
- In `api` mode, the badge is automatically hidden.

---

## 4. Routing & Interaction Hardening

### 4.1. Case-Insensitive Genre Detail Matching
In `frontend/src/pages/Genres/GenreDetail.tsx`:
- Updated genre lookup to be case-insensitive:
  ```ts
  const genre: GenreInfo =
    APPROVED_GENRES.find(
      (g) =>
        g.id.toLowerCase() === genreId.toLowerCase() ||
        g.name.toLowerCase() === genreId.toLowerCase()
    ) ?? APPROVED_GENRES[0]!;
  ```
- Ensures URLs such as `?view=genre-detail&genre=philosophy`, `?genre=Philosophy`, or `?genre=fiction` resolve accurately without redirecting to Discover.

### 4.2. "Explore All Works" CTA Navigation
In `frontend/src/pages/Genres/GenreDetail.tsx`:
- The primary CTA button invokes `onSearchWithinGenre(genre.name, '')`.
- In `App.tsx`, `handleSearchWithinGenre` sets `view = 'search'`, updates `searchFilters.subject = genre.name`, resets `page = 1`, and updates the URL to `?view=search&subject=<genre>`, seamlessly transitioning into the search results view.

---

## 5. Automated Quality Gates

```text
Quality Gate       Tool              Command               Result
-------------------------------------------------------------------------
Typecheck          TypeScript        npm run typecheck     PASSED (0 errors)
Typecheck (Build)  TypeScript        tsc -b                PASSED (0 errors)
Linter             ESLint            npm run lint          PASSED (0 errors, 0 warnings)
Unit & Regr Tests  Vitest            npm run test          PASSED (12/12 suites, 68/68 tests)
Production Build   Vite              npm run build         PASSED (319 kB JS, 66 kB CSS in 1.0s)
```

---

## 6. Repository & Contributor Safety Audit

```bash
$ git branch --show-current
ragnar/frontend

$ git status --short
?? docs/Frontend_Docs/
?? docs/LOCAL_SETUP_AND_BACKEND_VERIFICATION_REPORT.md
?? docs/design-reference/
?? frontend/
```

- **Branch:** Preserved on `ragnar/frontend`.
- **Backend Safety:** Zero modifications to Django backend files, models, views, serializers, or migrations.
- **Tracked Files:** Clean working tree with no accidental modifications or deletions.
- **Environment:** `frontend/.env` remains strictly untracked and ignored.
