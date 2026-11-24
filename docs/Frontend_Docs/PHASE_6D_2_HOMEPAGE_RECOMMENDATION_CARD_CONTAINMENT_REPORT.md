# PHASE 6D.2: HOMEPAGE CURATED RECOMMENDATIONS — CARD SIZING, IMAGE CONTAINMENT & RESPONSIVE CAROUSEL CLOSEOUT REPORT

**Date:** 2026-11-16  
**Status:** COMPLETED & VERIFIED  
**Milestone:** Phase 6D.2 Targeted UI Bug Fix  
**Repository Branch:** `ragnar/frontend`  
**Git Safety Notice:** Implementation and documentation only. Per prompt Section 11, **zero Git commits or pushes** have been performed. All changes remain staged/unstaged in the local working copy.

---

## 1. EXECUTIVE SUMMARY & ROOT CAUSE ANALYSIS

### 1.1 Problem Statement
In the Akashic Library Discovery Homepage (`/#recommendations`), the **Curated Recommendations** section exhibited severe layout instability when presenting certain book covers—most notably *Alvar Aalto* (`https://covers.openlibrary.org/b/id/4467119-L.jpg`) and other titles with non-standard cover dimensions. The book card expanded uncontrollably beyond its allocated boundaries, squashing neighboring cards, distorting the layout grid, and collapsing into a vertical stack on mobile devices rather than presenting an elegant horizontal browsing shelf.

### 1.2 Reference Benchmark: Kindred Explorations
During Phase 6D.1, the Book Details page's **Kindred Explorations** section (`frontend/src/pages/BookDetail/BookDetailPage.tsx`, `BookDetailPage.module.css`) was stabilized to enforce uniform card dimensions, 2:3 aspect ratio book-cover containment (`object-fit: contain` on `var(--color-surface-inset)`), and a smooth horizontal carousel shelf. The objective of Phase 6D.2 was to bring the Discovery Homepage's Curated Recommendations into exact visual, architectural, and structural parity with the Kindred Explorations reference implementation.

### 1.3 Root Cause Analysis
The defect stemmed from three compounding layout mechanics in `DiscoveryHome.module.css` and `DiscoveryHome.tsx`:
1. **CSS Grid `1fr` Column Track Flexibility:**  
   The recommendations container was styled with `display: grid; grid-template-columns: repeat(4, 1fr)`. In CSS Grid, track sizing of `1fr` defaults to `minmax(auto, 1fr)`. If an item's content—such as an image without strict max-width constraints or long unbreakable metadata—has a minimum content size larger than the track, the browser expands that column to accommodate the minimum content size. Consequently, *Alvar Aalto* forced its column to expand, while the remaining 3 columns were compressed into slivers.
2. **Absence of Rigid Item Constraints:**  
   Unlike `BookDetailPage.module.css` which constrained items with `flex: 0 0 250px; width: 250px; max-width: 250px; min-width: 250px;`, the homepage cards were unconstrained flex/grid children, making them vulnerable to content explosion.
3. **Mobile Vertical Collapse:**  
   On mobile viewports (`max-width: 768px`), the CSS rule collapsed the grid into a single column (`grid-template-columns: 1fr`), completely removing the horizontal browsing experience and forcing users to scroll vertically through tall cards.

---

## 2. ARCHITECTURAL & SIZING STRATEGY

### 2.1 Uniform Dimensional Hierarchy
To ensure that all cards maintain identical, rock-solid proportions regardless of image aspect ratios or text lengths, rigid dimensional constraints were introduced across five responsive tiers:

| Viewport Category | Viewport Width | Card Width (`flex: 0 0 <W>; width: <W>`) | Image Container Dimensions | Aspect Ratio |
|---|---|---|---|---|
| **Desktop Wide** | `≥ 1440px` | `250px` | `216px × 324px` | `2 : 3` |
| **Standard Desktop / Laptop** | `1280px` | `250px` | `216px × 324px` | `2 : 3` |
| **Landscape Tablet / Small Laptop** | `1024px` | `220px` | `186px × 279px` | `2 : 3` |
| **Portrait Tablet** | `768px` | `200px` | `166px × 249px` | `2 : 3` |
| **Mobile Large / Medium** | `480px / 440px / 390px` | `185px` | `151px × 226.5px` | `2 : 3` |
| **Small Mobile** | `360px` | `165px` | `131px × 196.5px` | `2 : 3` |

### 2.2 Standardized Card Anatomy
Every recommendation card in the shelf consists of four strictly regulated vertical regions:
1. **Fixed-Height Reason Badge Slot (`26px`):**  
   Positioned above each card, `.reasonBadgeSlot` reserves a constant `26px` height. Badges feature single-line ellipsis text (`text-overflow: ellipsis; white-space: nowrap; overflow: hidden`), ensuring recommendations with differing badge text lengths do not cause card vertical misalignment.
