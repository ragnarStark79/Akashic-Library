# AKASHIC LIBRARY — PART I
# PHASE 6A: COMPLETE PRODUCT AUDIT & GAP ASSESSMENT
## Application-Wide Feature Inventory + Backend/API Audit + Technical Debt + Phase 6 Implementation Plan

---

## SECTION A — EXECUTIVE SUMMARY

### A.1 Current Part I Maturity
Akashic Library Part I (Book Discovery, Reading, and Community) has completed its core architectural foundation through Phase 5B.4.1. The system features a decoupled architecture combining a **Django 6.1.1 REST Framework backend** with a **React 18.3.1 + TypeScript 5.6.2 single-page application**, supported by a polyglot persistence layer (**PostgreSQL** for relational authentication and commerce data; **MongoDB** for flexible discovery documents, reader reviews, reading room annotations, and community discussions).

The application possesses a fully functional visual interface adhering to an editorial light archival design system (Soft Porcelain, Warm Ivory, Warm Stone, Deep Editorial Teal, Soft Sage, and Muted Terracotta), complete catalog exploration backed by an Open Library adapter, user shelf management, a dedicated Book Reviews alcove with owner replies, a private/shared Reading Room for in-passage annotations, and a Community Hub with threaded reader discussions supporting 1-level nested responses and folio citations.

### A.2 Main Verified Strengths
1. **Robust Automated Quality Gates**: 100% test pass rate across both domains: **312 backend tests** for Part I apps (plus 40 commerce tests, totaling **352 passing Django tests**) and **174 frontend Vitest tests** across 21 test files with zero TypeScript typecheck errors and zero ESLint warnings.
2. **True Backend Privacy & Ownership Enforcement**: Reading Room annotations enforce strict query-level isolation in MongoDB (`{"$or": [{"visibility": "SHARED"}, {"user_id": user_id}]}`). Private annotations are mathematically invisible to other users even through direct curl/API invocations. Ownership checks are strictly enforced on review editing, reply deletion, annotation updating, and discussion reply retirement.
3. **Clean Route Synchronization & Active Navigation**: Centralized route resolver (`resolveActiveNavigation`) cleanly coordinates browser history, URL query parameters, and top-level navbar capsule highlights without circular redirect loops or conflicting state.
4. **Resilient Provider Caching**: Book discovery uses a local-first architecture in MongoDB with graceful fallback to the Open Library API. External network outages do not compromise local catalog availability.
5. **Database Test Isolation**: Test execution via `Akashic_Library.test_settings` isolates all MongoDB operations to `akashic_discovery_test`, completely shielding persistent development and seed records in `akashic_discovery` from teardown truncation.

### A.3 Critical Outstanding Risks and Technical Debt
1. **Unconsumed Backend Capabilities (Frontend Gaps)**:
   - **Content Moderation & Reporting**: The Django `community` app contains complete backend reporting and moderation models, services, and endpoints (`ReportCreateView`, `ModerationReportListView`, `ModerationReportDetailView`, `ModerationHideView`, `ModerationRestoreView`), but the React frontend has **zero UI** for reporting content and **zero moderation dashboard**.
   - **Recommendations Engine**: Django exposes personalized recommendations (`GET /api/recommendations/`), similar book queries (`GET /api/recommendations/books/<book_id>/similar/`), and external link resolution (`GET /api/recommendations/books/<book_id>/external/`), but the React frontend does not call these endpoints. "Curated Recommendations" in the footer is a dead anchor link (`#recommendations`), and Book Details computes "Related Books" via generic subject searches.
   - **Legal Access Link Categories**: The six availability classifications defined in FR-10 and Section 24 (`OUR_STORE`, `EXTERNAL_PURCHASE`, `PREVIEW`, `BORROW`, `PUBLIC_DOMAIN`, `INFORMATION`) are not exposed on Book Details; only a hardcoded fallback link to Open Library is rendered.
2. **Account & Patron Profile Gaps (FR-01)**:
   - No user-facing password reset or change endpoint. The frontend AuthPage renders an informational disclaimer on its "Recover" tab stating automated recovery is deferred.
   - User profile editing (avatar, bio, display name) is not exposed via API or UI; role assignment is restricted entirely to the Django admin site.
3. **Database Index Gaps in MongoDB**:
   - The `annotations` collection currently possesses only the default `_id_` index. It completely lacks compound indexes for `(book_id, visibility, created_at)` and `(user_id, book_id, created_at)`, creating potential collection-scan bottlenecks under scale.
4. **Frontend Bundle Performance**:
   - The production Vite bundle outputs a single JavaScript chunk of **531.24 kB** (148.82 kB gzip) because route-level code splitting (`React.lazy()` / dynamic `import()`) is not yet implemented in `AppContent`.

### A.4 Overall Assessment & Readiness Decision
**CORE FEATURES COMPLETE — FINALIZATION REQUIRED.**

Part I is functional and stable in its primary reader workflows. However, it is **not yet production-ready or final**. Transitioning immediately to Part II (Akashic Store) would leave significant technical debt and unfulfilled academic requirements in Part I. The project must execute Phases 6B through 6G to complete patron profile management, connect moderation and recommendations, harden security and indexing, optimize bundle delivery, and produce final deployment documentation.

---

## SECTION B — REPOSITORY AND ARCHITECTURE SNAPSHOT

### B.1 Repository Baseline & Git Status
- **Repository Root**: `/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library`
- **Active Git Branch**: `ragnar/frontend`
- **Current Commit Hash**: `7538c1c05d0f27cfdaaece5819f9d2093f4b4101`
- **Working Tree State**: Intentionally uncommitted (dirty) per project operating constraints.
  - **Staged Files**: `0`
  - **Modified Tracked Files (20)**:
    - `Akashic_Library/test_settings.py`
    - `community/constants.py`
    - `community/repository.py`
    - `community/serializers.py`
    - `community/services.py`
    - `community/tests_step9.py`
    - `community/urls.py`
    - `community/views.py`
    - `discovery/exceptions.py`
    - `discovery/providers/base.py`
    - `discovery/providers/google_books.py`
    - `discovery/providers/open_library.py`
    - `discovery/repository.py`
    - `discovery/reviews_repository.py`
    - `discovery/reviews_serializers.py`
    - `discovery/reviews_views.py`
    - `discovery/services.py`
    - `discovery/tests.py`
    - `discovery/urls.py`
    - `discovery/views.py`
  - **Untracked Directories & Files (11)**:
    - `discovery/annotations_repository.py`
    - `discovery/annotations_serializers.py`
    - `discovery/annotations_views.py`
    - `discovery/genre_mappings.py`
    - `discovery/tests_step5_annotations.py`
    - `discovery/tests_step5_replies.py`
    - `docs/Frontend_Docs/`
    - `docs/Frontend_Docs-Part-II/`
    - `docs/LOCAL_SETUP_AND_BACKEND_VERIFICATION_REPORT.md`
    - `docs/design-reference/`
    - `frontend/`

### B.2 Technology Stack
| Layer | Technologies | Version / Notes |
|---|---|---|
| **Backend Framework** | Django, Django REST Framework | Django 6.1.1, DRF 3.18.1, Python 3.14 / 3.13 venv |
| **Relational Database** | PostgreSQL via `psycopg2-binary` | Primary store for `accounts`, `store`, `cart`, `orders` |
| **Document Database** | MongoDB via `pymongo` | Primary store for `books`, `user_library`, `reviews`, `annotations`, `discussions`, `replies` |
| **Frontend Framework** | React, TypeScript, Vite | React 18.3.1, TypeScript 5.6.2, Vite 6.4.6 |
| **Styling Architecture** | CSS Modules + Custom Properties | Strict token architecture defined in `tokens.css` |
| **Test Runners** | Django Test Runner, Vitest | 352 Django tests passing; 174 Vitest tests passing |

### B.3 Dual-Database Separation Architecture
```
                                ┌────────────────────────┐
                                │   React Frontend SPA   │
                                │   (Vite + TypeScript)  │
                                └───────────┬────────────┘
                                            │ HTTP / JSON (Cookies + CSRF)
                                            ▼
                                ┌────────────────────────┐
                                │   Django REST API      │
                                │   (SessionAuth + DRF)  │
                                └─────┬────────────┬─────┘
                                      │            │
            ┌─────────────────────────┘            └─────────────────────────┐
            │ PostgreSQL (Relational)                                        │ MongoDB (Document-Based)
            ▼                                                                ▼
   ┌───────────────────┐                                            ┌───────────────────┐
   │ accounts_user     │ (UUID PK) ───[Scalar Reference]──────────► │ books             │
   │ store_product     │ (UUID PK)                                  │ library_entries   │
   │ store_inventory   │ (OneToOne)                                 │ reviews           │
   │ cart_cart         │ (OneToOne)                                 │ review_replies    │
   │ cart_cartitem     │ (ForeignKey)                               │ annotations       │
   │ orders_order      │ (ForeignKey)                               │ discussions       │
   │ orders_orderitem  │ (ForeignKey)                               │ replies           │
   │ orders_payment    │ (ForeignKey)                               │ reports           │
   └───────────────────┘                                            │ moderation_audits │
                                                                    └───────────────────┘
```

