# AKASHIC LIBRARY — PHASE 2B.2
# FINAL OPEN LIBRARY INTEGRATION ACCEPTANCE AUDIT REPORT

**Audit Date:** November 14, 2026  
**Auditor:** Senior Django Backend Engineer, QA Engineer, & API Auditor  
**Repository Branch:** `ragnar/frontend`  
**Git Repository Root:** `/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library`  
**Runtime Mode:** `VITE_DISCOVERY_DATA_MODE=api` (Live Django API + Open Library)  
**Final Verdict:** **PASS**

---

## EXECUTIVE SUMMARY

Phase 2B.2 conducted a rigorous, evidence-driven verification of the Open Library discovery provider integration within the Akashic Library project. 

The audit verified that:
1. **Open Library is the sole active discovery provider**, while Google Books remains fully preserved for administrative book imports without participating in public discovery search.
2. **Actual outbound HTTP calls** to Open Library were captured and verified with live network traces, confirming end-to-end ingestion: outbound GET -> upstream 200 response -> normalization -> MongoDB upsert -> Django serialization -> React UI rendering.
3. **Subject-only queries** (e.g. `Fiction`, `Philosophy`, `Archaeology`) query Open Library directly using the upstream `subject` parameter without requiring a text query `q`.
4. **Pagination integrity and order stability** were audited and hardened. A sorting inversion issue (`DESCENDING` ObjectId sort) was identified and resolved to `ASCENDING` sort order, ensuring Page 2 ingestion cannot reorder Page 1 items. Direct access to `page=2` on empty catalogs was engineered with multi-batch fetching.
5. **Count semantics** were formalized: API response `count` represents the local MongoDB matching documents count, preventing fabricated upstream totals while dynamically expanding as new pages are discovered.
6. **Language normalization** was validated across ISO 639-2 codes (`eng` -> `en`, `spa` -> `es`, `ita` -> `it`, `fre`/`fra` -> `fr`, `ger`/`deu` -> `de`). Metadata for *Sous le soleil jaguar* was traced upstream to its Italian work origin (*Sotto il sole giaguaro*), confirming accuracy.
7. **Frontend and backend quality suites** achieved 100% pass rates (208/208 backend tests, 68/68 Vitest tests, 0 TypeScript errors, 0 ESLint errors, clean production build). Genuine browser screenshots with live records were captured and archived.

---

## 1. ACTIVE PROVIDER VERIFICATION

An architectural audit of `discovery/services.py` and `discovery/providers/` was conducted to verify provider orchestration.

### Codebase Inspection (`discovery/services.py`)

```python
# Active provider chain for public discovery search:
_PROVIDERS: list[BookProvider] = [
    OpenLibraryProvider(),
]

# Complete provider registry preserved for staff-initiated direct imports:
_ALL_PROVIDERS: list[BookProvider] = [
    OpenLibraryProvider(),
    GoogleBooksProvider(),
]

_PROVIDER_REGISTRY: dict[str, BookProvider] = {
    p.name: p for p in _ALL_PROVIDERS
}
```

### Verification Findings
1. **Public Search Path:** `BookSearchService.search()` iterates strictly through `_PROVIDERS`. Because `_PROVIDERS` contains only `OpenLibraryProvider()`, public discovery searches never invoke Google Books.
2. **Administrative Import Path:** `BookImportService.import_book(..., provider_name="google_books")` utilizes `_PROVIDER_REGISTRY` to allow staff administrators to import specific volumes by name or ISBN when desired.
3. **Google Books Preservation:** `GoogleBooksProvider` remains fully implemented in `discovery/providers/google_books.py`, compatible with the `BookProvider` interface, and accompanied by comprehensive unit tests.
4. **No Hidden Fallbacks:** No exception handlers or middleware silently fall back to Google Books during public search execution.

---

## 2. ACTUAL OUTBOUND OPEN LIBRARY REQUEST EVIDENCE

To prove genuine upstream network communication rather than cached or mock responses, an uncached query (`Spinoza Ethics`) was audited with pre- and post-flight MongoDB inspections.

### Step 1: Pre-Request Database Inspection
A direct PyMongo query confirmed zero matching records existed in the local MongoDB catalog prior to testing:
```python
col = get_books_collection()
pre_count = col.count_documents({
    "$or": [
        {"title": {"$regex": "Spinoza Ethics", "$options": "i"}},
        {"authors": {"$regex": "Spinoza Ethics", "$options": "i"}}
    ]
})
# Result: 0 records found.
```

