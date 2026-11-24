# STAGE 1D.2: CHOOSE FROM INTERACTION REGRESSION RESTORATION & TYPESCRIPT ERROR FIX REPORT

**Date:** November 19, 2026  
**Milestone:** Part II: Akashic Store — Stage 1D.2  
**Branch:** `ragnar/frontend` (Local working branch, strict zero commits/pushes/branch switches)  
**Lead Engineer:** Senior React, TypeScript, GSAP & Frontend Animation Engineer  

---

## 1. Executive Summary

During previous stabilization passes, a visual regression occurred in the **Choose From (Category Showcase)** section: hovering over individual book genres no longer displayed the four floating book covers around the active genre. Concurrently, an IDE TypeScript error was reported:
```text
Object is possibly 'undefined'. ts(2532)
jitterMap[displayIndex][hIdx]
```

Stage 1D.2 was executed to resolve both the visual regression and the TypeScript error with mathematical fidelity to the authoritative original reference (`frontend/site-clone/site_copy/`), without redesigning the approved layout and without modifying any other sections (Store Hero, Our Top Books, How It Works, Why Akashic, Common Questions, Store Footer, or Backend).

All quality gates have passed with 100% compliance:
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors, 0 warnings
- `npm run test -- --run` — 44 test suites, 326 tests passing
- `npm run build` — Production Vite build succeeded in 2.22s

---

## 2. Root Cause Analysis

### A. Root Cause 1: CSS Image Opacity Blackout (`opacity: 0` without `.isLoaded`)
In `ChooseFromSection.module.css`:
```css
.genreImg {
  object-fit: cover;
  border-radius: 0.65rem;
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.18s ease;
  box-shadow: 0 0 0 0.25rem #FFFFFF, 0 16px 36px rgba(0, 0, 0, 0.22);
}
.genreImg.isLoaded {
  opacity: 1;
}
```
In `ChooseFromSection.tsx`, the `<img>` element was rendered as:
```tsx
<img key={`${displayIndex}_${hIdx}`} src={activeSrc} alt="" className={styles.genreImg} />
```
The `.isLoaded` class was never appended or bound to state in the JSX markup. As a result, every cover image in the section remained at `opacity: 0` permanently. Even when GSAP animated the card wrappers up to `scale: 1`, the nested image was 100% transparent.

### B. Root Cause 2: Conflicting Transform Layering between GSAP and CSS Jitter
In the previous implementation, GSAP `scale` and `opacity` tweens were applied directly to `.genreBox`, which also owned the CSS transform calculation:
```css
transform: translate(calc(var(--x) * 1%), calc(var(--y) * 1%)) rotate(calc(var(--r) * 1deg)) ...;
transition: transform 0.85s ...;
scale: 0;
```
When GSAP animated `.genreBox`, writing inline matrix transforms wiped out or collided with the CSS jitter/parallax transforms, causing jerky pops or frozen scales.

### C. Root Cause 3: Symmetrical 2x2 Grid vs. Organic Aardvark Layout
The previous CSS assigned identical X coordinates to positions 1 & 3 (`calc(-150% - startWidth*0.5)`) and positions 2 & 4 (`calc(50% + startWidth*0.5)`), creating an artificial, rigid rectangular box. In contrast, the original reference in `site_copy/` utilizes organic asymmetric coordinates, natural variations in holder dimensions (12.5rem–13.5rem), distinct stacking orders (`z-index: 3, 2, 4, 1`), and per-category jitter.

### D. Root Cause 4: TypeScript Error `ts(2532)` on `jitterMap[displayIndex][hIdx]`
`jitterMap` was typed as `Array<Array<{ x, y, r }>>` and populated at runtime with `Math.random()`. In TypeScript with strict indexed access, accessing `[displayIndex]` yields `CategoryJitter[] | undefined`. Chaining `[hIdx]` immediately triggers:
`Object is possibly 'undefined'. ts(2532)`.

---

## 3. Implementation Details & Architecture Corrections

### A. Complete Resolution of TypeScript Error `ts(2532)`
We introduced strongly-typed interfaces and deterministic data tables in `types.ts` and `categoryData.ts`:
1. **Interface Definition (`types.ts`):**
   ```ts
   export interface CategoryJitter {
     x: number;
     y: number;
     r: number;
   }
   ```
2. **Deterministic Category Jitter Matrix (`categoryData.ts`):**
   Replaced runtime `Math.random()` with `CATEGORY_JITTERS`: a handcrafted 11-category $\times$ 4-holder matrix with organic, natural offsets derived from the reference site's range (`[-15..15]%` offset, `[-12..12]deg` rotation).
3. **Safe Bounds-Checked Accessor (`categoryData.ts`):**
   ```ts
   export const DEFAULT_CATEGORY_JITTER: CategoryJitter = { x: 0, y: 0, r: 0 };

   export function getCategoryJitter(
     catIndex: number | null | undefined,
     holderIndex: number
   ): CategoryJitter {
     if (catIndex === null || catIndex === undefined || catIndex < 0 || catIndex >= CATEGORY_JITTERS.length) {
       return DEFAULT_CATEGORY_JITTER;
     }
     const categoryRow = CATEGORY_JITTERS[catIndex];
     if (!categoryRow) return DEFAULT_CATEGORY_JITTER;
     return categoryRow[holderIndex] ?? DEFAULT_CATEGORY_JITTER;
   }
   ```