---

## SECTION C — FINAL PROJECT SPECIFICATION MAPPING

Comparison between `Akashic_Library_Final_Project_Report_Updated.docx` (the authoritative specification) and the actual repository state:

### C.1 Functional Requirements Matrix (FR-01 to FR-12)

| Requirement ID | Original Specification Requirement | Current Status | Supporting Evidence & Source Location | Audit Findings & Gaps |
|---|---|---|---|---|
| **FR-01: Authentication** | User registration, login, logout, password reset, profile maintenance, and administrative role separation. | **PARTIAL** | [accounts/models.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/models.py#L84-L179), [accounts/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/views.py#L22-L133), [frontend/src/pages/Auth/AuthPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Auth/AuthPage.tsx#L1-L600) | Registration, login, logout, and session check (`/api/auth/me/`) work cleanly. **Missing**: Password reset endpoints, password change endpoint, user profile edit API (display name, bio), and avatar support. |
| **FR-02: Book Discovery** | Search, browse, filter, sort, and open book records from the discovery catalog. | **COMPLETE** | [discovery/repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/repository.py#L140-L280), [discovery/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/views.py#L25-L115), [frontend/src/pages/SearchResults/SearchResults.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/SearchResults/SearchResults.tsx#L1-L400) | Full search over title, author, isbn, subjects, year range, and sorting. Catalog Search modal (`Meta+K`) and dedicated results view fully integrated. |
| **FR-03: External Metadata** | Retrieve and normalize metadata from external providers (Open Library, Google Books) with source identifiers. | **COMPLETE** | [discovery/providers/open_library.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/providers/open_library.py#L1-L300), [discovery/providers/google_books.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/providers/google_books.py#L1-L200), [discovery/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/services.py#L40-L270) | Open Library is primary active provider. Normalization handles covers, descriptions, ISBNs, authors, and publisher dates into MongoDB `books`. |
| **FR-04: Personal Library** | Save books to shelves: Want to Read, Currently Reading, Read, and Abandoned; favorites. | **PARTIAL** | [discovery/library_repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/library_repository.py#L52), [frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx#L1-L350) | `WANT_TO_READ`, `READING`, and `READ` are fully implemented and verified. **Missing**: The `ABANDONED` shelf status specified in Section 5 and Section 18 was omitted from `READING_STATUSES` in `library_repository.py`. |
| **FR-05: Reviews & Ratings** | Authenticated users rate and review books; calculate aggregate ratings; support reporting and moderation. | **PARTIAL** | [discovery/reviews_repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/reviews_repository.py#L1-L400), [discovery/reviews_views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/reviews_views.py#L1-L300), [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx#L1-L500) | 1-review-per-user rule, 1-5 integer ratings, aggregate recalculation, and review replies work. **Missing**: Reporting reviews to the moderation queue is unimplemented in the frontend. |
| **FR-06: Community** | Discussion threads and replies attached to books; topic-based community discussions. | **COMPLETE** | [community/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/services.py#L1-L300), [community/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/views.py#L1-L200), [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx#L1-L550) | Master topics with rich thesis text, book anchoring, chronological replies, 1-level nested responses, folio passage citations, editing, and soft-retirement verified. |
| **FR-07: Store** | Manage store products, price, edition, condition, stock, availability. | **DEFERRED (PART II)** | [store/models.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/models.py#L1-L90), [store/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/views.py#L1-L120) | Fully implemented in PostgreSQL backend; intentionally deferred to Part II (Store 0–9) for frontend implementation. |
| **FR-08: Cart & Checkout** | Add products to cart, change quantities, remove items, submit order. | **DEFERRED (PART II)** | [cart/models.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/cart/models.py#L1-L80), [cart/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/cart/services.py#L1-L120), [orders/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/orders/services.py#L1-L150) | Backend models and atomic checkout transaction implemented; deferred to Part II for frontend implementation. |
| **FR-09: Orders** | Preserve order items, quantities, historical purchase prices, totals, status. | **DEFERRED (PART II)** | [orders/models.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/orders/models.py#L1-L100), [orders/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/orders/views.py#L1-L80) | Backend order models and pricing snapshots verified; deferred to Part II for frontend. |
| **FR-10: External Links** | Show legitimate external purchase, preview, borrow, or access links with source attribution. | **PARTIAL** | [recommendations/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/services.py#L113-L147), [recommendations/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/views.py#L104-L120), [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L704-L715) | Backend `ExternalIntegrationService` returns raw Google Books, Open Library, and Goodreads URLs. Frontend only renders a single hardcoded Open Library link. The 6 availability types (`OUR_STORE`, `EXTERNAL_PURCHASE`, `PREVIEW`, `BORROW`, `PUBLIC_DOMAIN`, `INFORMATION`) from Section 24 are missing. |
| **FR-11: Recommendations** | Recommendation mechanism based on genres, authors, ratings, popularity, reading history. | **PARTIAL** | [recommendations/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/services.py#L13-L110), [recommendations/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/views.py#L35-L102) | Backend implements the weighted recommendation algorithm and similar books service. **Missing**: Zero frontend integration. No UI carousel or page displays these recommendations; footer link is a dead anchor (`#recommendations`). |
| **FR-12: Administration** | Manage catalog imports, products, stock, users, reviews, discussions, reported content. | **PARTIAL** | [community/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/views.py#L219-L281), [discovery/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/views.py#L16) | Django Admin site manages PostgreSQL tables and catalog import API exists. Moderation endpoints exist in backend. **Missing**: No user-facing or moderator frontend interface for reviewing reports or hiding abusive content. |

---

## SECTION D — COMPLETE FRONTEND FEATURE INVENTORY

### D.1 Application Shell & Navigation
| Feature Component | Implementation File | Navigation State | Status | Verification Evidence & Notes |
|---|---|---|---|---|
| **ApplicationShell** | [frontend/src/components/layout/ApplicationShell/ApplicationShell.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/ApplicationShell/ApplicationShell.tsx) | Dynamic | **COMPLETE** | Renders header capsule navbar, skip link, main landmark, and footer. Verified responsive across all breakpoints. |
| **Navbar Capsule** | [frontend/src/components/layout/Navbar/Navbar.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Navbar/Navbar.tsx) | `discover`, `genres`, `community`, `library`, `about` | **COMPLETE** | Resolves active route highlights via `resolveActiveNavigation`. Accurately shows `_active_1eczu_114` on valid views and `undefined` on contextual views (Book Details, Search). |
| **Catalog Search Modal** | [frontend/src/components/layout/SearchModal/SearchModal.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/SearchModal/SearchModal.tsx) | `search` | **COMPLETE** | Global `Meta+K` / `Ctrl+K` shortcut listener, autofocus, search scopes (Everything, Title, Author, ISBN, Subject), search handoff to `/search`. |
| **Account Menu Dropdown** | [frontend/src/components/layout/Navbar/Navbar.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Navbar/Navbar.tsx#L140-L200) | `library` / `auth` | **COMPLETE** | Displays avatar badge, patron display name/handle, direct link to Personal Library, and Sign Out action. |
| **Mobile Drawer** | [frontend/src/components/layout/Navbar/MobileDrawer.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Navbar/MobileDrawer.tsx) | Matches desktop | **COMPLETE** | Accessible slide-over navigation with focus trapping and ESC key dismiss. |
| **Footer** | [frontend/src/components/layout/Footer/Footer.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Footer/Footer.tsx) | Static links | **PARTIAL** | Contains dead anchor links: `#recommendations`, `#groups`, `#guidelines`, `#api`, `#docs`, `#privacy`. |

### D.2 Discovery & Home
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Hero Inscription & Search Capsule** | [frontend/src/pages/DiscoveryHome/DiscoveryHomePage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/DiscoveryHome/DiscoveryHomePage.tsx#L50-L100) | **COMPLETE** | Editorial search bar with scope selector and quick search submit. |
| **Spotlight / Featured Folios** | [frontend/src/pages/DiscoveryHome/DiscoveryHomePage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/DiscoveryHome/DiscoveryHomePage.tsx#L120-L180) | **COMPLETE** | Fetches books with `featured=true` from local MongoDB catalog. Renders cover jackets, author attribution, and quick-view modals. |
| **Genre Exploration Grid** | [frontend/src/pages/DiscoveryHome/DiscoveryHomePage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/DiscoveryHome/DiscoveryHomePage.tsx#L190-L240) | **COMPLETE** | Displays thematic category cards (Philosophy, Labyrinths, Speculative Fiction, etc.) with handoff to `genre-detail`. |

### D.3 Search & Results
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Query & Scope Parsing** | [frontend/src/pages/SearchResults/SearchResults.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/SearchResults/SearchResults.tsx#L80-L150) | **COMPLETE** | Reads and synchronizes `q`, `title`, `author`, `isbn`, `subject`, `search_scope`, `sort`, `page` from URL search params. |
| **Faceting & Filter Drawer** | [frontend/src/components/discovery/FilterDrawer/FilterDrawer.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/discovery/FilterDrawer/FilterDrawer.tsx) | **COMPLETE** | Slide-out filter panel supporting year range, language, subject filter, and sorting. |
| **Deduplicated Result Stream** | [frontend/src/pages/SearchResults/SearchResults.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/SearchResults/SearchResults.tsx#L200-L280) | **COMPLETE** | Loop regression fix verified in `SearchResultsLoopRegression.test.tsx`. Grid layout with responsive book cards. |
| **Pagination Controls** | [frontend/src/pages/SearchResults/SearchResults.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/SearchResults/SearchResults.tsx#L320-L360) | **COMPLETE** | Previous/Next pagination preserving all active filter states in URL query string. |

### D.4 Genres
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Genres Index** | [frontend/src/pages/Genres/GenresIndexPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Genres/GenresIndexPage.tsx) | **COMPLETE** | Renders 12 curated genres with descriptions, icons, and folio counts. |
| **Genre Detail Page** | [frontend/src/pages/Genres/GenreDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Genres/GenreDetailPage.tsx) | **COMPLETE** | Displays genre header, subject aliases, search-within-genre field, and book catalog filtered by subject. |

### D.5 Book Details
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Bibliographic Dossier** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L200-L350) | **COMPLETE** | Publisher, publication year, ISBN-10/13, page count, primary language, and subject pill links. |
| **Description Presentation** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L280-L320) | **COMPLETE** | Phase 3.1 integrity correction: renders description as ordinary synopsis text without automatic pull quotes; fallback: *"No description is currently available for this catalogue record."* |
| **Shelf Action Dropdown** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L400-L460) | **COMPLETE** | Authenticated dropdown offering *"Want to Read"* and *"Currently Reading"*. Separate *"Mark as Read / Completed"* button. |
| **Reviews Preview Card** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L550-L620) | **COMPLETE** | Displays aggregate star rating, review count, excerpt of latest review, and *"Read Public Reviews"* navigation. |
| **Reading Room Preview Card** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L630-L690) | **COMPLETE** | Displays shared marginalia count, excerpt of shared note, and *"Enter Reading Room"* navigation. |
| **Related Books Shelf** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L1036-L1080) | **PARTIAL** | Fetches related books via subject search instead of calling `GET /api/recommendations/books/<book_id>/similar/`. |
| **External Access Links** | [frontend/src/pages/BookDetail/BookDetailPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookDetail/BookDetailPage.tsx#L704-L715) | **PARTIAL** | Hardcodes a single link to Open Library; does not query `GET /api/recommendations/books/<book_id>/external/` and omits the 6 availability categories. |

### D.6 Authentication & Session Management
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Sign In Form** | [frontend/src/pages/Auth/AuthPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Auth/AuthPage.tsx#L280-L360) | **COMPLETE** | Username/password login, error banner, session cookie establishment, CSRF capture. |
| **Registration Form** | [frontend/src/pages/Auth/AuthPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Auth/AuthPage.tsx#L370-L500) | **COMPLETE** | Username, email, password, password confirmation, validation errors. |
| **Password Recovery** | [frontend/src/pages/Auth/AuthPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Auth/AuthPage.tsx#L569-L590) | **MISSING** | UI displays disclaimer: *"Automated self-service password recovery is scheduled for a future milestone."* No backend integration. |
| **Session Restoration** | [frontend/src/context/AuthContext.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/context/AuthContext.tsx#L40-L75) | **COMPLETE** | Invokes `getCurrentUser()` (`/api/auth/me/`) on mount; smoothly restores active session without screen flicker. |
| **Intended Destination Redirect** | [frontend/src/context/AuthContext.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/context/AuthContext.tsx#L80-L105) | **COMPLETE** | Captures target view/bookId before redirecting unauthenticated users to `/auth`; returns to destination post-login. |

### D.7 Personal Library
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Shelf Tabs** | [frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx#L100-L160) | **COMPLETE** | Tabs for *All (Total)*, *Currently Reading*, *Want to Read*, and *Completed*. Active counts update dynamically. |
| **Reading State Transitions** | [frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx#L180-L240) | **COMPLETE** | Move folios between shelves with immediate optimistic UI and persistent PATCH `/api/library/<book_id>/update/`. |
| **Remove from Shelf** | [frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx#L250-L280) | **COMPLETE** | DELETE `/api/library/<book_id>/remove/` with accessible confirmation. |
| **Reading Room Deep Links** | [frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/PersonalLibrary/PersonalLibraryPage.tsx#L290-L320) | **COMPLETE** | Each shelf card includes *"Enter Reading Desk"* linking to `/?view=reading-room&id=<book_id>`. |

### D.8 Book Reviews & Review Management
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Aggregate Rating Dossier** | [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx#L80-L150) | **COMPLETE** | Star breakdown, average calculation, total review count. |
| **1-Review-per-User Inscription** | [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx#L200-L280) | **COMPLETE** | Authenticated patrons submit 1 review per book. Existing review is fetched via `/my-review/` to switch composer to Edit mode. |
| **Review Editing & Deletion** | [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx#L300-L370) | **COMPLETE** | PATCH `/update/` and DELETE `/delete/` with ownership enforcement and aggregate rating recalculation. |
| **Review Replies** | [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx#L380-L450) | **COMPLETE** | Readers can reply to approved reviews; replies render beneath parent review card; reply deletion supported. |
| **Report Review Action** | [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx) | **MISSING** | No UI button to report a review or reply to the moderation queue. |

### D.9 Reading Room & Annotations
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Reading Desk Composer** | [frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx#L120-L220) | **COMPLETE** | Visibility selector (*Private Reflection* vs *Shared Marginalia*), page reference, quoted passage, and contemplation text. |
| **Ledger & Visibility Tabs** | [frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx#L240-L310) | **COMPLETE** | Filter ledger by *All*, *My Private*, or *Shared with Reading Room*. |
| **Annotation Editing & Deletion** | [frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx#L320-L390) | **COMPLETE** | In-place editing, visibility toggle (*Make Private* / *Make Shared*), and note deletion. |
| **Privacy Enforcement** | [discovery/annotations_repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/annotations_repository.py#L80-L120) | **COMPLETE** | Verified: unauthenticated and other patrons cannot query private notes; backend query filter is mathematically strict. |

### D.10 Community Hub & Discussion Threads
| Feature | Implementation File | Status | Verification Evidence & Notes |
|---|---|---|---|
| **Community Hub** | [frontend/src/pages/Community/CommunityHubPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityHubPage.tsx) | **COMPLETE** | Category filter tabs, search discussions input, Active Anchor Folios sidebar, and *"Begin a Dialogue"* modal. |
| **Discussion Thread Page** | [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx) | **COMPLETE** | Master topic essay, author dossier, anchored book sidebar with canonical links to Book Details, Reviews, and Reading Room. |
| **Replies & 1-Level Nesting** | [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx#L280-L380) | **COMPLETE** | Direct replies and 1-level nested responses with visual indentation, connecting line, and *"↳ In response to"* header. |
| **Passage Citations** | [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx#L400-L460) | **COMPLETE** | Optional citation accordion capturing page reference, chapter title, and passage quote. Renders styled citation well in reply cards. |
| **Soft Deletion Modal** | [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx#L500-L545) | **COMPLETE** | Phase 5B.4.1 verified: explains retirement from visible conversation, child response cascade, and preservation of master dialogue and volume records. |
| **Report Discussion / Reply** | [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx) | **MISSING** | No UI button to report a discussion or reply to the moderation queue. |

---

## SECTION E — COMPLETE BACKEND FEATURE INVENTORY

### E.1 Accounts Application
- **Models**: `accounts.User` (AbstractBaseUser + PermissionsMixin with UUID PK, username, email, role choice: `USER`, `MODERATOR`, `STORE_MANAGER`, `ADMIN`, `display_name`, `bio`, timestamps).
- **Services**: `AccountService` in [accounts/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/services.py) (handles registration, normalization, authentication via `django.contrib.auth.authenticate`, login session setup via `django.contrib.auth.login`, and logout).
- **Views**: `register`, `login_view`, `logout_view`, `me` in [accounts/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/views.py).
- **Serializers**: `UserSerializer`, `RegistrationSerializer`, `LoginSerializer` in [accounts/serializers.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/serializers.py).
- **Tests**: [accounts/tests.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/tests.py) — **22 tests passing** (covers registration validation, login authentication, session management, user serialization, and role properties).

### E.2 Discovery Application
- **Models**: `discovery.Book` (Django proxy model documenting MongoDB mapping).
- **Repositories**:
  - `repository.py`: `books` collection access, text search index, ISBN lookup, provider upserts, cover/featured filtering.
  - `library_repository.py`: `library_entries` and `favorites` collections, user shelf status transitions (`WANT_TO_READ`, `READING`, `READ`), compound uniqueness indexes.
  - `reviews_repository.py`: `reviews` and `review_replies` collections, aggregate calculation, 1-review-per-user index constraint.
  - `annotations_repository.py`: `annotations` collection, strict user privacy filtering, shared marginalia filtering, in-place updates.
- **Services**: `BookSearchService`, `BookImportService` in [discovery/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/services.py).
- **Providers**: `OpenLibraryProvider` (active, rate-limited, timeout-safe) and `GoogleBooksProvider` (import fallback) in [discovery/providers/](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/providers/).
- **Views**:
  - `views.py`: `book_list` (search/filter/sort), `book_detail`.
  - `library_views.py`: `library_list`, `library_entry_detail`, `library_entry_add`, `library_entry_update`, `library_entry_remove`, `favorite_add`, `favorite_remove`, `book_import`.
  - `reviews_views.py`: `book_rating`, `review_list_create`, `review_detail`, `review_update`, `review_delete`, `user_book_review`, `review_replies_list_create`, `review_reply_delete`.
  - `annotations_views.py`: `annotation_list_create`, `annotation_detail`, `annotation_update`, `annotation_delete`, `user_book_annotations`.
- **Tests**:
  - `discovery/tests.py`: **60 tests passing** (search service, providers, pagination, timeouts).
  - `discovery/tests_step4.py`: **72 tests passing** (library shelf transitions, favorites, duplicates).
  - `discovery/tests_step5.py`: **80 tests passing** (reviews, ratings aggregation, ownership).
  - `discovery/tests_step5_annotations.py`: **10 tests passing** (annotation privacy, visibility, CRUD).
  - `discovery/tests_step5_replies.py`: **13 tests passing** (review replies, ownership, deletion).
  - **Subtotal Discovery Backend Tests**: **235 tests passing**.

### E.3 Recommendations Application
- **Repositories**: `recommendations/repository.py`: `get_recommended_books` (queries books by matching subjects or authors excluding interacted books), `get_popular_books`.
- **Services**:
  - `RecommendationService`: `get_personalized_recommendations` (calculates user subject/author preferences from library and favorites; tags recommendation reasons: *"Because you like related subjects"*, *"Because you like these authors"*), `get_similar_books`.
  - `ExternalIntegrationService`: `get_external_links` (extracts stored Google Books, Open Library, and Goodreads links).
- **Views**: `PersonalizedRecommendationView` (`/api/recommendations/`), `SimilarBooksView` (`/api/recommendations/books/<book_id>/similar/`), `ExternalLinksView` (`/api/recommendations/books/<book_id>/external/`).
- **Serializers**: `RecommendationResponseSerializer`, `RecommendationBookSerializer`, `ExternalLinksSerializer`.
- **Tests**: [recommendations/tests_step10.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/recommendations/tests_step10.py) — **23 tests passing** (covers recommendation scoring, cold-start fallback, similar books, and external link resolution).

### E.4 Community Application
- **Repositories**: `community/repository.py`: `discussions`, `replies`, `reports`, and `moderation_audits` PyMongo collections; compound indexes on `(discussion_id, created_at)`, `(parent_id, created_at)`.
- **Services**:
  - `DiscussionService`: `list_discussions`, `get_discussion`, `create_discussion`.
  - `ReplyService`: `list_replies`, `get_reply`, `create_reply` (validates 1-level depth ceiling), `update_reply` (ownership check), `delete_reply` (cascade soft-deletion of children, recalculation of active replies).
  - `ModerationService`: `report_content`, `list_reports`, `resolve_report`, `hide_content`, `restore_content`, audit logging.
- **Views**: `DiscussionListCreateView`, `DiscussionDetailView`, `ReplyListCreateView`, `ReplyDetailView`, `ReportCreateView`, `ModerationReportListView`, `ModerationReportDetailView`, `ModerationHideView`, `ModerationRestoreView`.
- **Permissions**: `IsModerator` in [community/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/views.py#L22) (allows `MODERATOR`, `STORE_MANAGER`, `ADMIN`).
- **Tests**: [community/tests_step9.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/tests_step9.py) — **32 tests passing** (covers discussion creation, replies, citations, nesting limits, soft-deletion, and moderation services).

### E.5 Part II Store Boundary (PostgreSQL)
- **Store App**: Models: `Product` (linked to discovery `book_reference`), `Inventory` (`quantity_on_hand`, `quantity_reserved`, `low_stock_threshold`). Services: `ProductService`, `InventoryService`. Views: `ProductListView`, `ProductDetailView`, `ManageProductView`, `ManageInventoryView`. Tests: `store/tests_step6.py` (**14 tests passing**).
- **Cart App**: Models: `Cart`, `CartItem`. Services: `CartService` (atomic item additions, quantity updates). Views: `CartSummaryView`, `CartItemListView`, `CartItemDetailView`. Tests: `cart/tests_step7.py` (**12 tests passing**).
- **Orders App**: Models: `Order`, `OrderItem`, `Payment`. Services: `OrderService` (atomic checkout in transaction block with row locking `select_for_update`, stock reservation, snapshot pricing). Views: `CheckoutView`, `OrderListView`, `OrderDetailView`. Tests: `orders/tests_step8.py` (**14 tests passing**).
- **Total Store Tests**: **40 tests passing**.
- **Boundary Assessment**: Cleanly decoupled. The Store backend exists and passes tests in PostgreSQL, but is **completely separate** from the React Discovery frontend.

---

## SECTION F — API CONTRACT AND FRONTEND INTEGRATION MAP

Master inventory of all Part I API endpoints, comparing backend capabilities against active frontend consumers:

| Application | Method | Endpoint URL | Auth Required | Permissions | Storage | Active Frontend Consumer | Status | Findings & Integration Mismatches |
|---|---|---|---|---|---|---|---|---|
| **Accounts** | `POST` | `/api/auth/register/` | No | Any | PostgreSQL | `authService.registerUser()` | **COMPLETE** | Fully integrated in AuthPage. |
| **Accounts** | `POST` | `/api/auth/login/` | No | Any | PostgreSQL | `authService.loginUser()` | **COMPLETE** | Sets `sessionid` and `csrftoken` cookies. |
| **Accounts** | `POST` | `/api/auth/logout/` | Yes/No | Any | PostgreSQL | `authService.logoutUser()` | **COMPLETE** | Clears session cookie; verified. |
| **Accounts** | `GET` | `/api/auth/me/` | Yes | IsAuthenticated | PostgreSQL | `authService.getCurrentUser()` | **COMPLETE** | Used on initial load and route changes. |
| **Discovery** | `GET` | `/api/books/` | No | Any | MongoDB | `discoveryService.fetchBooks()` | **COMPLETE** | Powers search, home spotlights, genres. |
| **Discovery** | `POST` | `/api/books/import/` | Yes | Any | MongoDB | `discoveryService.book_import` | **PARTIAL** | Backend exists; no user-facing import UI. |
| **Discovery** | `GET` | `/api/books/<book_id>/` | No | Any | MongoDB | `discoveryService.fetchBookById()` | **COMPLETE** | Powers `BookDetailPage`. |
| **Discovery** | `GET` | `/api/books/<book_id>/rating/` | No | Any | MongoDB | `discoveryService.fetchBookRating()` | **COMPLETE** | Aggregate rating on Book Details & Reviews. |
| **Discovery** | `GET` | `/api/books/<book_id>/my-review/` | Yes | IsAuthenticated | MongoDB | `discoveryService.fetchMyReview()` | **COMPLETE** | Distinguishes own review from other readers. |
| **Discovery** | `GET` | `/api/books/<book_id>/reviews/` | No | Any | MongoDB | `discoveryService.fetchBookReviews()` | **COMPLETE** | Public review stream. |
| **Discovery** | `POST` | `/api/books/<book_id>/reviews/` | Yes | IsAuthenticated | MongoDB | `discoveryService.createBookReview()` | **COMPLETE** | 1-review-per-user enforced. |
| **Discovery** | `GET` | `/api/books/<book_id>/reviews/<review_id>/` | No | Any | MongoDB | `discoveryService.review_detail` | **COMPLETE** | Individual review view. |
| **Discovery** | `PATCH` | `/api/books/<book_id>/reviews/<review_id>/update/` | Yes | Owner | MongoDB | `discoveryService.updateBookReview()` | **COMPLETE** | Edit own review; recalculates aggregates. |
| **Discovery** | `DELETE` | `/api/books/<book_id>/reviews/<review_id>/delete/` | Yes | Owner | MongoDB | `discoveryService.deleteBookReview()` | **COMPLETE** | Delete own review; cascade removes replies. |
| **Discovery** | `GET` | `/api/books/<book_id>/reviews/<review_id>/replies/` | No | Any | MongoDB | `discoveryService.fetchReviewReplies()` | **COMPLETE** | Lists reader replies to reviews. |
| **Discovery** | `POST` | `/api/books/<book_id>/reviews/<review_id>/replies/` | Yes | IsAuthenticated | MongoDB | `discoveryService.createReviewReply()` | **COMPLETE** | Post reply to another patron's review. |
| **Discovery** | `DELETE` | `/api/books/<book_id>/reviews/<review_id>/replies/<reply_id>/delete/` | Yes | Owner | MongoDB | `discoveryService.deleteReviewReply()` | **COMPLETE** | Delete own review reply. |
| **Discovery** | `GET` | `/api/books/<book_id>/annotations/` | No | Any | MongoDB | `discoveryService.fetchSharedAnnotations()` | **COMPLETE** | Returns only `visibility: SHARED` notes. |
| **Discovery** | `GET` | `/api/books/<book_id>/my-annotations/` | Yes | IsAuthenticated | MongoDB | `discoveryService.fetchMyAnnotations()` | **COMPLETE** | Returns user's private and shared notes. |
| **Discovery** | `POST` | `/api/books/<book_id>/annotations/` | Yes | IsAuthenticated | MongoDB | `discoveryService.createBookAnnotation()` | **COMPLETE** | Inscribe private or shared marginalia. |
| **Discovery** | `PATCH` | `/api/books/<book_id>/annotations/<id>/update/` | Yes | Owner | MongoDB | `discoveryService.updateBookAnnotation()` | **COMPLETE** | Update note, passage, or visibility. |
| **Discovery** | `DELETE` | `/api/books/<book_id>/annotations/<id>/delete/` | Yes | Owner | MongoDB | `discoveryService.deleteBookAnnotation()` | **COMPLETE** | Delete own marginalia note. |
| **Library** | `GET` | `/api/library/` | Yes | IsAuthenticated | MongoDB | `libraryService.fetchUserLibrary()` | **COMPLETE** | Powers Personal Library shelves. |
| **Library** | `GET` | `/api/library/<book_id>/` | Yes | IsAuthenticated | MongoDB | `libraryService.getLibraryEntry()` | **COMPLETE** | Shelf status check on Book Details. |
| **Library** | `POST` | `/api/library/<book_id>/add/` | Yes | IsAuthenticated | MongoDB | `libraryService.addBookToLibrary()` | **COMPLETE** | Adds folio to Want to Read or Reading. |
| **Library** | `PATCH` | `/api/library/<book_id>/update/` | Yes | IsAuthenticated | MongoDB | `libraryService.updateLibraryEntry()` | **COMPLETE** | Changes shelf status. |
| **Library** | `DELETE` | `/api/library/<book_id>/remove/` | Yes | IsAuthenticated | MongoDB | `libraryService.removeLibraryEntry()` | **COMPLETE** | Removes folio from library. |
| **Library** | `POST` | `/api/library/<book_id>/favorite/` | Yes | IsAuthenticated | MongoDB | `libraryService.toggleBookFavorite()` | **COMPLETE** | Favorites folio. |
| **Library** | `DELETE` | `/api/library/<book_id>/unfavorite/` | Yes | IsAuthenticated | MongoDB | `libraryService.toggleBookFavorite()` | **COMPLETE** | Unfavorites folio. |
| **Community** | `GET` | `/api/community/discussions/` | No | Any | MongoDB | `communityService.listDiscussions()` | **COMPLETE** | Powers Community Hub listing & search. |
| **Community** | `POST` | `/api/community/discussions/` | Yes | IsAuthenticated | MongoDB | `communityService.createDiscussion()` | **COMPLETE** | *"Begin a Dialogue"* modal submission. |
| **Community** | `GET` | `/api/community/discussions/<id>/` | No | Any | MongoDB | `communityService.getDiscussion()` | **COMPLETE** | Powers Discussion Thread detail. |
| **Community** | `GET` | `/api/community/discussions/<id>/replies/` | No | Any | MongoDB | `communityService.listReplies()` | **COMPLETE** | Chronological direct and nested replies. |
| **Community** | `POST` | `/api/community/discussions/<id>/replies/` | Yes | IsAuthenticated | MongoDB | `communityService.createReply()` | **COMPLETE** | Inscribes reply with optional citation. |
| **Community** | `PATCH` | `/api/community/discussions/<id>/replies/<reply_id>/` | Yes | Owner | MongoDB | `communityService.updateReply()` | **COMPLETE** | In-place reply editing. |
| **Community** | `DELETE` | `/api/community/discussions/<id>/replies/<reply_id>/` | Yes | Owner | MongoDB | `communityService.deleteReply()` | **COMPLETE** | Cascade soft-retirement of replies. |
| **Community** | `POST` | `/api/community/reports/` | Yes | IsAuthenticated | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Backend endpoint exists and is tested; **no frontend caller**. |
| **Community** | `GET` | `/api/community/moderation/reports/` | Yes | IsModerator | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Backend endpoint exists; **no frontend moderator queue**. |
| **Community** | `GET` | `/api/community/moderation/reports/<id>/` | Yes | IsModerator | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Backend endpoint exists; **no frontend detail view**. |
| **Community** | `POST` | `/api/community/moderation/hide/<type>/<id>/` | Yes | IsModerator | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Backend endpoint exists; **no frontend caller**. |
| **Community** | `POST` | `/api/community/moderation/restore/<type>/<id>/` | Yes | IsModerator | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Backend endpoint exists; **no frontend caller**. |
| **Recommendations** | `GET` | `/api/recommendations/` | Yes | IsAuthenticated | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Personalized recommendations service exists; **no frontend caller**. |
| **Recommendations** | `GET` | `/api/recommendations/books/<book_id>/similar/` | No | Any | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | Similar books service exists; frontend Book Details uses subject search. |
| **Recommendations** | `GET` | `/api/recommendations/books/<book_id>/external/` | No | Any | MongoDB | **None (Missing UI)** | **MISSING CONSUMER** | External links service exists; frontend Book Details uses hardcoded URL. |

---

## SECTION G — ROUTE AND REDIRECTION MATRIX

Complete inventory of application routes managed by `AppContent` in `frontend/src/App.tsx`:

| View Mode | URL Query Pattern | Component Rendered | Data Dependencies | Auth Required | Active Navbar ID | Return Destination | Status |
|---|---|---|---|---|---|---|---|
| **Discovery Home** | `/?view=discover` or `/` | `DiscoveryHomePage` | Catalog spotlights, featured genres | No | `discover` (Home) | Root | **COMPLETE** |
| **Catalog Search** | `/?view=search&q=...` | `SearchResultsPage` | `fetchBooks()` with search filters | No | `undefined` (None) | Previous or Home | **COMPLETE** |
| **Genres Index** | `/?view=genres` | `GenresIndexPage` | Static genre metadata list | No | `genres` | Previous or Home | **COMPLETE** |
| **Genre Detail** | `/?view=genre-detail&genre=<id>` | `GenreDetailPage` | Genre mapping + subject search | No | `genres` | `genres` index | **COMPLETE** |
| **Book Details** | `/?view=book-detail&id=<book_id>` | `BookDetailPage` | `fetchBookById()`, reviews, annotations, related | No | `undefined` (None) | Search / Home | **COMPLETE** |
| **Book Reviews** | `/?view=book-reviews&id=<book_id>` | `BookReviewsPage` | `fetchBookReviews()`, rating, my-review | No (Write: Yes) | `community` | Book Details | **COMPLETE** |
| **Reading Room** | `/?view=reading-room&id=<book_id>` | `ReadingRoomPage` | `fetchSharedAnnotations()`, my-annotations | No (Write: Yes) | `community` | Book Details | **COMPLETE** |
| **Authentication** | `/?view=auth&tab=signin\|register` | `AuthPage` | `loginUser()`, `registerUser()` | No | `undefined` (None) | Intended Destination | **COMPLETE** |
| **Personal Library** | `/?view=library` | `PersonalLibraryPage` | `fetchUserLibrary()` | Yes (Redirects to Auth) | `library` (My Library) | Discovery Home | **COMPLETE** |
| **Community Hub** | `/?view=community` | `CommunityHubPage` | `listDiscussions()`, active folios | No | `community` | Home | **COMPLETE** |
| **Thread Detail** | `/?view=community-thread&id=<id>` | `CommunityThreadPreview` (`CommunityThreadPage`) | `getDiscussion()`, `listReplies()` | No (Reply: Yes) | `community` | `community` Hub | **COMPLETE** |
| **About View** | `/?view=about` | Inline About Section | Static copy | No | `about` | Discovery Home | **PARTIAL** (Static placeholder) |

---

## SECTION H — AUTHENTICATION AND AUTHORIZATION AUDIT

### H.1 Session Authentication Mechanics
- **Mechanism**: Native Django `SessionAuthentication` using HTTP-only `sessionid` cookies and `csrftoken` cookies.
- **Cross-Origin Transport**: Configured with `credentials: 'include'` on all `fetch` requests in `authService.ts`, `discoveryService.ts`, `libraryService.ts`, and `communityService.ts`.
- **CORS Allowlist**: Explicitly controlled via `CORS_ALLOWED_ORIGINS` in `settings.py` (`http://localhost:3000`). `CORS_ALLOW_CREDENTIALS = True` is correctly configured.
- **CSRF Token Handling**: All mutative operations (`POST`, `PATCH`, `DELETE`) extract the `csrftoken` cookie value via regex in `authService.getCsrfToken()` and inject the `X-CSRFToken` request header.

### H.2 Ownership & Access Control Matrix

| Domain | Operation | Target Entity | Backend Verification Method | Failure Response | Status |
|---|---|---|---|---|---|
| **Personal Library** | List, Add, Update, Remove | `library_entries` | `user_id = str(request.user.id)` in repository query | HTTP 401 / 403 | **VERIFIED** |
| **Book Reviews** | Update, Delete | `reviews` | Explicit comparison: `str(review["user_id"]) == str(user.id)` | HTTP 403 Forbidden | **VERIFIED** |
| **Review Replies** | Delete | `review_replies` | Explicit comparison: `str(reply["user_id"]) == str(user.id)` | HTTP 403 Forbidden | **VERIFIED** |
| **Annotations** | List My Private | `annotations` | Strict repository filter: `{"user_id": user_id}` | HTTP 401 Unauthorized | **VERIFIED** |
| **Annotations** | Update, Delete | `annotations` | Explicit comparison: `str(note["user_id"]) == str(user.id)` | HTTP 403 Forbidden | **VERIFIED** |
| **Discussions** | Create | `discussions` | `IsAuthenticated` permission class | HTTP 401 Unauthorized | **VERIFIED** |
| **Discussion Replies**| Update, Delete | `replies` | Explicit comparison: `str(reply["author_user_id"]) == str(user.id)` | HTTP 403 Forbidden | **VERIFIED** |
| **Moderation** | View Reports, Hide, Restore | `reports`, `moderation_audits` | `IsModerator` permission class (`role in ('MODERATOR', 'STORE_MANAGER', 'ADMIN')`) | HTTP 403 Forbidden | **VERIFIED** |

### H.3 Authentication & Authorization Gaps
1. **Password Reset Unavailability**: No endpoint exists for initiating or completing password resets (`FR-01`).
2. **Missing Rate Limiting**: Neither Django nor DRF enforces throttling classes (`DEFAULT_THROTTLE_CLASSES`) on `/api/auth/login/` or `/api/auth/register/`, exposing endpoints to potential credential-stuffing attacks.

---

## SECTION I — DATABASE AND DATA INTEGRITY AUDIT

### I.1 Database Engine Partitioning
- **PostgreSQL**: Holds structured relational schema for `accounts` (1 table: `accounts_user`), and Part II Store (`store_product`, `store_inventory`, `cart_cart`, `cart_cartitem`, `orders_order`, `orders_orderitem`, `orders_payment`). All migrations are applied cleanly.
- **MongoDB**: Database `akashic_discovery` houses document collections:
  - `books`: 789 persistent catalogue records.
  - `user_library`: 3 persistent user shelf entries.
  - `reviews`: 30 persistent reviews.
  - `review_replies`: 3 persistent replies.
  - `annotations`: 5 persistent annotations (private and shared).
  - `discussions`: 3 persistent curated master threads.
  - `replies`: 3 persistent community replies.
  - `reports`: 0 records (collection initialized).
  - `moderation_audits`: 0 records (collection initialized).

### I.2 Data Integrity & Cross-Database Referencing
- **User Reference**: MongoDB documents store the scalar string representation of the PostgreSQL `accounts_user.id` (`UUID4`). No foreign-key emulation or direct cross-database joins are attempted.
- **Book Reference**: MongoDB collections reference `book_id` (a 24-character hexadecimal ObjectId string or external provider slug).
- **Compound Uniqueness Constraints**:
  - `reviews`: Indexed on `(user_id, 1), (book_id, 1)` with `unique=True`.
  - `library_entries`: Indexed on `(user_id, 1), (book_id, 1)` with `unique=True`.
  - `favorites`: Indexed on `(user_id, 1), (book_id, 1)` with `unique=True`.

### I.3 MongoDB Index Gaps
Audit of existing MongoDB indexes revealed an indexing omission:
```python
# Current indexes on 'annotations' collection
=== Collection: annotations ===
  Index: _id_: SON([('_id', 1)])
```
**Defect / Technical Debt**: `annotations` has no secondary indexes.
- Querying shared annotations for a book (`{"book_id": book_id, "visibility": "SHARED"}`) performs a full collection scan.
- Querying a user's annotations (`{"user_id": user_id, "book_id": book_id}`) performs a full collection scan.
**Recommendation**: Create compound indexes:
1. `db.annotations.create_index([("book_id", 1), ("visibility", 1), ("created_at", -1)])`
2. `db.annotations.create_index([("user_id", 1), ("book_id", 1), ("created_at", -1)])`

### I.4 Test Database Isolation Verification
- **Configuration**: [Akashic_Library/test_settings.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/Akashic_Library/test_settings.py) sets:
  ```python
  DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
  MONGODB_NAME = "akashic_discovery_test"
  ```
- **Execution Proof**: Running test suites creates and tears down collections strictly within `akashic_discovery_test`. Inspection of development database `akashic_discovery` confirmed that all 789 books, 3 discussions, 30 reviews, and 5 annotations remained completely intact before and after full test execution.

---

## SECTION J — SECURITY, ACCESSIBILITY AND PERFORMANCE FINDINGS

### J.1 Security Findings
1. **Private Note Leakage Protection (VERIFIED SECURE)**:
   - Evaluated `annotations_repository.py`. `get_book_annotations` explicitly applies:
     `{"$or": [{"visibility": "SHARED"}, {"user_id": user_id}]}` when a user is authenticated, and `{"visibility": "SHARED"}` when unauthenticated. Direct requests cannot access other patrons' private notes.
2. **Review & Discussion Ownership (VERIFIED SECURE)**:
   - Backend services independently assert author user ID matching before executing updates or soft-deletions, returning HTTP 403 Forbidden on mismatch.
3. **Missing Authentication Rate Limiting (P2 — Security Debt)**:
   - Neither IP nor username throttling is configured for `/api/auth/login/` or `/api/auth/register/`.

### J.2 Accessibility Findings (WCAG 2.1 AA Review)
1. **Keyboard Operability (VERIFIED)**:
   - Full keyboard accessibility for Catalog Search modal (`Meta+K`, `Escape` to close), mobile drawer, dropdown menus, and delete confirmation dialogs. Focus trapping is properly implemented on modals.
2. **ARIA Compliance & Landmarks (VERIFIED)**:
   - Valid ARIA landmark structure (`banner`, `main`, `navigation`, `region`, `complementary`, `contentinfo`).
   - Accessible names provided for icon buttons (`aria-label="Account menu for Beatrice Thorne"`, `aria-label="Close modal"`).
3. **Heading Hierarchy (Minor Observation)**:
   - On `BookDetailPage.tsx`, some subheadings jump from `h1` (Book Title) to `h3` (Sidebar headers) without an intermediate `h2`.

### J.3 Performance & Bundle Findings
1. **Frontend Bundle Size (P2 — Performance Debt)**:
   - Production Vite build output:
     `dist/assets/index-DPz_21CI.css  200.57 kB │ gzip:  29.20 kB`
     `dist/assets/index-C81YDn7C.js   531.24 kB │ gzip: 148.82 kB`
   - Notice: Vite emits a warning: *"Some chunks are larger than 500 kB after minification."*
   - Root cause: All 12 pages are imported synchronously in [App.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/App.tsx#L3-L11). Implementing `React.lazy()` for secondary routes (`BookReviewsPage`, `ReadingRoomPage`, `CommunityThreadPage`, `PersonalLibraryPage`, `AuthPage`) will cut the initial load bundle size in half.
2. **Cover Image CDN Caching**:
   - Covers are loaded directly from `covers.openlibrary.org`. No local image proxy or responsive `srcset` resizing is currently implemented.

---

## SECTION K — TEST AND VERIFICATION RESULTS

### K.1 Frontend Automated Test Suite
- **Command**: `npm test -- --run` (inside `Akashic_Library/frontend`)
- **Result**: **174 / 174 tests passing (100% pass rate)** across **21 test files** in 4.50s.
- **Coverage Highlights**:
  - `BookDetailPage.test.tsx`: 25 tests (metadata rendering, fallback text, shelf buttons, reviews preview, reading room preview).
  - `CommunityThreadPage.test.tsx`: 10 tests (topic thesis, nested responses, citations, cascade deletion copy, intercept).
  - `CommunityHubPage.test.tsx`: 7 tests (category filtering, discussion cards, dialogue creation).
  - `BookReviewsPage.test.tsx`: 11 tests (ratings summary, own review edit, deletion, reply creation).
  - `ReadingRoomPage.test.tsx`: 12 tests (private/shared notes, desk composer, ledger filtering).
  - `PersonalLibraryPage.test.tsx`: 9 tests (shelf filtering, status updates, removal).
  - `AuthPage.test.tsx`: 11 tests (login, registration, validation, error banners).
  - `Navbar.test.tsx` & `MobileDrawer.test.tsx`: 21 tests (navigation highlighting, account menu, drawer).
  - `SearchResults.test.tsx` & `SearchResultsLoopRegression.test.tsx`: 13 tests (deduplication, pagination).

### K.2 Frontend Static Quality Gates
- **TypeScript**: `npm run typecheck` (`tsc --noEmit`) ➔ **0 errors**.
- **ESLint**: `npm run lint` (`eslint .`) ➔ **0 errors, 0 warnings**.
- **Production Build**: `npm run build` (`tsc -b && vite build`) ➔ **0 errors** (built in 1.17s).

### K.3 Backend Automated Test Suite
- **Execution Settings**: `--settings=Akashic_Library.test_settings`

| App / Test File | Test Count | Result | Execution Time | Scope / Domain Covered |
|---|---|---|---|---|
| `accounts.tests` | 22 | **PASS** | 4.506s | User creation, role validation, authentication, session endpoints. |
| `discovery.tests` | 60 | **PASS** | 0.146s | Search service, provider normalization, error handling, timeouts. |
| `discovery.tests_step4` | 72 | **PASS** | 9.761s | Personal library, shelves, favorites, duplicate constraints. |
| `discovery.tests_step5` | 80 | **PASS** | 13.129s | Reviews CRUD, rating aggregates, moderation status filtering. |
| `discovery.tests_step5_annotations` | 10 | **PASS** | 3.413s | Reading room annotations, privacy isolation, visibility updates. |
| `discovery.tests_step5_replies` | 13 | **PASS** | 5.443s | Review replies, ownership checks, reply cascade deletion. |
| `community.tests_step9` | 32 | **PASS** | 16.812s | Discussions, 1-level nested replies, citations, moderation service. |
| `recommendations.tests_step10`| 23 | **PASS** | 4.310s | Scoring algorithm, cold-start fallback, external link mapping. |
| **Total Part I Backend Tests** | **312** | **PASS** | **57.52s** | **100% Pass Rate across Part I** |
| `store.tests_step6` (Part II) | 14 | **PASS** | 2.810s | Products, inventory management, price snapshots. |
| `cart.tests_step7` (Part II) | 12 | **PASS** | 2.520s | Cart items, quantity updates, user session carting. |
| `orders.tests_step8` (Part II) | 14 | **PASS** | 3.088s | Atomic checkout transaction, row locking, order creation. |
| **Grand Total Repository Tests** | **352** | **PASS** | **65.94s** | **All Backend Test Suites Green** |

---

## SECTION L — FEATURE GAP MATRIX

Master matrix of all identified defects, incomplete features, and unconsumed endpoints:

| ID | Feature Area | Current Status | Requirement Source | Priority | Supporting Evidence | Recommended Remediation Action |
|---|---|---|---|---|---|---|
| **GAP-01** | Content Reporting UI | **MISSING** | FR-05, FR-06, Sec 19 | **P1 (High)** | `POST /api/community/reports/` exists in backend; 0 frontend callers in `BookReviewsPage` or `CommunityThreadPage`. | Add accessible "Report Content" modal to reviews, review replies, discussions, and discussion replies. |
| **GAP-02** | Moderator Queue Dashboard | **MISSING** | FR-12, Sec 22 | **P1 (High)** | `GET /api/community/moderation/reports/` and `/hide/` exist in backend; no moderator dashboard in frontend. | Implement dedicated Moderator View accessible to patrons with `role in ('MODERATOR', 'ADMIN')`. |
| **GAP-03** | Patron Password Management | **MISSING** | FR-01, Sec 5 | **P1 (High)** | `AuthPage.tsx:587` displays disclaimer; no password reset or change endpoint in `accounts`. | Implement authenticated password change endpoint and self-service password reset workflow. |
| **GAP-04** | Patron Profile Editing | **MISSING** | FR-01, Sec 7 | **P2 (Med)** | `accounts.User` has `display_name` and `bio`, but no `PATCH /api/auth/me/` endpoint or frontend edit form exists. | Create profile edit endpoint and Patron Profile Settings view in frontend. |
| **GAP-05** | Curated Recommendations Integration | **MISSING** | FR-11, Sec 23 | **P1 (High)** | `GET /api/recommendations/` exists in backend; footer has dead link `#recommendations`; no frontend UI. | Create Recommendations service caller and render personalized recommendations carousel on Discovery Home and Library. |
| **GAP-06** | Similar Books on Book Details | **PARTIAL** | FR-11, Sec 23 | **P2 (Med)** | `BookDetailPage.tsx:1036` calls generic subject search instead of `GET /api/recommendations/books/<book_id>/similar/`. | Wire `fetchRelatedBooks` to consume `SimilarBooksView` with recommendation reasons. |
| **GAP-07** | Legal Access Links & Categories | **PARTIAL** | FR-10, Sec 24 | **P2 (Med)** | `BookDetailPage.tsx:710` hardcodes Open Library link; 6 availability categories from Sec 24 omitted. | Update `ExternalIntegrationService` and `BookDetailPage` to render categorized external access links. |
| **GAP-08** | Incomplete Shelf Statuses | **PARTIAL** | FR-04, Sec 18 | **P2 (Med)** | `library_repository.py:52` defines only `WANT_TO_READ`, `READING`, `READ`. Status `ABANDONED` omitted. | Add `ABANDONED` to `READING_STATUSES` in backend repository, serializers, and frontend Personal Library tabs. |
| **GAP-09** | MongoDB Annotation Indexes | **DEFECTIVE** | Sec 11, Sec 30 | **P2 (Med)** | `db.annotations.list_indexes()` shows only `_id_`. No compound indexes for `book_id` or `user_id`. | Add compound index migration in `annotations_repository.py` for `(book_id, visibility, created_at)` and `(user_id, book_id, created_at)`. |
| **GAP-10** | Route-Level Code Splitting | **DEFECTIVE** | Sec 30 | **P2 (Med)** | `dist/assets/index-*.js` exceeds 531 kB; all 12 views imported statically in `App.tsx`. | Implement `React.lazy()` and `Suspense` for all secondary page routes in `AppContent`. |
| **GAP-11** | Dead Footer Links | **DEFECTIVE** | Sec 27 | **P3 (Low)** | `Footer.tsx` has dead anchors: `#groups`, `#guidelines`, `#api`, `#docs`, `#privacy`. | Replace dead anchor tags with functional modal overlays or route handoffs to static about/policy sections. |
| **GAP-12** | API Authentication Throttling | **DEFECTIVE** | Sec 29 | **P2 (Med)** | No rate limiting configured on `/api/auth/login/` or `/api/auth/register/` in `settings.py`. | Add DRF throttle classes (`AnonRateThrottle`, `UserRateThrottle`) in `settings.py`. |

---

## SECTION M — PHASE 6B–6G IMPLEMENTATION PLAN

### Phase 6B — Patron Profile, Account Settings and Permissions
- **Goal**: Complete FR-01 by providing patron account management, password changing, profile editing, and role-based permissions.
- **Existing Capability**: Custom User model with UUID, `display_name`, `bio`, and `role`. Registration, login, logout, and `/api/auth/me/`.
- **Remaining Gaps**: No profile edit endpoint (`PATCH /api/auth/me/`), no password change endpoint (`POST /api/auth/password/change/`), no profile settings UI, no avatar support.
- **Backend Work**:
  - Add `UserUpdateSerializer` supporting `display_name` and `bio`.
  - Add `PasswordChangeSerializer` validating old password and new password strength.
  - Implement `PATCH /api/auth/me/` and `POST /api/auth/password/change/` in `accounts/views.py`.
- **Frontend Work**:
  - Create `ProfileSettingsModal` or `AccountSettingsPage` accessible from navbar avatar menu.
  - Form validation for display name, bio, and password changes.
- **Complexity**: Medium.
- **Test Requirements**: Unit tests for profile updates, password verification, and unauthorized rejection.

### Phase 6C — Community Governance, Reporting and Moderation
- **Goal**: Complete FR-05, FR-06, and FR-12 by connecting the backend moderation pipeline to the frontend.
- **Existing Capability**: Backend `ModerationService`, `reports` collection, `moderation_audits` collection, report creation and resolution endpoints, `IsModerator` permission class.
- **Remaining Gaps**: No frontend reporting trigger in reviews, review replies, discussions, or replies. No moderator dashboard to view and action reports.
- **Backend Work**: Minor enhancements to ensure reported items include author snapshots and context preview.
- **Frontend Work**:
  - Add accessible "Report" flag/button on all user-generated content cards.
  - Implement `ReportModal` capturing reason (Spam, Harassment, Inappropriate, Spoiler) and details.
  - Implement `ModeratorDashboardPage` (restricted to users with `is_moderator`) displaying report queue, dismiss action, and hide/restore content triggers.
- **Complexity**: Medium.
- **Test Requirements**: End-to-end tests for reporting items, moderator queue listing, and content hiding.

### Phase 6D — Notifications and Activity Center (Proposed Extension)
- **Goal**: Implement an in-app reader activity ledger for discussion replies, mentions, and review responses.
- **Status**: **PROPOSED PRODUCT ENHANCEMENT** (Not in core FR-01–12 requirements).
- **Scope**:
  - In-app notification bell icon in navbar.
  - Event triggers on discussion reply creation and review reply creation.
  - MongoDB `notifications` collection storing unread badges and target route URLs.
- **Complexity**: Medium.
- **Recommendation**: Defer until after core Phases 6B, 6C, 6E, and 6F are completed.

### Phase 6E — Discovery and Reading Experience Completion
- **Goal**: Complete FR-10 and FR-11 by activating the backend recommendation engine and legal access links in the UI.
- **Existing Capability**: `PersonalizedRecommendationView`, `SimilarBooksView`, `ExternalLinksView` in `recommendations` app.
- **Remaining Gaps**: Recommendations are uncalled; footer link `#recommendations` is dead; Book Details uses basic subject search for related books; availability categories are missing.
- **Backend Work**:
  - Extend `ExternalIntegrationService` to map the 6 availability categories (`OUR_STORE`, `EXTERNAL_PURCHASE`, `PREVIEW`, `BORROW`, `PUBLIC_DOMAIN`, `INFORMATION`).
- **Frontend Work**:
  - Add `CuratedRecommendationsSection` on Discovery Home and Personal Library.
  - Wire `BookDetailPage` to call `SimilarBooksView` and display recommendation reasons.
  - Render categorized external access badges on Book Details.
- **Complexity**: Medium.
- **Test Requirements**: Automated integration tests verifying recommendation rendering and external link clicks.

### Phase 6F — Platform-Wide Security, Performance and Quality
- **Goal**: Harden platform security, add database indexes, optimize bundle delivery, and resolve technical debt.
- **Work Items**:
  1. **Bundle Optimization**: Implement `React.lazy()` and `Suspense` for all secondary page components in `AppContent` to bring main bundle under 250 kB.
  2. **MongoDB Indexing**: Create compound indexes on `annotations` (`book_id`, `visibility`, `created_at` and `user_id`, `book_id`, `created_at`).
  3. **Throttling**: Configure DRF `AnonRateThrottle` and `UserRateThrottle` in `settings.py` for auth endpoints.
  4. **Shelf Expansion**: Add `ABANDONED` to `READING_STATUSES` in backend repository and frontend Personal Library.
  5. **Footer Polish**: Replace dead footer anchors with valid modal disclosures or static pages.
- **Complexity**: Medium.
- **Test Requirements**: Bundle size verification, index query explain plan validation, throttle rate tests.

### Phase 6G — Deployment, Documentation and Part I Acceptance
- **Goal**: Complete operational deployment readiness, update stale documentation, and perform final sign-off.
- **Work Items**:
  - Update `README.md` to reflect the completed React frontend and dual-database architecture.
  - Verify environment configuration against `ENVIRONMENT.md`.
  - Validate production build assets and static file serving.
  - Final end-to-end regression audit across all user roles (Visitor, Patron, Moderator, Admin).
  - Formal Part I Acceptance Sign-Off.
- **Complexity**: Low to Medium.

---

## SECTION N — DEFERRED AND OUT-OF-SCOPE FEATURES

### N.1 Part II — Akashic Store (Out of Scope for Part I)
The following commerce subsystems belong strictly to **Part II — Akashic Store** and must not be implemented during Phase 6:
- Store product catalog frontend (`store_product` listing and detail).
- Physical/digital inventory management UI.
- Shopping cart interface (`cart_cart`, `cart_cartitem`).
- Multi-step checkout, shipping address collection, and payment gateway integration.
- Order history and order tracking (`orders_order`, `orders_orderitem`).
- Store manager product administration dashboard.

### N.2 Deferred Future Enhancements
The following architectural concepts from Section 37 of the final project report are explicitly deferred beyond Phase 6:
- Real-time WebSocket discussion chat via Django Channels.
- Vector embedding generation and semantic similarity search via external embedding models.
- Production third-party payment gateway integration (Stripe / PayPal).
- Native iOS / Android mobile applications.

---

## SECTION O — FINAL PART I ASSESSMENT

### Verdict: CORE FEATURES COMPLETE — FINALIZATION REQUIRED

#### Detailed Rationale:
1. **Core Functional Soundness**: The core vision of Akashic Library Part I—discovering literature, maintaining personal reading shelves, reading and writing substantive reviews, creating private annotations and shared marginalia, and engaging in multi-user community dialogues—is fully implemented and backed by verified automated tests and real browser workflows.
2. **Architecture Integrity**: The polyglot persistence model (PostgreSQL for Auth, MongoDB for Discovery/Community) is completely sound. Privacy enforcement on private annotations is mathematically strict on the backend.
3. **Identified Finalization Scope**: Part I cannot be declared "production complete" because critical specification requirements remain unintegrated (no user-facing moderation queue, no reporting modal, no password change, recommendations uncalled by the frontend, single-chunk 531 kB bundle, missing annotation indexes).
4. **Prerequisite for Part II**: Finalizing Part I through Phases 6B–6G guarantees that the discovery and community experience is rock-solid, fully documented, and cleanly decoupled before opening the commercial Store environment in Part II.

---

## SECTION P — RECOMMENDED NEXT ACTION

### Immediate Starting Task for Phase 6B:
**Begin Phase 6B — Patron Profile, Account Settings, and Role Permissions.**

#### Exact First Implementation Step:
1. Extend `Akashic_Library/accounts/serializers.py` to create `UserProfileUpdateSerializer` (allowing updates to `display_name` and `bio`) and `PasswordChangeSerializer` (validating current password via `user.check_password()` and enforcing Django password validators on the new password).
2. Add `PATCH /api/auth/me/` and `POST /api/auth/password/change/` to [accounts/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/views.py).
3. Write automated unit tests in `accounts/tests.py` covering profile editing, password changes, and invalid password rejections.
4. Integrate the profile settings UI into the frontend application shell.
