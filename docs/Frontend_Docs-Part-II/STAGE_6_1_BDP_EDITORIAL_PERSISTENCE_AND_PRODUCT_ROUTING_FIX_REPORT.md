# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 6.1 — BOOK DETAIL EDITORIAL DATA PERSISTENCE & PRODUCT-SPECIFIC ROUTING STABILIZATION REPORT

**Executive Milestone Report**  
**Engineering Team:** Senior Full-Stack, React/TypeScript, Django Architecture, and UI/UX Integration  
**Date:** November 20, 2026  
**Git Branch:** `ragnar/frontend`  
**Status:** **COMPLETE & VERIFIED** (Quality Gates: 100% Pass)

---

## 1. EXECUTIVE SUMMARY

Stage 6.1 resolved two critical post-implementation functional defects in the Akashic Store without disrupting the approved storefront visual styling or existing store manager workflows:

1. **Defect 1 — Editorial Content Persistence ("Get a Taste" Excerpt & Content Warnings):**
   - **Problem:** In the Store Manager portal (`Edit Store Product -> Detail Page Content`), the "Get a Taste" reading passage and "Content Warnings" chips failed to save or reloaded empty. Additionally, older records lacked standardized field synchronization between `sample_excerpt` and `excerpt`, and empty content warning accordions cluttering the public BDP.
   - **Resolution:** Unified backend models, serializers, and services to support both `sample_excerpt` and `excerpt` bidirectionally; normalized, trimmed, and deduplicated `content_warnings` arrays while preserving order; updated `StoreProductDrawer.tsx` and `StoreManagerPage.tsx` to reliably persist detail payloads upon product saving; enriched all 234 demonstration PostgreSQL store products via an idempotent Django management command (`audit_and_fix_demo_bdp_content`) using safe, illustrative/public-domain excerpts; rendered the public "Get a taste" reading passage safely without `dangerouslySetInnerHTML`; and conditionally omitted the "Content warnings" accordion whenever the list is empty.

2. **Defect 2 — Fourth Wing Default Book Routing Bug:**
   - **Problem:** When navigating from the All Books catalogue or clicking a book card, the application frequently opened "Fourth Wing" by default or stripped the `&id=...` parameter (`localhost:3000/?view=store-book-detail`), trapping visitors on Fourth Wing regardless of which title they clicked.
   - **Resolution:** Removed the implicit `all[0]` fallback from `BookDetailPage.tsx`; established strict canonical routing (`?view=store-book-detail&id=<uuid>`); updated `App.tsx` and `StoreApp.tsx` so `updateUrl` preserves query parameters and synchronizes `currentProductId`; added `popstate` browser navigation support and `productId` prop synchronization; implemented `isSubscribed` race-condition guards for rapid book switching; implemented a clean "No Book Selected" missing-ID state with a "Browse All Books" button; and provided an explicit "Book Not Found" state with graceful recovery for nonexistent UUIDs.

All automated test suites pass with zero regressions (Django: **144/144 tests OK**, Vitest: **52/52 test files, 372/372 tests passed**, TypeScript: **0 errors**, Vite Production Build: **clean**).

---

## 2. DEFECT 1: BDP EDITORIAL DATA PERSISTENCE

### 2.1 Root Cause Analysis
1. **Frontend-Backend Contract Discrepancy:**
   - The PostgreSQL `StoreProductDetail` model defined the excerpt field as `excerpt`, whereas parts of the frontend and API contracts referenced `sample_excerpt`.
   - In `store/serializers.py`, `StoreProductDetailSerializer` omitted explicit aliasing for `sample_excerpt`, causing payloads containing `sample_excerpt` to be dropped or rejected during deserialization.
2. **Asynchronous Save Lifecycle in Store Manager:**
   - In `StoreProductDrawer.tsx`, `onSaveProduct(productPayload, isEdit)` was awaited, but `updateStoreProductDetail` was called separately after `onSaveProduct`.
   - In `StoreManagerPage.tsx`, `handleSaveProduct` triggered `await fetchData()` immediately, which retrieved the database state *before* the subsequent detail update had completed. When the drawer reopened or the table updated, it re-rendered stale un-updated data.
3. **Empty Content Warnings Clutter:**
   - Titles with no content warnings rendered an empty accordion in `BookDetailNotes.tsx` with no tags inside, creating a confusing UI state.

### 2.2 Backend Architectural Solutions
1. **Model Aliasing (`store/models.py`):**
   ```python
   @property
   def sample_excerpt(self) -> str:
       return self.excerpt

   @sample_excerpt.setter
   def sample_excerpt(self, value: str) -> None:
       self.excerpt = value
   ```
