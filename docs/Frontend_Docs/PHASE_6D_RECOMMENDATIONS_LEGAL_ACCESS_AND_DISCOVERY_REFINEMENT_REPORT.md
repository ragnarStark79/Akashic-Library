# PHASE 6D: RECOMMENDATIONS INTEGRATION, LEGAL ACCESS CLASSIFICATIONS & DISCOVERY REFINEMENT REPORT
**Milestone:** Part I — Book Discovery, Reading and Community (Phase 6D)  
**Repository:** Akashic Library (`ragnar/frontend`)  
**Specification References:**  
- *Akashic Library Final Project Report (Updated)* — Section 24 (*Legal Access and Resource Classifications*), Section 18 (*Shelf Taxonomy & Paragraph 393*), and FR-04 (*Reading Shelves & Personal Sanctuary*).  
- *Phase 6A Product Audit & Gap Assessment* — Items GAP-REC-01, GAP-ACC-01, GAP-SHELF-01, and DEF-NAV-03.  
**Date:** November 15, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 6D successfully resolves the three interconnected discovery and access gaps identified in the Phase 6A Product Audit:
1. **Recommendations Service Activation:** The existing Django recommendation services (`GET /api/recommendations/` and `GET /api/recommendations/books/<book_id>/similar/`) have been connected end-to-end to the React application, surfacing personalized recommendations with transparent provenance reasons on the Discovery Home page, and kindred explorations on the Book Details page.
2. **The Six Legal Access Classifications:** The authoritative taxonomy specified in Section 24 of the Final Project Report has been implemented across the Django serializer layer, external link service, and Book Details page. Each verified access pathway (`OUR_STORE`, `EXTERNAL_PURCHASE`, `PREVIEW`, `BORROW`, `PUBLIC_DOMAIN`, `INFORMATION`) is rendered with appropriate badges, provider attribution, availability status, and URL safety verification.
3. **Reading Shelf Harmonization (`ABANDONED`):** Verified against FR-04 and Paragraph 393 of the Final Project Report, the `ABANDONED` shelf status ("Set Aside / Abandoned") has been added across Django backend schemas, repository validation, API endpoints, TypeScript definitions, Book Details shelf dropdowns, and Personal Library tabs/counts. Personalized recommendations respect this classification by omitting abandoned works from positive seed signals while excluding them from recommended folios.
4. **Discovery Home Anchor Target (`#recommendations`):** Resolved the dead footer link `Curated Recommendations` (`#recommendations`) by embedding a dedicated recommendations section in [DiscoveryHome.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.tsx) with smooth scroll anchoring. Authenticated patrons receive bespoke recommendations with explanation pills, while guest patrons receive an inviting archival sign-in prompt.

All changes strictly adhere to the Part I product boundary: no shopping carts, commercial checkout flows, or store navigation bars were activated.

---

## 2. Part I Boundary & Scope Compliance

As mandated by project governance:
- **Part I Isolation:** The feature set remains entirely within Part I (Book Discovery, Reading, and Community).
- **`OUR_STORE` Classification:** For works available in the bookstore inventory, the badge displays `"Akashic Bookstore • Available in Collection"` accompanied by an explicit informational note: *"Part I Archive Record — Physical bookstore inventory is listed for reference. Store checkout and orders will be enabled in Part II."* No dead purchase buttons, shopping carts, or payment routes were introduced.
- **Strict Git Branch Policy:** The repository remains strictly on branch `ragnar/frontend` with zero git commits, pushes, merges, stashes, or resets executed.

---

## 3. Architecture & Implementation Breakdown

### 3.1 Backend Data Model & Services

#### 3.1.1 Access Classifications Taxonomy
Created [constants.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/constants.py) defining `AccessClassification`:
- `OUR_STORE`: Physical inventory in the project bookstore (informational in Part I).
- `EXTERNAL_PURCHASE`: Commercial purchase links to legitimate publishers or retailers.
- `PREVIEW`: Digital excerpts and previews (e.g. Google Books Preview).
- `BORROW`: Digital lending via participating institutions (Internet Archive Lending).
- `PUBLIC_DOMAIN`: Source-verified public domain editions with jurisdiction attribution.
- `INFORMATION`: Catalogue concordance and reference records (Open Library, Goodreads).