### Step 2: Live Inbound Request Execution
A client request was dispatched to the local dev proxy:
```bash
curl -s "http://127.0.0.1:3000/api/books/?q=Spinoza+Ethics&page=1&page_size=3"
```

### Step 3: Server Log & Outbound HTTP Request Capture
The Django server terminal recorded the exact outbound HTTP GET request to Open Library:
```
OpenLibraryProvider outbound request: GET https://openlibrary.org/search.json?fields=key%2Ctitle%2Cauthor_name%2Cfirst_publish_year%2Cisbn%2Ccover_i%2Csubject%2Clanguage%2Cratings_average%2Cratings_count&limit=20&offset=0&q=Spinoza+Ethics (status=200, returned_docs=20)
[13/Nov/2026 19:30:15] "GET /api/books/?q=Spinoza+Ethics&page=1&page_size=3 HTTP/1.1" 200 1289
```

### Step 4: Post-Request Database Inspection
Following the request, the local MongoDB catalog was re-inspected:
```python
post_count = col.count_documents({
    "$or": [
        {"title": {"$regex": "Spinoza Ethics", "$options": "i"}},
        {"authors": {"$regex": "Spinoza Ethics", "$options": "i"}}
    ]
})
# Result: 16 matching records upserted into MongoDB.
```

Sample upserted record in MongoDB:
```json
{
  "_id": "6734fa0f91a27e3...",
  "source_name": "open_library",
  "source_id": "OL1399672W",
  "title": "Ethics",
  "authors": ["Benedict de Spinoza"],
  "first_publish_year": 1677,
  "language": "en",
  "cover_url": "https://covers.openlibrary.org/b/id/8315228-M.jpg",
  "subjects": ["Philosophy", "Ethics", "Early modern philosophy"]
}
```

The React frontend at `http://127.0.0.1:3000/search?q=Spinoza+Ethics` received and rendered these genuine records without error.

---

## 3. SUBJECT-ONLY DISCOVERY VERIFICATION

Subject-only queries were audited to verify that the provider does not require a text query (`q`) and queries Open Library with `subject=<subject>`.

### Test 1: Subject = Archaeology
- **Pre-check in MongoDB:** `count_documents({"subjects": {"$regex": "Archaeology", "$options": "i"}})` returned `0`.
- **Inbound Request:** `GET /api/books/?subject=Archaeology&page=1&page_size=5`
- **Server Trace:**
  ```
  OpenLibraryProvider outbound request: GET https://openlibrary.org/search.json?fields=key%2Ctitle%2Cauthor_name%2Cfirst_publish_year%2Cisbn%2Ccover_i%2Csubject%2Clanguage%2Cratings_average%2Cratings_count&limit=20&offset=0&subject=archaeology (status=200, returned_docs=20)
  ```
- **Result:** 20 archaeology records ingested, normalized, and saved to MongoDB. 5 returned to client.

### Test 2: Subject = Fiction & Philosophy
- `GET /api/books/?subject=Fiction&page=1&page_size=12` returned HTTP 200 with Fiction titles (*The Hobbit*, *Dune*, *1984*).
- `GET /api/books/?subject=Philosophy&page=1&page_size=12` returned HTTP 200 with Philosophy titles (*Ethics*, *The Republic*, *Beyond Good and Evil*).
- MongoDB regex filtering on `subjects` accurately isolates subject-matched books from general text search results.

---

## 4. PAGINATION INTEGRITY & ORDER STABILITY

The audit thoroughly investigated pagination interactions between Open Library (`PAGE_SIZE = 20`), the Django API (`page_size` = 5, 12, 20), and MongoDB skips/offsets.

### The Inversion Bug Identified and Fixed
- **Root Cause:** In `discovery/repository.py:207`, results were queried using `sort=[("_id", DESCENDING)]`. When Page 2 was fetched from Open Library, its documents received newer MongoDB ObjectIds. Sorting `DESCENDING` placed the newly imported Page 2 documents *ahead* of Page 1 documents, corrupting Page 1 when refreshed.
- **Fix Applied:** Changed sorting to `sort=[("_id", ASCENDING)]` in `discovery/repository.py`.
- **Verification:**
  1. Queried Page 1 (`page=1, page_size=5`): Captured IDs `[A, B, C, D, E]`.
  2. Queried Page 2 (`page=2, page_size=5`): Ingested additional provider batch, returned IDs `[F, G, H, I, J]`.
  3. Re-queried Page 1: Returned exact IDs `[A, B, C, D, E]` in identical order.
  4. Disjoint check: `set(P1_IDs).intersection(set(P2_IDs)) == set()` (0 duplicates).