2. **Standardized 2:3 Cover Container:**  
   The image wrapper enforces `aspect-ratio: 2 / 3` with an inset warm stone background (`var(--color-surface-inset)`). The `<img>` is styled with `object-fit: contain; width: 100%; height: 100%; max-width: 100%; max-height: 100%;`.
3. **Clamped Metadata Section:**  
   Book titles are clamped to a maximum of 2 lines (`-webkit-line-clamp: 2`), and author names are clamped to 1 line (`-webkit-line-clamp: 1`).
4. **Bottom-Aligned Explore Action:**  
   The footer action ("Explore →") uses `margin-top: auto` within `.carouselCard`, ensuring all call-to-action buttons align on the exact same horizontal baseline across the entire shelf.

---

## 3. IMPLEMENTATION DETAILS

### 3.1 CSS Rules (`DiscoveryHome.module.css`)
```css
/* ── Horizontal Shelf / Carousel Track ── */
.recommendationsShelf,
.recommendationsGrid {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-2) var(--space-6);
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-subtle) transparent;
  width: 100%;
}

/* ── Rigid Item Wrapper ── */
.carouselItemWrapper,
.recommendationCardWrapper,
.recommendationsShelf > *,
.recommendationsGrid > * {
  flex: 0 0 250px;
  width: 250px;
  max-width: 250px;
  min-width: 250px;
  scroll-snap-align: start;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Card & Image Containment ── */
.carouselCard {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.recommendationsShelf img,
.carouselCard img {
  object-fit: contain !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

/* ── Fixed-Height Badge Slot ── */
.reasonBadgeSlot {
  height: 26px;
  min-height: 26px;
  display: flex;
  align-items: center;
  min-width: 0;
}
```

### 3.2 Responsive Breakpoints
```css
/* Tablet (1024px) */
@media (max-width: 1024px) {
  .carouselItemWrapper,
  .recommendationsShelf > * {
    flex: 0 0 220px;
    width: 220px;
    max-width: 220px;
    min-width: 220px;
  }
}

/* Tablet (768px) */
@media (max-width: 768px) {
  .carouselItemWrapper,
  .recommendationsShelf > * {
    flex: 0 0 200px;
    width: 200px;
    max-width: 200px;
    min-width: 200px;
  }
}

/* Mobile (480px / 440px / 390px) */
@media (max-width: 480px) {
  .carouselItemWrapper,
  .recommendationsShelf > * {
    flex: 0 0 185px;
    width: 185px;
    max-width: 185px;
    min-width: 185px;
  }
}

/* Small Mobile (360px) */
@media (max-width: 360px) {
  .carouselItemWrapper,
  .recommendationsShelf > * {
    flex: 0 0 165px;
    width: 165px;
    max-width: 165px;
    min-width: 165px;
  }
}
```

### 3.3 Interactive Header Carousel Navigation (`DiscoveryHome.tsx`)
```tsx
const recommendationsShelfRef = useRef<HTMLDivElement>(null);

const scrollRecommendations = (direction: 'left' | 'right') => {
  const container = recommendationsShelfRef.current;
  if (!container) return;
  const scrollDistance = container.clientWidth * 0.75;
  const isReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  container.scrollBy({
    left: direction === 'left' ? -scrollDistance : scrollDistance,
    behavior: isReducedMotion ? 'auto' : 'smooth',
  });
};
```
When `isAuthenticated && recommendations.length > 3`, circular pill navigation buttons (`<button aria-label="Scroll recommendations left">` and `<button aria-label="Scroll recommendations right">`) are rendered directly within the section header.

---

## 4. BROWSER VERIFICATION MATRIX

Live verification was executed in Chrome DevTools against the live Vite application running at `http://127.0.0.1:3000/`, backed by Django at `http://127.0.0.1:8000/`. Verification was performed using user `shivam` (the exact test account containing *Alvar Aalto*, *Louis I. Kahn*, *E.E. Cummings*, and *Dante Gabriel Rossetti*) and user `kartik` (10 curated recommendations for scroll testing).