2. **Serializer Standardization (`store/serializers.py`):**
   - Added `sample_excerpt = serializers.CharField(required=False, allow_blank=True)` with bidirectional getter/setter mapping to `excerpt`.
   - Added `allow_blank=True` to the `content_warnings` child `CharField` so whitespace strings are cleanly parsed and sanitized.
3. **Service Layer Normalization (`store/services.py`):**
   - In `enrich_products_with_book_data`, both `"excerpt"` and `"sample_excerpt"` are exposed in `detail_dict`.
   - In `update_product_detail`:
     ```python
     # Accept both sample_excerpt and excerpt
     excerpt_val = data.get("sample_excerpt")
     if excerpt_val is None:
         excerpt_val = data.get("excerpt")
     if excerpt_val is not None:
         detail.excerpt = str(excerpt_val).strip()

     # Normalize content warnings: trim, strip whitespace, deduplicate while preserving order
     warnings_raw = data.get("content_warnings")
     if warnings_raw is not None:
         if isinstance(warnings_raw, list):
             cleaned: list[str] = []
             for item in warnings_raw:
                 w = str(item).strip()
                 if w and w not in cleaned:
                     cleaned.append(w)
             detail.content_warnings = cleaned
     ```

### 2.3 Idempotent Management Command: `audit_and_fix_demo_bdp_content`
- Implemented `store/management/commands/audit_and_fix_demo_bdp_content.py` supporting `--dry-run`.
- **Audit Findings:** Out of 234 PostgreSQL `StoreProductDetail` records:
  - 232 records were missing unique sample excerpts.
  - 2 records had unformatted content warning arrays.
- **Enrichment Executed:**
  - Injected authentic, original illustrative passages and classic public-domain literature excerpts (e.g., Bram Stoker, Mary Shelley, H.G. Wells, Virginia Woolf, Arthur Conan Doyle, Edgar Allan Poe) mapped by book genre.
  - All existing product UUIDs, inventory stock levels, prices, store manager assignments, orders, and card customization palettes were strictly preserved without mutation.

### 2.4 Frontend Persistence & Public BDP Rendering
1. **Drawer Data Flow (`StoreProductDrawer.tsx` & `StoreManagerPage.tsx`):**
   - `StoreProductDrawer` initializes `sampleExcerpt` with `d?.sample_excerpt || d?.excerpt || ''`.
   - Content warnings input trims values, ignores blanks, and rejects duplicates in `handleAddWarning`.
   - Passes `detailPayload` directly to `onSaveProduct(payload, isEdit, detailPayload)`.
   - `StoreManagerPage.handleSaveProduct` awaits `updateStoreProductDetail(productId, detailPayload)` *before* triggering `fetchData()`, ensuring pristine state reload.
2. **Safe Plain-Text Multi-Paragraph Excerpt (`BookDetailExcerpt.tsx`):**
   - Completely eliminated `dangerouslySetInnerHTML`.
   - Parses multi-paragraph excerpts into distinct paragraph elements (`<p key={idx} className={styles.paragraph}>`), safely rendering drop caps on the first letter of the first paragraph while escaping all HTML entities.
3. **Conditional Content Warnings Accordion (`BookDetailNotes.tsx`):**
   - Completely eliminated `dangerouslySetInnerHTML`.
   - If `warningsList.length === 0`, the "Content warnings" accordion row is completely omitted from the DOM, leaving only "Why we chose".

---

## 3. DEFECT 2: FOURTH WING DEFAULT BOOK ROUTING STABILIZATION

### 3.1 Root Cause Analysis
1. **URL Parameter Truncation in `App.tsx`:**
   - In `App.tsx`, `updateUrl` previously executed:
     ```ts
     if (isStoreView(newView)) {
       const newUrl = `${window.location.pathname}?view=${newView}`;
       window.history.pushState(null, '', newUrl);
       return;
     }
     ```
     This wiped out all query parameters except `view`! Every time a user navigated to `store-book-detail`, the `&id=...` parameter was stripped from the URL.
2. **Implicit First-Book Fallback in `BookDetailPage.tsx`:**
   - When `activeId` was missing or unresolvable, `BookDetailPage` fell back to:
     ```ts
     const all = await getStoreProducts();
     if (all.length > 0) {
       setActiveId(all[0].id); // Fourth Wing happened to be all[0]!
     }
     ```
     Because the URL was stripped of `id`, the page loaded `all[0]`, locking every navigation onto Fourth Wing.
