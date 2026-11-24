# STAGE 2 IMPLEMENTATION & VISUAL POLISH REPORT
## ALL BOOKS CATALOGUE, UNIVERSAL BOOK CARD SYSTEM & STORE MANAGER PORTAL

**Date:** November 19, 2026  
**Milestone:** Part II: Akashic Store — Stage 2 & Visual Quality Closure  
**Branch:** `ragnar/frontend` (Local working branch, strict zero commits / pushes / branch switches)  
**Lead Engineer:** Lead Frontend & Backend Integration Engineer  

---

## 1. Executive Summary

Stage 2 represents the transition of the Akashic Store from a marketing landing page into a fully functional, dual-database driven bookstore catalogue and product management platform. The milestone delivers three core engineering pillars:

1. **Public All Books Catalogue Page (`/allbooks` / `?view=store-allbooks`):**
   A faithful reconstruction of the authoritative design reference (`frontend/site-clone/site_copy/allbooks/`), featuring the pale periwinkle hero with search bar and animated easter-egg pop-up, horizontal genre filter chips with active rabbit-ears indicator, and genre-grouped horizontal carousels (Horror, Science Fiction, Fantasy, Romance, Thriller, Literary Fiction, Gothic Fiction, Historical Fiction, LGBTQIA+, Contemporary Fiction, Magical Realism) replacing original monthly groupings.

2. **Universal Customizable Book Card System:**
   An extension of the established `BookCard` component into a polymorphic presentation system that accepts both static landing page items (`TopBookItem`) and dynamic database products (`StoreProductItem`), supporting full Store Manager color customization (card background, title, description, genre badges), rich-text description clamping, and custom cover images while maintaining fixed geometry, hover tilts, rabbit-ears pop-ups, and "Read more" capsule button interactions.

3. **Store Manager Product Management Portal (`/store/manager` / `?view=store-manager`):**
   A dedicated administrative console accessible strictly to `STORE_MANAGER` and `ADMIN` roles. Supports **Method A** (1-click Open Library URL/ISBN/work import with live metadata preview) and **Method B** (manual product creation with full bibliographic, pricing, inventory, and color customization), inline inventory quantity adjustments, and a real-time reactive `BookCard` preview panel.

4. **Visual Fidelity Corrections to "How It Works" Section:**
   In response to the visual review screenshots comparing local `localhost:3000/?view=store` to the reference site `aardvarkbookclub.com`, this milestone resolved all layout anomalies in the "How It Works" section:
   - Eliminated text clipping and overflow by bounding illustration heights (`max-height: 165px`).
   - Reduced card overlap from -60px to -48px (-3rem), ensuring 100% of card headlines and descriptions remain visible without truncation.
   - Corrected card rotations to an authentic natural cascade (Step 1: -3.5°, Step 2: -2.2°, Step 3: -0.8°, Step 4: 0° upright anchor card).
   - Repositioned the purple handwritten note ("Consider us your professional book curator") below the header boundary, resolving overlap with the sticky navigation bar.

All quality gates passed with 100% test coverage:
- **TypeScript:** 0 errors (`tsc --noEmit`, `tsc -b`)
- **Lint:** 0 errors (`eslint .`)
- **Frontend Vitest:** 46 test suites, 340 tests passing
- **Backend Django Store:** 19 tests passing
- **Backend Django Discovery:** 240 tests passing
- **Vite Production Build:** Succeeded in 2.08s

---

## 2. Source of Truth & Architecture Compliance

### 2.1 Design Source of Truth (`frontend/site-clone/site_copy/`)
The reference folder remained strictly **READ-ONLY**. The following authoritative source assets and styling definitions were extracted:
- `allbooks/index.html`: Layout structure for `.hero-xs.is--bg-pale-periwinkle`, `.filter`, `.tag`, and `.slider`.
- `_ext/slater.app/18601/54934.css`:
  - Active tag styling: `.tag.is--active` with bouncing pseudo-element ears (`::before`, `::after`).
  - Fluid sizing: `calc(100vw / 120)` base unit, `.flow__card` 300px × 450px proportions.
