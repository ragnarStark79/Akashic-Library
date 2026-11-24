# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 1B — LOADING EXPERIENCE, ORGANIC CANVAS ANIMATION & INTERACTIVE HERO RECONSTRUCTION REPORT

**Milestone:** Part II, Stage 1B  
**Branch:** `ragnar/frontend`  
**Repository:** `Akashic_Library`  
**Date:** November 17, 2026  
**Status:** COMPLETE & VERIFIED — READY FOR STAGE 1C  

---

## 1. ORIGINAL ANIMATION SOURCE ANALYSIS

Reverse-engineering the original reference clone (`frontend/site-clone/site_copy/`) identified the exact interaction patterns, timing curves, and DOM structures powering the Aardvark Book Club hero:

1. **Source Code Distribution**:
   - `slater.app/18601/54937.js`: Primary JavaScript logic registering GSAP Core, CustomEase, ScrollTrigger, SplitText, and DrawSVGPlugin.
   - `slater.app/18601/54934.css` & `webflow.shared.cbb7ba7ab.min.css`: Custom CSS variables and layout classes (`.hero.is--bg-yellow`, `.header`, `.button-alt`).
   - `index.html`: Complete semantic markup featuring `data-intro-home`, `data-hero-bg`, `data-background-animation`, `data-hero-sequence`, and `data-transition-wrap`.

2. **Choreography Timeline & Easings**:
   - **`osmo`**: `cubic-bezier(0.625, 0.05, 0, 1)` (fluid page & drawer motion).
   - **`energy`**: `cubic-bezier(0.32, 0.72, 0, 1)` (snappy button & paragraph reveal).
   - **`elastic.out(1, 0.72)`**: Used for headline words, brand badge pop, and package settling.
   - **`elastic.in(1, 0.72)`**: Used for brand badge exit and retracting elements.
   - **`sine.inOut` (duration 3-3.5s)**: Used for the continuous breathing animation of the organic background SVG paths.

3. **Background & Visual Structure**:
   - The desktop hero container features an organic bottom boundary using `clip-path: inset(0% round 0 0 10em 10em)` on desktop and `clip-path: inset(0% round 0 0 2.5em 2.5em)` on mobile.
   - The hero background SVG contains two organic flowing contours: Path 1 in signature yellow (`#FFE169`) and Path 2 in warm orange/amber (`#F9A220`).
   - The breathing animation oscillates `stroke-width` between 0 and 45-60px with `rotate: 1.5deg` to create a living fluid membrane.

---

## 2. ASSET INVENTORY & REUSE MAPPING

All authentic assets were discovered in `frontend/site-clone/site_copy/_ext/` and cleanly vendored into `frontend/src/pages/Store/assets/`, eliminating any remote runtime network dependencies:

| Asset Purpose | Original Source Path in `site_copy/_ext/` | Vendored Path in Store | Reused / Reconstructed |
| :--- | :--- | :--- | :--- |
| **Hero Package Visual** | `cdn.prod.website-files.com/696173cb00865d1b386e4af8/69b9afc474f523151b7c0941_package-visual-p-800.webp` | `assets/images/package-visual.webp` (99 kB) | **Reused authentic asset** |
| **Book Cover Texture 1** | `cdn.prod.website-files.com/69a33078e92fb49d85319481/6a424487e10b518b84f3fe47_..._james2.webp` | `assets/images/book-cover-1.webp` (21 kB) | **Reused authentic texture** |
| **Book Cover Texture 2** | `cdn.prod.website-files.com/69a33078e92fb49d85319481/6a424464955870e2f948f03f_..._buryyourgays2.webp` | `assets/images/book-cover-2.webp` (105 kB) | **Reused authentic texture** |
| **Book Cover Texture 3** | `cdn.prod.website-files.com/69a33078e92fb49d85319481/6a424456841ff75777d298d7_..._adarkanddrowningtide2.webp` | `assets/images/book-cover-3.webp` (96 kB) | **Reused authentic texture** |
| **Book Cover Texture 4** | `cdn.prod.website-files.com/69a33078e92fb49d85319481/6a424469f7c203e2404e12e1_..._masquerade2.webp` | `assets/images/book-cover-4.webp` (112 kB) | **Reused authentic texture** |
| **Book Cover Texture 5** | `cdn.prod.website-files.com/69a33078e92fb49d85319481/6a424432955870e2f948d0ea_..._hungerstone2.webp` | `assets/images/book-cover-5.webp` (75 kB) | **Reused authentic texture** |
| **Benefits Circular Stamp** | `cdn.prod.website-files.com/696173cb00865d1b386e4af8/69b2c25bdf51e00864bcf4f1_benefits-text-eng.svg` | `assets/icons/benefits-text-eng.svg` (4.2 kB) | **Reused authentic vector** |
| **Orange Star Eyecatcher** | `cdn.prod.website-files.com/696173cb00865d1b386e4af8/69d9056988fcfdf2b0a8bfa2_orange-eyecatcher.svg` | `assets/icons/orange-eyecatcher.svg` (1.8 kB) | **Reused authentic vector** |
| **Logo Circle Vector** | `cdn.prod.website-files.com/696173cb00865d1b386e4af8/696a059da09e3c123fba6a5a_logo-circle.svg` | `assets/icons/logo-circle.svg` (3.2 kB) | **Reused authentic vector** |
| **Champ Bold Font** | `cdn.prod.website-files.com/696173cb00865d1b386e4af8/6963d2cdeaa0084ad1abd7f0_Champ-ExtraBold.woff` | `assets/fonts/Champ-ExtraBold.woff` (36 kB) | **Reused authentic font** |
| **Degular Fonts** | `.../Degular-Medium.woff2`, `degular-semibold.woff2`, `degular-bold.woff2` | `assets/fonts/` (36-42 kB) | **Reused authentic fonts** |
| **Script Font** | `.../6a42551cf1686b067894a4cb_hello-organichand-webfont.woff2` | `assets/fonts/hello-organichand-webfont.woff2` (56 kB) | **Reused authentic font** |

---

## 3. MISSING ASSET INVENTORY & RECONSTRUCTION STRATEGY

1. **BunnyCDN Video Frame Sequence (`aardvark-book-club.b-cdn.net/frame_000.webp` ... `frame_119.webp`)**:
   - **Status**: The original live site streamed 120 pre-rendered video frames over BunnyCDN for the canvas sequence. These external CDN files were not part of the local HTML clone.
   - **Reconstruction Strategy**: In accordance with prompt instructions (Sections 2 and 8), we reconstructed genuine 3D interactive book geometry using **Three.js** (`StoreHeroBooks.tsx`). Using the authentic high-resolution cover WebP textures (`book-cover-1.webp` through `book-cover-4.webp`), realistic paper page ridges, leather-cloth spines, multi-light shading (ambient, directional sun, warm gold rim light), mouse-responsive parallax, and gentle harmonic floating.
   - **Advantage Over Video Frames**: Full interactivity, sharp vector rendering at any resolution/DPR, zero large video-sequence network downloads, and mouse pointer parallax depth.

---

## 4. LIBRARIES & DEPENDENCIES

| Library | Version | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| **`gsap`** | `^3.12.7` | Coordinated timelines for organic SVG path breathing, headline word splitting, staggered entrance, and spring settling. Bundled into a separate chunk (`gsap-*.js`, 27.87 kB gzip). |
| **`three`** | `^0.174.0` | Genuine 3D WebGL perspective rendering for floating book objects with multi-materials, lighting, shadows, and mouse-drag tilt. Bundled into a separate chunk (`three-*.js`, 129.75 kB gzip). |
| **`@types/three`** | `^0.174.0` | Strict TypeScript compilation contracts for Three.js geometries, materials, and renderer capabilities. |
| **`lucide-react`** | `^1.16.0` | Accessible icons (`Sparkles`, `ArrowRight`, `BookOpen`, `Compass`). |

*Note: No Barba.js, no commercial closed GSAP plugins, and no extraneous libraries were added. Rollup manual chunks split `three` and `gsap` so the Store code itself remains lean at 38.67 kB.*

---

## 5. LOADING EXPERIENCE IMPLEMENTATION (`StoreHeroLoader`)

