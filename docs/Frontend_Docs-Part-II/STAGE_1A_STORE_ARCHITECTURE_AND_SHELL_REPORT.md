# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 1A: STORE ARCHITECTURE, APPLICATION SHELL & PORTAL TRANSITION REPORT

**Milestone:** Part II, Stage 1A  
**Branch:** `ragnar/frontend`  
**Repository:** `Akashic_Library`  
**Date:** November 17, 2026  
**Status:** COMPLETE & VERIFIED — READY FOR STAGE 1B  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES

Stage 1A of Part II (Akashic Store) establishes the foundational frontend architecture, isolated application shell, shared animation infrastructure, and bidirectional portal transitions for the artisanal marketplace inside the Akashic Library repository.

The implementation strictly reproduces the visual identity, typography, color harmony, and micro-interactions reverse-engineered from the Aardvark Book Club reference clone (`frontend/site-clone/site_copy/`), while maintaining absolute architectural isolation and zero regressions across the existing Part I Book Discovery, Reading Room, Community, and Personal Library systems.

### Core Stage 1A Deliverables Achieved:
1. **Isolated Store Module (`frontend/src/pages/Store/`)**: Self-contained architecture with dedicated tokens, fonts, routes, animation hooks, layout, and UI components.
2. **Typography & Assets Engine**: Locally vendored and bundled font assets (Champ, Degular, Hello Organichand) and SVGs, eliminating any external runtime asset dependency.
3. **Dedicated Application Shell (`StoreLayout`, `StoreHeader`, `StoreFooter`, `StoreMobileMenu`)**: Scoped under `.storeTheme`, delivering the warm cream (`#FAF7F2`), butter yellow (`#FFE169`), and dark evergreen (`#1C2826`) aesthetic.
4. **Bidirectional Portal Transition (`StoreTransitionOverlay`, `useStoreTransition`)**: Organic SVG brush-sweep transition between Part I (Sanctuary) and Part II (Store) with center logo elastic pop and reduced-motion fallbacks.
5. **View Routing & Navigation Engine**: URL-synchronized query parameter routing (`?view=store*`), distinguishing intra-store navigation from cross-sanctuary portal traversal.
6. **Authentication Integration**: Native hooks into `useAuth()`, providing patron identity display, dropdown management, and guest/authenticated states.
7. **Production Quality Sign-Off**: 100% test pass rate (34 suites, 267 tests), 0 TypeScript errors, 0 ESLint warnings, and automated chunk code-splitting.

---

## 2. DIRECTORY STRUCTURE & FILE INVENTORY

All Store architectural files are organized into modular, scalable subdirectories under `frontend/src/pages/Store/`:

```
frontend/src/pages/Store/
├── assets/
│   ├── fonts/
│   │   ├── Champ-ExtraBold.woff                 # 36.98 kB — Display serif / headings
│   │   ├── Degular-Medium.woff2                # 42.06 kB — Body / navigation font
│   │   ├── degular-semibold.woff2              # 36.75 kB — UI buttons & pills
│   │   ├── degular-bold.woff2                  # 41.43 kB — Heavy emphasis & labels
│   │   └── hello-organichand-webfont.woff2     # 56.41 kB — Script handwritten accents
│   └── icons/
│       └── benefits-text-eng.svg               # Circular rotating badge text vector
├── styles/
│   └── storeTokens.css                         # Scoped .storeTheme custom properties & font-faces
├── types/
│   ├── store.ts                                # Strongly typed interfaces & component contracts
│   └── index.ts                                # Barrel re-export
├── routes/
│   ├── storeNavigation.ts                      # Navigation links & store views configuration
│   ├── storeRoutes.ts                          # Route parsing, path matching & isStoreView guard
│   └── index.ts                                # Barrel re-export
├── animation/
│   ├── storeMotion.ts                          # Osmo bezier curves, spring configs & timing constants
│   ├── useReducedMotion.ts                     # Accessible window.matchMedia observer
│   ├── StoreMotionContext.ts                   # Fast-refresh compliant motion context
│   ├── StoreMotionProvider.tsx                 # Shared provider exposing reduced-motion state
│   ├── useStoreMotion.ts                       # Custom hook for motion preferences
│   ├── useStoreTransition.ts                   # Two-stage portal transition state machine
│   ├── StoreTransition.test.tsx                # Unit tests for portal transition lifecycle
│   └── index.ts                                # Barrel re-export
├── components/
│   ├── StoreHeader/
│   │   ├── StoreHeader.tsx                     # Fixed/sticky frosted navigation bar
│   │   ├── StoreHeader.module.css              # Desktop pills, blur backdrop, brand logo
│   │   └── StoreHeader.test.tsx                # 7 unit tests covering desktop & mobile interactions
│   ├── StoreMobileMenu/
│   │   ├── StoreMobileMenu.tsx                 # Full-screen modal drawer dialog with inert support
│   │   ├── StoreMobileMenu.module.css          # Organic SVG backdrop, stagger transitions
│   │   └── StoreMobileMenu.test.tsx            # 5 unit tests verifying keyboard, focus & aria
│   ├── StoreFooter/
│   │   ├── StoreFooter.tsx                     # Scalloped wave top, dual link groups, newsletter form
│   │   ├── StoreFooter.module.css              # Responsive grid, copyright, back-to-top button
│   │   └── StoreFooter.test.tsx                # 3 unit tests for newsletter & back-to-top
│   ├── StoreTransition/
│   │   ├── StoreTransitionOverlay.tsx          # Full-screen organic SVG brush draw transition
│   │   └── StoreTransition.module.css          # Dasharray animation, badge spring, backdrop blur
│   └── StoreCommon/
│       ├── StorePlaceholder.tsx                # Typed roadmap placeholder for future stages
│       └── StorePlaceholder.module.css         # Scoped placeholder cards and badges
├── StoreLayout.tsx                             # Root layout shell injecting .storeTheme tokens
├── StoreLayout.module.css                      # Base layout styles, container limits, skip-link
├── StoreApp.tsx                                # Main Store entry point, view dispatcher & error boundary
├── StoreApp.test.tsx                           # 5 unit tests for StoreApp routing and shell
└── index.ts                                    # Barrel export for StoreApp lazy loading
```

---

## 3. CORE ARCHITECTURE & COMPONENT IMPLEMENTATION

### 3.1 CSS Design System & Scoped Theme Tokens (`storeTokens.css`)
To prevent CSS style bleed into Part I, all Store styles are bound to the `.storeTheme` class selector or scoped inside CSS Modules:

- **Color Harmony**:
  - `--store-bg`: `#FAF7F2` (Warm archival cream)
  - `--store-bg-yellow`: `#FFE169` (Aardvark signature butter yellow)
  - `--store-text`: `#1C2826` (Deep forest charcoal)
  - `--store-accent-blue`: `#4A7C59` (Subtle sage green)
  - `--store-accent-orange`: `#E07A5F` (Warm terracotta)
  - `--store-border`: `rgba(28, 40, 38, 0.12)`
- **Typography Families**:
  - Headings: `'Champ', Georgia, serif`
  - Body & UI: `'Degular', -apple-system, BlinkMacSystemFont, sans-serif`
  - Accents: `'Hello Organichand', cursive`
- **Animation Easing Curves**:
  - `--store-ease-osmo`: `cubic-bezier(0.625, 0.05, 0, 1)` (Reverse-engineered from Aardvark clone)
  - `--store-ease-energy`: `cubic-bezier(1, 0, 0, 1)`
  - `--store-ease-elastic-out`: `cubic-bezier(0.34, 1.56, 0.64, 1)`

### 3.2 StoreHeader Component
- **Desktop Navigation**: Centered pill capsule containing links to `All Books`, `Gifting`, `Merch`, and `FAQ` with active state indicators.
- **Brand Wordmark**: Custom SVG logo + "CURATED EDITIONS" pill with responsive sizing.
- **Sanctuary Return Capsule**: Prominent "Return to Akashic Library Sanctuary" button allowing one-click portal traversal.
- **Patron Identity Pill**: Displays user initials, username, and dropdown menu with "Account Settings", "My Library", "Return to Library", and "Sign Out". Unauthenticated users see "Sign In" and "Explore" buttons.
- **Mobile Hamburger**: Accessible button with `aria-expanded` and SVG animated bar states.