4. **Usage in `ChooseFromSection.tsx`:**
   ```tsx
   const jit = getCategoryJitter(displayIndex, hIdx);
   ```
   `jit` is unconditionally guaranteed to be `CategoryJitter`. The IDE error `Object is possibly 'undefined'. ts(2532)` is 100% eliminated without any `@ts-ignore`, `any`, or unsafe non-null assertions `!`.

### B. Clean Separation of Transform Concerns (Three-Tier DOM Architecture)
To eliminate GSAP-CSS transform collision:
1. **Tier 1 — `.genreHolder` (Slot Placement & Dimensions):**
   - **Holder 1 (Top Left):** `width: 13.25rem`, `z-index: 3`, `transform: translate(calc(-162% - (var(--start-width) * 0.5px)), -108%)`
   - **Holder 2 (Top Right):** `width: 12.5rem`, `z-index: 2`, `transform: translate(calc(48% + (var(--start-width) * 0.5px)), -96%)`
   - **Holder 3 (Bottom Left):** `width: 12.75rem`, `z-index: 4`, `transform: translate(calc(-142% - (var(--start-width) * 0.5px)), 46%)`
   - **Holder 4 (Bottom Right):** `width: 13.5rem`, `z-index: 1`, `transform: translate(calc(58% + (var(--start-width) * 0.5px)), 52%)`
2. **Tier 2 — `.genreBox` (Jitter & Parallax):**
   Applies pure CSS elastic transforms for `--x`, `--y`, `--r`, `--px`, and `--py` without touching `scale` or conflicting with GSAP.
3. **Tier 3 — `.genreCard` (Dedicated GSAP Animation Target):**
   A dedicated wrapper div inside `.genreBox` that GSAP animates:
   - Initial state: `scale: 0, opacity: 0`
   - Hover entrance: `gsap.to(validBoxes, { scale: 1, opacity: 1, duration: 0.35, stagger: 0.03, ease: 'back.out(1.5)', overwrite: 'auto' })`
   - Pointer leave exit: `gsap.to(validBoxes, { scale: 0, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto', onComplete: () => setDisplayIndex(null) })`
4. **Tier 4 — `.genreImg` (Clean Presentation):**
   `opacity: 1; display: block; border-radius: 0.875rem; box-shadow: 0 0 0 0.25rem #FFFFFF, 0 16px 36px rgba(0, 0, 0, 0.22);`.

### C. Preloading & Rapid Genre Switching Robustness
- **Preloading:** All 44 category cover images (`cat_0_holder_0.webp` through `cat_10_holder_3.webp`) are preloaded and decoded via `useCategoryImagesPreloader()` upon section mount.
- **Rapid Genre Switching:** When pointer moves rapidly (e.g., Horror $\to$ Romance $\to$ Thriller $\to$ Fantasy), any existing exit tween is immediately killed via `exitTweenRef.current.kill()`. The cards stay at `scale: 1` while smoothly sliding vertically and re-jittering to their new positions. Two categories never render simultaneously on screen.
- **Graceful Reverse Exit:** On pointer leave, covers remain mounted during the 0.25s reverse scale-down animation and unmount cleanly in `onComplete`.

---

## 4. Verification & Quality Gates

### A. Automated Quality Gates

| Gate | Command | Result |
|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | **PASS (0 errors)** |
| **ESLint** | `npm run lint` | **PASS (0 errors, 0 warnings)** |
| **Unit & Integration Tests** | `npm run test -- --run` | **PASS (44 test suites, 326 tests)** |
| **Production Build** | `npm run build` | **PASS (Vite production bundle built in 2.22s)** |

### B. Captured Visual Verification Screenshots

All required screenshots were captured via Playwright browser automation on the live frontend (`http://127.0.0.1:3000/?view=store`) at viewport 1440x900 (deviceScaleFactor: 2) and saved into `screenshots/` and `Akashic_Library/screenshots/`:

1. `stage1d2_choose_from_default_1440.png` — Default resting state (clean magenta background, crisp typography, no covers visible).
2. `stage1d2_choose_from_horror_hover_1440.png` — Horror genre hovered; all 4 Horror book covers floating organically.
3. `stage1d2_choose_from_romance_hover_1440.png` — Romance genre hovered; 4 distinct Romance covers visible.
4. `stage1d2_choose_from_thriller_hover_1440.png` — Thriller genre hovered; 4 distinct Thriller covers visible.
5. `stage1d2_choose_from_science_fiction_hover_1440.png` — Science Fiction hovered; 4 distinct Sci-Fi covers visible.
6. `stage1d2_choose_from_rapid_switching_fantasy_1440.png` — Rapid genre switching test settling on Fantasy; 0 flicker, 0 duplicate covers.
7. `stage1d2_choose_from_exit_animating_1440.png` — Pointer leave mid-transition; covers smoothly scaling down.
8. `stage1d2_choose_from_exit_completed_1440.png` — Reverse exit animation completed; cleanly cleared.
9. `stage1d2_full_desktop_section_horror_1440.png` — Full desktop viewport with active category covers.

---

## 5. Scope Boundaries Maintained

- **Store Hero:** Unchanged.
- **Our Top Books:** Unchanged.
- **How It Works:** Unchanged.
- **Why Akashic?:** Unchanged.
- **Common Questions:** Unchanged.
- **Store Footer:** Unchanged.
- **Backend / Django:** Unchanged.
- **Branch:** `ragnar/frontend` strictly preserved; 0 git commits, 0 git pushes, 0 branch switches.
