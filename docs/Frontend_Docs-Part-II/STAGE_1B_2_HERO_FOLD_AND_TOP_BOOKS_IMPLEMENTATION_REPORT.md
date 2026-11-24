# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 1B.2 — HERO FOLD COMPLETION & OUR TOP BOOKS SECTION IMPLEMENTATION REPORT

**Date:** November 19, 2026  
**Milestone:** Stage 1B.2 — Hero Fold Completion & Our Top Books Section  
**Repository Branch:** `ragnar/frontend`  
**Reference Source:** `frontend/site-clone/site_copy/` (Aardvark Book Club local clone)  
**Implementation Location:** `frontend/src/pages/Store/`

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES

Stage 1B.2 builds directly upon the established Stage 1B.1.3 responsive architecture, executing two core objectives:

1. **Part A — Hero Fold Height & Curve Containment:** Corrected the desktop hero viewport dimensions so that the initial desktop viewport (1440×900 and above) displays a 100% edge-to-edge organic yellow hero surface. The bottom organic rounded curve (`10em` desktop, `2.5em` mobile) and white page background corners are completely hidden below the fold on initial load and appear naturally only upon user scrolling.
2. **Part B — "Our Top Books" Section Reconstruction:** Replaced the temporary "Our Nov books" placeholder with the complete, interactive "Our Top Books" horizontal carousel rail matching the Aardvark Book Club reference. This includes editorial typography, handwritten accent calligraphy, circular navigation controls, staggered vertical zigzag card offsets, authentic rabbit-ear hover animations, dual-capsule "Read more ->" CTAs, and 6 curated books with localized cover artwork.

---

## 2. PART A — HERO FOLD HEIGHT & CURVE CONTAINMENT

### Defect Analysis
In previous iterations, the hero element had `min-height: 100svh`, causing the bottom rounded clipping mask (`clip-path: inset(0% round 0 0 10em 10em)`) and white page background corners to peek into the lower viewport at standard desktop resolutions (1440×900). In the original reference (`aardvark-book-club.webflow.shared.cbb7ba7ab.min.css`), `.hero` has `height: 87.5em`, ensuring that the bottom fold remains well below the initial 900px viewport.

### Solution Implemented
- In `frontend/src/pages/Store/components/StoreHero/StoreHero.module.css`:
  - Desktop `.hero`: Set `min-height: 122vh` (exceeding 1050px on a 900px display).
  - Maintained `clip-path: inset(0% round 0 0 10em 10em)` on desktop and `round 0 0 2.5em 2.5em` on mobile (`max-width: 991px`).
  - Scrolled curve appearance: As the reader scrolls downward (`scrollY > 400px`), the bottom curve and crisp white page background enter the viewport seamlessly.

---

## 3. PART B — "OUR TOP BOOKS" SECTION RECONSTRUCTION

### 1. Section Header & Typography
- **Heading:** "Our Top Books" rendered in bold `Champ` display font (`#1C2826`, `font-size: clamp(2.5rem, 6vw, 4.25rem)`).
- **Approved Description:** "Explore noteworthy releases, remarkable stories and carefully selected editions from the Akashic Store." rendered in `Degular` (`#1C2826`, `font-weight: 600`).
- **Handwritten Accent Script:** "Discover hidden gems and buzzy new releases" rendered in `Hello Organichand Webfont` (`#3B308F`), rotated `-10deg` on desktop and positioned at the top-left of the section header.

### 2. Carousel Navigation Controls
- Circular Previous (`<`, rotated `-180deg`) and Next (`>`) buttons positioned in the upper right.
- Distinct states:
  - **Active state:** Solid dark `#1C2826` circular capsule with bounce hover transition (`transform: scale(1.08)`).
  - **Disabled state:** `opacity: 0.25; pointer-events: none; cursor: default;` when at start or end bounds.
- Supports programmatic smooth scrolling (`clientWidth * 0.75`), native keyboard navigation, and mouse drag-to-scroll.

### 3. Staggered Vertical Zigzag Offsets
Matching reference `54937.js` (`ParallaxSlider`):
- **Even Cards (0, 2, 4):** Lower vertical baseline (`translateY(+5% to +6.5%)`) with positive tilt (`rotate(+1.7° to +1.9°)`).
- **Odd Cards (1, 3, 5):** Elevated vertical baseline (`translateY(-5% to -6%)`) with negative tilt (`rotate(-2.0° to -2.3°)`).

### 4. Interactive Editorial Book Cards
Each card features:
- **Aspect-ratio 320/460** rounded book cover artwork with subtle drop shadows (`box-shadow: 0 6px 18px rgba(0,0,0,0.18)`).
- **Dynamic Background Colors:** Matching each curated title's bespoke palette (e.g., `#5e0f12` for Milkteeth, `#dddf20` for Lethal Kiss, `#d74a5a` for Bones of Jade).
- **Pill Genre Tags:** Authentic multi-colored tags (Debut Novel, Fantasy, Romance, LGBTQIA+, Horror, Sci-Fi, Includes a Cat, Includes a Dog).
- **Rabbit-Ear Decorative Animation:** Dual left (`viewBox="0 0 44 45"`) and right (`viewBox="0 0 29 80"`) ear SVGs that pop out from top-center of the card on hover with keyframe twitch animations (`@keyframes earTwitchLeft`, `earTwitchRight`).
- **Dual-Capsule "Read more ->" CTA:** Custom `button-alt` pill with hot pink background (`#FF008F`), white text, and right arrow that slides down and bounces into view on card hover.

