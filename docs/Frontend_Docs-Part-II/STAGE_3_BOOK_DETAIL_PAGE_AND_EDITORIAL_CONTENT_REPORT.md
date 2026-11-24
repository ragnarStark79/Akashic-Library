# STAGE 3 IMPLEMENTATION & VISUAL FIDELITY REPORT
## INDIVIDUAL BOOK DETAIL PAGE (BDP), EDITORIAL CONTENT MANAGEMENT & ADD-TO-BOX INTEGRATION

**Date:** November 20, 2026  
**Milestone:** Part II: Akashic Store — Stage 3 & BDP Editorial Experience  
**Branch:** `ragnar/frontend` (Local working branch, strict zero commits / pushes / branch switches)  
**Lead Engineer:** Lead Frontend, Backend & GSAP Animation Engineer  

---

## 1. Executive Summary

Stage 3 completes the core consumer experience of the Akashic Store by introducing the individual **Book Detail Page (BDP)**, accessible by clicking the "Read more" button on any `BookCard` or navigating to `?view=store-book-detail&id=<id>`. This implementation delivers a high-fidelity frontend reconstruction of the authoritative original Aardvark Book Club detail experience (`frontend/site-clone/site_copy/books/bones-of-jade-flesh-like-ice/index.html`) while maintaining the Akashic Library dual-database architecture, rich editorial content management, and reactive Add-to-Box shopping cart integration.

### Core Deliverables Completed in Stage 3:
1. **Public Book Detail Page (`BookDetailPage`):**
   - **Store Header Update:** Replaced "Merch" with "Shopping Bag" including a real-time reactive item count pill badge.
   - **Hero Section (`BookDetailHero`):** Responsive organic wave backdrop (SVG paths), centered author headline, oversized Degular display title, genre capsules with custom emojis, and interactive circular rabbit emblem.
   - **Central 3D Book Cover (`BookDetailCover`):** Book cover positioned with responsive negative top margin (`-11.0625em` desktop, `-8.75em` tablet, `-6em` mobile) physically crossing the organic wave hero boundary into the content section, featuring 3D spine depth and realistic multi-layered drop shadow (`aspect-ratio: 643/925`, width `27.5em`).
   - **At a Glance Section (`BookDetailGlance`):** Handwritten section heading with a diamond/kite 2-column grid layout of curated highlight tags (cards 1 & 4 span full width).
   - **Synopsis & Complete Description (`BookDetailDescription`):** Prominent Degular reading synopsis, followed by complete multi-paragraph description arranged in 2 columns on desktop and 1 column on mobile.
   - **Don't Just Take Our Word For It (`BookDetailEditorialCards`):** Interactive testimonial cards reproducing the original `initCallout` / `data-call-out` physics using GSAP—tracking cursor movements to dynamically fan and rotate cards with spring elasticity.
   - **Get a Taste Excerpt (`BookDetailExcerpt`):** Organic wave container framing a textured white paper reading card (`flow__page`) displaying a sample passage.
   - **Book Notes Accordions (`BookDetailNotes`):** Centered rabbit emblem, "Book notes" title, and dual yellow rounded accordions for "🙋‍♀️ Why we chose" and "⚠️ Content warnings".
   - **Similar Titles Carousel (`BookDetailSimilarTitles`):** Horizontal scrollable carousel powered by `BookCarousel` and universal `BookCard` components, querying real PostgreSQL products sharing genres while excluding the current edition.
   - **Floating Persistent Add-to-Box CTA (`BookDetailFloatingCta`):** Fixed bottom-right action bar featuring twitching bunny ears (`::before` / `::after` CSS keyframe animations), real-time discount pricing calculations, stock-aware state, and automatic hiding when scrolled near the footer.

2. **Store Manager 2-Step Product Workflow (`StoreProductDrawer`):**
   - **Step 1 (`01 Product & Card`):** Bibliographic metadata, pricing, inventory stock, and universal BookCard visual customization.
   - **Step 2 (`02 Detail Page Content`):** Full BDP editorial editor supporting original pricing (for strikethrough discount calculations), hero theme colors, At a Glance highlight pills, Degular synopsis, complete description, editorial proof cards with custom background colors, reading excerpt, and Book Notes accordions.
   - **Live BDP Preview:** Embedded real-time preview of the BDP within the drawer, updating instantly as the manager edits fields.
   - **Direct Management Access:** Dedicated "Edit BDP" and "Edit Card" actions on each table row in `StoreManagerPage`.