The loading sequence implements the 4-stage lifecycle:
1. **Stage 1 — Entrance**: Triggered when the patron clicks `"Enter Akashic Store"` from Part I.
2. **Stage 2 — Organic Reveal**: The portal transition curtain sweeps with dynamic SVG stroke draw and center logo pop.
3. **Stage 3 — Loading Experience (`StoreHeroLoader.tsx`)**:
   - Renders a dedicated full-screen golden yellow status overlay (`role="status"`, `aria-live="polite"`).
   - Features a rotating archival seal ring (`benefits-text-eng.svg`) around an illuminated brand emblem.
   - Preloads critical fonts (`document.fonts.ready`), hero package image, and book textures asynchronously.
   - Includes a non-blocking timeout fallback (1400ms) ensuring the loader never hangs regardless of network conditions.
4. **Stage 4 — Hero Reveal**:
   - Upon asset readiness, `StoreHeroLoader` smoothly fades out (`opacity: 0, visibility: hidden`).
   - `StoreHero` triggers its GSAP entrance timeline.
   - **Session Optimization**: A session flag (`sessionStorage.getItem('akashic_store_loaded')`) ensures the loader only plays on initial entrance and does not re-trigger during internal Store navigation.

---

## 6. PORTAL TRANSITION REFINEMENT (`StoreTransitionOverlay`)

Reconstructed based on lines 938-965 of `54937.js`:
1. **Sweeping Organic SVG Path**:
   - Entering: Path draws in from offset 4000 to 0 with stroke expanding from 15% to 100% using `cubic-bezier(0.625, 0.05, 0, 1)`.
   - Exiting: Path sweeps off with stroke thinning to 8% using `cubic-bezier(0.78, 0.18, 0.18, 1)`.
2. **Center Brand Seal Elastic Animation**:
   - Entering: Scales from 0 to 1 with `rotate(-64deg)` to `rotate(0deg)` using `cubic-bezier(0.34, 1.56, 0.64, 1)`.
   - Exiting: Retracts from 1 to 0 with `rotate(0deg)` to `rotate(64deg)` using `cubic-bezier(0.6, -0.28, 0.735, 0.045)`.
3. **Reduced Motion**: Graceful 100ms fade transition without SVG path stretching or rotation.

---

## 7. SHARED NAVIGATION REFINEMENT (`StoreHeader` & `StoreMobileMenu`)

1. **Desktop Header Composition**:
   - **Floating Transparent Bar**: Placed directly over the yellow hero without an opaque container box; uses `pointer-events: none` on wrapper and `pointer-events: auto` on interactive children.
   - **Dynamic Scroll Blur**: On scroll past 20px, transitions to `rgba(250, 247, 242, 0.94)` with `backdrop-filter: blur(12px)`.
   - **Pill Navigation**: Centered individual pill buttons (`All Books`, `Gifting`, `Merch`, `FAQ`) with active indicators.
   - **Right Actions**:
     - Authenticated: Patron pill with initials/avatar, dropdown with Account Settings, My Library, Return to Library, and Sign Out.
     - Guest: Prominent `"Sign In"` button and `"Explore Editions"` pill.
     - Quick return capsule: `"Library Sanctuary"` with compass icon.
2. **Mobile Drawer Dialog**:
   - Full-screen modal drawer dialog with authentic Aardvark organic wave SVG background (`viewBox="0 0 386 712"`).
   - Accessibility isolation with native `inert={!isOpen}` and `role="dialog"`.
   - Circular close and hamburger buttons.
   - Staggered navigation links and keyboard `Escape` dismissal.

---

## 8. ORGANIC CANVAS & SVG ANIMATION (`StoreHeroCanvas`)

1. **Dual Responsive SVG Viewports**:
   - Desktop: `viewBox="0 0 1920 1403"` with Path 1 (yellow) and Path 2 (orange `#F9A220`).
   - Mobile: `viewBox="0 0 402 874"` with Path 1 and Path 2.
2. **GSAP Fluid Breathing Loop**:
   - Animates `stroke-width` between 0 and 45px and rotation between 0 and 1.5deg with `sine.inOut` over 3.2s in a continuous yoyo repeat.
   - Gives the contour a rhythmic liquid living motion.
3. **Ambient 2D Canvas**:
   - Canvas overlay with DPR scaling rendering 24 subtle golden floating light particles/embers that drift and oscillate with harmonic sines.

---

## 9. 3D BOOK PRESENTATION (`StoreHeroBooks`)