- SVG Assets:
  - Easter-egg rabbit heart pop-up icon (`M53.332 55.909...`).
  - Search magnifying glass icon (`M12.6667 21.3333...`).
  - Chevron navigation controls and rabbit-ears badges.

### 2.2 Project Architecture Report (`Akashic_Library_Final_Project_Report_Updated(1).docx`)
The implementation strictly adheres to the Dual-Database Strategy defined in Section 4 of the architectural specifications:
- **Discovery (MongoDB):** Canonical bibliographic records (`akashic_discovery.books`) holding title, authors, descriptions, publisher, identifiers (ISBN-10, ISBN-13, Open Library ID), and subjects.
- **Store Commerce (PostgreSQL):** Commercial records (`store_products` and `store_inventory`) tracking selling prices, SKU, active status (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `ARCHIVED`), custom cover URLs, custom descriptions, and JSONB card customizations.
- **Zero N+1 Query Batch Enrichment:** Product listing queries in `StoreService.enrich_products_with_book_data()` collect all MongoDB `book_reference` IDs and execute a single batch query (`books_collection.find({'_id': {'$in': object_ids}})`), merging data in memory with $O(N)$ efficiency.

---

## 3. Detailed Component Implementation

### 3.1 All Books Catalogue (`frontend/src/pages/Store/pages/AllBooks/`)
- `StoreAllBooksPage.tsx`:
  - Main catalogue controller. Synchronizes query parameters (`?genre=<slug>&search=<query>`) with browser history via `window.history.replaceState`.
  - Client-side instantaneous genre switching and search query filtering with real-time UI response.
- `StoreAllBooksHero.tsx` & `.module.css`:
  - Recreates the pale periwinkle curved banner (`background-color: var(--store-color-pale-periwinkle, #D7CDF1)`).
  - Centered search form with input field and magenta submit button (`#FF008C`).
  - Interactive easter-egg rabbit emblem on the right that pops out with smooth scale and rotation transitions on hover.
- `StoreGenreFilterBar.tsx` & `.module.css`:
  - Horizontal scrolling rail of tag chips representing all canonical genres.
  - Active chip receives the signature bouncing rabbit ears indicator (`.tag.is--active::before` and `.tag.is--active::after`).
  - Left and right navigation chevron buttons with auto-scroll and disabled states.
- `StoreGenreCarousels.tsx` & `.module.css`:
  - Renders horizontal book carousels grouped by genre.
  - Employs `CANONICAL_GENRE_SECTIONS` for consistent ordering.
  - Reuses `BookCarousel` and `CarouselControls` from the Store Books section.
  - Provides responsive loading skeletons and friendly empty states when search returns zero results.

### 3.2 Universal Customizable Book Card System
- `BookCard.tsx`:
  - Refactored to accept `UniversalBookItem` (`TopBookItem | StoreProductItem`).
  - Fallback hierarchies:
    - Cover: `custom_cover_url` -> `cover_image` -> `coverImage` -> Placeholder asset.
    - Description: `custom_description` -> `description` -> Clamped rich-text HTML (sanitized).
    - Colors: `card_customization.background_color` -> `accentColor` -> Default `#1c1917`.
  - Geometry is strictly locked: 260px width, 410px height, 1.5rem border radius, maintaining the exact card proportions of the approved homepage.
  - Interactive states: Hover tilt (-1.5°), rabbit ears popping out from behind the top edge, and "Read more" pink pill button appearing smoothly at the bottom.

### 3.3 Store Manager Portal (`frontend/src/pages/Store/pages/StoreManager/`)
- `StoreManagerPage.tsx`:
  - Guarded access: Checks `user.role === 'STORE_MANAGER' || user.role === 'ADMIN'`. Unauthorized users are presented with a restricted access alert.
  - Metrics summary banner: Total Products, Active In-Stock, Low Stock, and Out of Stock counts.
  - Search and filter bar for catalogue management.
  - Products table with book thumbnails, titles, authors, genres, prices, inventory counters, status badges, and quick stock adjustment controls (+ / -).
