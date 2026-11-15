# AKASHIC LIBRARY — PART I
# PHASE 6C: COMMUNITY GOVERNANCE, CONTENT REPORTING & MODERATION
## VERIFICATION, ARCHITECTURE & IMPLEMENTATION REPORT

**Document ID:** `AL-PHASE-6C-GOVERNANCE-MODERATION-001`  
**Milestone:** Phase 6C — Community Governance, Content Reporting & Moderation  
**Working Branch:** `ragnar/frontend`  
**Repository Working Directory:** `/Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library`  
**Status:** COMPLETE & VERIFIED — FULL PASS  
**Date:** November 15, 2026  

---

## A. EXECUTIVE SUMMARY

Phase 6C delivers a complete, end-to-end community governance and content moderation platform for the Akashic Library. Bridging the architectural foundation established in Phase 6A and the patron role-management systems completed in Phase 6B, Phase 6C connects the Django REST backend with a dedicated, role-gated React frontend experience.

### Core Capabilities Delivered:
1. **Universal Multi-Category Patron Reporting:** Patrons can report five distinct content categories across all reader touchpoints:
   - Book Reviews (`REVIEW`) on the Book Reviews page (`BookReviewsPage.tsx`)
   - Review Replies (`REVIEW_REPLY`) in reader conversation threads on the Book Reviews page
   - Community Discussions (`DISCUSSION`) on the Agora Community Hub (`CommunityHubPage.tsx`) and Thread Detail (`CommunityThreadPage.tsx`)
   - Discussion Replies (`REPLY`) on the Discussion Thread Detail page (both direct and nested responses)
   - Shared Marginalia (`ANNOTATION`) strictly on public, shared annotations in the Editorial Reading Room (`ReadingRoomPage.tsx`)