#### 3.1.2 URL Security Sanitization
In [services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/services.py), implemented `_is_safe_url`:
- Validates that external URLs strictly use `http://` or `https://` schemes.
- Rejects non-HTTP schemes including `javascript:`, `data:`, `vbscript:`, and `file:`, preventing XSS and protocol smuggling.

#### 3.1.3 External Integration Service & Access Resolution
Enhanced `ExternalIntegrationService.get_access_options(book_or_id)` to evaluate:
- Store availability (`book.store.available == True`) -> Emits `OUR_STORE`.
- Google Books identifier (`google_books_id`) -> Emits `PREVIEW`.
- Internet Archive identifier (`internet_archive_id`) -> Emits `BORROW` or `PUBLIC_DOMAIN` based on copyright metadata.
- Open Library (`open_library_id` or `open_library_work_id`) -> Emits `INFORMATION`.
- Goodreads reference (`goodreads_id` or ISBN fallback) -> Emits `INFORMATION`.
- Retail purchase fallback (safe publisher or retailer link) -> Emits `EXTERNAL_PURCHASE`.

#### 3.1.4 Serializer Integration
Updated [serializers.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/serializers.py) and [discovery/serializers.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/serializers.py):
- Created `AccessOptionSerializer` defining fields `type`, `label`, `provider`, `url`, `availability`, `jurisdiction`, and `description`.
- Embedded `access_options` in `ExternalLinksSerializer` with `to_representation` ensuring historical empty responses pass existing contracts.
- Added `access_options = serializers.SerializerMethodField()` to `BookDetailSerializer` so that `GET /api/books/<book_id>/` directly returns verified access options without secondary round trips.

#### 3.1.5 Reading Shelf Harmonization (`ABANDONED`)
Updated [discovery/library_repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/library_repository.py):
- Extended `READING_STATUSES` to `("WANT_TO_READ", "READING", "READ", "ABANDONED")`.
- Updated `VALID_STATUSES` validation set.
- In `RecommendationService.get_personalized_recommendations`:
  ```python
  positive_entries = [
      entry["book_id"]
      for entry in library_entries
      if entry.get("status") != "ABANDONED"
  ]
  interacted_book_ids = set(favorites + [entry["book_id"] for entry in library_entries])
  preferred_seed_ids = set(favorites + positive_entries)
  ```
  `ABANDONED` folios are excluded from positive seed signals while still counted among interacted books excluded from future recommendations.

---

### 3.2 Frontend Architecture & Components

#### 3.2.1 TypeScript Types
In [types/discovery.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/types/discovery.ts) and [types/library.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/types/library.ts):
- Added `AccessClassification` and `AccessOption` interfaces.
- Extended `BookDetail` with `access_options?: AccessOption[]`.
- Defined `RecommendationBook`, `RecommendationResponse`, and `ExternalLinksResponse`.
- Extended `ReadingStatus` union to `'WANT_TO_READ' | 'READING' | 'READ' | 'ABANDONED'`.

#### 3.2.2 Recommendation Service
Created [services/recommendationService.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/services/recommendationService.ts):
- `fetchPersonalizedRecommendations(options)`: Requests `GET /api/recommendations/` with patron credentials.
- `fetchSimilarBooks(bookId, options)`: Requests `GET /api/recommendations/books/${bookId}/similar/`.
- `fetchExternalLinks(bookId, options)`: Requests `GET /api/recommendations/books/${bookId}/external/`.
- `normalizeRecommendationBook(item)`: Robustly handles author dictionaries (`[{name: "..."}]`), author string arrays, cover image normalization, and recommendation reason extraction.
- `isSafeExternalUrl(url)`: Client-side protocol validator ensuring external links only open `http://` or `https://` targets.