| Viewport | Target Width | Measured Card Width | Measured Card Height | Measured Image Size | Scroll State / Controls | Screenshot Link |
|---|---|---|---|---|---|---|
| **1440px (Desktop Wide)** | `250px` | `250.0px` | `552.8px` | `216px × 324px` | Prev/Next Chevrons Visible | [phase6d2_homepage_recommendations_1440.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_1440.png) |
| **1280px (Standard Desktop)** | `250px` | `250.0px` | `552.8px` | `216px × 324px` | Prev/Next Chevrons Visible | [phase6d2_homepage_recommendations_1280.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_1280.png) |
| **1024px (Landscape Tablet)** | `220px` | `220.0px` | `507.8px` | `186px × 279px` | Prev/Next Chevrons Visible | [phase6d2_homepage_recommendations_1024.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_1024.png) |
| **768px (Portrait Tablet)** | `200px` | `200.0px` | `477.8px` | `166px × 249px` | Prev/Next Chevrons Visible | [phase6d2_homepage_recommendations_768.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_768.png) |
| **440px (Mobile Large)** | `185px` | `185.0px` | `455.3px` | `151px × 226.5px` | Horizontal Touch Swiping | [phase6d2_homepage_recommendations_440.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_440.png) |
| **390px (Mobile Medium)** | `185px` | `185.0px` | `455.3px` | `151px × 226.5px` | Horizontal Touch Swiping | [phase6d2_homepage_recommendations_390.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_390.png) |
| **360px (Small Mobile)** | `165px` | `165.0px` | `443.3px` | `131px × 196.5px` | Horizontal Touch Swiping | [phase6d2_homepage_recommendations_360.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_360.png) |
| **Scrolled Shelf State (10 Cards)** | `250px` | `250.0px` | `552.8px` | `216px × 324px` | Smooth scrollBy 802px | [phase6d2_homepage_recommendations_scrolled.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_homepage_recommendations_scrolled.png) |
| **Book Detail Kindred Parity** | `250px` | `250.0px` | `518.8px` | `216px × 324px` | Zero Visual Deviation | [phase6d2_book_details_kindred_reference.png](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/docs/Frontend_Docs/screenshots/phase6d2_book_details_kindred_reference.png) |

---

## 5. QUALITY ASSURANCE & REGRESSION VERIFICATION

### 5.1 Frontend Unit Tests (Vitest)
All 29 test suites were executed with 100% pass rate:
```
$ npm --prefix Akashic_Library/frontend test -- --run
Test Files  29 passed (29)
     Tests  243 passed (243)
  Duration  9.10s
```
Specific tests validated:
- `BookCard.test.tsx`: 9/9 passed (verified custom className forwarding, imageFit="contain", aspect ratio, action buttons).
- `DiscoveryHome.test.tsx`: 5/5 passed (verified carousel track rendering, button presence when recommendations > 3, scrollBy trigger).

### 5.2 TypeScript Build & Linting
Production build and static analysis completed with zero errors and zero warnings:
```
$ npm --prefix Akashic_Library/frontend run build
vite v6.4.6 building for production...
✓ built in 1.56s

$ npm --prefix Akashic_Library/frontend run lint
> eslint .
(Clean exit: 0 errors, 0 warnings)
```

### 5.3 Django Backend Test Suite
Django recommendation and discovery test suites were verified:
```
$ python3 Akashic_Library/manage.py test discovery.tests_step4 recommendations --settings=Akashic_Library.test_settings
Ran 102 tests in 15.823s
OK
```

### 5.4 Cross-Feature Non-Regression
- **From the Archives:** The Open Library Highlights grid continues to render standard 4-column responsive grid on desktop and horizontally scrollable snap-track on mobile (`max-width: 768px`).
- **Wander Through the Archives (Genres):** 8 genre cards render in 4-column grid with intact hover states, navigation links, and icons.
- **Book Details (Kindred Explorations):** Verified at `http://127.0.0.1:3000/?view=book-detail&id=6af6c5c544bc1bb117770997`. Kindred folios carousel renders 250px cards with 2:3 image containment and smooth scrolling, completely unaffected.
- **Personal Library & Reading Room:** Zero modifications or regressions.

---

## 6. FILES MODIFIED & GIT STATUS

### 6.1 Modified Files
- [DiscoveryHome.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.tsx): Added horizontal carousel track ref, scroll handler with reduced-motion detection, previous/next carousel navigation buttons, fixed-height reason badge slot, and imageFit="contain" forwarding to BookCard.
- [DiscoveryHome.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.module.css): Replaced fragile CSS Grid with horizontal flex-nowrap carousel shelf, rigid item wrapper dimensions across 5 responsive breakpoints, image containment rules, and reason badge height constraints.
- [BookCard.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/discovery/BookCard/BookCard.test.tsx): Added unit tests for className forwarding and imageFit prop.
- [DiscoveryHome.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/DiscoveryHome/DiscoveryHome.test.tsx): Added carousel track and navigation button scroll behavior tests.

### 6.2 Strict Git Compliance
```
$ git -C Akashic_Library status -s
 M frontend/src/components/discovery/BookCard/BookCard.test.tsx
 M frontend/src/pages/DiscoveryHome/DiscoveryHome.module.css
 M frontend/src/pages/DiscoveryHome/DiscoveryHome.test.tsx
 M frontend/src/pages/DiscoveryHome/DiscoveryHome.tsx
```
**Zero commits created. Zero pushes attempted.** All changes remain in the local working directory awaiting Part II workflow directions.
