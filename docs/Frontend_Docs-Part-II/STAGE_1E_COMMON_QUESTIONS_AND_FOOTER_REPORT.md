# STAGE 1E: COMMON QUESTIONS & FOOTER REDESIGN REPORT

**Date:** November 19, 2026  
**Branch:** `ragnar/frontend` (Local working branch)  
**Engineer:** Lead Full-Stack Frontend Engineer  
**Stage:** 1E — Common Questions & Footer Redesign  
**Status:** COMPLETE (100% Quality Gates Passing)

---

## 1. Executive Summary

Stage 1E introduced the sixth major section of the Akashic Store—**Common Questions**—and delivered a **complete architectural and visual redesign of the Store Footer**:
1. **Common Questions Section (`CommonQuestionsSection`):**
   - Pure white background (`#FFFFFF`) with generous vertical spacing.
   - Large Champ 800 heading: "Common questions" (78px, `line-height: 0.8`, letter-spacing `-0.01em`).
   - Organic cyan background waves (`var(--store-color-soft-blue, #E6FBFB)` / `#D4F8F8`) utilizing the exact SVG paths from reference `faq__bg` (both desktop and mobile viewports) with subtle GSAP stroke animation.
   - Centered accordion list (`max-width: 820px`) with light cyan rounded capsules (`padding: 1.8125rem 2rem; border-radius: 1.5rem`), Degular 600 titles (1.25rem), and authentic Plus/Minus SVG icon toggle transitions.
   - Centralized, truthful dataset in `commonQuestionsData.ts` with 8 relevant questions concerning Akashic archival folios, monthly reveals, doorstep delivery, guest purchasing, and damage care.
   - Magenta "Show all FAQ" dual-capsule button (`#FF008C`) with animated arrow and functional expansion from initial 5 questions to all 8 questions.
   - Circular Akashic brand seal logo at lower-right (`faq__logo-easter-egg`).
2. **Store Footer Complete Redesign (`StoreFooter`):**
   - Deep purple background (`#3B308F`), upper scalloped wave border overlapping preceding content.
   - **Left Column:** Akashic Store logo, brand title & description, prominent **"Open to everyone."** status badge, Return to Library Sanctuary button (`Compass` icon), organized Store links and Sanctuary links. All app-store buttons and external social media icons removed.
   - **Central Column:** Large floating physical book mock visual rotated at `-21deg` extending beyond footer bounds, featuring local high-quality book artwork (`book-cover-2.webp`) with realistic spine highlight, page edges, and deep drop shadows. Non-interactive (`pointer-events: none; z-index: 2`) ensuring links and inputs remain 100% clickable.
   - **Right Column:** "Join our mailing list" in Champ font, accessible email input with focus-visible ring, magenta dual-capsule submit button with animated arrow, and client-side email format validation with accessible success feedback.
   - **Bottom Legal Strip:** Dark black background (`#000000`), dynamic copyright year (`© {new Date().getFullYear()} Akashic Store. All rights reserved.`), Terms of Service and Privacy Policy links, and smooth "Back to top" button.
3. **Section Ordering in `StoreApp.tsx`:** Verified strict chronological sequence:
   1. Store Hero
   2. Our Top Books
   3. How It Works
   4. Choose From
   5. Why Akashic?
   6. Common Questions
   7. Store Footer

---

## 2. File Architecture & Changes

### 2.1 Common Questions Component Architecture
Created directory `frontend/src/pages/Store/components/CommonQuestions/`:
- `types.ts`: TypeScript interfaces for `CommonQuestionItem`, `CommonQuestionsSectionProps`, and `CommonQuestionsAccordionProps`.
- `data/commonQuestionsData.ts`: 8 truthful, accurate Q&A items describing the Akashic physical folio club and store.
- `CommonQuestionsAccordion.tsx` & `CommonQuestionsAccordion.module.css`: Accessible accordion list component with `aria-expanded` and `aria-controls`, focus-visible indicators, and authentic plus/minus transition.
- `CommonQuestionsSection.tsx` & `CommonQuestionsSection.module.css`: Main section container with header, cyan background wave SVGs (desktop & mobile), GSAP wave animation on scroll, dual-capsule "Show all FAQ" CTA, and lower-right brand seal.
- `index.ts`: Public API export barrel.
- `CommonQuestionsSection.test.tsx`: 5 comprehensive unit tests covering rendering, expansion, accordion toggling, accessibility, and background SVGs.

