# STAGE 1D.1: INTERACTION STABILIZATION & HERO POSITION POLISH REPORT

**Date:** November 19, 2026  
**Branch:** `ragnar/frontend` (Local working branch)  
**Engineer:** Lead Full-Stack Frontend Engineer  
**Stage:** 1D.1 — Interaction Stabilization & Hero Position Polish  
**Status:** COMPLETE (100% Quality Gates Passing)

---

## 1. Executive Summary

Stage 1D.1 addressed subtle visual and interaction stability edge cases across the four initial store sections:
1. **How It Works Card Flickering Elimination:** Root caused to continuous numerical `zIndex` tweening inside `gsap.to` combined with unkilled sibling item tweens. Solved via deterministic resting z-indices (1..4), immediate elevated foreground z-index (`gsap.set(itemEl, { zIndex: 30 })`) applied before movement, and systematic `gsap.killTweensOf` calls with `overwrite: 'auto'`.
2. **Choose From Pointer-Leave Exit & Preloading:** Fixed the sudden unmounting disappearance of active cover artwork on pointer leave by implementing a 0.25s `scale: 0, opacity: 0` reverse exit tween, with immediate cancellation and fast-path switching if another genre is rapidly entered. Created the `useCategoryImagesPreloader` hook preloading all 44 category cover images via `new Image()` and `img.decode()` with graceful error handling.
3. **Why Akashic Buoyant Motion:** Restored authentic cursor-driven momentum motion to the 5 feature capsules inspired by `initMomentumBasedHover` from the reference codebase. Capsules subtly displace ($\le 12\text{px}$) and tilt ($\pm 1.5^\circ$) with smooth damping on cursor movement, gently settling back via `elastic.out(1, 0.5)` on pointer stop/leave, and strictly honoring `prefers-reduced-motion`.
4. **Store Hero Vertical Position Polish:** Adjusted desktop `.heroContainer` top padding from `170px` to `130px` and applied `margin-top: -1.75rem` to `.heroContent` to sit higher on desktop viewports, matching reference image 4 while preserving responsive alignment across iPad Pro (1032px), tablet (768px), and mobile viewports.

---

## 2. Detailed Technical Breakdown

### 2.1 How It Works — Card Stacking & Stagger Stabilization
- **Files Modified:**
  - `frontend/src/pages/Store/components/HowItWorks/HowItWorksSection.tsx`
  - `frontend/src/pages/Store/components/HowItWorks/HowItWorksSection.test.tsx`
- **Root Cause Analysis:**
  - Previously, `zIndex` was included in the `gsap.to` parameter object. Because GSAP interpolates numeric properties linearly or with easing over time, `zIndex` transitioned through fractional values (e.g., 1.0 -> 1.5 -> ... -> 20) over the 0.85s tween duration. When cursor moved across cards, competing tweens caused cards to fight over stacking order frame by frame, creating visible flicker and z-fighting.
- **Architectural Solution:**
  - Defined deterministic resting stacking order: Card 0 has z-index 1, Card 1 has 2, Card 2 has 3, Card 3 has 4.
  - When a card becomes active, its DOM node is immediately set to z-index 30 (`gsap.set(itemEl, { zIndex: 30 })`) **synchronously before** the transform tween begins.
  - Sibling resting items are explicitly reset to their resting z-index (`gsap.set(itemEl, { zIndex: i + 1 })`).
  - Added `gsap.killTweensOf(itemEl)` and `gsap.killTweensOf(cardEl)` prior to initiating new tweens.
  - Verified no CSS `transition: transform` exists on `.flowListItem` or `.flowCard` to avoid fighting with GSAP transforms.
  - Added test cases covering rapid non-adjacent switching (e.g. 1 -> 4 -> 2 -> 4 -> 1) and leave-re-enter cycles.

### 2.2 Choose From — Reverse Exit Animation & 44-Cover Preloader
- **Files Created / Modified:**
  - `frontend/src/pages/Store/components/ChooseFrom/hooks/useCategoryImagesPreloader.ts`
  - `frontend/src/pages/Store/components/ChooseFrom/hooks/useCategoryImagesPreloader.test.ts`
  - `frontend/src/pages/Store/components/ChooseFrom/ChooseFromSection.tsx`
  - `frontend/src/pages/Store/components/ChooseFrom/ChooseFromSection.module.css`
- **Root Cause Analysis:**
  - `handleListLeave` was immediately resetting `activeIndex = null`, which caused `activeSrc` to become null and immediately unmounted the `<img />` tags. As a result, CSS scale-out transitions never had an element to render, causing books to vanish instantaneously.