3. **Backend Dual-Database & API Integration:**
   - **PostgreSQL `StoreProductDetail` Model:** 1-to-1 relationship with `StoreProduct`, storing BDP-specific editorial fields without altering canonical MongoDB records.
   - **Database Migration:** Applied `store.0003_storeproductdetail` cleanly.
   - **Zero N+1 Query Batch Enrichment:** Integrated `select_related('inventory', 'detail')` into Django ORM queries.
   - **Secure Detail Updates:** `PATCH /api/store/products/<id>/detail/` endpoint restricted to `STORE_MANAGER` and `ADMIN` users, with rich text sanitization (`sanitize_rich_text`) preventing XSS injection.
   - **Add-to-Box Commerce API:** `POST /api/store/products/<id>/add-to-box/` endpoint supporting authenticated and guest cart additions with stock validation.

4. **100% Quality Gate Certification:**
   - **TypeScript (`tsc -b`, `tsc --noEmit`):** 0 errors.
   - **ESLint (`eslint .`):** 0 errors.
   - **Frontend Vitest:** 47 test suites, 350 tests passing (including 10 comprehensive tests in `BookDetailPage.test.tsx`).
   - **Backend Django:** 26 tests passing in `store` (`tests_phase3.py`).
   - **Vite Production Build:** Succeeded in 2.12s.
   - **Visual Verification:** 7 browser screenshots captured and archived across desktop, tablet, mobile, Store Manager, and cart interactions.

---

## 2. Source of Truth & Architecture Compliance

### 2.1 Design Source of Truth (`frontend/site-clone/site_copy/`)
The clone folder remained strictly **READ-ONLY**. The exact HTML structure, CSS selectors, fluid units, SVG paths, and GSAP animation parameters were extracted from:
- `books/bones-of-jade-flesh-like-ice/index.html`:
  - Hero markup: `.hero-xs.is--bg-soft-orange`, `.hero-xs__paragraph`, `.hero-xs__title`, `.hero-xs__tags`.
  - 3D Cover: `.detail__header`, `.detail__visual`, `.detail__visual-img` with negative margin `-11.0625em`.
  - At a glance: `.kite-grid`, `.kite-item`.
  - Editorial callout: `data-call-out`, `data-call-out-item`, `data-call-out-child`.
  - Excerpt: `.flow__paper`, `.flow__page`.
  - Book notes: `.accordion-item`, `.accordion-summary`.
  - Floating CTA: `.floating-cta`, `.ears-wrap`, `.ear-left`, `.ear-right`.
- `_ext/slater.app/18601/54934.css`: Exact fluid layout and typography rules (`calc(100vw / 120)`).
- `_ext/slater.app/18601/54937.js`: Original `initCallout` interaction math and GSAP easing.

### 2.2 Dual-Database Strategy Compliance
The implementation honors the dual-database architecture specified in the project architecture report:
- **MongoDB (`akashic_discovery.books`):** Preserves immutable canonical bibliographic data (title, authors, canonical descriptions, ISBNs, Open Library identifiers).
- **PostgreSQL (`StoreProduct` & `StoreProductDetail`):** Houses commercial, editorial, and merchandising data (prices, discounts, hero themes, highlight tags, editorial quotes, excerpts, notes).
- **Zero N+1 Query Execution:** All store endpoints utilize `select_related('inventory', 'detail')` in PostgreSQL and batch-fetch canonical metadata from MongoDB using single `$in` queries (`books_collection.find({'_id': {'$in': object_ids}})`).

---

## 3. Component Architecture & Visual Implementation

### 3.1 Book Detail Page Layout Hierarchy
```
BookDetailPage (?view=store-book-detail&id=<id>)
├── StoreHeader (with "Shopping Bag" nav button & live item badge)
├── Back to All Books navigation row
├── BookDetailHero (Organic SVG wave, author, oversized title, genre badges, rabbit emblem)
├── BookDetailCover (3D cover crossing wave boundary with -11.0625em negative margin)
├── Content Container
│   ├── BookDetailGlance (Handwritten "At a glance", 4-tag diamond/kite grid)
│   ├── BookDetailDescription (Degular reading synopsis, 2-column complete description)
│   └── BookDetailEditorialCards (GSAP fanning cards, spring physics)
├── BookDetailExcerpt (Organic container, textured paper reading excerpt)
├── BookDetailNotes (Rabbit emblem, "Book notes" title, accordions for Why We Chose & Warnings)
├── BookDetailSimilarTitles (Horizontal carousel filtering real StoreProducts)
├── StoreFooter (Store links, sanctuary links, newsletter subscription)
└── BookDetailFloatingCta (Fixed bottom-right action button with bunny ears & discount price)
```