#### 3.2.3 Discovery Home Recommendations Section (`#recommendations`)
In [DiscoveryHome.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.tsx) and [DiscoveryHome.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.module.css):
- Positioned `#recommendations` section directly between "From the Archives" and "Wander Through the Archives".
- Configured `scroll-margin-top: 100px;` so anchor scrolling positions cleanly below the sticky navigation pill.
- **Authenticated State:** Renders grid of `BookCard` components with recommendation reason pills (`"Because you like related subjects"`, `"Popular in Akashic Library"`).
- **Guest State:** Displays an archival sanctuary card explaining how personal shelves curate bespoke reading horizons, complete with an `"Authenticate at Custodial Desk"` button invoking `onNavigateAuth`.
- **Navigation Anchor:** Connected in [App.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/App.tsx) so clicking `Curated Recommendations` in the footer switches view to `discover` (if needed) and smoothly scrolls to `#recommendations`.

#### 3.2.4 Book Details Access Options & Kindred Folios
In [BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/BookDetail/BookDetailPage.tsx) and [BookDetailPage.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/BookDetail/BookDetailPage.module.css):
- **Access & Reading Availability Card:** Renders verified access options in the left column with distinct classification badges (`badgeStore`, `badgePurchase`, `badgePreview`, `badgeBorrow`, `badgePublicDomain`, `badgeInfo`), provider attribution, availability status, jurisdiction notes, and safe external links (`target="_blank" rel="noopener noreferrer"`).
- **Scholarly Concordance:** Preserves baseline links to Open Library, Internet Archive, and WorldCat.
- **Kindred Folios:** Connected to `fetchSimilarBooks(book.id)`. Normalizes results and excludes current book ID. If empty or on error, smoothly falls back to `fetchRelatedBooks(book)` (subject search).
- **Shelf Dropdown:** Integrated `Set Aside / Abandoned` as the third option in the reading shelf menu, updating the main button label to `"Set Aside"` when shelved as `ABANDONED`.

#### 3.2.5 Personal Library `ABANDONED` Shelf
In [PersonalLibraryPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx) and [PersonalLibraryPage.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.module.css):
- Added fifth navigation tab: `Set Aside` with icon and badge count (`abandonedCount`).
- Added status badge styling `.statusAbandoned` (muted slate border and background).
- Added `<option value="ABANDONED">Set Aside</option>` to the shelf status select on each book card.

---

## 4. Verification Evidence & Test Results

### 4.1 Backend Django Test Suite
Ran full test suite using `Akashic_Library.test_settings`:

```bash
# 1. New Phase 6D Recommendations & Shelf Suite (7 tests)
python manage.py test recommendations.tests_phase6d --settings=Akashic_Library.test_settings
# Ran 7 tests in 1.487s -> OK

# 2. Complete Recommendations App Suite (30 tests)
python manage.py test recommendations --settings=Akashic_Library.test_settings
# Ran 30 tests in 7.213s -> OK

# 3. Complete Discovery App Suite (235 tests)
python manage.py test discovery --settings=Akashic_Library.test_settings
# Ran 235 tests in 31.990s -> OK
```

Key test cases verified in [recommendations/tests_phase6d.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/tests_phase6d.py):
1. `test_access_classification_constants_and_options_structure`: Verified all 6 legal access categories.
2. `test_unsafe_urls_rejected_in_access_options`: Verified rejection of `javascript:`, `data:`, and malformed URLs.
3. `test_multiple_access_options_coexist_honestly`: Verified multiple concurrent access paths without collision.
4. `test_access_options_in_external_links_serializer`: Verified serialization contract.
5. `test_shelf_status_abandoned_acceptance_and_persistence`: Verified POST to `/api/library/<book_id>/add/` with `status="ABANDONED"`.
6. `test_abandoned_books_excluded_from_positive_recommendation_seeds`: Verified negative seed filtering.
7. `test_similar_books_endpoint_integration`: Verified `GET /api/recommendations/books/<book_id>/similar/`.

### 4.2 Frontend Vitest & Build Verification
Ran full Vitest test suite and production build:

```bash
# TypeScript Typecheck
npm --prefix frontend run typecheck
# tsc --noEmit -> Exit 0 (0 errors)

# ESLint
npm --prefix frontend run lint
# eslint . -> Exit 0 (0 errors)

# Full Test Suite (26 test files)
npm --prefix frontend test -- --run
# Test Files: 26 passed (26)
# Tests:      220 passed (220)
# Duration:   7.42s -> OK

# Production Build
npm --prefix frontend run build
# tsc -b && vite build -> built in 1.48s (0 errors)
```

Key test suites created/verified:
- [recommendationService.test.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/services/recommendationService.test.ts): 9/9 tests passed (URL safety, data normalization, demo endpoints).
- [DiscoveryHome.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.test.tsx): 4/4 tests passed (guest card, authenticated recommendations, query chips).
- [BookDetailPage.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/BookDetail/BookDetailPage.test.tsx): 25/25 tests passed (Kindred folios, access options, shelf dropdown).
- [PersonalLibraryPage.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.test.tsx): 10/10 tests passed (`Set Aside` tab, `ABANDONED` badge, filtering).

---

## 5. Live Browser Verification & Photographic Evidence

Verification was conducted using Chrome DevTools with both the Django REST backend (port 8000) and the Vite frontend (port 5173) active.

All screenshots are stored in [Akashic_Library/docs/Frontend_Docs/screenshots/](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/):

| Screenshot File | Resolution | Description & Verified Elements |
|---|---|---|
| [phase6d_01_discovery_recommendations_guest.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d_01_discovery_recommendations_guest.png) | 1440x900 | Discovery Home `#recommendations` guest state: Archival sanctuary card, honest explanation, and *"Authenticate at Custodial Desk"* CTA. |
| [phase6d_02_discovery_recommendations_authenticated.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d_02_discovery_recommendations_authenticated.png) | 1440x900 | Discovery Home `#recommendations` authenticated state: Bespoke recommendations for patron with provenance tags (*"Popular in Akashic Library"*). |
| [phase6d_03_book_details_access_options.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d_03_book_details_access_options.png) | 1440x900 | Book Details: Legal Access & Reading Options card (Open Library, Goodreads records, WorldCat concordance) and reading shelf dropdown with `Set Aside / Abandoned`. |
| [phase6d_04_book_details_kindred_folios.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d_04_book_details_kindred_folios.png) | 1440x900 | Book Details: Kindred Explorations carousel powered by `fetchSimilarBooks`. |
| [phase6d_05_personal_library_abandoned_tab.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d_05_personal_library_abandoned_tab.png) | 1440x900 | Personal Library: Dedicated `Set Aside 1` tab filtering folios shelved under `ABANDONED`, showing `SET ASIDE / ABANDONED` badge and `Set Aside` select option. |

---

## 6. Audit Gap Resolution Matrix

| Audit Item | Description | Resolution in Phase 6D | Status |
|---|---|---|---|
| **GAP-REC-01** | Recommendation endpoints disconnected from frontend | Connected `GET /api/recommendations/` to Discovery Home and `GET /api/recommendations/books/<book_id>/similar/` to Book Details. | **RESOLVED** |
| **GAP-ACC-01** | Missing six legal access classifications | Implemented `OUR_STORE`, `EXTERNAL_PURCHASE`, `PREVIEW`, `BORROW`, `PUBLIC_DOMAIN`, and `INFORMATION` across backend and frontend with URL security validation. | **RESOLVED** |
| **GAP-SHELF-01** | `ABANDONED` shelf missing from frontend and negative seed logic | Implemented `ABANDONED` across backend allowed values, serializers, TypeScript types, Book Details shelf dropdown, Personal Library tab, and recommendation negative seed exclusions. | **RESOLVED** |
| **DEF-NAV-03** | Footer link `#recommendations` dead anchor | Added `#recommendations` section in Discovery Home with responsive scroll margin offset and routing support. | **RESOLVED** |

---

## 7. Conclusion

Phase 6D is complete and verified across unit tests, integration test suites, production build validation, and live browser testing. Part I now possesses an integrated, transparent recommendation architecture and source-verified legal access classification system, fully upholding the standards of the Akashic Library project.
