# AKASHIC LIBRARY — PART I
# PHASE 6G: PRODUCTION RELEASE MANIFEST

**Application Name:** Akashic Library  
**Milestone:** Part I — Book Discovery, Reading, Personal Sanctuary and Community  
**Release State:** `PREPARED — NOT DEPLOYED (OWNER HOSTING DECISION & COMMIT APPROVAL REQUIRED)`  
**Manifest Date:** November 15, 2026  
**Author / Orchestrator:** DeepMind Agentic Assistant (Rolex / Antigravity)  

---

## 1. REPOSITORY & BUILD PROVENANCE

| Dimension | Specification & Recorded Value |
| :--- | :--- |
| **Git Working Branch** | `ragnar/frontend` |
| **Current HEAD Commit** | `7538c1c05d0f27cfdaaece5819f9d2093f4b4101` |
| **Working Tree State** | **Modified / Uncommitted Work Present** (Deliberate development state preserved) |
| **Build Classification** | **Verification Build (Staging Candidate)** — Not an immutable release tag |
| **Build Toolchain** | Vite v6.4.6, TypeScript v5.9.3, Node v26.10.0, npm 11.19.1 |
| **Python Environment** | Python 3.13.2 / 3.14.x, Django 6.1.3, DRF 3.18.3, PyMongo 4.20.0 |

---

## 2. SOURCE CONTROL BASELINE & FILE INVENTORY

In accordance with strict repository safety guidelines, all existing uncommitted and untracked files are preserved:

### Tracked Modified Files:
- `Akashic_Library/settings.py` (CORS, email, and authentication settings)
- `Akashic_Library/test_settings.py` (Test isolation overrides)
- `Akashic_Library/urls.py` (Domain routing and health check endpoints)
- `Akashic_Library/views.py` (Liveness and readiness probes)
- `accounts/models.py`, `serializers.py`, `services.py`, `tests.py`, `urls.py`, `views.py` (Profile, password validation, recovery)
- `community/constants.py`, `repository.py`, `serializers.py`, `services.py`, `tests_step9.py`, `urls.py`, `views.py`
- `discovery/exceptions.py`, `library_repository.py`, `repository.py`, `reviews_repository.py`, `reviews_serializers.py`, `reviews_views.py`, `serializers.py`, `services.py`, `tests.py`, `urls.py`, `views.py`
- `recommendations/serializers.py`, `services.py`

### Newly Created Release Packaging Files (Phase 6G):
- `Akashic_Library/e2e_settings.py` (Dedicated E2E test isolation settings)
- `Akashic_Library/production_settings.py` (Hardened production settings module)
- `discovery/management/commands/setup_e2e_data.py` (Fail-closed E2E setup with run ownership)
- `discovery/management/commands/cleanup_e2e_data.py` (Fail-closed E2E cleanup)
- `docs/Frontend_Docs/PHASE_6G_DEPLOYMENT_ENVIRONMENT_REFERENCE.md`
- `docs/Frontend_Docs/PHASE_6G_DEPLOYMENT_AND_RELEASE_RUNBOOK.md`
- `docs/Frontend_Docs/PHASE_6G_DATABASE_BACKUP_AND_RECOVERY_RUNBOOK.md`
- `docs/Frontend_Docs/PHASE_6G_RELEASE_MANIFEST.md`
- `docs/Frontend_Docs/PHASE_6G_PART_I_PRODUCTION_READINESS_AND_RELEASE_PREPARATION_REPORT.md`
- `frontend/e2e/helpers.ts` (Redacted test credentials using runtime defaults)

---

## 3. PRODUCTION BUILD METRICS & ASSET INVENTORY