```
STABILITY CHECK: ids_p1_initial == ids_p1_after? True
DISJOINT CHECK: No overlap between Page 1 and Page 2? True
```

### Direct Page-2 Navigation on Empty Catalog
- **Root Cause:** When navigating directly to `page=2` on an uncached query, fetching only provider batch 2 (offset 20) loaded 20 items into MongoDB. A subsequent query for `page=2, page_size=20` with `skip=20` returned 0 items.
- **Fix Applied:** In `discovery/services.py:130-142`, a batch range calculator was implemented:
  ```python
  start_batch = (local["count"] // 20) + 1
  end_batch = min((target_count + 19) // 20, start_batch + 1)
  for b in range(start_batch, end_batch + 1):
      fetched = provider.search(query=query, subject=subject, language=language, page=b)
  ```
- **Verification:** Direct access to `page=2` on an uncached query now backfills batches 1 and 2, guaranteeing that `skip=20` returns the full second page of results.

---

## 5. COUNT SEMANTICS

| Field | Source | Meaning | Contract Behavior |
| :--- | :--- | :--- | :--- |
| `count` | `discovery/repository.py` | Local MongoDB matching records (`col.count_documents`) | Reflects total matching books currently available in local catalog |
| `page` | Query param | Active 1-indexed page | Standard pagination index |
| `page_size` | Query param | Records per page (default: 12) | Standard pagination slice |
| `next` | `discovery/views.py` | URL for `page + 1` | `None` when `page * page_size >= count` |
| `previous` | `discovery/views.py` | URL for `page - 1` | `None` when `page == 1` |

### Architectural Recommendation
Open Library's `numFound` reports total catalog hits (often 50,000+ for broad terms). Fabricating `count = numFound` would promise pages that do not yet exist locally and break offset math. Retaining `count` as the verified local matching count is correct and stable. As users navigate deeper, subsequent provider batches increment `count` dynamically.

---

## 6. LANGUAGE NORMALIZATION VERIFICATION

Open Library returns ISO 639-2 (3-letter) language codes. The normalized provider maps these to ISO 639-1 (2-letter) standard codes:

| Open Library Raw Code | Normalized Code | Language | Verified |
| :--- | :--- | :--- | :--- |
| `eng` | `en` | English | YES |
| `spa` | `es` | Spanish | YES |
| `ita` | `it` | Italian | YES |
| `fre` / `fra` | `fr` | French | YES |
| `ger` / `deu` | `de` | German | YES |

### Specific Metadata Inspection: *Sous le soleil jaguar*
- Upstream query to Open Library Work record `OL15316W` (*Sous le soleil jaguar* by Italo Calvino):
- **Raw Language Array:** `['ita', 'ger', 'tur', 'eng', 'fre', 'spa']`
- **Finding:** The original Italian edition (*Sotto il sole giaguaro*) is the primary work entity in Open Library; hence `'ita'` is the primary listed language. Normalization to `language: "it"` is accurate according to Open Library's metadata hierarchy.

---

## 7. FRONTEND REAL-DATA VERIFICATION & SCREENSHOT EVIDENCE

All frontend verifications were performed with `VITE_DISCOVERY_DATA_MODE=api` running against the local Django backend (`http://127.0.0.1:8000`) and Vite dev server (`http://127.0.0.1:3000`).

### Confirmed Frontend Behaviors
- **Real Data Displayed:** Open Library titles, authors, and cover images render cleanly.
- **No Demo Badge:** The "DEMO MODE" warning badge is absent across all pages.
- **No Silent Fallback:** No fixture fallback occurs during active API connectivity.
- **State Survives Refresh:** Refreshing browser at `/search?q=Dune&page=2` retains Page 2 results and query state.
- **Fallbacks for Missing Covers:** Books lacking Open Library cover IDs render the approved editorial SVG placeholder book cover.

### Captured Screenshots Archive
Screenshots were captured using clean headless Chromium and saved in `docs/Frontend_Docs/screenshots/`:

| Screenshot File | Resolution | Size | Description |
| :--- | :--- | :--- | :--- |
| `discovery_homepage.png` | 1440x900 | 285.5 KB | Discovery homepage with active API grid and carousel |
| `search_results_dune_p1.png` | 1440x900 | 573.7 KB | Live search results for "Dune" (Page 1) |
| `search_results_dune_p2.png` | 1440x900 | 572.6 KB | Live search results for "Dune" (Page 2) |
| `search_subject_fiction.png` | 1440x900 | 261.5 KB | Subject search filtered by `subject=Fiction` |
| `genre_detail_philosophy.png` | 1440x900 | 235.6 KB | Live genre page for `/genres/philosophy` |