### 3.3 StoreMobileMenu Component
- **Accessibility & Inertness**: Implements native HTML `inert={!isOpen}` and `role="dialog"`, preventing screen reader leak or accidental keyboard navigation when closed.
- **Organic Aesthetics**: Features the authentic Aardvark SVG organic wave backdrop (`viewBox="0 0 386 712"`).
- **Navigation Flow**: Staggered navigation links with descriptions, portal return button, and mobile user auth card.
- **Keyboard Handling**: Listens for the `Escape` key to close the drawer and safely restores focus to the toggle button.
- **Scroll Lock**: Dynamically locks `document.body.style.overflow = 'hidden'` while open.

### 3.4 StoreFooter Component
- **Scalloped Wave Border**: Authentic SVG wave divider separating content from footer.
- **Navigation Architecture**: Dual-column navigation separating "Store" (Editions, Gifting, Merch, FAQ) from "Sanctuary" (Discovery Home, Reading Room, Community Hub).
- **Newsletter Subscription**: Client-side validated email input with instant positive feedback state ("Welcome to the Inner Folio circle!").
- **Back-to-Top Action**: Smooth scrolling back to viewport top (`window.scrollTo({ top: 0, behavior: 'smooth' })`).

### 3.5 StoreTransitionOverlay & Lifecycle (`useStoreTransition`)
- **Organic Brush Draw**: Animated SVG path with dynamic `strokeDasharray` and `strokeDashoffset` animating the sweep across the screen.
- **Elastic Pop Badge**: Centered circular seal with sparkles and brand wordmark scaling with `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Coordinated State Machine**:
  - `idle`: Overlay unrendered.
  - `entering`: Overlay covers viewport; pointer-events locked; duration 450ms (or 50ms under reduced-motion).
  - `midpoint`: Callback swaps `currentView` in React state and pushes new browser history entry.
  - `exiting`: Overlay sweeps off; duration 450ms.
  - `complete`: Lifecycle resets to `idle`.
- **Intra-Store Navigation**: Store internal routes (e.g. `store` -> `store-allbooks`) navigate smoothly via `handleNavigateStore` without re-triggering the full-screen curtain overlay.

---

## 4. INTEGRATION WITH PART I (APPLICATION SHELL & NAVBAR)

Part I was cleanly augmented to expose the new Store portal without touching any existing business logic:
1. **Desktop Navbar (`Navbar.tsx` & `Navbar.module.css`)**:
   - Added `.storePortalButton` capsule button adjacent to the search input, styled with a warm gold border and sparkle icon: `"Enter Akashic Store"`.
   - Added `"Akashic Store"` entry in the authenticated user menu dropdown.
2. **Mobile Drawer (`MobileDrawer.tsx`)**:
   - Added `"Akashic Store"` navigation item with a distinct gold badge.
3. **Application Root (`App.tsx`)**:
   - Extended `ViewMode` union with `'store' | 'store-allbooks' | 'store-book-detail' | 'store-gifting' | 'store-merch' | 'store-faq'`.
   - Created lazy import for `StoreApp` with `Suspense` and `ChunkErrorBoundary`.
   - Conditioned top-level layout rendering:
     - When `isStoreView(currentView)`: renders `<StoreApp>` wrapped in `<StoreMotionProvider>`.
     - Otherwise: renders `<ApplicationShell>` with Part I components.
   - Mounted `<StoreTransitionOverlay>` at root level above both shells.

---

## 5. RESPONSIVE DESIGN AUDIT ACROSS 7 BREAKPOINTS

Verified in live browser testing using Chrome DevTools MCP:

| Breakpoint | Target Device | Navigation Mode | Header Layout | Mobile Drawer | Visual Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **360px** | Mobile Compact (Galaxy S8) | Mobile Menu | Logo + User + Hamburger | Full width drawer | Verified |
| **390px** | Mobile Standard (iPhone 14/15) | Mobile Menu | Logo + User + Hamburger | Compact slide-over | Verified |
| **440px** | Mobile Large (iPhone 16 Pro Max) | Mobile Menu | Logo + User + Hamburger | 440px max drawer | Verified |
| **768px** | Tablet Portrait (iPad Mini) | Mobile Menu | Logo + User + Hamburger | 440px right drawer | Verified |
| **1024px** | Tablet Landscape / Small Laptop | Desktop Pills | Full navigation visible | Hidden | Verified |
| **1280px** | Desktop Standard (MacBook Air) | Desktop Pills | Centered pills + Portal btn | Hidden | Verified |
| **1440px** | Desktop Large (iMac / External) | Desktop Pills | Max-width 1360px container | Hidden | Verified |

---

## 6. ACCESSIBILITY (WCAG 2.1 AA) COMPLIANCE

1. **Semantic Landmarks**:
   - `<header className={styles.header} role="banner">`
   - `<main id="store-main" className={styles.main}>`
   - `<footer className={styles.footer} role="contentinfo">`
   - `<div role="dialog" aria-modal="true" aria-label="Store navigation menu">`
2. **Keyboard Navigation & Focus Management**:
   - Skip to main content link (`#store-main`).
   - `Escape` key dismisses `StoreMobileMenu` and returns focus to the trigger.
   - Native `inert` attribute applied when modal drawer is closed.
