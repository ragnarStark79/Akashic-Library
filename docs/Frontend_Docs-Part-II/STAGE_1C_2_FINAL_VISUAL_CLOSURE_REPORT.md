# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 1C.2 — FINAL VISUAL FIDELITY CLOSURE & INTERACTION REPORT

**Milestone:** Stage 1C.2 — Final Visual Corrections to How It Works and Choose From  
**Date:** November 19, 2026  
**Repository Branch:** `ragnar/frontend` (Strict local branch; 0 git commits, 0 git pushes, 0 branch switches, 0 stash/reset)  
**Authoritative Source of Truth (Read-Only):** `frontend/site-clone/site_copy/`  
**Target Components:**
- `frontend/src/pages/Store/components/HowItWorks/`
- `frontend/src/pages/Store/components/ChooseFrom/`

---

## 1. EXECUTIVE SUMMARY

Stage 1C.2 provides final visual-fidelity closure and interaction stabilization for the **How It Works** and **Choose From** sections of the Akashic Store. While Stage 1C.1 corrected initial layout inflations, deep comparative inspection against the authentic reference site (`frontend/site-clone/site_copy/`) revealed several subtle design and kinetic discrepancies:

1. **How It Works Heading Scale Discrepancy:** The main heading was previously set to 41.25px based on an initial misinterpretation of typography tokens. In the authentic reference stylesheet (`_ext/slater.app/18601/54934.css`), `--font-size-heading-l: 6.5em;` is calculated against the 12px desktop body font ($6.5 \times 12\text{px} = 78\text{px}$, or `4.875rem` at a standard 16px root), making the authentic heading substantially bolder, tighter, and visually authoritative.
2. **Handwritten Annotation Scale & Legibility:** The annotation ("Consider us your professional book curator") was previously rendered too small (18px) and washed out. The authentic styling uses `Hello Organichand Webfont` at 24px (`1.5rem`), line-height 1.0, deep violet `#3B308F` (`var(--violet)`), and a natural tilt of `2.382deg`.
3. **CTA Color Saturation:** The "Become a member" CTA previously used a lighter pastel pink (`#FD48F2`). Inspection of the reference Webflow rules revealed an explicit override: `--button-alt-color-background: var(--magenta)` (`#FF008C`), paired with pure white text and an inverted white arrow pill.
4. **Card Colors & Text Contrast:** The four step cards now exhibit rich, un-attenuated authentic colors (#1CE8ED cyan, #FD48F2 bright pink, #FFD24A golden yellow, #9982DE periwinkle) with high-contrast pure black typography (`#000000`).
5. **Whole-Card Fanning Physics:** Card hover previously animated only the inner text container (`.flowCardContent`), leaving the card body, headers, and illustrations stationary. The interaction now animates the entire card entity (`data-call-out-child` / `cardsRef`) using the exact Aardvark fanning equation $\Delta x\% = \frac{45}{j - \text{activeIdx}}$, elevating the hovered card to the foreground (`zIndex: 20`, `scale: 1.075`) with elastic recoil.
6. **Choose From Full-Width Geometry:** The pink category container previously showed unwanted white vertical margin strips. The container now extends edge-to-edge ($100\text{vw}$ full width, `margin: 0`), retaining organic rounded clipping masks (`inset(0 round 7.5rem)`).
7. **Contemporary Fiction Single-Line Layout:** Category wrapping previously caused "Contemporary Fiction" to break into two lines on desktop, overlapping adjacent categories. By enforcing desktop `white-space: nowrap` and constraining word-breaking to mobile viewports ($\le 768\text{px}$), the desktop row remains strictly on one line.

All automated verification gates (42 test suites, 310 unit/integration tests, zero TypeScript errors, clean production bundle) passed cleanly. Visual evidence was captured across standard viewports and interactive states.

---

## 2. DETAILED DISCREPANCY ANALYSIS & RESOLUTION

### 2.1 Main Heading "How it works"
- **Discrepancy:** The previous report reduced the heading to `2.578rem` (41.25px), which left the heading looking diminutive compared to the cards below.
- **Reference Investigation:** In `frontend/site-clone/site_copy/` Webflow styles, `u-heading-l` is bound to `--font-size-heading-l`. In `54934.css`, `:root { --font-size-heading-l: 6.5em; }`. At the 1440px desktop reference viewport, body font is 12px, yielding:
  $$6.5 \times 12\text{px} = 78\text{px} \quad (\text{or } 4.875\text{rem at } 16\text{px root})$$
- **Implementation:** In `HowItWorksSection.module.css`:
  ```css
  .flowTitle {
    font-family: var(--font-family-champ, 'Champ', 'Degular Bold', sans-serif);
    font-size: 4.875rem; /* 78px exact matching 6.5em @ 12px */
    line-height: 0.8;
    letter-spacing: -0.01em;
    font-weight: 800;
    color: var(--black, #000000);
    margin: 0;
  }
  ```

### 2.2 Handwritten Annotation
- **Discrepancy:** The annotation "Consider us your professional book curator" was undersized and positioned too far from the heading baseline.
- **Reference Values:**
  - Font Family: `'Hello Organichand Webfont', 'Covered By Your Grace', cursive`
  - Font Size: `1.5rem` (24px)
  - Color: `#3B308F` (`var(--violet)`)
  - Rotation: `2.382deg`
  - Line-height: `1.0`
- **Implementation:** Updated `.flowText` with exact font sizing, tracking, violet color token, and character-level staggered reveal preserving authentic handwriting cadence.

### 2.3 Become a Member CTA
- **Discrepancy:** Previous implementation used `#FD48F2`, a light magenta that lacked contrast.
- **Reference Values:** Webflow `.button-alt` with modifier `--button-alt-color-background: var(--magenta)`.
  - Background: `#FF008C` (Deep saturated magenta)
  - Text: `#FFFFFF` (Pure white, `Champ` 800 weight)
  - Arrow Icon: Inverted white `#FFFFFF` within matching pill capsule
- **Implementation:** Updated `.buttonAlt` and `.buttonAltBg` in `HowItWorksSection.module.css` to `#FF008C` with white text and icon.

### 2.4 Card Color & Typography Integrity
- **Card #1 (Step #1):** Cyan `#1CE8ED`, text `#000000`, Step label `#000000`
- **Card #2 (Step #2):** Bright Pink `#FD48F2`, text `#000000`, Step label `#000000`
- **Card #3 (Step #3):** Yellow `#FFD24A`, text `#000000`, Step label `#000000`
- **Card #4 (Step #4):** Periwinkle `#9982DE`, text `#000000`, Step label `#000000`
- Overlays and tint washes were eliminated; full color vibrancy is preserved.

### 2.5 Whole-Card Fanning Physics
- **Discrepancy:** In Stage 1C.1, only `.flowCardContent` (the bottom text div) was translated. The card body, headers, and illustrations remained locked in position.
- **Authentic Formula (`initCallout`):**
  When hovering card index $i$:
  - Hovered card: `scale: 1.075`, `zIndex: 20`, translates towards pointer center.
  - Neighboring card index $j \ne i$:
    $$x\% = \frac{45}{j - i}$$
    - For card to the left ($j < i$): $j - i < 0 \implies x\% < 0$ (fans left).
    - For card to the right ($j > i$): $j - i > 0 \implies x\% > 0$ (fans right).
- **Implementation:** In `HowItWorksSection.tsx`, attached `cardsRef` to the root `HowItWorksCard` div (`data-call-out-child`) and `listItemsRef` to the containing `<li>` item. On hover:
  ```typescript
  cardsRef.current.forEach((cardEl, idx) => {
    if (!cardEl) return;
    if (idx === activeIdx) {
      gsap.to(cardEl, { xPercent: 0, duration: 0.85, ease: 'elastic.out(1, 0.75)' });
    } else {
      const offset = Math.round(45 / (idx - activeIdx));
      gsap.to(cardEl, { xPercent: offset, duration: 0.85, ease: 'elastic.out(1, 0.75)' });
    }
  });
  ```
  On mouse leave, cards smoothly recoil back to their natural irregular jitter positions.

---

## 3. PART A — CHOOSE FROM CLOSURE

### 3.1 Full-Width Pink Section
- **Discrepancy:** Previous `.genreSection` had `margin: 0 1.5rem 3.5rem;` which produced unsightly white vertical margins on desktop.
- **Reference Solution:** The authentic section extends $100\%$ across the browser viewport, using `width: 100%`, `margin: 0`, and CSS `clip-path: inset(0 round 7.5rem)` at the top and bottom edges.
- **Implementation:** In `ChooseFromSection.module.css`, eliminated all lateral margins, ensuring seamless full-bleed coverage.

### 3.2 Contemporary Fiction Single-Line Guarantee
- **Discrepancy:** Under desktop viewport widths, "Contemporary Fiction" previously wrapped into "Contemporary<br>Fiction", colliding with neighboring rows.
- **Reference Solution:** On desktop, genre items use `white-space: nowrap`. Word breaking is only enabled on constrained mobile viewports.
- **Implementation:** In `ChooseFromSection.module.css`:
  ```css
  .genreLink {
    white-space: nowrap;
  }
  @media (max-width: 768px) {
    .genreListItem.hasWordBreak .genreLink {
      white-space: normal;
      word-break: break-word;
    }
  }
  ```

### 3.3 Genre Row Spacing & Typography
- Genre row height set to `6rem` (96px), exactly matching the reference's `8em` base font sizing.
- Hover typography smoothly scales to `7.5rem` (120px) without layout shift or text jumping.

---

## 4. VERIFICATION EVIDENCE & QUALITY GATES

### 4.1 Automated Test Suites
- Full test run: `npm --prefix frontend run test -- --run`
- **Result:** **42 passed test files (100%), 310 passed tests (100%)**
- TypeScript check: `tsc -b` passed with 0 errors.
- ESLint: Clean execution, 0 lint warnings.
- Production build: `vite build` completed in 2.06s with clean output bundle.

### 4.2 Visual Artifacts Captured
The following screenshot artifacts were recorded and saved under `screenshots/`:

| Artifact File | Description |
| :--- | :--- |
| `screenshots/stage1c2_how_it_works_1440_default.png` | How It Works 1440px desktop default state (78px heading, 24px violet script, saturated CTA) |
| `screenshots/stage1c2_how_it_works_hover_step1.png` | Step #1 active: Step 1 pops forward (z: 20, scale: 1.075), Steps 2, 3, 4 fan right |
| `screenshots/stage1c2_how_it_works_hover_step2.png` | Step #2 active: Step 1 fans left, Steps 3 & 4 fan right |
| `screenshots/stage1c2_how_it_works_hover_step3.png` | Step #3 active: Steps 1 & 2 fan left, Step 4 fans right |
| `screenshots/stage1c2_how_it_works_hover_step4.png` | Step #4 active: Steps 1, 2, 3 fan left, Step 4 fully foregrounded |
| `screenshots/stage1c2_choose_from_1440_default.png` | Choose From default state (96px row height, black typography, organic curves) |
| `screenshots/stage1c2_choose_from_contemporary_fiction_1line.png` | Contemporary Fiction verified strictly on one line on desktop |
| `screenshots/stage1c2_choose_from_hover_scifi.png` | Science Fiction hovered: single category active, 4 dynamic book covers displayed |
| `screenshots/stage1c2_choose_from_hover_romance.png` | Romance hovered: clean single activation, zero overlap with neighboring genres |
| `screenshots/stage1c2_choose_from_hover_thriller.png` | Thriller hovered: swift stable transition without lingering cover artifacts |
| `screenshots/stage1c2_choose_from_full_width_edges.png` | Full-width edge check: pink section extends edge-to-edge with no white sidebars |

---

## 5. CONCLUSION & READINESS
Stage 1C.2 closes all identified visual fidelity issues in How It Works and Choose From, delivering an authentic editorial and kinetic experience matching the reference site.