- **Frontend Compilation Duration:** 1.45s
- **Initial JavaScript Entry Chunk:** `dist/assets/index-CURWWKJg.js` — **320.52 kB (gzip: 97.39 kB)** (Architectural Budget: <500 kB)
- **Initial Entry CSS:** `dist/assets/index-P7muQVaQ.css` — **47.26 kB (gzip: 8.15 kB)**
- **Dynamic Asynchronous Chunks:**
  - `BookDetail`: 41.23 kB (gzip: 11.56 kB)
  - `BookReviews`: 33.32 kB (gzip: 9.68 kB)
  - `Community`: 51.04 kB (gzip: 13.66 kB)
  - `ReadingRoom`: 24.67 kB (gzip: 7.60 kB)
  - `ModerationConsole`: 22.83 kB (gzip: 6.40 kB)
  - `SearchResults`: 21.58 kB (gzip: 6.56 kB)
  - `Auth`: 20.57 kB (gzip: 5.25 kB)
  - `AccountSettings`: 17.43 kB (gzip: 5.29 kB)
  - `PersonalLibrary`: 13.72 kB (gzip: 4.21 kB)
  - `DiscoveryHome`: 12.83 kB (gzip: 4.17 kB)
  - `Genres`: 12.39 kB (gzip: 4.02 kB)
- **Django Administrative Static Assets:** 157 static files collected to `Akashic_Library/staticfiles/`.

---

## 4. AUTOMATED QUALITY & VERIFICATION SIGN-OFF TABLE

| Verification Suite | Target Standard | Measured Result | Verdict |
| :--- | :--- | :--- | :---: |
| **Playwright E2E Suite** | 7 Concern Areas, 21 Specifications | **21 passed / 0 failed (1.4m)** | **PASS** |
| **Vitest Unit/Component Suite** | 29 Test Files (`frontend/src/**/*.test.tsx`) | **240 passed / 0 failed (6.99s)** | **PASS** |
| **Django Backend Suite** | `accounts`, `discovery`, `recommendations`, `community` | **386 passed / 0 failed (102.4s)** | **PASS** |
| **TypeScript Compilation** | `tsc --noEmit` across full codebase | **0 errors** | **PASS** |
| **ESLint Static Analysis** | `eslint .` across all sources & specs | **0 errors, 0 warnings** | **PASS** |
| **Django Deployment Check** | `python manage.py check --deploy` | **0 errors, 2 informational warnings** | **PASS** |
| **Database Migrations** | `makemigrations --check --dry-run` | **No unrepresented changes (0 pending)** | **PASS** |
| **MongoDB Indexes** | `python manage.py init_mongo_indexes` | **10 collections indexed & verified** | **PASS** |
| **E2E Isolation Safeguards** | Fail-closed DB check (refuse dev & prod DBs) | **10/10 lifecycle tests passed** | **PASS** |
| **Restore Rehearsal** | PostgreSQL & MongoDB test restoration | **100% record match (852 docs, 30 users)** | **PASS** |
| **Credential Redaction** | Zero plaintext passwords in tracked files | **100% redacted** | **PASS** |

---

## 5. OUTSTANDING OWNER DECISIONS PRIOR TO DEPLOYMENT

The platform is deployment-ready, but actual live publication remains blocked pending the repository owner's explicit decisions:
1. **Source Control Commit Approval:** The repository owner must review, stage, commit, and tag the uncommitted changes on branch `ragnar/frontend`.
2. **Production Hosting Platform:** Selection of target cloud infrastructure (e.g. AWS, GCP, Render, Railway, or VPS).
3. **Domain & TLS Setup:** Finalization of production domain name and DNS nameservers.
4. **Production SMTP Credentials:** Provisioning of verified outbound transactional email service credentials (SendGrid, Postmark, AWS SES).
5. **Managed Database Secrets:** Generation of production passwords for PostgreSQL and MongoDB replica set URI.

---

## 6. STRICT BOUNDARY CONFIRMATION

- **Part I Scope Only:** Book Discovery, Reading Room, Reviews, Personal Sanctuary, and Community Governance are 100% complete and verified.
- **Part II Zero Invasion:** No shopping cart, checkout, order placement, or Stripe/payment gateway features were implemented.