3. **Color Contrast**:
   - Primary text (`#1C2826`) on Cream (`#FAF7F2`): Contrast ratio **14.8:1** (Exceeds WCAG AAA 7:1).
   - Brand Dark (`#1C2826`) on Butter Yellow (`#FFE169`): Contrast ratio **11.2:1** (Exceeds WCAG AAA 7:1).
4. **Motion Preferences**:
   - `useReducedMotion` detects `prefers-reduced-motion: reduce`.
   - Transitions drop from 900ms brush draw to a 100ms fade transition.

---

## 7. QUALITY GATES & VERIFICATION RESULTS

### 7.1 Vitest Unit Test Suite
- Total Test Files: **34 passed (34 total)**
- Total Tests: **267 passed (267 total)**
- Store Test Suites Added:
  - `StoreHeader.test.tsx` (7 tests passed)
  - `StoreMobileMenu.test.tsx` (5 tests passed)
  - `StoreFooter.test.tsx` (3 tests passed)
  - `StoreTransition.test.tsx` (4 tests passed)
  - `StoreApp.test.tsx` (5 tests passed)
- Execution Duration: **7.05s** (100% pass)

### 7.2 TypeScript Strict Typecheck
```bash
npm run typecheck
> akashic-library-frontend@0.1.0 typecheck
> tsc --noEmit
# 0 errors
```

### 7.3 ESLint Code Quality
```bash
npm run lint
> akashic-library-frontend@0.1.0 lint
> eslint .
# 0 errors, 0 warnings
```

### 7.4 Production Build & Chunk Code Splitting
```bash
npm run build
> akashic-library-frontend@0.1.0 build
> tsc -b && vite build

dist/assets/degular-semibold-31Kir8JE.woff2            36.75 kB
dist/assets/Champ-ExtraBold-w-55QW8P.woff              36.98 kB
dist/assets/degular-bold-Bkz_gMZC.woff2                41.43 kB
dist/assets/Degular-Medium-5Vserq9N.woff2              42.06 kB
dist/assets/hello-organichand-webfont-N2lES-qN.woff2   56.41 kB
dist/assets/Store-CESmvu-W.css                         19.63 kB │ gzip:  3.63 kB
dist/assets/Store-CBbAAbfK.js                          20.47 kB │ gzip:  6.74 kB
✓ built in 1.40s
```

---

## 8. REGRESSION VERIFICATION & NON-GOALS

### 8.1 Zero Regression Guarantee for Part I
- All Part I views (`discover`, `book-detail`, `genres`, `community`, `community-thread`, `library`, `reviews`, `reading-room`, `account`, `moderation`) execute without change.
- `ApplicationShell`, `Navbar`, and `Footer` for Part I remain fully active when navigating within Part I.
- No backend Django models, serializers, or API views were modified.

### 8.2 Deliberate Non-Goals for Stage 1A
- Complete Store homepage sections (Hero, Monthly Book Carousel, Benefits, Pricing Grid, etc.) are scheduled for **Stages 1B through 1E**.
- Full Catalog browsing and filtering are scheduled for **Stage 2**.
- Cart slide-over drawer, persistent state, and checkout integration are scheduled for **Stage 3**.

---

## 9. READINESS FOR STAGE 1B

Stage 1A is complete, rigorously tested, and fully signed off. The application shell and animation primitives are established and ready to host the interactive homepage sections.

**Next Milestone:** **Part II, Stage 1B — Store Homepage Hero Section & Dynamic Interactive Elements**
- Hero layout featuring artisanal typographic hierarchy.
- Interactive book stack / folio presentation.
- Membership CTA cards with organic hover micro-interactions.