3. **Missing Prop & History Synchronization:**
   - `BookDetailPage` maintained internal state without listening to `popstate` events or responding to changes in the `productId` prop from parent components.

### 3.2 Architectural Solution & Route Synchronization
1. **Canonical URL Schema:**
   - Every public BDP URL strictly follows:
     ```
     http://localhost:3000/?view=store-book-detail&id=<store_product_uuid>
     ```
2. **`App.tsx` & `StoreApp.tsx` URL Preservation:**
   - `App.tsx`'s `updateUrl` updated to:
     ```ts
     if (isStoreView(newView)) {
       const params = new URLSearchParams(window.location.search);
       params.set('view', newView);
       if (newView === 'store-book-detail' && productId) {
         params.set('id', productId);
       }
       const newUrl = `${window.location.pathname}?${params.toString()}`;
       window.history.pushState(null, '', newUrl);
       return;
     }
     ```
   - `handleNavigateStore` passes `(newStoreView: StoreViewMode, productId?: string)` down to `StoreApp`.
   - `StoreApp` passes `productId={currentProductId}` directly to `BookDetailPage`.
3. **Prop & History Synchronization (`BookDetailPage.tsx`):**
   - Added `useEffect` listening to `window.addEventListener('popstate', syncFromUrl)`.
   - Added `useEffect` watching `productId` prop: when parent updates `productId`, `setActiveId(productId)` updates immediately.
4. **Race-Condition Protection:**
   - Inside `loadProductData`, an `isSubscribed` boolean guard cancels out-of-order responses:
     ```ts
     let isSubscribed = true;
     // ... async fetch ...
     if (isSubscribed) {
       setProduct(data);
       setIsLoading(false);
     }
     return () => { isSubscribed = false; };
     ```
5. **Clean Missing-ID & 404 Error States:**
   - When no `id` is present in URL or props, renders a clean, styled "No Book Selected" card with a prominent "Browse All Books" CTA button (data-testid `book-detail-missing`).
   - When an invalid or nonexistent UUID is queried, renders an informative "Book Not Found" error container with a "Back to All Books" button (data-testid `book-detail-not-found`).

---

## 4. AUTOMATED QUALITY GATES & VERIFICATION

### 4.1 Backend Django Test Suite
```bash
python manage.py test accounts store cart orders
```
- **Results:** `Ran 144 tests in 60.095s — OK`
- **Phase 6.1 Tests (`store/tests_phase6_1.py`):**
  - `test_sample_excerpt_alias_read_and_write`: **PASS**
  - `test_content_warnings_normalization_and_deduplication`: **PASS**
  - `test_partial_update_preserves_other_detail_fields`: **PASS**
  - `test_public_product_endpoint_exposes_sample_excerpt_and_content_warnings`: **PASS**
  - `test_empty_content_warnings_serialized_as_empty_list`: **PASS**
  - `test_audit_management_command_dry_run_and_execution`: **PASS**

### 4.2 Frontend Vitest Test Suite
```bash
npm --prefix frontend run test -- --run
```
- **Results:** `Test Files: 52 passed (52) | Tests: 372 passed (372) | Errors: 0`
- **BookDetailPage Tests (`BookDetailPage.test.tsx`):**
  - `1. displays missing-product state when no id is provided`: **PASS**
  - `2. handles sample_excerpt alias seamlessly in excerpt card`: **PASS**
  - `3. omits content warnings section when content_warnings is empty`: **PASS**
  - `4. switches product smoothly when productId prop changes`: **PASS**

### 4.3 TypeScript Verification & Vite Production Build
```bash
npm --prefix frontend run build
```
- **TypeScript:** `tsc -b` compiled with **0 errors**.
- **Vite:** Production bundle generated in 2.33s across 2,439 transformed modules.

---

## 5. VISUAL VERIFICATION MATRIX

All 15 screenshots have been captured across desktop (1440x900) and mobile (390x844) viewports:

| # | Artifact Filename | Viewport | Verification Description |
|---|---|---|---|
| 01 | `stage6_1_01_store_manager_bdp_editor_excerpt.png` | 1440x900 | Store Manager Drawer (Tab 2): Section 6 "Get a Taste" reading passage populated with multi-paragraph excerpt. |
| 02 | `stage6_1_02_store_manager_bdp_editor_warnings.png` | 1440x900 | Store Manager Drawer (Tab 2): Section 8 "Content Warnings" showing tags/chips (`Fantasy`, `Story Building`, `Dragons`). |
| 03 | `stage6_1_03_store_manager_reopened_saved_state.png` | 1440x900 | Store Manager Drawer reopened after save: all excerpt and warning data verified intact and persisted. |
| 04 | `stage6_1_04_public_bdp_sample_excerpt_1440.png` | 1440x900 | Public BDP "Get a taste" reading passage card with drop cap, clean paragraphs, and no HTML tag leaks. |
| 05 | `stage6_1_05_public_bdp_content_warnings_accordion_1440.png` | 1440x900 | Public BDP Book Notes: "Content warnings" accordion opened, displaying warning chips (`Fantasy`, `Story Building`, `Dragons`). |
| 06 | `stage6_1_06_public_bdp_empty_warnings_omitted_1440.png` | 1440x900 | Public BDP for Tigana (empty warnings): "Content warnings" accordion row cleanly omitted; only "Why we chose" visible. |
| 07 | `stage6_1_07_bdp_routed_fourth_wings_1440.png` | 1440x900 | Direct route to Fourth Wings (`id=40fa016d...`): Fourth Wings hero, cover, and details render accurately. |
| 08 | `stage6_1_08_bdp_routed_second_book_1440.png` | 1440x900 | Direct route to Tigana (`id=7c46e209...`): Tigana renders with its own cover and metadata (NOT Fourth Wings). |
| 09 | `stage6_1_09_bdp_routed_third_book_1440.png` | 1440x900 | Direct route to Oscar Wao (`id=125660b6...`): Oscar Wao renders with its own cover and metadata. |
| 10 | `stage6_1_10_bdp_missing_id_state_1440.png` | 1440x900 | Route without ID (`?view=store-book-detail`): Clean "No Book Selected" state with "Browse All Books" CTA. |
| 11 | `stage6_1_11_bdp_invalid_uuid_state_1440.png` | 1440x900 | Route with invalid UUID (`?id=00000000...`): Informative "Book Not Found" state with recovery CTA. |
| 12 | `stage6_1_12_public_bdp_mobile_hero_390.png` | 390x844 | Mobile BDP Hero for Fourth Wings: high-contrast title, responsive cover layout, and action controls. |
| 13 | `stage6_1_13_public_bdp_mobile_taste_390.png` | 390x844 | Mobile BDP "Get a taste" reading passage card: fully responsive text formatting and drop cap. |
| 14 | `stage6_1_14_public_bdp_mobile_notes_warnings_390.png` | 390x844 | Mobile BDP Book Notes: responsive accordion open with content warning tags. |
| 15 | `stage6_1_15_bdp_mobile_missing_id_390.png` | 390x844 | Mobile BDP "No Book Selected" state: fully responsive layout and centered CTA button. |

---

## 6. VERIFICATION CHECKLIST AGAINST ACCEPTANCE CRITERIA

- [x] **Sample Excerpt Persistence:** `sample_excerpt` and `excerpt` are bidirectionally synchronized across models, serializers, and services.
- [x] **Content Warnings Persistence:** Warnings are stored as clean string arrays, whitespace-trimmed, and deduplicated while preserving order.
- [x] **Store Manager Drawer Data Flow:** Form updates persist correctly on save and remain intact when reopening.
- [x] **Zero Regressions to Other Detail Fields:** `hero_theme`, `hero_title_color`, `at_a_glance`, `synopsis`, `full_description`, `editorial_cards`, and `why_we_chose` are strictly preserved during partial updates.
- [x] **Safe Public Excerpt Display:** Renders multi-paragraph passages cleanly without `dangerouslySetInnerHTML`.
- [x] **Conditional Warning Accordion:** Omitted when warnings are empty; displays chips when present.
- [x] **PostgreSQL Dataset Audit:** All 234 demonstration products enriched via `audit_and_fix_demo_bdp_content` with zero loss of IDs, stock, prices, or orders.
- [x] **Fourth Wing Fallback Eliminated:** Implicit `all[0]` fallback removed; URL parameter preservation guaranteed.
- [x] **Routing Synchronization:** Canonical URL format `?view=store-book-detail&id=<uuid>` supported on direct load, refresh, and popstate navigation.
- [x] **Async Race-Condition Protection:** Protected against stale asynchronous responses.
- [x] **Missing ID & Invalid UUID States:** Pristine fallback states implemented with clear recovery buttons.
- [x] **Automated Tests:** 144 Django tests passing, 372 Vitest tests passing, 0 TypeScript errors.

---

## 7. NEXT STEPS & MILESTONE CLOSURE

Stage 6.1 is **100% complete, verified, and ready for user inspection**.
Per project rules, no work on **Stage 7 (Discovery Homepage Hero Redesign)** will begin until explicit user sign-off is provided.
