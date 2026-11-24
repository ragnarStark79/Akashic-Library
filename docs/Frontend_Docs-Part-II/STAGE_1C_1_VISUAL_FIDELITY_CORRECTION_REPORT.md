# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 1C.1 — VISUAL FIDELITY CORRECTION & INTERACTION STABILIZATION REPORT

**Milestone:** Stage 1C.1 — Visual Fidelity Correction & Interaction Stabilization  
**Date:** November 19, 2026  
**Repository Branch:** `ragnar/frontend` (Strict local branch; 0 commits, 0 pushes)  
**Authoritative Source of Truth:** `frontend/site-clone/site_copy/` (Read-only reference)  
**Implementation Components:**
- `frontend/src/pages/Store/components/HowItWorks/`
- `frontend/src/pages/Store/components/ChooseFrom/`

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE CLOSURE

Stage 1C.1 was executed as a targeted visual-fidelity and interaction-stabilization milestone following the implementation of Stage 1C. Direct side-by-side browser comparisons against the authentic local Aardvark Book Club clone (`frontend/site-clone/site_copy/`) identified four critical discrepancies:

1. **How It Works Oversized Composition:** Cards rendered at 400px × 600px (`25rem × 37.5rem` based on 16px root), requiring extensive scrolling to see card titles and descriptions. In the authentic reference, the entire section fits gracefully within a single 1440×900 viewport.
2. **How It Works Hover & Card-Fanning Physics:** Card fanning did not fully mirror the reference's `initCallout` interaction formula (`xPercent = 45 / (index - activeIndex)`).
3. **Choose From Typography & Color:** Category titles were rendered in slate/dark-green (`#1C2826`) and oversized (128px/160px), whereas the original uses pure black (`#000000` / `var(--black)`) and 96px (8em) base / 120px (10em) hover typography.
4. **Choose From Hover Oscillation & Flicker Bug:** Rapid pointer movement between adjacent genres (e.g., Romance and Thriller) previously caused rapid oscillation where both categories appeared active and multiple covers overlapped during CSS opacity cross-fades.

All four issues have been resolved. The implementation passes all automated quality gates (41 test suites, 303 unit/integration tests, zero TypeScript errors, clean production bundle) and was visually verified across all 7 responsive viewports and all 4 card hover states.

---

## 2. ROOT CAUSE INVESTIGATION & SOURCE OF TRUTH ANALYSIS

### 2.1 The `--size-font` Formula and Dimensional Inflation
Inspection of `frontend/site-clone/site_copy/_ext/slater.app/18601/54934.css` revealed the reference website's dynamic root font calculation:
```css
:root {
  --size-font: calc(clamp(992px, 100vw, 3840px) / (1920 / 16));
}
body {
  font-size: var(--size-font);
}
```
At a standard desktop viewport of 1440px:
$$\text{font-size} = \frac{1440}{120} = 12\text{px}$$

In the Webflow stylesheet (`aardvark-book-club.webflow.shared.cbb7ba7ab.min.css`), all dimensional values were defined in `em` units relative to this 12px body font. When our previous React implementation ported these values directly into `rem` (where root `html = 16px`), every element was inflated by **33.3%**:

| Element | Reference (`em` @ 12px) | Reference (px) | Previous React (`rem`) | Corrected React (`rem` @ 16px) |
| :--- | :--- | :--- | :--- | :--- |
| **Card Width** | `25em` | `300px` | `25rem` (400px) | `18.75rem` (300px) |
| **Card Height** | `37.5em` | `450px` | `37.5rem` (600px) | `28.125rem` (450px) |
| **Card Overlap** | `-5em` | `-60px` | `-5rem` (-80px) | `-3.75rem` (-60px) |
| **Section Header Padding** | `7.5em` | `90px` | `7.5rem` (120px) | `5.625rem` (90px) |
| **Section Content Padding** | `9em / 7.5em` | `108px / 90px` | `8.5rem / 7.5rem` | `5.625rem` (90px) |
| **Flow Title** (`u-heading-l`) | `3.4375em` | `41.25px` | `5.25rem` (~84px) | `2.578rem` (41.25px) |
| **Annotation Text** | `1.5em` | `18px` | `1.5rem` (24px) | `1.125rem` (18px) |
| **Brand Seal Logo** | `5em` | `60px` | `4.5rem` (72px) | `3.75rem` (60px) |
| **Capsule CTA Height** | `3.25em` | `39px` | `3.25rem` (52px) | `2.45rem` (39px) |
| **Category Base Font** | `8em` | `96px` | `8rem` (128px) | `6rem` (96px) |
| **Category Hover Font** | `10em` | `120px` | `10rem` (160px) | `7.5rem` (120px) |
| **Floating Book Width** | `17em` | `204px` | `17rem` (272px) | `12.75rem` (204px) |