### 5. Curated Book Entries
All 6 books utilize localized PNG assets copied from `site-clone/site_copy/`:
1. **Milkteeth** by Caitlin Starling (Burgundy background `#5e0f12`, Horror, LGBTQIA+, Gothic).
2. **Lethal Kiss** by Taylor Grothe (Lime/Chartreuse background `#dddf20`, Romance, Fantasy, LGBTQIA+, Horror, Mystery).
3. **Bones of Jade, Flesh like Ice** by Gracie Marsden (Coral Red background `#d74a5a`, Debut Novel, Fantasy, Historical, Includes a Cat).
4. **Monsters of Ohio** by John Scalzi (Slate Blue background `#5a8aab`, Sci-Fi, Satire, Includes a Cat, Includes a Dog).
5. **Stations** by Louise Kennedy (Lilac Lavender background `#d7bbda`, Literary, Includes a Dog).
6. **There Used to Be People Here** by Eliot Peper (Midnight Navy background `#081424`, Debut Novel, Sci-Fi, Thriller, LGBTQIA+, Includes a Dog).

---

## 4. AUTOMATED QUALITY GATES & VERIFICATION

All automated gates were executed and passed cleanly:

| Check | Command | Status | Notes |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | **PASSED** | 0 errors |
| **ESLint Quality** | `npm run lint` | **PASSED** | 0 warnings, 0 errors |
| **Vitest Test Suite** | `npm run test` | **PASSED** | 39 test suites, 289 tests passed |
| **Production Build** | `npm run build` | **PASSED** | Bundled cleanly with Vite |

---

## 5. VISUAL VERIFICATION GALLERY

| State / Viewport | Screenshot File | Description |
|---|---|---|
| **Initial Desktop Hero (1440×900)** | `screenshots/stage1b2_hero_initial_1440.png` | 100% edge-to-edge yellow canvas, zero bottom curve visible |
| **Scrolled Hero Curve (1440×900)** | `screenshots/stage1b2_hero_scrolled_curve_1440.png` | Smooth curve transition with white corners entering viewport |
| **Top Books Header (1440×900)** | `screenshots/stage1b2_top_books_1440.png` | "Our Top Books" heading, handwritten note, and controls |
| **Card Hover & Rabbit Ears (1440×900)** | `screenshots/stage1b2_card_hover_1440.png` | Bones of Jade card hover with twitching rabbit ears & Read More button |
| **Carousel Scrolled State (1440×900)** | `screenshots/stage1b2_carousel_scrolled_1440.png` | Cards 4, 5, 6 in view with active previous button |
| **Laptop (1280×800)** | `screenshots/stage1b2_top_books_1280.png` | Verified responsive proportions at 1280px |
| **iPad Pro 13 (1032×1376)** | `screenshots/stage1b2_top_books_ipad1032.png` | Verified tablet portrait layout at 1032px |
| **Tablet Portrait (768×1024)** | `screenshots/stage1b2_top_books_768.png` | Verified centered heading with left-aligned script note |
| **Large Mobile (440×956)** | `screenshots/stage1b2_top_books_440.png` | Touch-friendly carousel rail with zero page-level horizontal overflow |
| **Standard Mobile (390×844)** | `screenshots/stage1b2_top_books_390.png` | Verified compact mobile typography and card spacing |
| **Compact Mobile (360×740)** | `screenshots/stage1b2_top_books_360.png` | Verified small-screen responsiveness and button touch targets |

---

## 6. INVENTORY OF MODIFIED & CREATED FILES

### Created Components & Assets
- `frontend/src/pages/Store/assets/images/cards/card-milkteeth.png`
- `frontend/src/pages/Store/assets/images/cards/card-lethalkiss.png`
- `frontend/src/pages/Store/assets/images/cards/card-bonesofjade.png`
- `frontend/src/pages/Store/assets/images/cards/card-monstersofohio.png`
- `frontend/src/pages/Store/assets/images/cards/card-stations.png`
- `frontend/src/pages/Store/assets/images/cards/card-thereusedtobepeople.png`
- `frontend/src/pages/Store/components/StoreBooksSection/types.ts`
- `frontend/src/pages/Store/components/StoreBooksSection/data/topBooksData.ts`
- `frontend/src/pages/Store/components/StoreBooksSection/components/RabbitEars.tsx` & `RabbitEars.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/components/ReadMoreButton.tsx` & `ReadMoreButton.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/components/CarouselControls.tsx` & `CarouselControls.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/components/BookCard.tsx` & `BookCard.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/components/BookCarousel.tsx` & `BookCarousel.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/StoreTopBooksSection.tsx` & `StoreTopBooksSection.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/StoreTopBooksSection.test.tsx`
- `frontend/src/pages/Store/components/StoreBooksSection/index.ts`

### Modified Files
- `frontend/src/pages/Store/StoreApp.tsx` (Connected `StoreTopBooksSection`)
- `frontend/src/pages/Store/components/StoreHero/StoreHero.module.css` (Adjusted desktop hero height to `122vh`)

### Removed Obsolete Files
- `frontend/src/pages/Store/components/StoreBooksSection/StoreNovBooksSection.tsx`
- `frontend/src/pages/Store/components/StoreBooksSection/StoreNovBooksSection.module.css`
- `frontend/src/pages/Store/components/StoreBooksSection/StoreNovBooksSection.test.tsx`
