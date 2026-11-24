"""
Phase 6C Moderation & Reporting Comprehensive Tests.

Tests:
1. Patron reporting across all 5 content categories:
   - DISCUSSION
   - REPLY
   - REVIEW
   - REVIEW_REPLY
   - ANNOTATION (SHARED)
2. Private annotation privacy: reports against PRIVATE annotations are rejected.
3. Self-reporting prevention: users cannot report their own content.
4. Duplicate active report prevention.
5. Role permissions: MODERATOR & ADMIN allowed; USER, STORE_MANAGER, anonymous denied.
6. Moderator queue filtering & report detail view (GET).
7. Hide & Restore across content types with public feed exclusion & restoration.
8. Resolve & Dismiss report workflows with moderation audit trail.
"""

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.models import UserRole
from community.repository import get_db
from community.services import ModerationService, CommunityService, ReplyService
from discovery.reviews_repository import create_review, create_reply as create_review_reply
from discovery.annotations_repository import create_annotation, VISIBILITY_SHARED, VISIBILITY_PRIVATE
import uuid
from bson import ObjectId

User = get_user_model()


class Phase6CModerationTests(APITestCase):
    def setUp(self):
        db = get_db()
        db.discussions.delete_many({})
        db.replies.delete_many({})
        db.reviews.delete_many({})
        db.review_replies.delete_many({})
        db.annotations.delete_many({})
        db.reports.delete_many({})
        db.moderation_audits.delete_many({})

        # Create distinct test users
        self.user_a = User.objects.create_user(
            username="patron_a",
            email="patron_a@example.com",
            password="Password123!",
            role=UserRole.USER,
            display_name="Patron A",
        )
        self.user_b = User.objects.create_user(
            username="patron_b",
            email="patron_b@example.com",
            password="Password123!",
            role=UserRole.USER,
            display_name="Patron B",
        )
        self.mod_user = User.objects.create_user(
            username="moderator_patron",
            email="mod@example.com",
            password="Password123!",
            role=UserRole.MODERATOR,
            display_name="Curator Mod",
        )
        self.admin_user = User.objects.create_user(
            username="admin_patron",
            email="admin@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            display_name="High Archivist",
        )
        self.store_mgr = User.objects.create_user(
            username="store_mgr",
            email="store@example.com",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            display_name="Store Keeper",
        )

        self.test_book_id = "000000000000000000000001"
        db.books.delete_many({})
        db.books.insert_one({
            "_id": ObjectId(self.test_book_id),
            "title": "The Name of the Rose",
            "authors": ["Umberto Eco"],
        })

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    # ─── 1. Content Categories Reporting ──────────────────────────────────────

    def test_report_discussion(self):
        # User B creates discussion
        self._auth(self.user_b)
        disc = CommunityService.create_discussion(str(self.user_b.id), "B's Discussion", "Content body")
        disc_id = disc["_id"]

        # User A reports User B's discussion
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc_id,
            "reason": "SPAM",
            "details": "Promotional link",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "PENDING")
        self.assertEqual(res.data["target_type"], "DISCUSSION")

    def test_report_discussion_reply(self):
        # User B creates discussion & User A creates a reply
        self._auth(self.user_b)
        disc = CommunityService.create_discussion(str(self.user_b.id), "Discussion Title", "Discussion Body")
        reply = ReplyService.create_reply(str(self.user_b.id), disc["_id"], "Reply by B")

        # User A reports User B's reply
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "REPLY",
            "target_id": reply["_id"],
            "reason": "HARASSMENT",
            "details": "Hostile comment",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["target_type"], "REPLY")

    def test_report_book_review(self):
        # User B creates a book review
        rev = create_review(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            rating=4,
            title="Great Folio",
            body="Review text by User B",
        )
        rev_id = rev["id"]

        # User A reports User B's review
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "REVIEW",
            "target_id": rev_id,
            "reason": "SPOILER",
            "details": "Reveals ending without tag",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["target_type"], "REVIEW")

    def test_report_review_reply(self):
        # User B creates review & reply
        rev = create_review(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            rating=5,
            title="Masterpiece",
            body="Deep reading",
        )
        rep = create_review_reply(
            user_id=str(self.user_b.id),
            book_id=self.test_book_id,
            review_id=rev["id"],
            body="Reply to my review",
        )

        # User A reports review reply
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "REVIEW_REPLY",
            "target_id": rep["id"],
            "reason": "INAPPROPRIATE",
            "details": "Offensive language",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["target_type"], "REVIEW_REPLY")

    def test_report_shared_annotation(self):
        # User B creates a shared annotation
        annot = create_annotation(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            content="Marginalia on page 42",
            visibility=VISIBILITY_SHARED,
        )

        # User A reports the shared annotation
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "ANNOTATION",
            "target_id": annot["id"],
            "reason": "OFF_TOPIC",
            "details": "Not relevant to text",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["target_type"], "ANNOTATION")

    # ─── 2. Privacy & Self-Reporting Constraints ──────────────────────────────

    def test_private_annotation_cannot_be_reported(self):
        # User B creates a private annotation
        annot = create_annotation(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            content="My private thoughts",
            visibility=VISIBILITY_PRIVATE,
        )

        # User A attempts to report User B's private annotation
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "ANNOTATION",
            "target_id": annot["id"],
            "reason": "SPAM",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Private annotations cannot be reported", str(res.data))

    def test_self_reporting_prevented(self):
        # User A creates a discussion and attempts to report it themselves
        self._auth(self.user_a)
        disc = CommunityService.create_discussion(str(self.user_a.id), "My Title", "My Body")

        res = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc["_id"],
            "reason": "SPAM",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot report your own content", str(res.data))

    def test_duplicate_active_report_prevented(self):
        self._auth(self.user_b)
        disc = CommunityService.create_discussion(str(self.user_b.id), "Title", "Body")

        self._auth(self.user_a)
        res1 = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc["_id"],
            "reason": "SPAM",
        }, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc["_id"],
            "reason": "HARASSMENT",
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already have an active report", str(res2.data))

    # ─── 3. Role Permissions ──────────────────────────────────────────────────

    def test_moderator_queue_role_permissions(self):
        # 1. Unauthenticated -> 401 or 403 (DRF SessionAuthentication returns 403 when unauthenticated)
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/community/moderation/reports/")
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # 2. Regular Patron (USER) -> 403
        self._auth(self.user_a)
        res = self.client.get("/api/community/moderation/reports/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Store Manager -> 403
        self._auth(self.store_mgr)
        res = self.client.get("/api/community/moderation/reports/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Moderator -> 200
        self._auth(self.mod_user)
        res = self.client.get("/api/community/moderation/reports/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 5. Admin -> 200
        self._auth(self.admin_user)
        res = self.client.get("/api/community/moderation/reports/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_report_detail_and_resolution(self):
        # User B creates discussion, User A reports it
        disc = CommunityService.create_discussion(str(self.user_b.id), "Flagged Discussion", "Flagged body text")
        self._auth(self.user_a)
        rep_res = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc["_id"],
            "reason": "SPAM",
            "details": "Details here",
        }, format="json")
        report_id = rep_res.data["id"]

        # Moderator retrieves detail
        self._auth(self.mod_user)
        detail_res = self.client.get(f"/api/community/moderation/reports/{report_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["id"], report_id)
        self.assertIn("Flagged body text", detail_res.data["target_content"])
        self.assertEqual(detail_res.data["target_author"]["display_name"], "Patron B")

        # Moderator resolves report
        patch_res = self.client.patch(f"/api/community/moderation/reports/{report_id}/", {
            "action": "RESOLVED",
            "note": "Content reviewed and handled",
        }, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["status"], "RESOLVED")
        self.assertEqual(patch_res.data["resolution_note"], "Content reviewed and handled")

    # ─── 4. Hide & Restore Across Content Categories ──────────────────────────

    def test_hide_and_restore_discussion(self):
        disc = CommunityService.create_discussion(str(self.user_b.id), "Title", "Body")
        disc_id = disc["_id"]

        # Moderator hides discussion
        self._auth(self.mod_user)
        res = self.client.post(f"/api/community/moderation/hide/DISCUSSION/{disc_id}/", {
            "note": "Violates community norms",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Public retrieval excludes hidden discussion
        self._auth(self.user_a)
        pub_res = self.client.get(f"/api/community/discussions/{disc_id}/")
        self.assertEqual(pub_res.status_code, status.HTTP_404_NOT_FOUND)

        # Moderator restores discussion
        self._auth(self.mod_user)
        res = self.client.post(f"/api/community/moderation/restore/DISCUSSION/{disc_id}/", {
            "note": "Restored after appeal",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Public retrieval sees discussion again
        self._auth(self.user_a)
        pub_res = self.client.get(f"/api/community/discussions/{disc_id}/")
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)

    def test_hide_and_restore_review(self):
        rev = create_review(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            rating=3,
            title="Book Review",
            body="Review content",
        )
        rev_id = rev["id"]

        # Moderator hides review
        self._auth(self.mod_user)
        res = self.client.post(f"/api/community/moderation/hide/REVIEW/{rev_id}/", {
            "note": "Hidden review",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Public reviews list excludes hidden review
        from discovery.reviews_repository import list_reviews_for_book
        pub_list = list_reviews_for_book(self.test_book_id)
        self.assertEqual(len(pub_list["results"]), 0)

        # Moderator restores review
        res = self.client.post(f"/api/community/moderation/restore/REVIEW/{rev_id}/", {
            "note": "Restored review",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Public reviews list includes restored review
        pub_list = list_reviews_for_book(self.test_book_id)
        self.assertEqual(len(pub_list["results"]), 1)

    def test_hide_and_restore_shared_annotation(self):
        annot = create_annotation(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            content="Shared annotation note",
            visibility=VISIBILITY_SHARED,
        )
        annot_id = annot["id"]

        # Moderator hides annotation
        self._auth(self.mod_user)
        res = self.client.post(f"/api/community/moderation/hide/ANNOTATION/{annot_id}/", {
            "note": "Hidden annotation",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Public shared annotations list excludes hidden annotation
        from discovery.annotations_repository import list_shared_annotations_for_book
        shared, count = list_shared_annotations_for_book(self.test_book_id)
        self.assertEqual(count, 0)
        self.assertEqual(len(shared), 0)

        # Moderator restores annotation
        res = self.client.post(f"/api/community/moderation/restore/ANNOTATION/{annot_id}/", {
            "note": "Restored annotation",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Public shared annotations list includes restored annotation
        shared, count = list_shared_annotations_for_book(self.test_book_id)
        self.assertEqual(count, 1)

    def test_moderation_audit_log(self):
        disc = CommunityService.create_discussion(str(self.user_b.id), "Audit Test", "Body text")
        disc_id = disc["_id"]

        # Moderator hides
        self._auth(self.mod_user)
        self.client.post(f"/api/community/moderation/hide/DISCUSSION/{disc_id}/", {
            "note": "Inappropriate discussion",
        }, format="json")

        # Check audits endpoint
        audits_res = self.client.get("/api/community/moderation/audits/")
        self.assertEqual(audits_res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(audits_res.data) >= 1)
        audit_entry = audits_res.data[0]
        self.assertEqual(audit_entry["action"], "HIDE")
        self.assertEqual(audit_entry["target_id"], disc_id)
        self.assertEqual(audit_entry["moderator_display_name"], "Curator Mod")

    # ─── 5. Strict Role Enforcement (Phase 6C.1) ─────────────────────────────

    def test_strict_moderator_role_enforcement_all_endpoints(self):
        """Verify USER and STORE_MANAGER are rejected even with is_staff=True."""
        user_staff = User.objects.create_user(
            username="user_staff",
            email="user_staff@example.com",
            password="Password123!",
            role=UserRole.USER,
            is_staff=True,
        )
        store_mgr_staff = User.objects.create_user(
            username="store_mgr_staff",
            email="store_mgr_staff@example.com",
            password="Password123!",
            role=UserRole.STORE_MANAGER,
            is_staff=True,
        )

        disc = CommunityService.create_discussion(str(self.user_b.id), "Strict Role Title", "Body")
        disc_id = disc["_id"]

        self._auth(self.user_a)
        rep = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc_id,
            "reason": "SPAM",
        }, format="json")
        report_id = rep.data["id"]

        unauthorized_users = [
            self.user_a,          # USER (not staff)
            user_staff,           # USER (is_staff=True)
            self.store_mgr,       # STORE_MANAGER (not staff)
            store_mgr_staff,      # STORE_MANAGER (is_staff=True)
        ]

        endpoints = [
            ("GET", "/api/community/moderation/reports/", None),
            ("GET", f"/api/community/moderation/reports/{report_id}/", None),
            ("PATCH", f"/api/community/moderation/reports/{report_id}/", {"action": "RESOLVED"}),
            ("POST", f"/api/community/moderation/hide/DISCUSSION/{disc_id}/", {"note": "Test"}),
            ("POST", f"/api/community/moderation/restore/DISCUSSION/{disc_id}/", {"note": "Test"}),
            ("GET", "/api/community/moderation/audits/", None),
        ]

        for u in unauthorized_users:
            self._auth(u)
            for method, path, payload in endpoints:
                if method == "GET":
                    res = self.client.get(path)
                elif method == "PATCH":
                    res = self.client.patch(path, payload, format="json")
                elif method == "POST":
                    res = self.client.post(path, payload, format="json")
                self.assertEqual(
                    res.status_code,
                    status.HTTP_403_FORBIDDEN,
                    f"User {u.username} (role={u.role}, staff={u.is_staff}) should receive 403 on {method} {path}, got {res.status_code}"
                )

        # Unauthenticated visitor must receive 401 or 403
        self.client.force_authenticate(user=None)
        for method, path, payload in endpoints:
            if method == "GET":
                res = self.client.get(path)
            elif method == "PATCH":
                res = self.client.patch(path, payload, format="json")
            elif method == "POST":
                res = self.client.post(path, payload, format="json")
            self.assertIn(
                res.status_code,
                [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
                f"Unauthenticated visitor should receive 401/403 on {method} {path}, got {res.status_code}"
            )

        # MODERATOR and ADMIN must succeed
        for mod in [self.mod_user, self.admin_user]:
            self._auth(mod)
            res = self.client.get("/api/community/moderation/reports/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            res = self.client.get(f"/api/community/moderation/reports/{report_id}/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            res = self.client.get("/api/community/moderation/audits/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)

    # ─── 6. Hidden-Content Visibility Verification (Phase 6C.1) ───────────────

    def test_hidden_review_visibility_aggregates_and_replies(self):
        """Verify hidden review behaves correctly across public APIs, single retrieval, rating aggregates, and replies."""
        from discovery.reviews_repository import get_aggregate_rating, get_reply_count

        rev1 = create_review(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            rating=5,
            title="Book Review 1",
            body="Review content 1",
        )
        rev2 = create_review(
            book_id=self.test_book_id,
            user_id=str(self.user_a.id),
            rating=3,
            title="Book Review 2",
            body="Review content 2",
        )
        rev1_id = rev1["id"]
        rev2_id = rev2["id"]

        # Before hide: aggregates have 2 reviews, avg = (5+3)/2 = 4.0
        agg_before = get_aggregate_rating(self.test_book_id)
        self.assertEqual(agg_before["rating_count"], 2)
        self.assertEqual(agg_before["average_rating"], 4.0)
        self.assertEqual(agg_before["distribution"]["5"], 1)
        self.assertEqual(agg_before["distribution"]["3"], 1)

        # Create a reply to rev1
        rep1 = create_review_reply(
            user_id=str(self.user_a.id),
            book_id=self.test_book_id,
            review_id=rev1_id,
            body="Nice review",
        )
        self.assertEqual(get_reply_count(rev1_id), 1)

        # Moderator hides rev1
        self._auth(self.mod_user)
        res = self.client.post(f"/api/community/moderation/hide/REVIEW/{rev1_id}/", {"note": "Hide review 1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # 1. Rating Aggregates: rev1 is excluded; only rev2 (rating 3) is counted
        agg_after = get_aggregate_rating(self.test_book_id)
        self.assertEqual(agg_after["rating_count"], 1)
        self.assertEqual(agg_after["average_rating"], 3.0)
        self.assertEqual(agg_after["distribution"]["5"], 0)
        self.assertEqual(agg_after["distribution"]["3"], 1)

        # 2. Top-level reviews listing: rev1 excluded
        self.client.force_authenticate(user=None)
        res_list = self.client.get(f"/api/books/{self.test_book_id}/reviews/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        ids = [r["id"] for r in res_list.data["results"]]
        self.assertNotIn(rev1_id, ids)
        self.assertIn(rev2_id, ids)

        # 3. Single-review retrieval:
        # Unauthenticated visitor -> 404
        self.client.force_authenticate(user=None)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/reviews/{rev1_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_404_NOT_FOUND)

        # Other regular user -> 404
        self._auth(self.user_a)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/reviews/{rev1_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_404_NOT_FOUND)

        # Review author (User B) -> 200
        self._auth(self.user_b)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/reviews/{rev1_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_200_OK)

        # Moderator -> 200
        self._auth(self.mod_user)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/reviews/{rev1_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_200_OK)

        # 4. Reply listing & reply count
        self.assertEqual(get_reply_count(rev1_id), 0)
        res_replies = self.client.get(f"/api/books/{self.test_book_id}/reviews/{rev1_id}/replies/")
        self.assertEqual(res_replies.status_code, status.HTTP_404_NOT_FOUND)

        # 5. Adding new reply to hidden review -> 404
        self._auth(self.user_a)
        res_post_rep = self.client.post(f"/api/books/{self.test_book_id}/reviews/{rev1_id}/replies/", {
            "body": "Should fail",
        }, format="json")
        self.assertEqual(res_post_rep.status_code, status.HTTP_404_NOT_FOUND)

    def test_hidden_discussion_visibility_and_reply_blocking(self):
        """Verify hidden discussion is excluded from feed, returns 404 on detail, and blocks replies."""
        disc = CommunityService.create_discussion(str(self.user_b.id), "Discussion B", "Discussion body")
        disc_id = disc["_id"]

        rep = ReplyService.create_reply(str(self.user_b.id), disc_id, "Reply 1")
        rep_id = rep["_id"]

        # Moderator hides discussion
        self._auth(self.mod_user)
        self.client.post(f"/api/community/moderation/hide/DISCUSSION/{disc_id}/", {"note": "Hide discussion"}, format="json")

        # 1. Feed listing excludes hidden discussion
        self.client.force_authenticate(user=None)
        res_feed = self.client.get("/api/community/discussions/")
        self.assertEqual(res_feed.status_code, status.HTTP_200_OK)
        disc_ids = [d["_id"] for d in res_feed.data]
        self.assertNotIn(disc_id, disc_ids)

        # 2. Detail returns 404 for regular visitor
        res_detail = self.client.get(f"/api/community/discussions/{disc_id}/")
        self.assertEqual(res_detail.status_code, status.HTTP_404_NOT_FOUND)

        # 3. Replies list returns 404 for regular visitor
        res_replies = self.client.get(f"/api/community/discussions/{disc_id}/replies/")
        self.assertEqual(res_replies.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Creating a reply to hidden discussion returns 400 validation error
        self._auth(self.user_a)
        res_new_rep = self.client.post(f"/api/community/discussions/{disc_id}/replies/", {
            "body": "Reply to hidden discussion",
        }, format="json")
        self.assertEqual(res_new_rep.status_code, status.HTTP_400_BAD_REQUEST)

    def test_hidden_reply_blocking_nested_responses(self):
        """Verify hidden reply cannot be replied to."""
        disc = CommunityService.create_discussion(str(self.user_b.id), "Discussion", "Body")
        disc_id = disc["_id"]

        rep = ReplyService.create_reply(str(self.user_b.id), disc_id, "Reply 1")
        rep_id = rep["_id"]

        # Moderator hides reply
        self._auth(self.mod_user)
        self.client.post(f"/api/community/moderation/hide/REPLY/{rep_id}/", {"note": "Hide reply"}, format="json")

        # Attempting to reply to hidden parent reply -> 400
        self._auth(self.user_a)
        res = self.client.post(f"/api/community/discussions/{disc_id}/replies/", {
            "body": "Nested response to hidden reply",
            "parent_id": rep_id,
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Parent reply not found or hidden", str(res.data))

    def test_hidden_shared_annotation_visibility_and_counts(self):
        """Verify hidden shared annotation is excluded from shared list, decrements counts, and returns 404 on single GET."""
        from discovery.annotations_repository import get_annotation_counts_for_book

        annot = create_annotation(
            book_id=self.test_book_id,
            user_id=str(self.user_b.id),
            content="Annotation to hide",
            visibility=VISIBILITY_SHARED,
        )
        annot_id = annot["id"]

        counts_before = get_annotation_counts_for_book(self.test_book_id)
        self.assertEqual(counts_before["shared_count"], 1)

        # Moderator hides annotation
        self._auth(self.mod_user)
        res = self.client.post(f"/api/community/moderation/hide/ANNOTATION/{annot_id}/", {"note": "Hide note"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # 1. Counts query: shared_count should be 0
        counts_after = get_annotation_counts_for_book(self.test_book_id)
        self.assertEqual(counts_after["shared_count"], 0)

        # 2. Shared list endpoint: count = 0, results empty
        self.client.force_authenticate(user=None)
        res_list = self.client.get(f"/api/books/{self.test_book_id}/annotations/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.data["count"], 0)
        self.assertEqual(len(res_list.data["results"]), 0)

        # 3. Single annotation GET:
        # Unauthenticated -> 404
        res_single = self.client.get(f"/api/books/{self.test_book_id}/annotations/{annot_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_404_NOT_FOUND)

        # Other user -> 404
        self._auth(self.user_a)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/annotations/{annot_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_404_NOT_FOUND)

        # Author (User B) -> 200
        self._auth(self.user_b)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/annotations/{annot_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_200_OK)

        # Moderator -> 200
        self._auth(self.mod_user)
        res_single = self.client.get(f"/api/books/{self.test_book_id}/annotations/{annot_id}/")
        self.assertEqual(res_single.status_code, status.HTTP_200_OK)

    # ─── 7. Safe State Preservation on Restore (Phase 6C.1) ───────────────────

    def test_restore_preserves_previous_moderation_status(self):
        """Verify restoring content preserves previous moderation status (e.g. PENDING remains PENDING)."""
        from discovery.reviews_repository import _get_col
        from bson import ObjectId

        # Create a pending review directly in mongo
        col = _get_col()
        res = col.insert_one({
            "book_id": self.test_book_id,
            "user_id": str(self.user_b.id),
            "rating": 5,
            "title": "Pending Review",
            "body": "Awaiting approval",
            "moderation_status": "PENDING",
            "helpful_count": 0,
            "created_at": 1000000,
            "updated_at": 1000000,
        })
        pending_rev_id = str(res.inserted_id)

        # Hide it
        self._auth(self.mod_user)
        self.client.post(f"/api/community/moderation/hide/REVIEW/{pending_rev_id}/", {"note": "Hide pending"}, format="json")

        doc = col.find_one({"_id": ObjectId(pending_rev_id)})
        self.assertEqual(doc["moderation_status"], "REJECTED")
        self.assertEqual(doc["previous_moderation_status"], "PENDING")

        # Restore it -> must restore to PENDING, not APPROVED!
        self.client.post(f"/api/community/moderation/restore/REVIEW/{pending_rev_id}/", {"note": "Restore pending"}, format="json")

        doc_restored = col.find_one({"_id": ObjectId(pending_rev_id)})
        self.assertEqual(doc_restored["moderation_status"], "PENDING")
        self.assertNotIn("previous_moderation_status", doc_restored)

    def test_cannot_report_already_hidden_content(self):
        """Verify reporting content that is already hidden or rejected is blocked."""
        disc = CommunityService.create_discussion(str(self.user_b.id), "Title", "Body")
        disc_id = disc["_id"]

        # Moderator hides discussion
        self._auth(self.mod_user)
        self.client.post(f"/api/community/moderation/hide/DISCUSSION/{disc_id}/", {"note": "Hide"}, format="json")

        # Patron attempts to report hidden discussion -> 400
        self._auth(self.user_a)
        res = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": disc_id,
            "reason": "SPAM",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already hidden", str(res.data))
