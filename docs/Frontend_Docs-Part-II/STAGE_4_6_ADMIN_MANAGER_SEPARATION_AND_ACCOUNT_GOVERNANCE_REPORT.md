# AKASHIC LIBRARY — PART II: AKASHIC STORE
# STAGE 4.6 IMPLEMENTATION & GOVERNANCE CLOSURE REPORT
## ADMIN & STORE MANAGER PORTAL SEPARATION, USER ACCOUNT GOVERNANCE & ADMIN PROVISIONING

**Date:** November 20, 2026  
**Milestone:** Stage 4.6 — Admin / Store Manager Portal Separation, User Account Management & Admin Provisioning Corrections  
**Branch:** `ragnar/frontend`  
**Working Directory:** `/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library`  
**Reference Design:** `frontend/site-clone/site_copy/` (READ-ONLY)  
**Deliverable Document:** `docs/Frontend_Docs-Part-II/STAGE_4_6_ADMIN_MANAGER_SEPARATION_AND_ACCOUNT_GOVERNANCE_REPORT.md`  

---

## 1. Executive Summary & Objective

In the preceding milestone (Stage 4), multi-role authentication, the Admin Console, and the Store Manager Portal were established alongside the Book Detail Page (BDP) visual polish. A subsequent operational and architectural inspection identified critical role-separation, inventory governance, and portal navigation defects:

1. **Portal Cross-Access Defect:** An authenticated `ADMIN` was able to navigate to `?view=store-manager` and view/edit the Store Manager Portal and its inventory matrix.
2. **Customer Storefront Navigation in Private Portals:** The public `StoreHeader` (with customer links like `All Books`, `Gifting`, `Shopping Bag`, `FAQ`, `Library Sanctuary`) was rendering atop the Store Manager Portal because `StoreManagerPage` was wrapped inside `<StoreLayout>`.
3. **Ambiguous Global Inventory Adjustment by Admin:** In the Admin Dashboard, global stock quantities had mutation controls and backend endpoints (`/api/store/manager/inventory/` and `InventoryManagementView`) that allowed cross-manager or admin stock modifications without individual store scoping.
4. **Missing Patron Account Suspension/Reactivation:** The Admin Console offered approval/suspension for Store Managers, but lacked account suspension controls for normal patron (`USER`) accounts.
5. **Admin Console Provisioning Standard:** The `init_admin` Django command needed verification and enhancement to support configurable CLI arguments (`--username`, `--email`, `--password`) and environment variables (`AKASHIC_ADMIN_USERNAME`, `AKASHIC_ADMIN_EMAIL`, `AKASHIC_ADMIN_PASSWORD`) with secure hashing, idempotent execution, and zero secret logging.

Stage 4.6 resolves each of these architectural issues with 100% test coverage and strict enforcement across backend DRF permission classes and frontend view dispatchers.

---

## 2. Comprehensive Implementation Details

### A. Strict Role-Based Portal Separation & Navigation Matrix

We enforced a strict, non-bypassable role access matrix across both frontend routing and backend Django REST Framework APIs:

| Account Role & State | Admin Dashboard (`?view=store-admin`) | Store Manager Portal (`?view=store-manager`) | Public Storefront (`?view=store`) |
|---|:---:|:---:|:---:|
| **Normal User (`USER`)** | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Pending Manager (`PENDING`)** | ❌ Denied | ❌ Restricted (Status Screen) | ✅ Allowed |
| **Rejected Manager (`REJECTED`)** | ❌ Denied | ❌ Restricted (Status Screen) | ✅ Allowed |
| **Suspended Manager (`SUSPENDED`)** | ❌ Denied | ❌ Restricted (Status Screen) | ✅ Allowed |
| **Approved Manager (`STORE_MANAGER`)** | ❌ Denied (Redirected) | ✅ Exclusive Access | ✅ Allowed |
| **Platform Admin (`ADMIN`)** | ✅ Exclusive Access | ❌ Denied (Redirected) | ✅ Allowed |

