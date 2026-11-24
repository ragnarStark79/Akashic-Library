# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 1D — "WHY AKASHIC?" SECTION IMPLEMENTATION REPORT

**Milestone:** Stage 1D — Why Akashic? Section Implementation  
**Date:** November 19, 2026  
**Repository Branch:** `ragnar/frontend` (Strict local branch; 0 git commits, 0 git pushes, 0 branch switches, 0 stash/reset)  
**Authoritative Source of Truth (Read-Only):** `frontend/site-clone/site_copy/`  
**Target Component:** `frontend/src/pages/Store/components/WhyAkashic/`  
**Integrated In:** `frontend/src/pages/Store/StoreApp.tsx` (Directly following `ChooseFromSection`)

---

## 1. EXECUTIVE SUMMARY

Stage 1D implements the **Why Akashic?** section, replacing the original Aardvark Book Club "Why Aardvark?" component. Rather than a conventional card grid, this section is an authentic recreation of Aardvark's organic editorial composition featuring:
- An organic pale golden canvas (`#FAED8F`) with an underlay `::before` pseudo-element extending beneath the bottom curved edge of the Choose From section.
- Layered golden wave background vector paths (`#FFD24A`) animated with subtle stroke-width wave breathing physics.
- An authentic curved header title reading **"Why Akashic?"** rendered along an SVG path in rich wine `#670A2E` (`var(--wine)`).
- A circular Akashic seal emblem centered below the curved text, combining an organic hand-drawn ring with the sanctuary archival crest.
- Five floating, asymmetric, rotated editorial feature capsules highlighting Akashic Store's genuine commercial advantages with physics-driven momentum hover animations.
- Full responsive adaptation across desktop, tablet, iPad, and small mobile displays ($\le 360\text{px}$).

All commercial copy reflects truthful, verified capabilities within the Akashic codebase—avoiding unfounded universal free shipping or all-hardcover claims.

---

## 2. ARCHITECTURAL DESIGN & SOURCE OF TRUTH FIDELITY

### 2.1 Color Palette & Visual Theme
The section adheres strictly to the authentic Aardvark design system tokens:
- **Base Canvas:** Pale butter yellow `#FAED8F` (`var(--sand)` / `var(--yellow-light)`)
- **Organic Wave Shapes:** Warm golden yellow `#FFD24A` (`var(--yellow)`)
- **Curved Typography:** Deep wine `#670A2E` (`var(--wine)`), Champ ExtraBold typeface
- **Brand Crest:** Hand-drawn organic concentric circles `#670A2E` enclosing the Akashic sanctuary book emblem

### 2.2 Section Curvature, Stacking Context & Seamless Underlay
In the original website, the "Why" section sits directly below the magenta "Choose From" section. Because "Choose From" has a deeply rounded lower edge (`clip-path: inset(0 round 7.5rem)`), the yellow background of Why Akashic must extend upward to meet the curved boundary with zero white seam or background clipping gaps.

To ensure Choose From's bottom content ("and more!" category and circular seal trigger) is never masked while allowing the organic corner cutouts to reveal the yellow canvas behind them:
- `.genreSection` is explicitly assigned `z-index: 2`.
- `.benefitsSection` is assigned `z-index: 1`, with an underlay `::before` pseudo-element extending 8rem upward beneath Choose From.

In `WhyAkashicSection.module.css`:
```css
.benefitsSection {
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 820px;
  display: flex;
  position: relative;
  box-sizing: border-box;
  margin: 0;
  z-index: 1;
}

/* Authentic underlay extension: connects seamlessly behind the bottom rounded boundary of Choose From */
.benefitsSection::before {
  content: "";
  display: block;
  position: absolute;
  top: -8rem;
  left: 0;
  width: 100%;
  height: 8.5rem;
  background-color: var(--store-color-pale-yellow, #FAED8F);
  z-index: 0;
  pointer-events: none;
}

.benefitsInner {
  width: 100%;
  height: 100%;
  background-color: var(--store-color-pale-yellow, #FAED8F);
  clip-path: inset(0 round 0 0 7.5rem 7.5rem);
  display: grid;
  position: relative;
  overflow: clip;
}
```

### 2.3 The Curved Header & Seal Emblem
- **SVG Text Path:** The title "Why Akashic?" is rendered along an arched cubic Bézier curve (`viewBox="0 0 650 235"`, `d="M 45,215 C 130,40 520,40 605,215"`), matching authentic Aardvark curve geometry with `startOffset="50%"` and `textAnchor="middle"` in Champ ExtraBold at font size 82.
- **Brand Seal Emblem (`WhyAkashicSealLogo.tsx`):** A custom SVG component featuring the hand-drawn organic ring texture surrounding the Akashic sanctuary open-tome motif.

### 2.4 Five Asymmetric Feature Capsules
The section features five overlapping, floating horizontal feature capsules, positioned with authentic rotations and offsets:

| Capsule | Verified Akashic Copy | Background Token | Background Hex | Text Hex | Rotation (Desktop / Tablet / Mobile) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | **Range of genres** | `var(--magenta)` | `#FF008C` | `#FFFFFF` | $-5^\circ$ / $-10^\circ$ / $-8^\circ$ |
| **#2** | **Direct delivery** | `var(--orange)` | `#F9A220` | `#670A2E` | $-1.8^\circ$ / $+5^\circ$ / $+4^\circ$ |
| **#3** | **Thoughtfully priced** | `var(--periwinkle)` | `#9982DE` | `#FFFFFF` | $+2.5^\circ$ / $+2^\circ$ / $+2^\circ$ |
| **#4** | **Quality editions** | `var(--cyan)` | `#1CE8ED` | `#3B308F` | $+5.8^\circ$ / $+6^\circ$ / $+5^\circ$ |
| **#5** | **Curated books** | `var(--olive)` | `#857521` | `#FFFFFF` | $-5.3^\circ$ / $-5^\circ$ / $-4^\circ$ |

#### Commercial Copy Honesty Audit
- **"Range of genres":** Grounded in the 11 verified store genres.
- **"Direct delivery":** Reflects verified doorstep fulfillment.
- **"Thoughtfully priced":** Truthful to fair artisanal pricing without deceptive "cheapest on earth" superlatives.
- **"Quality editions":** Highlights archival physical craftsmanship without asserting all books are hardcovers.
- **"Curated books":** References the curated monthly book reveals.

---

## 3. ANIMATION & INTERACTION IMPLEMENTATION

### 3.1 GSAP Scroll Entrance
Upon scrolling into view (`ScrollTrigger: start: 'top 75%'`):
- The central seal logo scales up smoothly (`scale: 0.85 -> 1.0`, `opacity: 0 -> 1`, duration 0.9s).
- The five feature capsules animate upward with a staggered reveal (`stagger: 0.072s`, `y: 45 -> 0`, `opacity: 0 -> 1`, `ease: 'power3.out'`).

### 3.2 Momentum Hover Physics
Hovering over any feature capsule triggers an organic scale and rotation shift:
- Capsule elevates slightly (`scale: 1.04`, `zIndex: 10`).
- Text gently tracks pointer movement, resetting elastically on `pointerleave`.

### 3.3 Decorative Wave Breathing
The background golden wave SVG paths (`bgPathsRef`) execute a subtle stroke-width oscillation (`attr: { strokeWidth: 45 }`, `duration: 3.5s`, `repeat: -1`, `yoyo: true`), mirroring the ambient background movement found in the reference site.

### 3.4 Accessibility & Reduced Motion
The implementation integrates `useReducedMotion()`. When `prefers-reduced-motion` is detected:
- GSAP timeline animations are bypassed.
- Capsules render immediately at their target resting coordinates and rotations.
- Background wave strokes remain static.

---

## 4. VERIFICATION EVIDENCE & QUALITY GATES

### 4.1 Automated Test Execution
- Component tests: `src/pages/Store/components/WhyAkashic/WhyAkashicSection.test.tsx` (5 tests passing).
- Root Store tests: `StoreApp.test.tsx` and `StoreLifecycle.test.tsx` passing.
- Full suite: `npm --prefix frontend run test -- --run`
  - **42 test suites passed (100%)**
  - **310 tests passed (100%)**
- TypeScript compilation: Clean `tsc -b` execution, 0 errors.
- Production build: `vite build` completed successfully.

### 4.2 Visual Artifacts Captured
The following screenshot artifacts were recorded and saved under `screenshots/`:

| Artifact File | Viewport | Focus / Description |
| :--- | :--- | :--- |
| `screenshots/stage1d_why_akashic_1440_default.png` | 1440×900 | Desktop resting composition: curved title, seal emblem, 5 rotated capsules, wave SVGs |
| `screenshots/stage1d_why_akashic_scroll_entrance.png` | 1440×900 | Viewport showing transition from Choose From curve into Why Akashic entrance |
| `screenshots/stage1d_why_akashic_capsules_hover.png` | 1440×900 | Capsule hover state showing interactive elevation and highlight |
| `screenshots/stage1d_why_akashic_1280.png` | 1280×800 | Standard laptop desktop layout |
| `screenshots/stage1d_why_akashic_1032_ipad.png` | 1032×1376 | iPad Pro portrait composition |
| `screenshots/stage1d_why_akashic_768_tablet.png` | 768×1024 | Standard tablet viewport with tablet-specific rotation angles |
| `screenshots/stage1d_why_akashic_440_mobile.png` | 440×956 | Large mobile (iPhone 16 Pro Max / Galaxy S Ultra) |
| `screenshots/stage1d_why_akashic_390_mobile.png` | 390×844 | Standard mobile (iPhone 14/15/16) |
| `screenshots/stage1d_why_akashic_360_mobile.png` | 360×780 | Compact mobile viewport showing stacked capsule layout without overflow |

---

## 5. CONCLUSION & INTEGRATION STATUS
Stage 1D is fully realized, functionally tested, and visually validated. The Akashic Store now seamlessly transitions from **Store Hero** to **Our Top Books**, **How It Works**, **Choose From**, and **Why Akashic?** with complete visual fidelity to the reference design.