With the corrected dimensions, the 4 cards span $300 \times 4 - (60 \times 3) = 1020\text{px}$, centered inside 1440px with 210px margin on each side. The entire desktop section height is ~780px, fitting comfortably inside 900px viewport height without scrolling.

### 2.2 Choose From Hover Oscillation Root Cause
In the previous implementation:
1. Category buttons were flex items without fixed layout heights. When hovered, the font swapped from Degular (font-size 8rem) to handwritten script (font-size 10rem absolute), triggering height recalculations and DOM reflow.
2. The CSS applied accordion neighbor translation (`translateY(±2rem)`) on elements that were inside the pointer hit target. This shifted the button under a stationary mouse cursor, triggering immediate `pointerleave` followed by `pointerenter` on the neighbor, leading to a high-frequency flicker loop.
3. All 44 book cover images were co-rendered in the DOM and toggled using CSS opacity (`transition: opacity 0.2s`). Rapid category switches caused adjacent genre covers to fade out simultaneously while new ones faded in, creating visual ghosting.

---

## 3. IMPLEMENTATION DETAILS

### 3.1 Part A: How It Works Dimensional & Compositional Reconstruction
Files modified:
- [HowItWorksSection.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/components/HowItWorks/HowItWorksSection.module.css)
- [HowItWorksSection.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/components/HowItWorks/HowItWorksSection.tsx)

Key changes:
- Section background: `var(--store-color-soft-pink, #FFDBFD)`, border-radius `6rem`, `clip-path: inset(0 round 6rem)`.
- Header: `padding: 5.625rem 4.5rem 0`, title `font-size: 2.578rem` (41.25px), line-height `0.85`, color `#000000`.
- Handwritten text: `font-size: 1.125rem` (18px), color `#3B308F`.
- Cards: `width: 18.75rem` (300px), `height: 28.125rem` (450px), `border-radius: 1.5rem` (24px).
- Overlap: `margin-left: -3.75rem` (-60px).
- Inner card padding: `1.875rem 0.9375rem 1.125rem` (30px 15px 18px).
- Typography inside cards: title `font-size: 1.375rem` (22px), description `font-size: 0.8125rem` (13px), color `#000000`.
- Exact brand colors: Step 1 `#1ce8ed` (cyan), Step 2 `#fd48f2` (bright pink), Step 3 `#ffd24a` (yellow), Step 4 `#9982de` (periwinkle).

### 3.2 Part B: How It Works Hover & Card-Fanning Physics
Reconstructed the exact `initCallout` algorithm from `54937.js`:
- Initial natural jitter:
  - Step 1: `{ xPercent: 1.1259, yPercent: 1.7653, rotation: -3.2805 }`
  - Step 2: `{ xPercent: -4.1039, yPercent: -3.6375, rotation: -5.0819 }`
  - Step 3: `{ xPercent: -0.0833, yPercent: 0.3111, rotation: 3.9736 }`
  - Step 4: `{ xPercent: -4.6595, yPercent: -4.8456, rotation: 4.9617 }`
- On hover of card $i$:
  - Card $i$ pops forward: `scale: 1.075, rotation: 0, xPercent: 0, yPercent: 0, zIndex: 10, duration: 0.85, ease: 'elastic.out(1, 0.75)'`.
  - Inactive cards $j \neq i$ maintain jitter and base `zIndex: 1`.
  - Inner card content of $j \neq i$ fans outward: `xPercent: 45 / (j - i), duration: 0.85, ease: 'elastic.out(1, 0.75)'`.
  - Inner card content of active card $i$: `xPercent: 0`.
- On mouseleave: Smooth reset of all cards to natural jitter, `scale: 1`, `zIndex: 1`, and `xPercent: 0`.

### 3.3 Part C: Choose From Typography & Color Corrections
Files modified:
- [ChooseFromSection.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/components/ChooseFrom/ChooseFromSection.module.css)

Key changes:
- Color: `#000000` (pure black) across default titles, hover titles, section header, and seal SVGs.
- Default title font: `font-family: var(--store-font-champ); font-size: 6rem; font-weight: 800; line-height: 0.8;`.
- Hover title font: `font-family: var(--store-font-handwritten); font-size: 7.5rem; font-weight: 400; line-height: 0.8;`.
- Floating book covers: `width: 12.75rem` (204px), `aspect-ratio: 272 / 419` (height ~314px), white border `0.25rem`, drop shadow `0 16px 36px rgba(0, 0, 0, 0.22)`.

### 3.4 Part D: Choose From Category Hover Architecture & Bug Fix
Files modified:
- [ChooseFromSection.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/components/ChooseFrom/ChooseFromSection.tsx)
- [ChooseFromSection.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/components/ChooseFrom/ChooseFromSection.test.tsx)