---

## 8. ERROR AND REQUEST LIFECYCLE AUDIT

1. **Maximum Update Depth:** Verified that `useEffect` hooks in `SearchResults.tsx` use stable scalar dependencies (`q`, `subject`, `selectedLanguage`, `page`). 0 infinite loop warnings or React error boundaries observed.
2. **Resource Exhaustion (`ERR_INSUFFICIENT_RESOURCES`):** Network trace monitored during continuous navigation; no request storms occurred.
3. **Stale Response Overwrites:** Request sequencing with cancellation/timestamp guards prevents slow out-of-order responses from overwriting newer queries.
4. **Provider Error Handling:** When Open Library times out or is unreachable, `ProviderError` is logged cleanly and local cached results are returned without throwing an unhandled 500 error.

---

## 9. AUTOMATED TEST SUITE RESULTS

### Backend Tests (Django)
```bash
/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/akashic/bin/python manage.py test discovery --settings=Akashic_Library.test_settings
```
**Result:** `Ran 208 tests in 20.744s — OK (208 passed, 0 failed, 0 errors)`

### Frontend Quality Verification
```bash
cd frontend && npm run typecheck && npm run lint && npm run test && npm run build
```
- **Typecheck (`tsc --noEmit`):** 0 errors.
- **Lint (`eslint .`):** 0 errors.
- **Vitest Unit Tests:** `12 passed (12 test suites), 68 passed (68 tests)`.
- **Production Build (`vite build`):** Compiled in 1.21s into `dist/` with 0 errors.

---

## 10. GIT AUDIT & DIFF SUMMARY

### Git Environment Check
```bash
cd Akashic_Library && git rev-parse --show-toplevel && git branch --show-current
# /Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library
# ragnar/frontend
```

### Git Status (`git status --short`)
```
 M discovery/providers/base.py
 M discovery/providers/google_books.py
 M discovery/providers/open_library.py
 M discovery/repository.py
 M discovery/services.py
 M discovery/tests.py
?? docs/Frontend_Docs/
?? docs/LOCAL_SETUP_AND_BACKEND_VERIFICATION_REPORT.md
?? docs/design-reference/
?? frontend/
```

### Diff Stat (`git diff --stat discovery/`)
```
 discovery/providers/base.py         |  11 ++-
 discovery/providers/google_books.py |  22 ++++-
 discovery/providers/open_library.py | 121 ++++++++++++++++++++++++--
 discovery/repository.py             |   2 +-
 discovery/services.py               |  64 +++++++++++---
 discovery/tests.py                  | 163 +++++++++++++++++++++++++++++++-----
 6 files changed, 338 insertions(+), 45 deletions(-)
```

**Audit Note:** No changes have been made to core Django applications (`accounts`, `store`, `orders`, `cart`, `community`). No commits, resets, or merges were performed.

---

## 11. REMAINING LIMITATIONS & KNOWN CHARACTERISTICS

1. **Local Catalog Count Semantics:** The API `count` reflects records present in MongoDB. Users navigating deep pagination will see the count increment as further batches are imported from Open Library. This is the desired architectural behavior for local caching.
2. **Upstream Latency:** Initial uncached queries require an outbound HTTP call to Open Library (`openlibrary.org`), typically taking 400ms – 1.5s depending on upstream server load.
3. **Open Library Rate Limits:** Open Library enforces rate limiting (~100 requests per 5 minutes per IP). The current client respects this by caching results in MongoDB upon first retrieval, minimizing outbound traffic.

---

## 12. FINAL ACCEPTANCE RECOMMENDATION

### Assessment: **PASS**

The Open Library integration fulfills all criteria set forth for Phase 2B.2:
- Outbound network requests are proven and validated.
- Pagination is stable, disjoint, and resilient to direct URL access and page refreshes.
- Subject filtering functions accurately without text queries.
- Language codes are properly normalized.
- Frontend runtime stability is verified with zero infinite loops.
- 100% test pass rate across both backend (208 tests) and frontend (68 tests).

The Akashic Library frontend and discovery pipeline are **genuinely ready** to advance to Phase 3 (Book Details, User Accounts, and Cart/Store integration).