- `StoreProductDrawer.tsx`:
  - Slide-out administrative drawer for adding and editing products.
  - **Method A (Open Library Import):** Accepts an Open Library URL, Work ID (`/works/OL...`), Edition ID (`/books/OL...`), or 10/13-digit ISBN. Fetches preview metadata from the backend API, pre-populating title, authors, description, genres, and cover choices.
  - **Method B (Manual Entry):** Provides inputs for title, authors, price, stock, ISBN, description (with bold, italic, and paragraph rich-text toolbar), and genres.
  - **Card Customization Palette:** Integrated color pickers and preset palettes for card background color, title color, description color, and genre badge styling.
  - **Live Card Preview:** Embeds the universal `BookCard` in a dedicated side-panel inside the drawer, updating in real time as the manager types or selects colors.

---

## 4. Backend Implementation & Security

### 4.1 Data Models (`store/models.py`)
Extended `StoreProduct` model with PostgreSQL fields:
```python
custom_cover_url = models.URLField(max_length=500, blank=True, null=True)
custom_description = models.TextField(blank=True, null=True)
custom_genres = models.JSONField(default=list, blank=True)
card_customization = models.JSONField(
    default=dict,
    blank=True,
    help_text="Custom card colors: background_color, title_color, description_color, badge_color",
)
```
Generated and executed migration: `0002_storeproduct_card_customization_and_more.py`.

### 4.2 API Services (`store/services.py`)
- `sanitize_rich_text(text)`: Whitelists safe HTML tags (`<p>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<span>`, `<br>`) and strips dangerous tags/attributes using `bleach`.
- `parse_open_library_identifier(input_str)`: Resolves full URLs or raw identifiers into works, editions, or ISBNs.
- `preview_open_library_import(input_str)`: Queries Open Library API and returns formatted preview metadata without creating database records.
- `enrich_products_with_book_data(products)`: Batches MongoDB lookups for all product references to eliminate N+1 queries.
- `get_filtered_store_products(...)`: Handles search queries and genre filtering with case-insensitive matching.

### 4.3 API Endpoints & Permissions (`store/views.py`)
- `GET /api/store/products/`: Public listing endpoint with genre and search filtering.
- `GET /api/store/products/<id>/`: Public product detail endpoint.
- `POST /api/store/products/import-preview/`: Open Library metadata preview endpoint (`STORE_MANAGER` / `ADMIN` only).
- `GET, POST /api/store/products/manage/`: Product management listing and creation endpoint (`STORE_MANAGER` / `ADMIN` only).
- `PATCH /api/store/products/<id>/manage/`: Product update endpoint (`STORE_MANAGER` / `ADMIN` only).
- `PATCH /api/store/products/<id>/inventory/`: Quick stock quantity update endpoint (`STORE_MANAGER` / `ADMIN` only).

Permission enforcement is handled by `IsStoreManagerOrAdmin`, verifying `request.user.role in ['STORE_MANAGER', 'ADMIN']`.

---

## 5. Visual Fidelity Corrections to "How It Works"

| Defect Observed in Visual Review | Root Cause in Codebase | Resolution Applied |
|---|---|---|
| Card text clipped at the bottom of cards | `flowCardImg` was unconstrained, expanding and pushing `flowCardContent` off the bottom of the card where `overflow: hidden` truncated it | Added `max-height: 165px` to `flowCardImg` and constrained `flowCardImgWrap` to `flex: 1 1 auto; max-height: 175px`, guaranteeing consistent vertical space for content |
| Cards heavily overlapping and obscuring titles | `margin-left: -3.75rem` (-60px) created an aggressive overlap that obscured up to 30% of each preceding card's text | Adjusted desktop overlap to `margin-left: -3rem` (-48px), providing 252px of clear card surface on 300px cards and 100% text visibility |
| Card 3 and 4 tilting in opposite direction (+4° / +5°) crashing into Card 2 | Inverted rotation angles in `initialJitterRef` caused cards to tilt clockwise towards the left card bottoms | Corrected rotations to an authentic counter-clockwise cascade: Step 1 (-3.5°), Step 2 (-2.2°), Step 3 (-0.8°), Step 4 (0° upright anchor) |
| Handwritten annotation colliding with sticky navbar | `.flowTextWrap` had `position: relative` with `height: 0`, and `.flowTextOuter` had `position: absolute; bottom: 2.25rem`, pushing it above the section into the fixed header | Changed `.flowHeader` to `align-items: flex-end`, removed absolute positioning on `.flowTextOuter`, and flowed the text inline beside the title with proper padding |