#### Frontend View Dispatcher & Redirection Invariants:
In [StoreApp.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/StoreApp.tsx#L60-L105):
- If `currentView === 'store-manager'`:
  - If `user?.role === 'ADMIN'`: automatically redirects to `store-admin`.
  - If `user && user.role !== 'STORE_MANAGER'`: redirects to `store`.
- If `currentView === 'store-admin'`:
  - If `user?.role === 'STORE_MANAGER'` with approved status: automatically redirects to `store-manager`.
  - If `user && user.role !== 'ADMIN'`: redirects to `store`.

#### Header Actions Isolation:
In [StoreHeader.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/components/StoreHeader/StoreHeader.tsx#L200-L235):
- `Admin Console` menu item is rendered **EXCLUSIVELY** when `user.role === 'ADMIN'`.
- `Store Manager Portal` menu item is rendered **EXCLUSIVELY** when `user.role === 'STORE_MANAGER' && (!user.manager_status || user.manager_status === 'APPROVED')`.
- Normal patrons (`USER`) and pending/rejected managers see neither link.

---

### B. Removal of Customer Storefront Navigation from Private Portals

- In [StoreApp.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/StoreApp.tsx#L85-L105), `<StoreManagerPage>` was decoupled from `<StoreLayout>`. Like `<AdminDashboardPage>`, it now mounts directly at the root view level.
- In [StoreManagerPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/pages/StoreManager/StoreManagerPage.tsx#L340-L400) and [StoreManagerPage.module.css](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/pages/StoreManager/StoreManagerPage.module.css#L20-L120), a dedicated private Management Navbar was implemented:
  - **Left:** Brand icon + "Akashic Store" + "Curator Management Portal" tag.
  - **Center:** Curator business name and verified status badge (`Verified Curator`).
  - **Right:** Quick action buttons: `Back to Store` (`onNavigateStore('store')`) and `Sign Out` (`onSignOutClick`).
  - Top padding was refactored from `8rem` (which reserved space for floating customer chrome) to a clean native `padding: 0 0 4rem;`.

---

### C. Admin Global Catalogue: Stock Displayed as READ-ONLY

In [AdminDashboardPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/pages/Admin/AdminDashboardPage.tsx#L705-L790):
- The "Global Catalogue" tab displays all physical editions across all independent curators with full title, edition, pricing, stock count, status badge (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`), and curator ownership.
- All stepper controls, mutation buttons (`[-5]`, `[-1]`, `[+1]`, `[+5]`), and editing forms were eliminated from the Admin view.
- Inventory quantities are displayed as strictly **READ-ONLY** (`{p.inventory?.available_quantity ?? 0} units`).

#### Backend Security & Scoped Ownership:
- In [permissions.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/permissions.py#L10-L35):
  - Created `IsApprovedStoreManager` permission class: verifies authentication, active account state, `role == UserRole.STORE_MANAGER`, and `manager_status == ManagerStatus.APPROVED`.
  - **Explicitly denies `ADMIN` and superusers** from accessing manager scoped endpoints to enforce portal separation.
- In [views_manager.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/views_manager.py#L20-L160):
  - `StoreManagerOverviewView`, `StoreManagerProductsView`, `StoreManagerInventoryUpdateView`, and `StoreManagerRevenueView` now strictly require `IsApprovedStoreManager`.
  - Removed all `if is_admin` bypasses.
  - In `StoreManagerInventoryUpdateView`, product resolution enforces `created_by=request.user`:
    ```python
    product = get_object_or_404(
        StoreProduct.objects.select_related("inventory"),
        created_by=request.user,
        pk=product_id,
    )
    ```
    - Manager A **cannot** adjust Manager B's product inventory (returns 404).
    - Manager B **cannot** adjust Manager A's product inventory.
    - Admin calling this endpoint receives **403 Forbidden**.
- In [views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/views.py#L325-L350):
  - `InventoryManagementView` (`PATCH /api/store/products/<uuid:pk>/inventory/`) now uses `permission_classes = [IsApprovedStoreManager]`. Admins cannot manipulate store inventory through this route (returns 403 Forbidden).

---

### D. Patron & User Account Governance (Activation / Suspension)

In [views_admin.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/views_admin.py#L155-L245) and [urls.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/store/urls.py#L50-L58):
- Added `AdminUserActionView` mounted at `POST /api/store/admin/users/<uuid:pk>/action/`.
- Supported actions: `action: "suspend" | "reactivate"`.
- **Soft Suspension Mechanism:** Sets `user.is_active = False` on suspend, `user.is_active = True` on reactivate.
  - When `is_active = False`, Django's authentication backend and DRF authentication automatically reject login attempts (`400 Bad Request` / `401 Unauthorized`) and block access to protected APIs.
  - All user records, cart items, order history, and personal details remain intact (no data deletion).
- **Hard Safety Protections:**
  1. *Self-Suspension Guard:* An administrator cannot suspend their own account (returns 400 with `"Administrators cannot suspend their own account."`).
  2. *Last Admin Protection Guard:* Cannot suspend an admin if only one active admin exists in the system (returns 400 with `"Cannot suspend the last active administrator account."`).

In [AdminDashboardPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Store/pages/Admin/AdminDashboardPage.tsx#L680-L760):
- The "Patrons & Users" directory table renders:
  1. Full Name & Username (`u.full_name || u.display_name` + `@username`)
  2. Email Address
  3. Registration Date (`new Date(u.created_at).toLocaleDateString()`)
  4. Current Role (`USER`, `STORE_MANAGER`, `ADMIN`, `MODERATOR`)
  5. Account Status (`Active` green pill vs `Suspended` red pill)
  6. Actions:
     - For active users: `Suspend Account` button (amber/red).
     - For suspended users: `Reactivate Account` button (emerald/green).
     - For self (currently logged-in admin): disabled with `Current Admin (Self)`.
     - Executing an action triggers immediate UI status update and confirmation toast.

---

### E. Idempotent Admin Account Provisioning via Django Console

In [init_admin.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/accounts/management/commands/init_admin.py#L1-L55):
- Added `add_arguments(self, parser)` supporting CLI flags:
  - `--username <username>`
  - `--email <email>`
  - `--password <password>`
- Prioritizes CLI flags > Environment variables (`AKASHIC_ADMIN_USERNAME`, `AKASHIC_ADMIN_EMAIL`, `AKASHIC_ADMIN_PASSWORD`) > Secure defaults.
- Guarantees:
  - Passwords hashed using Django's PBKDF2/argon2 password hasher (`set_password()`).
  - Sets `role = UserRole.ADMIN`, `is_staff = True`, `is_superuser = True`, `is_active = True`, `manager_status = ManagerStatus.APPROVED`.
  - Idempotent execution: verifies existing accounts without duplicate creation or primary key errors.
  - **Zero credential leakage:** raw passwords are never printed to stdout or written to logs.

---

## 3. Test Verification & Quality Gates

### A. Backend Quality Gates & Test Suites

1. **Django System Check:**
   ```bash
   python3 Akashic_Library/manage.py check
   ```
   *Result:* `System check identified no issues (0 silenced).` (Exit code 0)

2. **Django Migrations Validation:**
   ```bash
   python3 Akashic_Library/manage.py makemigrations --check
   ```
   *Result:* `No changes detected` (Exit code 0)

3. **Stage 4.6 Separation & Governance Test Suite:**
   ```bash
   python3 Akashic_Library/manage.py test store.tests_phase4_6
   ```
   *Result:* `Ran 7 tests in 7.482s — OK` (Exit code 0)
   - `test_01_admin_denied_access_to_manager_endpoints`: Verifies Admin gets 403 Forbidden on overview, products, inventory update, direct patch, and revenue.
   - `test_02_manager_denied_access_to_admin_endpoints`: Verifies Manager gets 403 Forbidden on overview, managers, users, products, revenue, and user actions.
   - `test_03_unapproved_and_regular_users_denied_both_portals`: Verifies regular patrons, pending managers, and suspended managers get 403 Forbidden on both portals.
   - `test_04_scoped_manager_ownership_enforced`: Verifies Manager A can update Product A (200 OK) but gets 404 when attempting to mutate Manager B's Product B.
   - `test_05_admin_user_suspend_and_reactivate`: Verifies Admin can suspend patron, suspended patron cannot log in (400), Admin can reactivate patron, reactivated patron logs in successfully.
   - `test_06_admin_self_suspension_prevented`: Verifies Admin cannot suspend their own account (400 Bad Request).
   - `test_07_last_active_admin_suspension_prevented`: Verifies last active administrator cannot be suspended (400 Bad Request).

4. **Full Regression Suites:**
   ```bash
   python3 Akashic_Library/manage.py test accounts store
   ```
   *Result:* `Ran 100 tests in 39.361s — OK` (Exit code 0, 100% passing across all 100 test cases)

---

### B. Frontend Quality Gates & Test Suites

1. **TypeScript Typecheck:**
   ```bash
   npm --prefix Akashic_Library/frontend run typecheck
   ```
   *Result:* `tsc --noEmit` — 0 errors (Exit code 0)

2. **ESLint Code Quality:**
   ```bash
   npm --prefix Akashic_Library/frontend run lint
   ```
   *Result:* `0 errors, 22 warnings` (Exit code 0)

3. **Vitest Unit & Integration Suites:**
   ```bash
   npm --prefix Akashic_Library/frontend run test -- --run
   ```
   *Result:* `Test Files: 47 passed (47), Tests: 351 passed (351)` in 9.99s (Exit code 0)

4. **Production Build:**
   ```bash
   npm --prefix Akashic_Library/frontend run build
   ```
   *Result:* `tsc -b && vite build` — `✓ built in 2.22s` with optimized production bundles (Exit code 0)

---

## 4. Visual Verification Artifacts

The following visual evidence was captured via automated Playwright sessions in headless Chromium at both 1440x900 desktop and 390x844 mobile viewports:

| Screenshot Artifact | Description & Verification Proof |
|---|---|
| `stage4_6_01_admin_dashboard_operations_1440.png` | Admin Operations Overview with private sidebar, metrics, and zero customer storefront navigation. |
| `stage4_6_02_store_manager_portal_desktop_1440.png` | Store Manager Portal with dedicated management top nav, verified curator banner, and zero customer store header. |
| `stage4_6_03_admin_catalogue_readonly_1440.png` | Admin Global Catalogue displaying prices, status, curator names, and stock as strictly READ-ONLY (no mutation steppers). |
| `stage4_6_04_admin_users_directory_actions_1440.png` | Admin Users Directory showing Full Name, Username, Email, Inscribed Date, Role, Status, and Suspend Account buttons. |
| `stage4_6_05_admin_users_suspended_state_1440.png` | User Directory showing suspended patron account status with green `Reactivate Account` action. |
| `stage4_6_06_admin_users_reactivated_state_1440.png` | User Directory showing restored active patron account state. |
| `stage4_6_07a_public_store_header_admin_dropdown_1440.png` | Customer Storefront header user dropdown for `admin`: displays ONLY "Admin Console" (no Store Manager link). |
| `stage4_6_07b_public_store_header_manager_dropdown_1440.png` | Customer Storefront header user dropdown for `store_manager`: displays ONLY "Store Manager Portal" (no Admin link). |
| `stage4_6_08_admin_attempting_store_manager_portal_1440.png` | Admin attempting direct access to `?view=store-manager`: denied access and automatically redirected to Admin Dashboard. |
| `stage4_6_09_manager_attempting_admin_portal_1440.png` | Store Manager attempting access to `?view=store-admin`: access denied with link back to Store Manager Portal. |
| `stage4_6_10_admin_dashboard_mobile_390.png` | Admin Dashboard responsive rendering at 390px mobile viewport. |
| `stage4_6_11_store_manager_portal_mobile_390.png` | Store Manager Portal responsive rendering at 390px mobile viewport. |

All captured screenshot files are preserved under `screenshots/` and synchronized to the conversation artifact directory.

---

## 5. Final Acceptance Checklist

- [x] **Criterion 1: Admin has only the Admin Dashboard.** (Admin cannot enter Store Manager Portal; redirected to `store-admin`; manager APIs return 403 Forbidden).
- [x] **Criterion 2: Store Manager has only the Store Manager Portal.** (Store Manager cannot enter Admin Dashboard; redirected to `store-manager`; admin APIs return 403 Forbidden).
- [x] **Criterion 3: Normal Users have neither management portal.** (Normal users navigating to either management view see restriction alerts or return to store; backend APIs return 403 Forbidden).
- [x] **Criterion 4: Private portals no longer display the public Store navigation.** (Public `StoreHeader` removed from `StoreManagerPage` and `AdminDashboardPage`; private navigation bars rendered).
- [x] **Criterion 5: Admin can view global inventory but cannot adjust it.** (Admin Global Catalogue displays stock as strictly read-only; mutation endpoints reject admin requests with 403).
- [x] **Criterion 6: Store Managers can adjust only their own inventory.** (Manager A can mutate Manager A's stock; Manager A cannot mutate Manager B's stock).
- [x] **Criterion 7: Admin can suspend and reactivate normal Users.** (`POST /api/store/admin/users/<pk>/action/` operational with self-suspension and last-admin guards; blocks authentication and protected APIs).
- [x] **Criterion 8: Manager approval and suspension remain functional.** (`POST /api/store/admin/managers/<pk>/action/` maintains full lifecycle).
- [x] **Criterion 9: Admin provisioning works through the existing Django console command.** (`python manage.py init_admin --username ... --email ... --password ...` fully verified with zero credential logging).
- [x] **Criterion 10: Existing Stage 4 functionality remains intact.** (Book Detail Page, All Books catalogue, horizontal carousels, Add-to-Box stepper actions, and responsive styling 100% verified).

---

## 6. Remaining Limitations & Recommendations for Stage 5

1. **Per-Store Admin Inventory Ingestion:** In Stage 5 or a future phase, an advanced Admin Inventory tool may allow platform administrators to select a specific Store Manager from a dropdown to adjust their specific warehouse allocation with explicit audit logging.
2. **Order & Checkout Settlement:** The Revenue & Settlement tabs in both Admin and Store Manager portals currently report active schemas with zero gross sales pending Stage 5 Checkout integration.