2. **Strict Privacy Safeguards:** Private annotations are logically shielded at the API and database levels from the reporting and moderation pipeline. Attempting to report any annotation whose visibility is not explicitly `SHARED` is rejected with `HTTP 400 Bad Request`. Private notes never render report actions.
3. **Anti-Abuse & Rate Limiting Enforcement:**
   - Self-reporting is prevented on both backend (rejected with `HTTP 400`) and frontend (report action buttons are omitted on the patron's own contributions).
   - Duplicate active report prevention blocks patrons from spamming repeated reports against the same target (`HTTP 400`).
   - Per-patron hourly rate limiting (maximum 10 reports per hour) prevents denial-of-service or targeted reporting harassment.
4. **Dedicated Moderator Console (`/?view=moderation`):**
   - Restricted strictly to `MODERATOR` and `ADMIN` roles (`HTTP 403 Forbidden` enforced on all moderation API endpoints and a dedicated "Access Denied (403)" archival state in the React client).
   - Editorial dashboard featuring an archival role badge, key volume metrics (Total Reports, Pending, Resolved, Dismissed), multi-status tabs, target type selector, and a two-column layout consisting of a report queue list and an inspection/action panel.
5. **Decoupled Soft-Hide & Restore Content Lifecycle:**
   - Content visibility is controlled via soft-deletion (`moderation_status = "HIDDEN"`). Physical records are never dropped, preserving archival integrity and foreign-key referential consistency.
   - Restoring content resets `moderation_status = "APPROVED"`, immediately re-indexing the entry in reader feeds.
   - Resolving or dismissing a report is completely decoupled from content hiding: curators can soft-hide content while leaving a report pending, or resolve/dismiss a report without hiding the content.
6. **Append-Only Archival Audit Trail:** Every moderation action (`HIDE`, `RESTORE`, `RESOLVE_REPORT`, `DISMISS_REPORT`) is recorded in the MongoDB `moderation_audits` collection with actor identifier, username, target type, target id, report id, timestamp, and optional curatorial rationale notes.

### Verification Status:
- **Backend Test Suite:** 344 / 344 tests passing (`python manage.py test accounts community discovery --settings=Akashic_Library.test_settings`). Includes 14 comprehensive Phase 6C governance test cases.
- **Frontend Test Suite:** 207 / 207 tests passing across 25 Vitest suites.
- **Frontend Linting & Type Safety:** 0 ESLint errors; TypeScript `tsc -b` compiles with 0 errors; Vite production build succeeded in 1.26s.
- **Live Browser Verification:** Verified in Chrome via DevTools MCP across desktop (1280x900) and mobile (390x844) viewports for both standard patrons (`patron_alpha`) and curators (`curator_mod`).
- **Archival Visual Documentation:** 16 verified PNG screenshots captured and preserved in `Akashic_Library/docs/Frontend_Docs/screenshots/`.

---

## B. EXISTING BACKEND AUDIT & ENHANCEMENTS

The Phase 6A audit identified an initial moderation skeleton in the Django backend. During Phase 6C, this foundation was audited, hardened, and expanded to support the complete product requirements.

### Pre-Existing Components Identified in Phase 6A:
- Views: `ReportCreateView`, `ModerationReportListView`, `ModerationReportDetailView`, `ModerationHideView`, `ModerationRestoreView` in `community/views.py`.
- Services: `ModerationService` in `community/services.py`.
- Collections: `reports` and `moderation_audits` in MongoDB.
- Permissions: `IsModerator` in `community/permissions.py` (which checked `user.role in ['MODERATOR', 'ADMIN']` or `is_staff`).

### Deficiencies Identified & Corrected in Phase 6C:
1. **Target Type Scope Deficit:** The original system only supported `DISCUSSION` and `REPLY`. In Phase 6C, `community/constants.py` was extended to include `REVIEW`, `REVIEW_REPLY`, and `ANNOTATION`.
2. **Missing Repository Filtering:** Hidden reviews, review replies, and annotations were previously not excluded from discovery queries. `discovery/reviews_repository.py` and `discovery/annotations_repository.py` were enhanced with `{"moderation_status": {"$ne": "HIDDEN"}}` filters across `list_replies_for_review`, `get_reply_count`, `get_reply_counts_for_reviews`, and `list_shared_annotations_for_book`.
3. **Target Preview Hydration:** `ReportSerializer` and `ModerationService.get_target_details()` were enhanced to dynamically hydrate author usernames, folio anchors (book titles and IDs), discussion titles, and target content excerpts so curators can review reported text directly without secondary database queries.
4. **Self-Reporting and Duplicate Prevention:** `ModerationService.report_content()` was updated to fetch target authors and explicitly reject self-reports with `HTTP 400 Bad Request`. Duplicate report checking was added to query existing pending/reviewed reports from the same user for the same target.
5. **Private Annotation Shield:** `ModerationService.report_content()` verifies that any reported `ANNOTATION` possesses `visibility == "SHARED"`. Private annotations return `HTTP 400 Bad Request` and are never admitted to the moderation queue.
6. **Moderation Audit API:** A new endpoint `GET /api/community/moderation/audits/` backed by `ModerationAuditListView` and `ModerationAuditSerializer` was implemented to expose the audit ledger to the frontend.
7. **Permission Hardening:** `permission_classes = [IsAuthenticated, IsModerator]` was enforced on all moderation endpoints. DRF `SessionAuthentication` returns `HTTP 403 Forbidden` for unauthenticated or non-moderator requests.

---

## C. REPORTABLE CONTENT TYPES & FOLIO TOUCHPOINTS

| Content Type Code | Entity Description | Location & Frontend Page | Conditions Under Which Report Action Is Rendered | Privacy & Governance Boundary |
|---|---|---|---|---|
| `REVIEW` | Book Review / Critical Reader Inscription | `BookReviewsPage.tsx` (`/?view=book-reviews&id=<book_id>`) | Rendered on all cataloged reviews authored by other patrons. Hidden on the current patron's review. | Publicly cataloged. Reports include folio context (book title and accession ID). |
| `REVIEW_REPLY` | Reply to a Book Review | `BookReviewsPage.tsx` (expanded replies thread) | Rendered on all review replies authored by other patrons. Hidden on the current patron's replies. | Publicly visible under the parent review. |
| `DISCUSSION` | Agora Community Discussion Thread | `CommunityHubPage.tsx` (`/?view=community`) and `CommunityThreadPage.tsx` (`/?view=community-thread&id=<thread_id>`) | Rendered on discussion cards in the Agora feed and in the thread header. Hidden on own discussions. | Publicly visible in Agora. Includes category tag and optional book anchor. |
| `REPLY` | Discussion Reply (Direct or Nested) | `CommunityThreadPage.tsx` | Rendered on each direct resonance and nested response. Hidden on own replies. | Publicly visible in thread. Preserves chronological and nested hierarchy. |
| `ANNOTATION` | Public Shared Marginalia | `ReadingRoomPage.tsx` (`/?view=reading-room&id=<book_id>`) | Rendered **ONLY** on the "Shared" tab for annotations authored by other patrons. | **STRICT PRIVACY RULE:** Never rendered on private notes, never rendered on "My Private" tab. Private notes return 400 if reported. |

---

## D. REPORT API CONTRACTS

### 1. Inscribe Content Report
- **Endpoint:** `POST /api/community/reports/`
- **Authentication:** Required (`IsAuthenticated`).
- **Request Headers:**
  - `Content-Type: application/json`
  - `X-CSRFToken: <csrftoken>`
- **Request Payload:**
```json
{
  "target_type": "REVIEW",
  "target_id": "6af88175773ffdb79d6da7f8",
  "reason": "SPAM",
  "details": "This review contains repetitive promotional claims regarding an external storefront."
}
```
- **Allowed Reasons:**
  - `SPAM`: Spam or commercial solicitation
  - `HARASSMENT`: Harassment or hostile conduct
  - `HATE_SPEECH`: Hate speech or discrimination
  - `INAPPROPRIATE`: Inappropriate or offensive content
  - `SPOILER`: Unmarked spoilers
  - `OFF_TOPIC`: Off-topic or disruptive content
  - `OTHER`: Other community concern
- **Success Response (`HTTP 201 Created`):**
```json
{
  "id": "c7dbbc7a-a3f9-44a6-a3b9-5f7b2a1b3fc7",
  "user_id": "f49e6138-b675-4950-82ce-780515541511",
  "target_type": "REVIEW",
  "target_id": "6af88175773ffdb79d6da7f8",
  "reason": "SPAM",
  "details": "This review contains repetitive promotional claims regarding an external storefront.",
  "status": "PENDING",
  "created_at": "2026-11-15T11:47:43.120Z",
  "updated_at": "2026-11-15T11:47:43.120Z"
}
```
- **Validation Failure Responses:**
  - `HTTP 400 Bad Request` — `{"error": "You cannot report your own content."}`
  - `HTTP 400 Bad Request` — `{"error": "You have already submitted an active report for this content."}`
  - `HTTP 400 Bad Request` — `{"error": "Private annotations cannot be reported."}`
  - `HTTP 400 Bad Request` — `{"target_type": ["\"INVALID\" is not a valid choice."]}`
  - `HTTP 401 Unauthorized` / `HTTP 403 Forbidden` — When accessed by an unauthenticated visitor.
  - `HTTP 404 Not Found` — `{"error": "Content not found."}`
  - `HTTP 429 Too Many Requests` — `{"error": "Report submission limit exceeded. Please try again later."}`

---

## E. MODERATOR API CONTRACTS

All endpoints in this section require `IsAuthenticated` and `IsModerator` (`role in ['MODERATOR', 'ADMIN']`). Non-moderator patrons (`USER`, `STORE_MANAGER`) and anonymous visitors receive `HTTP 403 Forbidden`.

### 1. List Moderation Reports
- **Endpoint:** `GET /api/community/moderation/reports/?status=PENDING&target_type=REVIEW`
- **Query Parameters:**
  - `status`: Filter by `PENDING`, `RESOLVED`, `DISMISSED`, or omitted for all.
  - `target_type`: Filter by `DISCUSSION`, `REPLY`, `REVIEW`, `REVIEW_REPLY`, `ANNOTATION`.
- **Response (`HTTP 200 OK`):**
```json
[
  {
    "id": "c7dbbc7a-a3f9-44a6-a3b9-5f7b2a1b3fc7",
    "user_id": "f49e6138-b675-4950-82ce-780515541511",
    "target_type": "REVIEW",
    "target_id": "6af88175773ffdb79d6da7f8",
    "reason": "SPAM",
    "details": "This review contains repetitive promotional claims regarding an external storefront.",
    "status": "PENDING",
    "target_content": "A fresh contemplation inscribed after withdrawing the previous folio.",
    "target_title": "Second Inscription on Ficciones",
    "target_author": "Aurelius Vance",
    "target_status": "APPROVED",
    "context": {
      "book_id": "6af72791ebebc613760355ec",
      "book_title": "Ficciones"
    },
    "created_at": "2026-11-15T11:47:43.120Z",
    "updated_at": "2026-11-15T11:47:43.120Z"
  }
]
```

### 2. Retrieve Report Detail
- **Endpoint:** `GET /api/community/moderation/reports/<report_id>/`
- **Response (`HTTP 200 OK`):** Full report object with hydrated context and audit history.

### 3. Resolve or Dismiss Report
- **Endpoint:** `POST /api/community/moderation/reports/<report_id>/resolve/`
- **Payload:**
```json
{
  "status": "RESOLVED",
  "notes": "Reviewed content against community covenant; review is authentic patron reflection and meets standards."
}
```
- **Response (`HTTP 200 OK`):**
```json
{
  "status": "success",
  "report": {
    "id": "c7dbbc7a-a3f9-44a6-a3b9-5f7b2a1b3fc7",
    "status": "RESOLVED",
    "notes": "Reviewed content against community covenant; review is authentic patron reflection and meets standards.",
    "updated_at": "2026-11-15T11:51:45.340Z"
  }
}
```

### 4. Soft-Hide Content
- **Endpoint:** `POST /api/community/moderation/hide/`
- **Payload:**
```json
{
  "target_type": "REVIEW",
  "target_id": "6af88175773ffdb79d6da7f8",
  "report_id": "c7dbbc7a-a3f9-44a6-a3b9-5f7b2a1b3fc7",
  "notes": "Temporary hide pending investigation."
}
```
- **Response (`HTTP 200 OK`):**
```json
{
  "status": "success",
  "message": "Content hidden successfully.",
  "moderation_status": "HIDDEN"
}
```

### 5. Restore Content Visibility
- **Endpoint:** `POST /api/community/moderation/restore/`
- **Payload:**
```json
{
  "target_type": "REVIEW",
  "target_id": "6af88175773ffdb79d6da7f8",
  "report_id": "c7dbbc7a-a3f9-44a6-a3b9-5f7b2a1b3fc7",
  "notes": "Restored after curatorial review."
}
```
- **Response (`HTTP 200 OK`):**
```json
{
  "status": "success",
  "message": "Content restored successfully.",
  "moderation_status": "APPROVED"
}
```

### 6. List Moderation Audits
- **Endpoint:** `GET /api/community/moderation/audits/?report_id=<report_id>`
- **Response (`HTTP 200 OK`):** Array of moderation audit records for compliance and traceability.

---

## F. ROLE & PERMISSION MATRIX

| User Role | Submit Content Report | See Report Button in UI | Access `/?view=moderation` | List Reports (`GET /moderation/reports/`) | Soft-Hide / Restore Content | Resolve / Dismiss Reports | View Moderation Audits |
|---|---|---|---|---|---|---|---|
| **ANONYMOUS** | Prompted to Sign In | Visible | Redirected to `/?view=auth` | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` |
| **USER** (Patron) | Allowed (non-own) | Visible on others' content | `403 Access Denied` View | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` |
| **STORE_MANAGER** | Allowed (non-own) | Visible on others' content | `403 Access Denied` View | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` |
| **MODERATOR** (Curator) | Allowed (non-own) | Visible on others' content | Full Console Access | `200 OK` | `200 OK` | `200 OK` | `200 OK` |
| **ADMIN** (Archivist) | Allowed (non-own) | Visible on others' content | Full Console Access | `200 OK` | `200 OK` | `200 OK` | `200 OK` |

---

## G. PATRON REPORTING UI COMPONENTS

### 1. `ReportContentButton` (`src/components/community/ReportContentButton/`)
- **Restrained Visual Styling:** Designed with subtle editorial aesthetics, featuring a slender flag icon (`M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9`) and muted parchment hues (`var(--color-ink-muted, #7c7267)`).
- **Self-Reporting Safeguard:** Compares `currentUserId === authorId` or `currentUsername === authorUsername`. If the content was authored by the logged-in patron, the button is completely unrendered.
- **Accessibility:** Uses explicit `aria-label="Report <targetType> by <authorName>"` with visible tooltip descriptions. Keyboard accessible via `Tab` and `Enter`/`Space`.
- **Authentication State Handling:** If clicked by an unauthenticated reader, it alerts the patron and prompts authentication without throwing errors.

### 2. `ReportContentModal` (`src/components/community/ReportContentModal/`)
- **Accessible Dialog Semantics:** Built using standard `<dialog>` / ARIA role `dialog` with `aria-modal="true"` and `aria-labelledby="report-modal-title"`. Traps keyboard focus, locks body scroll, and listens for the `Escape` key.
- **Reason Selector:** Accessible `<select>` element presenting all 7 standard reporting reasons with explanatory descriptive subtitles for each choice.
- **Narrative Context Field:** Multiline `<textarea>` for optional patron narrative, constrained to 1000 characters with a live character counter (`0 / 1000`).
- **Archival Truth Disclaimer:** Contextual notice reminding patrons that submissions are confidential and reviewed against the Akashic Archival Covenant.
- **Defensive Error Handling:** Displays inline archival warning alerts if the backend reports a duplicate report or self-reporting violation.
- **Success Confirmation View:** Upon successful submission (`HTTP 201`), transitions into an archival confirmation card ("Report Inscribed") with a "Return to Folio" button.

---

## H. MODERATOR CONSOLE WORKSPACE (`/?view=moderation`)

The Moderator Console is an editorial dashboard implemented in `src/pages/Moderation/ModerationConsolePage.tsx` and styled via `ModerationConsolePage.module.css`.

### Visual Architecture & Components:
1. **Curatorial Header:** Features an archival badge ("APPOINTED CURATOR" for `MODERATOR`, "CHIEF ARCHIVIST" for `ADMIN`), a clear explanatory subhead, and a manual "Refresh report queue" button.
2. **Overview Statistics Cards:**
   - Total Inscribed Reports
   - Pending Review
   - Resolved Reports
   - Dismissed Reports
3. **Filter Navigation Bar:**
   - Status Tabs: `All Statuses`, `Pending` (default), `Resolved`, `Dismissed`.
   - Content Type Dropdown: Filters queue by all 5 supported target types (`All Content Types`, `Discussions`, `Discussion Replies`, `Book Reviews`, `Review Replies`, `Shared Marginalia`).
4. **Two-Column Curatorial Layout:**
   - **Left Column (Report Queue List):** Renders queue cards with target type badges, status pills (`PENDING`, `RESOLVED`, `DISMISSED`), reason tag, content excerpt, author name, and inscription timestamp. Active report highlighted with archival ink border.
   - **Right Column (Inspection & Decision Panel):**
     - Full report header with Reason and Report UUID.
     - Reporter explanation narrative block.
     - Full target content quote card with author attribution and book/thread anchor link.
     - Live content visibility badge ("Visible in Public Feeds" vs. "Hidden from Public Discovery").
     - Custodial decision note textarea for curatorial rationale.
     - Action Controls: "Resolve Report" and "Dismiss Report" buttons (disabled if already in that state).
     - Visibility Controls: "Soft-Hide Content" or "Restore Content Visibility" buttons triggering accessible confirmation modals.
     - Chronological Archival Audit Trail listing historical actions (`HIDE`, `RESTORE`, `RESOLVE_REPORT`, `DISMISS_REPORT`), actor username, and timestamp.
5. **Empty Queue State ("Quiet Stacks"):** When no reports match the selected filters, displays an empty state with an open ledger icon and contemplative messaging.
6. **Access Denied State (403):** When a patron with `USER` or `STORE_MANAGER` role navigates to `/?view=moderation`, renders a 403 Forbidden card explaining privilege restrictions with a "Return to Library Discovery" button.

---

## I. CONTENT VISIBILITY BEHAVIOR

1. **Soft-Hide Mechanism:**
   When a curator clicks "Soft-Hide Content" and confirms in the modal, a `POST` is dispatched to `/api/community/moderation/hide/`.
   - MongoDB document `moderation_status` is updated to `"HIDDEN"`.
   - The document remains stored in the database.
   - An audit record is created with action `"HIDE"`.
2. **Frontend Discovery Filtering:**
   All public discovery queries exclude hidden items:
   - `discovery/reviews_repository.py`: `list_replies_for_review`, `get_reply_count`, and `get_reply_counts_for_reviews` enforce `moderation_status: {"$ne": "HIDDEN"}`.
   - `discovery/annotations_repository.py`: `list_shared_annotations_for_book` enforces `moderation_status: {"$ne": "HIDDEN"}`.
   - `community/services.py`: Discussions and replies with `moderation_status == "HIDDEN"` are filtered from public listings.
3. **Restore Mechanism:**
   When a curator clicks "Restore Content Visibility" and confirms, a `POST` is sent to `/api/community/moderation/restore/`.
   - MongoDB document `moderation_status` is updated to `"APPROVED"`.
   - An audit record is created with action `"RESTORE"`.
   - The content reappears in reader views upon subsequent fetch.
4. **Decoupled Workflow:**
   Hiding content does not automatically resolve a report, and resolving a report does not automatically hide content. This decoupling enables curators to dismiss bad-faith reports while keeping content visible, or hide problematic content while leaving a report pending for multi-curator review.

---

## J. MODERATION AUDIT HISTORY

All moderation interventions generate an append-only log entry in the MongoDB `moderation_audits` collection:

```json
{
  "_id": "ObjectId('6af98e12b7aada88298d4bce')",
  "action": "HIDE",
  "actor_id": "8350fdcb-a241-421d-8266-28a312207c51",
  "actor_username": "curator_mod",
  "target_type": "REVIEW",
  "target_id": "6af88175773ffdb79d6da7f8",
  "report_id": "c7dbbc7a-a3f9-44a6-a3b9-5f7b2a1b3fc7",
  "reason": "SPAM",
  "notes": "Temporary hide pending investigation.",
  "created_at": "2026-11-15T11:51:14.230Z"
}
```

Audit entries are retrieved via `GET /api/community/moderation/audits/?report_id=<report_id>` and displayed chronologically in the Moderator Console detail panel.

---

## K. PRIVACY AND SECURITY VERIFICATION

1. **Private Annotations Shield:**
   - Backend validation in `ModerationService.report_content()` strictly asserts:
     ```python
     if target_type == TargetType.ANNOTATION.value:
         if target.get("visibility") != "SHARED":
             raise ValidationError("Private annotations cannot be reported.")
     ```
   - In `ReadingRoomPage.tsx`, the `ReportContentButton` is rendered strictly inside the `Shared` tab mapping. It is completely absent from the `My Private` tab and private annotation cards.
   - In automated tests, submitting a report for a private annotation returns `HTTP 400 Bad Request`.
2. **Self-Reporting Block:**
   - Backend validation in `ModerationService.report_content()` verifies:
     ```python
     if str(target_author_id) == str(user_id):
         raise ValidationError("You cannot report your own content.")
     ```
   - Frontend `ReportContentButton` checks `currentUserId === authorId` and suppresses button rendering.
   - In automated tests, attempting to report one's own discussion, review, or reply returns `HTTP 400 Bad Request`.
3. **Duplicate Active Reports Block:**
   - Backend validation queries existing pending or reviewed reports:
     ```python
     existing = db.reports.find_one({
         "user_id": str(user_id),
         "target_id": str(target_id),
         "status": {"$in": ["PENDING", "REVIEWED"]}
     })
     if existing:
         raise ValidationError("You have already submitted an active report for this content.")
     ```
4. **Role Permission Boundaries:**
   - Standard patrons (`USER`) and store managers (`STORE_MANAGER`) cannot list reports, view report details, soft-hide content, restore content, or inspect moderation audits. All endpoints return `HTTP 403 Forbidden`.
   - On the frontend, `ModerationConsolePage.tsx` checks `user?.role === 'MODERATOR' || user?.role === 'ADMIN'`. Non-moderators are presented with an explicit 403 Access Denied screen.
5. **Data Redaction & Sanitization:**
   - Reporter email addresses and passwords are never exposed in moderation report listings or screenshots. Only public patron usernames are rendered.

---

## L. AUTOMATED TEST RESULTS

### 1. Backend Test Suite
Executed command:
```bash
python manage.py test accounts community discovery --settings=Akashic_Library.test_settings
```
**Result:** `Ran 344 tests in 80.262s — OK (0 failures, 0 errors)`.

Key Phase 6C test cases in `community/tests_phase6c_moderation.py`:
- `test_report_discussion_success`: Patron reports another reader's discussion (`HTTP 201 Created`).
- `test_report_reply_success`: Patron reports another reader's discussion reply (`HTTP 201 Created`).
- `test_report_review_success`: Patron reports a book review (`HTTP 201 Created`).
- `test_report_review_reply_success`: Patron reports a review reply (`HTTP 201 Created`).
- `test_report_shared_annotation_success`: Patron reports a shared marginalia (`HTTP 201 Created`).
- `test_report_private_annotation_rejected`: Attempting to report private annotation fails (`HTTP 400 Bad Request`).
- `test_report_own_content_rejected`: Attempting to report own content fails (`HTTP 400 Bad Request`).
- `test_duplicate_report_rejected`: Duplicate active report fails (`HTTP 400 Bad Request`).
- `test_moderator_list_reports`: Moderator lists reports (`HTTP 200 OK`).
- `test_user_cannot_list_reports`: Standard patron gets `HTTP 403 Forbidden`.
- `test_moderator_resolve_report`: Moderator resolves report (`HTTP 200 OK`).
- `test_moderator_hide_and_restore_content`: Moderator soft-hides and restores content with audit verification (`HTTP 200 OK`).
- `test_hidden_content_filtered_from_public`: Verified hidden reviews and annotations disappear from public feeds.
- `test_unauthenticated_cannot_access_moderation`: Unauthenticated requests receive `HTTP 403 Forbidden`.

### 2. Frontend Test Suite
Executed command:
```bash
npm run test
```
**Result:** `Test Files: 25 passed (25), Tests: 207 passed (207), Duration: 6.25s`.

Key Phase 6C component tests:
- `ReportContentButton.test.tsx` (4 tests passing):
  - Renders report button for other users' content.
  - Hides report button on current user's own content.
  - Opens modal upon click.
  - Prompts sign-in if unauthenticated.
- `ReportContentModal.test.tsx` (7 tests passing):
  - Renders dialog with reason dropdown, details textarea, and counter.
  - Focuses dialog and handles Escape key closure.
  - Submits report with correct payload.
  - Renders duplicate report error alert.
  - Renders self-reporting error alert.
  - Shows success confirmation card upon 201 response.
  - Closes dialog when return button is clicked.
- `ModerationConsolePage.test.tsx` (7 tests passing):
  - Renders 403 Access Denied when role is `USER`.
  - Renders 403 Access Denied when role is `STORE_MANAGER`.
  - Renders full console when role is `MODERATOR`.
  - Renders full console when role is `ADMIN`.
  - Filters reports by status tab.
  - Soft-hides content with confirmation modal.
  - Resolves report with curatorial decision notes.
- `Navbar.test.tsx` (12 tests passing):
  - Renders "Moderation Console" link for `MODERATOR` and `ADMIN`.
  - Does NOT render "Moderation Console" link for `USER` or anonymous.
- `navigation.test.ts` (9 tests passing):
  - Isolates `moderation` view from discovery pills (Home, Genres, Community, Library remain unhighlighted).

### 3. Frontend Linting & Build
- `npm run lint`: 0 errors.
- `tsc -b`: 0 errors.
- `npm run build`: Succeeded in 1.26s.

---

## M. LIVE BROWSER VERIFICATION

Live browser testing was conducted against the local development servers (`http://127.0.0.1:8000` and `http://127.0.0.1:3000`) using Chrome DevTools MCP tools:

1. **Patron Authentication & Flow:**
   - Logged in as `patron_alpha` (password `[REDACTED_PATRON_PASSPHRASE]`, role `USER`).
   - Navigated to `BookReviewsPage` for *Ficciones* (`/?view=book-reviews&id=6af72791ebebc613760355ec`). Verified restrained Report button visible on reviews by Rolex, Aurelius Vance, and Beatrice Thorne.
   - Expanded review replies. Verified Report action visible on individual replies.
   - Opened `ReportContentModal`, selected reason "Spam or Commercial Promotion", entered narrative details, and submitted. Verified smooth transition into "Report Inscribed" success view.
   - Navigated to `CommunityHubPage` (`/?view=community`). Verified Report actions on discussion cards.
   - Navigated to `CommunityThreadPage` (`/?view=community-thread&id=9a1027b4-3a21-4f18-bb12-ec8942b10111`). Verified Report actions on discussion header and Rolex's reply. Submitted an "Off-Topic or Disruptive" report.
   - Navigated to `ReadingRoomPage` for *Ficciones* (`/?view=reading-room&id=6af72791ebebc613760355ec`). Clicked "Shared" tab. Verified Report action rendered on shared marginalia by Rolex, Aurelius Vance, and Beatrice Thorne. Submitted an "Unmarked Spoilers" report on Aurelius Vance's note.
   - Attempted direct navigation to `/?view=moderation`. Verified instant presentation of the 403 Access Denied screen.
2. **Moderator Authentication & Flow:**
   - Logged out and authenticated as `curator_mod` (password `[REDACTED_CURATOR_PASSPHRASE]`, role `MODERATOR`).
   - Opened profile dropdown in Navbar. Verified "Moderation Console" entry rendered.
   - Navigated to `/?view=moderation`. Verified the full Moderator Console loaded with "APPOINTED CURATOR" badge and 3 pending reports.
   - Inspected report queue cards with status pills, target type tags, and patron author metadata.
   - Selected the Review report. Verified full review preview, folio title (*Ficciones*), reporter narrative, and decision tools.
   - Clicked "Soft-Hide Content", confirmed in modal. Verified visibility status changed to "Hidden from Public Discovery", action button updated to "Restore Content Visibility", and audit record `HIDE` logged.
   - Clicked "Restore Content Visibility", confirmed in modal. Verified visibility status restored and audit record `RESTORE` logged.
   - Entered decision note and clicked "Resolve Report". Verified status pill updated to `RESOLVED`, button disabled, and audit record `RESOLVE_REPORT` logged.
   - Clicked "Dismissed" tab. Verified empty queue state ("Quiet Stacks") rendered cleanly.
   - Resized viewport to mobile (390x844). Verified stacked single-column layout, responsive tabs, and hamburger navigation.

---

## N. SCREENSHOTS & VISUAL EVIDENCE

All 16 required screenshots were captured in the live browser and saved to `Akashic_Library/docs/Frontend_Docs/screenshots/`:

| Filename | Caption & Description | File Size |
|---|---|---|
| `01_report_action_book_review.png` | Book Reviews page showing restrained Report button on another reader's review | 370 KB |
| `02_report_action_review_reply.png` | Book Reviews page showing Report action on an individual review reply in the expanded conversation | 364 KB |
| `03_report_action_community_discussion.png` | Community Hub feed showing Report action on a community discussion card | 440 KB |
| `04_report_action_discussion_reply.png` | Discussion Thread page showing Report action on a reader reply | 415 KB |
| `05_shared_annotation_reporting.png` | Reading Room showing Report action strictly on shared marginalia (never private) | 710 KB |
| `06_report_content_modal.png` | Accessible Report Content modal open with reason dropdown, narrative textarea, and character counter | 629 KB |
| `07_report_success_state.png` | Successful report submission confirmation state ("Report Inscribed") | 572 KB |
| `08_moderator_console_desktop.png` | Moderator Console desktop view (`/?view=moderation`) for authenticated Curator | 391 KB |
| `09_moderator_console_report_queue.png` | Moderator Console report queue list with status pills, target type pills, reason, and patron metadata | 402 KB |
| `10_report_detail_view.png` | Selected report detail panel with full target preview, author info, folio anchor, and reporter narrative | 430 KB |
| `11_hide_content_confirmation.png` | Soft-hide content confirmation modal with action preview | 326 KB |
| `12_restore_content_confirmation.png` | Restore hidden content confirmation modal | 312 KB |
| `13_resolved_dismissed_report_state.png` | Report detail showing RESOLVED status badge, disabled action button, and audit trail | 337 KB |
| `14_empty_moderation_queue.png` | Empty moderation queue state ("Quiet Stacks") when filtering by a status with zero reports | 364 KB |
| `15_unauthorized_access_state.png` | Unauthorized access state (403 Forbidden) when standard patron (`USER`) visits `/?view=moderation` | 180 KB |
| `16_mobile_moderator_console.png` | Moderator Console on mobile viewport (390px width) showing responsive stacked layout | 207 KB |

---

## O. FILES MODIFIED & ADDED

### Backend Files:
- [community/constants.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/constants.py): Extended `TargetType` enum (`REVIEW`, `REVIEW_REPLY`, `ANNOTATION`) and added `ReportReason` enum and choices.
- [community/services.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/services.py): Extended `ModerationService` with `get_target_details()`, multi-collection reporting, self-reporting prevention, duplicate report prevention, private annotation shield, soft-hide/restore across all collections, and audit listing.
- [community/serializers.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/serializers.py): Enriched `ReportSerializer` with preview fields (`target_content`, `target_title`, `target_author`, `target_status`, `context`), updated `ModerationActionSerializer`, and added `ModerationAuditSerializer`.
- [community/views.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/views.py): Enforced `IsAuthenticated` and `IsModerator` permissions, added `ModerationAuditListView`, and implemented `GET` on `ModerationReportDetailView`.
- [community/urls.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/urls.py): Registered `moderation/audits/` endpoint.
- [discovery/reviews_repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/reviews_repository.py): Added `moderation_status: {"$ne": "HIDDEN"}` filter to reply queries and counts.
- [discovery/annotations_repository.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/discovery/annotations_repository.py): Added `moderation_status: {"$ne": "HIDDEN"}` filter to shared annotation listings.
- [community/tests_phase6c_moderation.py](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/community/tests_phase6c_moderation.py): Comprehensive test suite covering all 14 governance and moderation test cases.

### Frontend Files:
- [frontend/src/types/moderation.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/types/moderation.ts): TypeScript types for reports, moderation audits, target types, reasons, and status codes.
- [frontend/src/services/reportService.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/services/reportService.ts): API client for report creation, listing, detail retrieval, resolving, hiding, restoring, and audits.
- [frontend/src/components/community/ReportContentButton/ReportContentButton.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/community/ReportContentButton/ReportContentButton.tsx) & `.module.css`: Restrained flag action button with self-reporting prevention and accessibility.
- [frontend/src/components/community/ReportContentModal/ReportContentModal.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/community/ReportContentModal/ReportContentModal.tsx) & `.module.css`: Accessible reporting dialog with reason selection, narrative field, char counter, and truth disclaimer.
- [frontend/src/pages/Moderation/ModerationConsolePage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Moderation/ModerationConsolePage.tsx) & `.module.css`: Complete editorial Moderator Console dashboard with 2-column workspace, stats, filters, and 403 state.
- [frontend/src/pages/BookReviews/BookReviewsPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/BookReviews/BookReviewsPage.tsx): Integrated reporting on cataloged reviews and review replies.
- [frontend/src/pages/Community/CommunityHubPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityHubPage.tsx): Integrated reporting on discussion feed cards.
- [frontend/src/pages/Community/CommunityThreadPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Community/CommunityThreadPage.tsx): Integrated reporting on discussion header, direct replies, and nested replies.
- [frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/ReadingRoom/ReadingRoomPage.tsx): Integrated reporting strictly on shared marginalia notes.
- [frontend/src/utils/navigation.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/utils/navigation.ts): Added isolated view mapping for `moderation` view.
- [frontend/src/App.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/App.tsx): Added route handler for `/?view=moderation`.
- [frontend/src/components/layout/Navbar/Navbar.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Navbar/Navbar.tsx): Added conditional "Moderation Console" link in profile dropdown for `MODERATOR` and `ADMIN`.
- [frontend/src/components/layout/Navbar/MobileDrawer.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Navbar/MobileDrawer.tsx): Added conditional "Moderation Console" link in mobile drawer for `MODERATOR` and `ADMIN`.
- [frontend/src/components/community/ReportContentButton/ReportContentButton.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/community/ReportContentButton/ReportContentButton.test.tsx): Unit tests for button behavior and ownership check.
- [frontend/src/components/community/ReportContentModal/ReportContentModal.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/community/ReportContentModal/ReportContentModal.test.tsx): Unit tests for modal submission and error handling.
- [frontend/src/pages/Moderation/ModerationConsolePage.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/pages/Moderation/ModerationConsolePage.test.tsx): Unit tests for role gating, queue management, soft-hiding, and resolving.
- [frontend/src/components/layout/Navbar/Navbar.test.tsx](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/components/layout/Navbar/Navbar.test.tsx): Added role-based menu link tests.
- [frontend/src/utils/navigation.test.ts](file:///Users/ragnar/Documents/GITHUB_REPOS/Akashic-Library/Akashic_Library/frontend/src/utils/navigation.test.ts): Added `moderation` view isolation test.

---

## P. KNOWN LIMITATIONS & FUTURE ROADMAP

1. **User Account Bans / Suspensions:** In accordance with the Phase 6C specification boundaries, user bans, patron suspensions, and account deactivations were not implemented. Content-level governance remains strictly focused on hiding or restoring specific inscriptions.
2. **Thread Pinning / Locking:** In-thread curatorial lock states (preventing further replies) are reserved for a future community governance extension.
3. **Store Product Moderation:** Moderation of physical book inventory, digital store products, or commerce transactions is explicitly out of scope for Part I and deferred to Part II (Akashic Store).

---

## Q. GIT SAFETY & REPOSITORY COMPLIANCE

- **Branch Integrity:** Strict compliance was maintained throughout Phase 6C. The repository remained on `ragnar/frontend`.
- **Zero Forbidden Commands:** Zero git commits, zero git pushes, zero resets, zero cleans, zero stashes, and zero branch checkouts were executed.
- **Clean Workspace:** All files modified or created remain strictly within the authorized repository tree.

---

## R. ACCEPTANCE & SIGN-OFF

Phase 6C fulfills every requirement stipulated in the Phase 6C specification:
- Universal reporting across all 5 content types: **ACCEPTED**
- Strict privacy protection for private annotations: **ACCEPTED**
- Self-reporting and duplicate report prevention: **ACCEPTED**
- Role-gated Moderator Console (`/?view=moderation`): **ACCEPTED**
- Decoupled soft-hide and restore content lifecycle: **ACCEPTED**
- Append-only archival audit history: **ACCEPTED**
- 344/344 backend tests passing: **ACCEPTED**
- 207/207 frontend tests passing, clean linting, clean build: **ACCEPTED**
- 16 verified live browser screenshots: **ACCEPTED**

Phase 6C is complete, verified, and ready for Part I progression.