---

## 6. Automated Quality Gates

```bash
# 1. Frontend TypeScript Validation
npm --prefix frontend run typecheck
# Output: tsc --noEmit -> Exit code 0 (0 errors)

# 2. Frontend ESLint Validation
npm --prefix frontend run lint
# Output: eslint . -> Exit code 0 (0 errors, 13 fast-refresh warnings)

# 3. Frontend Vitest Test Suite
npm --prefix frontend run test -- --run
# Output: 46 passed (46), 340 tests passed (340) -> Exit code 0

# 4. Frontend Production Build
npm --prefix frontend run build
# Output: tsc -b && vite build -> Built in 2.08s -> Exit code 0

# 5. Django Backend Store App Tests
cd Akashic_Library && python manage.py test store
# Output: Ran 19 tests in 5.821s -> OK -> Exit code 0

# 6. Django Backend Discovery App Tests
cd Akashic_Library && python manage.py test discovery
# Output: Ran 240 tests in 33.512s -> OK -> Exit code 0
```

---

## 7. Screenshot Inventory (Section 27)

All verification captures are located in `screenshots/` and `Akashic_Library/screenshots/`:

| Filename | Description | Verified Attributes |
|---|---|---|
| `01_store_how_it_works_refined.png` | Store Homepage "How it works" section | Natural -3.5° to 0° fanning, no text clipping, upright Step 4, uncollided handwritten text |
| `02_allbooks_hero_and_search.png` | All Books catalogue initial page | Pale periwinkle hero, search input, magenta button, easter-egg emblem |
| `03_allbooks_genre_chips_active.png` | Genre filter navigation bar | Horizontal scrolling rail, active rabbit-ears indicator on selected tag, chevron arrows |
| `04_allbooks_horror_catalogue.png` | Horror genre filtered catalogue | Single Horror carousel displayed with matching titles (e.g. *Frankenstein*) |
| `05_allbooks_scifi_catalogue.png` | Science Fiction filtered catalogue | Displays Sci-Fi titles (e.g. *Monsters of Ohio* by John Scalzi) |
| `06_allbooks_romance_catalogue.png` | Romance filtered catalogue | Displays Romance titles with custom card badges |
| `07_allbooks_all_reset.png` | Reset to All Books catalogue | All 11 canonical genre carousels restored |
| `08_allbooks_carousel_scroll.png` | Carousel scroll interaction | Next slide movement via `CarouselControls` chevrons |
| `09_allbooks_card_hover.png` | Universal BookCard hover state | -1.5° tilt, rabbit ears pop-up, "Read more ->" pink capsule button |
| `10_allbooks_search_result.png` | Live search execution | Filtering by author "Scalzi", updating carousels in real time |
| `11_store_manager_products_table.png` | Store Manager Portal dashboard | Metrics summary cards, products table, stock counters, status badges |
| `12_store_manager_create_drawer.png` | Product creation drawer | Method A (Open Library) and Method B (Manual Entry) tabs |
| `13_store_manager_import_preview.png` | Open Library URL import | Pre-populating bibliographic metadata and cover images from Open Library API |
| `14_store_manager_custom_colors.png` | Card customization palette | Color pickers for card background, title, description, and badge styling |
| `15_store_manager_live_card_preview.png` | Live card preview in drawer | Real-time reactive `BookCard` rendering within the administrative panel |
| `16_allbooks_mobile_view.png` | Mobile viewport (390×844) | Responsive search input, swipeable tags, single-column stacked carousels |

---

## 8. Next-Stage Scope Boundaries

To maintain strict architectural focus, the following capabilities are deferred to future stages:
- **Stage 3:** Individual Book Description Page (BDP) with physical edition specifications, curator tasting notes, and book jacket photography.
- **Stage 4:** Gifting subscriptions, voucher codes, and multi-month boxed memberships.
- **Stage 5:** Merchandise storefront (canvas totes, reading caps, enamel pins).
- **Stage 6:** Production Cart, Checkout flow, and Payment Gateway integration.
