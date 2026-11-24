# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 4 — BDP VISUAL POLISH, MULTI-ROLE AUTHENTICATION, ADMIN DASHBOARD, STORE MANAGER DASHBOARD & REVENUE MANAGEMENT IMPLEMENTATION REPORT

**Author:** Antigravity AI Engineering Team  
**Date:** November 20, 2026  
**Status:** Completed & Production Verified  
**Branch:** `ragnar/frontend` (inside `Akashic_Library`)  
**Design Reference:** `frontend/site-clone/site_copy/` (Read-Only)  
**Test Suite Status:** 93/93 Django Backend Tests Passed (100%), 350/350 Vitest Frontend Tests Passed (100%), 0 TypeScript Errors, 0 ESLint Errors  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

Stage 4 of the Akashic Store marks the transition from static catalog browsing and editorial showcase to a fully operational, multi-role e-commerce and curation platform.

This milestone accomplished five core workstreams:
1. **Stage 4.1 — Book Detail Page (BDP) Visual Polish & Typography Alignment:** Perfected the hero fold geometry, reinstated authentic vintage bold `Champ` display typography, loaded original high-resolution book cover artwork directly from `site-clone/site_copy/`, and calibrated the GSAP physics for the "Don't Just Take Our Word For It" editorial fanning cards.
2. **Stage 4.2 — Add to Box Floating Quantity Stepper:** Transformed the floating buy-box CTA from a single-click button into an interactive `[-] quantity [+]` stepper pill with animated SVG bunny ears, real-time cart badge synchronization, and server-authoritative inventory checks.
3. **Stage 4.3 — Unified Multi-Role Authentication:** Built a single authentication gateway (`/auth`) that serves Readers (`USER`), Independent Curators (`STORE_MANAGER`), and Head Archivists (`ADMIN`). Added curator status management (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`) and a dedicated "Under Review" pending screen.
4. **Stage 4.4 — Central Admin Dashboard Console (`/api/store/admin/` & `?view=store-admin`):** Constructed a dedicated standalone console with real-time health metrics, curator approvals, user directories, global catalog management, and revenue analytics.
5. **Stage 4.5 — Scoped Store Manager Portal (`/api/store/manager/` & `?view=store-manager`):** Enforced catalog ownership (`created_by` ForeignKey), built an inline inventory stepper matrix (`[-5]`, `[-1]`, `[+1]`, `[+5]`), and integrated live asset valuation.
6. **Homepage Polish (How It Works):** Corrected card container clipping by adjusting `.flowContent` bottom padding to `9.5rem`, allowing all four tilted step cards to float freely with ample breathing room.

---

## 2. STAGE 4.1 — BDP VISUAL FIDELITY & TYPOGRAPHY ALIGNMENT

### A. Authentic 'Champ' Typography vs. Generic Sans
In initial iterations, the BDP hero title defaulted to `Degular`/sans-serif due to a missing CSS custom property. By binding `.title` to `var(--store-font-champ, 'Champ', Georgia, serif)` with `max-width: 11ch`, `line-height: 0.88`, and `letter-spacing: -0.025em`, the title:
```
Bones of Jade,
Flesh like Ice
```
now renders in the exact bold, chunky vintage display typeface seen in the original Aardvark Book Club production site (`media_1795124039121_e2a3ca61.png`).

### B. High-Resolution Authentic Cover Artwork
Generic Open Library fallback images were replaced with high-definition original assets extracted directly from `frontend/site-clone/site_copy/`:
- `bonesofjadena.png` -> `/covers/bonesofjade.png`
- `milkteethna.png` -> `/covers/milkteeth.png`
- `lethalkissna.png` -> `/covers/lethalkiss.png`
- `monstersofohiona.png` -> `/covers/monstersofohio.png`

The PostgreSQL `StoreProduct` models were updated accordingly. The covers render with realistic dropshadows (`0 1.5em 3.5em rgba(0,0,0,0.22)`), rounded corners, and vertical spine illumination gradients.

### C. Hero Fold Composition & Boundary Crossing
- **Hero Palette:** Saturated peach/apricot background (`#FED7AA` / `#FDBA74`) with multi-lobed organic wave SVGs.
- **Boundary Overlap:** The central 3D cover crosses the hero fold boundary using negative top margin (`margin-top: -15.0625em`), precisely matching the reference layout.
- **Top-Left Header Cleanliness:** Eliminated accidental duplicate back-navigation pills that previously collided with the store brand logo.

---

## 3. STAGE 4.2 — ADD TO BOX FLOATING QUANTITY STEPPER

### A. Interaction Architecture
The floating CTA (`BookDetailFloatingCta.tsx`) serves as the shopping nexus on the BDP:
1. **Initial State (Quantity = 0):** Renders the iconic pink pill button (`Add to box! ->`) with SVG bunny ears twitching via CSS `@keyframes earTwitchLeft` and `earTwitchRight`.
2. **Active State (Quantity > 0):** Dynamically transforms into an expanded quantity stepper pill:
   ```
   [ - ]  <quantity>  [ + ]
   ```
   Featuring white circular decrement/increment buttons and retaining the twitching ears.
3. **Cart Synchronization:** Updates propagate immediately to the header Shopping Bag counter badge using the PubSub `subscribeCartCount` hook.
4. **Inventory Validation:** Prevents incrementing beyond `available_quantity` and presents feedback toasts. Decrementing to 0 removes the item and reverts the stepper back to `Add to box! ->`.

---

## 4. STAGE 4.3 — UNIFIED MULTI-ROLE AUTHENTICATION SYSTEM

### A. Single Interface, Role-Based Routing
All three platform roles authenticate through `AuthPage.tsx`:
- **Patron (`USER`):** Accesses book reviews, personal library, sanctuary reading rooms, and store checkout.
- **Curator (`STORE_MANAGER`):** Requests or accesses the Store Manager portal. Upon registration, curators supply a `business_name`, entering `manager_status='PENDING'`.
- **Admin (`ADMIN`):** Unlocks the high-privilege Central Admin Console.

### B. Curator Lifecycle States
```mermaid
stateDiagram-v2
    [*] --> PENDING: Registration as Store Manager
    PENDING --> APPROVED: Admin approves via Admin Console
    PENDING --> REJECTED: Admin rejects application
    APPROVED --> SUSPENDED: Admin suspends curator
    SUSPENDED --> APPROVED: Admin reactivates curator
```
- **Pending Experience:** Users with `manager_status='PENDING'` see an elegant "Application Under Review" screen with direct return links to the public store.
- **Idempotent Admin Provisioning:** Executed via `python manage.py init_admin --username admin --email admin@akashic.library --password ...`.

---

## 5. STAGE 4.4 — CENTRAL ADMIN DASHBOARD CONSOLE

### A. Architectural Isolation
`AdminDashboardPage.tsx` renders outside the customer-facing `StoreLayout` in `StoreApp.tsx`. This grants the administrative team an uncluttered, full-viewport console with a dedicated sidebar.

### B. Console Capabilities
- **Overview Metrics:** Total editions (20), verified curators, total patrons, available stock units, and gross merchandise volume.
- **Curator Verification Hub:** Table displaying curator business names, emails, applied dates, and live status pills. Action buttons trigger `POST /api/store/admin/managers/<id>/action/` with `approve`, `reject`, `suspend`, or `reactivate`.
- **Patrons Directory:** Searchable index of registered users across all permission roles.
- **Global Catalog Management:** Full inventory listing across all curators with real-time stock levels and pricing.
- **Settlement & Revenue Analytics:** Clean accounting ledger (currently displaying truthful zero volume awaiting Stage 5 checkout).

---

## 6. STAGE 4.5 — STORE MANAGER PORTAL & REVENUE MANAGEMENT

### A. Scoped Product Ownership
Migration `0004_storeproduct_created_by` assigned a `ForeignKey(User, null=True, on_delete=SET_NULL)` to `StoreProduct`. Store managers only see, edit, and adjust stock for products they own.

### B. Portal Sections (`StoreManagerPage.tsx`)
1. **Curator Verification Banner:** Displays verified curator badge, authenticated business name, and catalog statistics.
2. **My Curated Editions:** Scoped table with quick actions for "Edit Card", "Edit BDP", and status toggling.
3. **Quick Inventory Matrix:** Direct adjustment buttons (`[-5]`, `[-1]`, `[+1]`, `[+5]`) calling `POST /api/store/manager/inventory/adjust/` with instant server validation and optimistic UI updates.
4. **Revenue & Sales Analytics:** Scoped earnings, unit sales, and live inventory asset value calculation (`$15,089.03`).

---

## 7. HOW IT WORKS SECTION POLISH

In visual reviews of the homepage, the 4 fanning cards in the "How It Works" section were previously clipped at the bottom by the `7.5rem` (120px) container corner radius.
- **Root Cause:** Container bottom padding was `5.625rem` (90px), causing the 120px bottom corner curves to slice off the bottom text of Card 1 ("Explore our books") and Card 4 ("Share your reads").
- **Fix:** Increased `.flowContent` bottom padding to `9.5rem` (152px) in `HowItWorksSection.module.css`.
- **Result:** All 4 cards float naturally above the bottom curve with ample pink margin, fully exposing all headlines and explanatory copy.

---

## 8. TEST SUITE & VERIFICATION MATRIX

| Test Suite | Commands Run | Tests Passed | Status |
| :--- | :--- | :--- | :--- |
| **Django Backend (accounts & store)** | `python manage.py test accounts store` | **93 / 93** | **100% Passed** |
| **Frontend Vitest Units & Integration** | `npm run test -- --run` | **350 / 350** (47 files) | **100% Passed** |
| **TypeScript Strict Checking** | `npm run typecheck` | **0 errors** | **100% Clean** |
| **ESLint Static Analysis** | `npm run lint` | **0 errors** (22 legacy warnings) | **100% Clean** |
| **Browser DevTools Live Audit** | Chrome DevTools MCP live navigation | Visuals verified | **100% Verified** |

---

## 9. TRANSITION TO STAGE 5

With Stage 4 approved and visually locked, the foundation for **Stage 5 — Shopping Bag, Checkout, Demo Payment Gateway & Order Fulfillment** is complete:
1. Cart line items and quantity state are fully reactive across the BDP and header.
2. Multi-role authentication and curator/admin permissions are hardened.
3. StoreProduct details, inventory levels, and scoped revenue structures are in place.

*Stage 4 is closed and ready for user inspection.*