### 3.2 Detailed Section Specifications

#### 1. Store Header & Shopping Bag Badge
- Changed "Merch" to "Shopping Bag" in `storeNavigation.ts`.
- Integrated `subscribeCartCount` hook in `StoreHeader.tsx` and `StoreMobileMenu.tsx`.
- Added badge pill styling (`_cartBadge`) rendering current bag items when `count > 0`.

#### 2. Hero Section (`BookDetailHero.tsx`)
- Organic wave SVG background with desktop and mobile path variants.
- Author display: `Degular Semibold`, centered uppercase letterspaced.
- Title: `Degular Bold / Champ ExtraBold`, fluid sizing (`clamp(2.5rem, 6vw, 4.5rem)`), organic word wrapping.
- Genre badges: Rounded capsules with emoji icons (`👋 Debut Novel`, `🔮 Fantasy`, `🕯️ Historical`, `🐱 Includes a Cat`).
- Interactive rabbit emblem with hover scale and micro-interactions.

#### 3. Central 3D Book Cover (`BookDetailCover.tsx`)
- Desktop negative margin: `-11.0625em` (`-177px`), tablet: `-8.75em`, mobile: `-6em`.
- Proportions: `aspect-ratio: 643/925`, `max-width: 27.5em`.
- 3D spine depth with layered drop shadow (`box-shadow: 0 24px 48px -12px rgba(0,0,0,0.35)`).

#### 4. At a Glance Highlight Grid (`BookDetailGlance.tsx`)
- Handwritten font: `Caveat / Playpen Sans`, tilted at `-2°`.
- Grid: 2 columns on desktop. Tags 1 and 4 span `grid-column: 1 / -1`, creating a distinct kite/diamond shape.
- Color palettes: Vivid pill backgrounds with high-contrast text.

#### 5. Synopsis & Complete Description (`BookDetailDescription.tsx`)
- Synopsis: Prominent Degular font (`1.35rem`, line height `1.5`), styled as an editorial hook.
- Complete description: Rendered in two columns on desktop (`column-count: 2`, `column-gap: 3rem`) and single column on mobile.

#### 6. Don't Just Take Our Word For It (`BookDetailEditorialCards.tsx`)
- Reconstructed original `initCallout` / `data-call-out` GSAP physics.
- Cursor movement across the container calculates active card index.
- Hovered card scales to `1.075` and rotates to `0°`, while non-hovered cards shift along the X-axis (`xPercent: 35 / (i - activeIdx)`) with spring easing (`elastic.out(1, 0.75)`).
- Full reduced-motion fallback preserving static readability.

#### 7. Get a Taste Excerpt (`BookDetailExcerpt.tsx`)
- Framed by organic waves echoing the hero aesthetic.
- Central textured white paper card (`border-radius: 1.5rem`, drop shadow, serif typography) mimicking physical book pages.

#### 8. Book Notes Accordions (`BookDetailNotes.tsx`)
- Rabbit emblem header with `"Book notes"` heading.
- Yellow rounded accordion bars (`#FDF8D2` background, smooth expand/collapse).
- "🙋‍♀️ Why we chose" explaining curator rationale.
- "⚠️ Content warnings" displaying tags or list items for reader safety.

#### 9. Similar Titles Carousel (`BookDetailSimilarTitles.tsx`)
- Reuses universal `BookCard` and `BookCarousel`.
- Filters available store products by overlapping genres, excluding the active product.

#### 10. Persistent Floating Add-to-Box CTA (`BookDetailFloatingCta.tsx`)
- Fixed at `bottom: 2rem; right: 2.5rem;` on desktop; full-width floating bar on mobile.
- Bunny ears emerging from the top of the button with idle twitch animation keyframes (`@keyframes earTwitchLeft`, `@keyframes earTwitchRight`).
- Discount price calculation: displays current selling price, strikethrough original price, and `-X%` badge when discounted.
- Automatic hide on scroll: disappears when scrolling within 350px of footer to prevent UI collision.

---

## 4. Store Manager 2-Step Editorial Workflow

The product management drawer (`StoreProductDrawer.tsx`) has been elevated into a 2-step workflow:

1. **Step 1: Product & Card (`01 Product & Card`)**
   - Open Library 1-click import (URL, ISBN, work ID).
   - Commercial data: price, status, SKU, stock quantity.
   - Universal BookCard customization: background color, title color, description color, genre tag color overrides.

2. **Step 2: Detail Page Content (`02 Detail Page Content`)**
   - Hero aesthetic customization (hero background color, wave color).
   - Original price input (automatically computes discount percentage and enables strikethrough).
   - At a Glance tag manager (emoji, text, and pill color pickers).
   - Degular synopsis editor.
   - Complete description multi-paragraph rich text editor.
   - Editorial proof card manager (quote, attribution, publication, card background color).
   - Sample reading excerpt textarea.
   - Curator notes and content warnings managers.
   - **Embedded Live BDP Preview:** Live rendered preview inside the drawer, updating instantly with every keystroke.

3. **Direct Table Navigation:**
   - Management rows in `StoreManagerPage.tsx` feature dual action buttons:
     - `Edit Card`: Opens drawer directly to Step 1.
     - `Edit BDP`: Opens drawer directly to Step 2.

---

## 5. Backend Architecture & API Specifications

### 5.1 Models (`Akashic_Library/store/models.py`)
```python
class StoreProductDetail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.OneToOneField(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name="detail"
    )
    original_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    hero_theme = models.JSONField(default=dict, blank=True)
    at_a_glance = models.JSONField(default=list, blank=True)
    synopsis = models.TextField(blank=True, default="")
    full_description = models.TextField(blank=True, default="")
    editorial_cards = models.JSONField(default=list, blank=True)
    excerpt = models.TextField(blank=True, default="")
    why_we_chose = models.TextField(blank=True, default="")
    content_warnings = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 5.2 Endpoints (`Akashic_Library/store/urls.py`)
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/store/products/<id>/` | Returns enriched product item with BDP detail | Public |
| `PATCH` | `/api/store/products/<id>/detail/` | Updates BDP editorial content | Store Manager / Admin |
| `POST` | `/api/store/products/<id>/add-to-box/` | Adds product to cart with stock validation | Public / Authenticated |

---

## 6. Verification & Quality Gates

### 6.1 Test Suite Results
- **TypeScript Compilation:** Passed with 0 errors.
  ```bash
  npm --prefix frontend run build
  # tsc -b && vite build -> built in 2.12s
  ```
- **Lint Verification:** Passed with 0 errors.
  ```bash
  npm --prefix frontend run lint
  # eslint . -> 0 errors
  ```
- **Frontend Unit Tests:** 47 test suites, 350 tests passed (100% pass rate).
  ```bash
  npm --prefix frontend run test -- --run
  # Test Files  47 passed (47)
  # Tests       350 passed (350)
  ```
- **Backend Unit Tests:** 26 test suites passed in `store`.
  ```bash
  python manage.py test store
  # Ran 26 tests in 9.941s -> OK
  ```

### 6.2 Browser Screenshots Captured
All screenshots have been generated and preserved under `screenshots/` and `Akashic_Library/screenshots/`:
1. `stage3_01_bdp_desktop_hero_1440.png`: Desktop hero fold, oversized title, genre badges, rabbit emblem, and 3D cover crossing wave boundary.
2. `stage3_02_bdp_desktop_fullpage_1440.png`: Full page desktop capture showing glance tags, synopsis, description, editorial cards, excerpt, notes, similar titles, and footer.
3. `stage3_03_bdp_tablet_768.png`: Tablet viewport (768×1024) responsive layout.
4. `stage3_04_bdp_mobile_375.png`: Mobile viewport (375×812) stacked layout and responsive floating CTA.
5. `stage3_05_store_manager_bdp_editor.png`: Store Manager Step 2 BDP editorial editor with color pickers and live preview.
6. `stage3_06_store_manager_step1_card.png`: Store Manager Step 1 product and card configuration.
7. `stage3_07_shopping_bag_live_badge.png`: Store navigation showing "Shopping Bag" with live counter badge (`1`).

---

## 7. Working Branch & Safety Commitments
- **Working Branch:** `ragnar/frontend` (inside `Akashic_Library`).
- **Commit History:** 0 git commits, 0 git pushes, 0 branch switches, 0 stashes, 0 resets.
- **Reference Site:** `frontend/site-clone/site_copy/` maintained strictly **READ-ONLY**.
- **Scope Compliance:** Zero checkout, payment gateway, order placement, or standalone cart page introduced in Stage 3.