- **Architectural Solution:**
  - Decoupled `activeIndex` (hover state) from `displayIndex` (rendered cover artwork state).
  - On `handleListLeave`, `activeIndex` is set to null, but `displayIndex` is retained while GSAP plays a reverse exit animation:
    `gsap.to(validBoxes, { scale: 0, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => setDisplayIndex(null) })`.
  - On `handleItemEnter`, if an exit tween is in flight, it is immediately killed (`exitTweenRef.current.kill()`), the new category index is applied, and covers animate in smoothly via `gsap.to(validBoxes, { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(1.4)' })`. Two categories are never rendered simultaneously.
  - Removed competing `transition: scale` from CSS `.genreBox` to let GSAP retain deterministic control over scale and opacity.
  - Created `useCategoryImagesPreloader` hook: preloads all 44 cover assets on mount using `new Image()` and `img.decode()`. Missing images or network errors are handled gracefully without breaking state.

### 2.3 Why Akashic — Buoyant Pointer-Responsive Motion
- **Files Modified:**
  - `frontend/src/pages/Store/components/WhyAkashic/WhyAkashicSection.tsx`
  - `frontend/src/pages/Store/components/WhyAkashic/WhyAkashicSection.module.css`
  - `frontend/src/pages/Store/components/WhyAkashic/WhyAkashicSection.test.tsx`
- **Architectural Solution:**
  - Implemented pointer tracking modeled after `initMomentumBasedHover`:
    - Checks `(hover: hover) and (pointer: fine)` to ensure touch devices are excluded.
    - Tracks cursor coordinates relative to each capsule center.
    - Within an influence radius of 480px, capsules respond with subtle displacement ($\le 12\text{px}$) and subtle tilt ($\pm 1.5^\circ$) with `power2.out` damping.
    - A 150ms debounce timer detects pointer stops; upon stop or `pointerleave`, capsules gently settle back to resting rotation and position using `elastic.out(1, 0.5)`.
    - Removed `transition: transform` from `.benefitsLabelInner` in CSS to eliminate conflicts with GSAP tweens.
    - Added comprehensive unit tests and verified full compliance with `prefers-reduced-motion`.

### 2.4 Store Hero — Vertical Alignment Correction
- **Files Modified:**
  - `frontend/src/pages/Store/components/StoreHero/StoreHero.module.css`
- **Adjustments Made:**
  - Desktop `.heroContainer` top padding reduced from `170px` to `130px`.
  - `.heroContent` updated with `margin-top: -1.75rem`, sitting higher in the hero viewport to match authentic reference image 4.
  - Verified that responsive media queries for tablet (991px) and mobile (640px) preserve centered vertical rhythm.

---

## 3. Verification & Screenshot Records

### 3.1 Quality Gates
- `npm --prefix frontend run typecheck`: **PASSED (0 errors)**
- `npm --prefix frontend run lint`: **PASSED (0 errors, 0 warnings)**
- `npm --prefix frontend run test -- --run`: **PASSED (44 test suites, 322 tests passing)**
- `npm --prefix frontend run build`: **PASSED (Production bundle built in 2.8s)**

### 3.2 Visual Artifacts Captured
The following screenshots were captured via Playwright and saved to both `screenshots/` and `Akashic_Library/screenshots/`:
- `stage1d1_hero_corrected_1440.png` — Desktop hero vertical alignment
- `stage1d1_how_it_works_1440_default.png` — Resting step cards with natural jitter
- `stage1d1_how_it_works_hover_step1_1440.png` — Hover Step 1 foreground elevation
- `stage1d1_how_it_works_hover_step2_1440.png` — Hover Step 2 fanning choreography
- `stage1d1_how_it_works_hover_step4_1440.png` — Hover Step 4 foreground elevation
- `stage1d1_how_it_works_rapid_switch_1440.png` — Rapid non-adjacent card switching
- `stage1d1_choose_from_1440_default.png` — Resting choose from category list
- `stage1d1_choose_from_hover_romance_1440.png` — Romance floating book covers
- `stage1d1_choose_from_hover_thriller_1440.png` — Thriller floating book covers
- `stage1d1_choose_from_exit_animation_1440.png` — Mid-flight reverse exit animation
- `stage1d1_why_akashic_1440_default.png` — Why Akashic resting layout
- `stage1d1_why_akashic_buoyant_hover_1440.png` — Buoyant cursor-responsive capsule reaction
- `stage1d1_hero_1280.png`, `stage1d1_hero_ipad1032.png`, `stage1d1_hero_tablet768.png`, `stage1d1_hero_mobile440.png`, `stage1d1_hero_mobile390.png`, `stage1d1_hero_mobile360.png` — Multi-viewport alignment checks