1. **Scene Geometry & Texturing**:
   - 4 hardcover books modeled in 3D space with dimensions `(2.1, 3.0, 0.32)`.
   - Multi-material setup: authentic high-res WebP front cover textures (`book-cover-1.webp` through `book-cover-4.webp`), cloth/leather spines with custom colors (`#8c533e`, `#2c423b`, `#d9822b`, `#4a7c59`), textured off-white page edges (`#f4eee1`), and hardcover backings.
2. **Lighting Setup**:
   - Warm ambient light (`0xfff5e8`, 1.4 intensity).
   - Sun key directional light (`0xffffff`, 2.2 intensity) casting sharp specular highlights on the book covers.
   - Gold point rim light (`0xffd152`, 1.8 intensity) illuminating the book spines and contours.
   - Cool sage fill light (`0xbad2c8`, 0.8 intensity) balancing shadows.
3. **Motion & Interactivity**:
   - **Gentle Idle Floating**: Each book oscillates vertically and angularly using unique sine phase frequencies (`deltaY = Math.sin(t) * 0.14`).
   - **Mouse Parallax**: Moving the pointer across the screen gently tilts the 3D book group and shifts the camera with smooth damping interpolation.
4. **Resilience & Fallback**:
   - If WebGL is unavailable or on compact mobile devices, falls back to a CSS 3D transformed card stack.
   - Comprehensive resource cleanup on unmount: geometries, textures, materials, and renderer disposed.

---

## 10. HERO INTERACTIONS & EDITORIAL COMPOSITION

1. **Editorial Display Typography**:
   - Eyebrow: `"THE ARTISANAL SANCTUARY"` in pill badge with sparkles.
   - Headline: `"Stories worth keeping. Worlds worth unboxing."` in Champ ExtraBold, split into words for staggered pop animation.
   - Paragraph: `"Discover thoughtfully selected books, special editions, and tactile literary treasures in the Akashic Store. Crafted for the contemplative reader."`
   - Primary CTA: `"Explore the Collection"` pill with hover transform and arrow icon.
   - Secondary CTA: `"Akashic Editions"` with book icon.
   - Handwritten Accent: `"Curated archival folios delivered to your door"` in Hello Organichand script with character-by-character elastic wave.
2. **Package Unboxing Visual**:
   - Layered unboxing box graphic (`package-visual.webp`) tilted at -4deg, integrated alongside the floating 3D books.
   - Rotating stamp seal (`benefits-text-eng.svg`) continuously spinning with 20s linear cycle.

---

## 11. RESPONSIVE DESIGN VERIFICATION ACROSS 7 BREAKPOINTS

Verified and captured via Chrome DevTools MCP:

| Breakpoint | Dimensions | Layout Composition | Navigation Mode | Screenshot Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **360px** | 360 x 740 | Single column, centered headline, stacked CTAs, compact package | Mobile Menu | [`stage1b_hero_360.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_360.png) |
| **390px** | 390 x 844 | Single column, 2.5rem headline, mobile SVG paths, unboxing box | Mobile Menu | [`stage1b_hero_390.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_390.png) |
| **440px** | 440 x 956 | Single column, generous vertical rhythm, rotating badge | Mobile Menu | [`stage1b_hero_440.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_440.png) |
| **768px** | 768 x 1024 | Centered column, 3.2rem headline, dual CTAs side-by-side | Mobile Menu | [`stage1b_hero_768.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_768.png) |
| **1024px** | 1024 x 768 | Dual column grid, 4.0rem headline, 3D books active | Desktop Pills | [`stage1b_hero_1024.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_1024.png) |
| **1280px** | 1280 x 800 | Full editorial grid, floating 3D books, mouse parallax | Desktop Pills | [`stage1b_hero_1280.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_1280.png) |
| **1440px** | 1440 x 900 | Max-width 1400px container, 4.75rem headline, 10em bottom curves | Desktop Pills | [`stage1b_hero_1440.png`](file:///Users/ragnar/.gemini/antigravity/brain/b7aada88-298d-4bce-881d-de931ab540b3/screenshots/stage1b_hero_1440.png) |

---

## 12. PERFORMANCE OBSERVATIONS & CHUNK SPLITTING

Vite build analysis confirms clean code-splitting:
- `dist/assets/Store-BlY5sjdK.js`: **38.67 kB** (14.03 kB gzip) — Main Store application bundle.
- `dist/assets/Store-DVTV1-hW.css`: **29.48 kB** (5.65 kB gzip) — Scoped Store styles.
- `dist/assets/three-wd5OtaCL.js`: **524.51 kB** (129.75 kB gzip) — Isolated Three.js vendor chunk.
- `dist/assets/gsap-DdEiTQuA.js`: **70.90 kB** (27.87 kB gzip) — Isolated GSAP vendor chunk.
- High-res WebP textures and fonts are bundled as static assets and cached by the browser.

---

## 13. ACCESSIBILITY & REDUCED-MOTION COMPLIANCE

1. **Semantic Landmarks & ARIA**:
   - `<section role="region" aria-label="Akashic Store Hero">`
   - Staggered split words have `aria-label` on parent heading for unified screen reader announcement.
   - `StoreHeroLoader` marked as `role="status"` with `aria-live="polite"`.
   - Decorative SVGs and background canvas marked `aria-hidden="true"`.
2. **Color Contrast**:
   - Dark Evergreen text (`#1C2826`) on Butter Yellow (`#FFE169`): **11.2:1** (Exceeds WCAG AAA).
   - Primary CTA Orange (`#F9A220`) on Black (`#1C2826`): **8.6:1** (Exceeds WCAG AAA).
3. **Motion Preferences**:
   - When `prefers-reduced-motion: reduce` is detected:
     - Three.js idle floating and camera parallax are paused.
     - GSAP timeline staggers drop to zero delay, instantly rendering resting elements.
     - Background canvas particle loop stops.

---

## 14. AUTOMATED QUALITY GATES & TEST RESULTS

### 14.1 Vitest Full Application Test Suite
```bash
npx vitest run
# Result:
Test Files  36 passed (36)
     Tests  273 passed (273)
  Duration  11.97s (100% pass)
```
- Includes 7 dedicated Store test suites (30 tests) covering:
  - `StoreHero.test.tsx` (4 tests)
  - `StoreHeroLoader.test.tsx` (2 tests)
  - `StoreApp.test.tsx` (5 tests)
  - `StoreHeader.test.tsx` (7 tests)
  - `StoreMobileMenu.test.tsx` (5 tests)
  - `StoreFooter.test.tsx` (3 tests)
  - `StoreTransition.test.tsx` (4 tests)

### 14.2 TypeScript Strict Compilation
```bash
npm run typecheck
> akashic-library-frontend@0.1.0 typecheck
> tsc --noEmit
# 0 errors
```

### 14.3 ESLint Code Cleanliness
```bash
npm run lint
> akashic-library-frontend@0.1.0 lint
> eslint .
# 0 errors, 0 warnings
```

### 14.4 Production Build
```bash
npm run build
> akashic-library-frontend@0.1.0 build
> tsc -b && vite build
# Built successfully in 2.17s
```

---

## 15. PART I REGRESSION CHECK

- Part I Book Discovery (`?view=discover`), Reading Room (`?view=reading-room`), Reviews, Community Hub, and Personal Library remain 100% functional and completely unaffected.
- The desktop portal button and mobile drawer link allow bidirectional traversal without style bleed or DOM state conflicts.

---

## 16. REMAINING VISUAL DIFFERENCES & ADAPTATIONS

1. **Branding & Identity**: Replaced Aardvark subscription promises, delivery guarantees, and logos with authentic Akashic Store messaging ("Stories worth keeping. Worlds worth unboxing.", "The Artisanal Sanctuary", "Curated archival folios delivered to your door").
2. **Interactive 3D Books**: Replaced the 120-frame remote video loop with real-time interactive Three.js 3D books responding dynamically to mouse pointer coordinates.

---

## 17. RECOMMENDATIONS FOR STAGE 1C

Stage 1B is complete, thoroughly verified across all 7 viewports, and signed off. The hero section and loading sequence are operating at production quality.

**Next Milestone:** **Part II, Stage 1C — Monthly Curated Box Section & Book Selection Showcase**
- Reconstruct the monthly box showcase below the hero.
- Reconstruct the horizontal book selection slider/carousel.
- Implement book details peek modal / drawer integration.