Key changes:
1. **Fixed Hit Geometry:** `.genreListItem` has an unmoving bounding box with fixed `height: 5.25rem` (84px).
2. **Hit Area Isolation:** `.genreLink` has `pointer-events: none`. The visual text and accordion translation `translateY(±1.5rem)` occur on an inner wrapper that cannot alter hit-testing or reflow the layout.
3. **Single Active Category Architecture:** Instead of co-rendering 44 images with overlapping CSS opacity transitions, each holder box conditionally renders ONLY the image corresponding to `activeIndex`.
4. **Exact Cover Mapping:** Verified all 44 covers from `frontend/site-clone/site_copy/` are correctly loaded:
   - Science Fiction: Top-Left `thedevils2.webp`, Top-Right `thestarvingsaints2.webp`, Bottom-Left `juliechaninsdead2.webp`, Bottom-Right `whenthewolfcomeshome2.webp`.
5. **Zero Flicker & Oscillation:** Rapid transition between Romance and Thriller cleanly switches state with zero jitter. Added regression unit test verifying exactly 4 covers render per genre with zero lingering duplicates.

---

## 4. QUALITY GATES & VERIFICATION RESULTS

### 4.1 Unit & Integration Test Suite
```bash
npm --prefix frontend run test
```
- **Test Files:** 41 passed (41 total)
- **Tests:** 303 passed (303 total)
- **Duration:** 10.07s
- **Regression Test:** `ChooseFromSection Component > prevents rapid hover oscillation between adjacent genres (Romance and Thriller)` passed in 12ms.

### 4.2 Production Build Verification
```bash
npm --prefix frontend run build
```
- `tsc -b`: Zero TypeScript compilation errors.
- `vite build`: Production build succeeded in 2.01s.
- Bundle output: Clean assets, all WebP category covers and step illustrations bundled properly.

---

## 5. SCREENSHOT VERIFICATION INVENTORY

All screenshots captured via Chrome DevTools MCP and stored locally in `Akashic_Library/screenshots/`:

| Screenshot File | Description & Viewport |
| :--- | :--- |
| `stage1c1_how_it_works_1440.png` | How It Works section at 1440×900 desktop, demonstrating entire section fits in single viewport |
| `stage1c1_how_it_works_hover_step1.png` | How It Works with Step #1 hovered (pops forward, Step 2-4 fanned outward) |
| `stage1c1_how_it_works_hover_step2.png` | How It Works with Step #2 hovered (Step 1 fanned left, Step 3-4 fanned right) |
| `stage1c1_how_it_works_hover_step3.png` | How It Works with Step #3 hovered (Step 1-2 fanned left, Step 4 fanned right) |
| `stage1c1_how_it_works_hover_step4.png` | How It Works with Step #4 hovered (Step 1-3 fanned left, Step 4 popped forward) |
| `stage1c1_choose_from_1440.png` | Choose From section at 1440×900 desktop in default unhovered state |
| `stage1c1_choose_from_hover_scifi_1440.png` | Choose From with Science Fiction hovered, showing 4 floating covers and handwritten font |
| `stage1c1_choose_from_hover_romance_1440.png` | Choose From with Romance hovered, demonstrating stable switch from Science Fiction |
| `stage1c1_choose_from_hover_thriller_1440.png` | Choose From with Thriller hovered, demonstrating zero flicker or double-rendering |
| `stage1c1_choose_from_easter_egg_1440.png` | Choose From Easter Egg popup open with rabbit ears and "Sign-up now!" CTA |
| `stage1c1_how_it_works_1280.png` | How It Works responsive layout at 1280×800 desktop |
| `stage1c1_how_it_works_1032.png` | How It Works responsive layout at 1032×1376 (iPad Pro) |
| `stage1c1_how_it_works_768.png` | How It Works responsive layout at 768×1024 (Tablet) |
| `stage1c1_how_it_works_440.png` | How It Works mobile carousel layout at 440×956 |
| `stage1c1_how_it_works_390.png` | How It Works mobile carousel layout at 390×844 |
| `stage1c1_how_it_works_360.png` | How It Works mobile carousel layout at 360×740 |

---

## 6. COMPLIANCE & REPOSITORY HYGIENE

- **Git Branch:** `ragnar/frontend` (Strict local branch; exactly 0 commits, 0 pushes).
- **Git Status:** Unstaged working tree changes only.
- **Reference Read-Only:** `frontend/site-clone/site_copy/` was treated strictly as a read-only source of truth.
- **Scope Discipline:** Strictly addressed Stage 1C.1 requirements without modifying Part I Discovery or building Stage 1D downstream components.