### 2.2 Store Footer Redesign Architecture
Directory `frontend/src/pages/Store/components/StoreFooter/`:
- `data/footerLinks.ts`: Structured link definitions for `STORE_NAV_LINKS`, `SANCTUARY_NAV_LINKS`, and `LEGAL_LINKS`.
- `StoreFooter.tsx`: Complete overhaul implementing the 3-column desktop layout, central floating physical book visual, newsletter validation, and legal strip.
- `StoreFooter.module.css`: Comprehensive responsive styles with grid layout, dual capsule button animations, book visual styling, and tablet/mobile adaptations.
- `StoreFooter.test.tsx`: 6 unit tests validating brand rendering, "Open to everyone." badge, link callbacks, book visual presence, newsletter validation, dynamic copyright, and absence of app/social buttons.

### 2.3 StoreApp Ordering
- `frontend/src/pages/Store/StoreApp.tsx`: Added `CommonQuestionsSection` into the view dispatcher immediately following `WhyAkashicSection`.
- `frontend/src/pages/Store/StoreApp.test.tsx`: Verified section ordering and rendering across the complete home page hierarchy.

---

## 3. Verification & Screenshot Records

### 3.1 Quality Gates
- `npm --prefix frontend run typecheck`: **PASSED (0 errors)**
- `npm --prefix frontend run lint`: **PASSED (0 errors, 0 warnings)**
- `npm --prefix frontend run test -- --run`: **PASSED (44 test suites, 322 tests passing)**
- `npm --prefix frontend run build`: **PASSED (Production bundle built in 2.8s)**

### 3.2 Visual Artifacts Captured
The following screenshots were captured via Playwright and saved to both `screenshots/` and `Akashic_Library/screenshots/`:
- `stage1e_common_questions_1440_default.png` — Default view with initial 5 questions and cyan wave background
- `stage1e_common_questions_q2_open_1440.png` — Accordion item 2 expanded with plus/minus SVG rotation
- `stage1e_common_questions_show_all_open_1440.png` — Expanded view revealing all 8 questions
- `stage1e_store_footer_1440_desktop.png` — Complete desktop 3-column footer with central rotated book visual
- `stage1e_store_footer_newsletter_success_1440.png` — Newsletter client-side success confirmation state
- `stage1e_common_questions_1280.png`, `stage1e_store_footer_1280.png` — 1280px viewport
- `stage1e_common_questions_ipad1032.png`, `stage1e_store_footer_ipad1032.png` — 1032px iPad Pro viewport
- `stage1e_common_questions_tablet768.png`, `stage1e_store_footer_tablet768.png` — 768px tablet viewport
- `stage1e_common_questions_mobile440.png`, `stage1e_store_footer_mobile440.png` — 440px mobile viewport
- `stage1e_common_questions_mobile390.png`, `stage1e_store_footer_mobile390.png` — 390px iPhone viewport
- `stage1e_common_questions_mobile360.png`, `stage1e_store_footer_mobile360.png` — 360px compact mobile viewport

---

## 4. Section Ordering Conformance Matrix

| # | Section Name | Component | Status |
|---|---|---|---|
| 1 | Store Hero | `StoreHero` | Verified (Padding 130px, margin -1.75rem) |
| 2 | Our Top Books | `StoreTopBooksSection` | Verified |
| 3 | How It Works | `HowItWorksSection` | Verified (Flicker eliminated, z-index 30, overwrite auto) |
| 4 | Choose From | `ChooseFromSection` | Verified (Reverse exit animation, 44 covers preloader) |
| 5 | Why Akashic? | `WhyAkashicSection` | Verified (Buoyant cursor momentum, elastic settling) |
| 6 | Common Questions | `CommonQuestionsSection` | Verified (Cyan waves, 8 questions, show-all toggle) |
| 7 | Store Footer | `StoreFooter` | Verified (3-column, central rotated book, newsletter, legal strip) |
