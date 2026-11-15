import uuid
from rest_framework.test import APIClient
from django.test import TestCase
from unittest.mock import patch

from accounts.models import User, UserRole
from community.services import CommunityService, ReplyService, ModerationService, AntiSpamService
from community.repository import get_document, count_documents
from discovery.exceptions import BookNotFoundError

class CommunityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="user", email="u@test.com", password="pw")
        self.other_user = User.objects.create_user(username="other", email="o@test.com", password="pw")
        self.mod = User.objects.create_user(username="mod", email="m@test.com", password="pw", role=UserRole.MODERATOR)
        
        self.valid_book_data = {"_id": "book-123", "title": "Test Book"}

    def tearDown(self):
        from discovery.db import get_db
        db = get_db()
        db.discussions.delete_many({})
        db.replies.delete_many({})
        db.reports.delete_many({})
        db.moderation_audits.delete_many({})
        
    def _auth(self, user):
        self.client.force_authenticate(user)
        
    def _unauth(self):
        self.client.logout()

    @patch("community.services.get_book_by_id")
    def test_create_discussion_success(self, mock_get_book):
        mock_get_book.return_value = self.valid_book_data
        self._auth(self.user)
        
        resp = self.client.post("/api/community/discussions/", {
            "title": "Great book",
            "body": "I loved this book so much.",
            "book_id": "book-123"
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertIn("id", resp.data)
        self.assertEqual(resp.data["title"], "Great book")
        self.assertEqual(resp.data["author_user_id"], str(self.user.id))

    def test_create_discussion_unauth(self):
        resp = self.client.post("/api/community/discussions/", {
            "title": "Title", "body": "Body"
        }, format="json")
        self.assertIn(resp.status_code, [401, 403])

    @patch("community.services.get_book_by_id")
    def test_create_discussion_missing_book(self, mock_get_book):
        mock_get_book.side_effect = BookNotFoundError("Missing")
        self._auth(self.user)
        
        resp = self.client.post("/api/community/discussions/", {
            "title": "Great book", "body": "Body", "book_id": "bad-book"
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("not found", str(resp.data))

    def test_create_discussion_empty_fields(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {
            "title": "   ", "body": "   "
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("blank", str(resp.data))

    @patch("community.services.get_book_by_id")
    def test_list_discussions(self, mock_get_book):
        mock_get_book.return_value = self.valid_book_data
        self._auth(self.user)
        self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1", "book_id": "book-123"}, format="json")
        self.client.post("/api/community/discussions/", {"title": "T2", "body": "B2"}, format="json")
        
        resp = self.client.get("/api/community/discussions/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)
        
        # Test filter
        resp = self.client.get("/api/community/discussions/?book_id=book-123")
        self.assertEqual(len(resp.data), 1)

    def test_update_own_discussion(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        resp = self.client.patch(f"/api/community/discussions/{d_id}/", {"title": "T1 Updated"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["title"], "T1 Updated")

    def test_update_other_discussion_forbidden(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self._auth(self.other_user)
        resp = self.client.patch(f"/api/community/discussions/{d_id}/", {"title": "Hacked"}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_delete_own_discussion(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        resp = self.client.delete(f"/api/community/discussions/{d_id}/")
        self.assertEqual(resp.status_code, 204)
        
        resp = self.client.get(f"/api/community/discussions/{d_id}/")
        self.assertEqual(resp.status_code, 404)

    def test_create_reply(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "My Reply"}, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["body"], "My Reply")

    def test_list_replies(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "R1"}, format="json")
        self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "R2"}, format="json")
        
        resp = self.client.get(f"/api/community/discussions/{d_id}/replies/")
        self.assertEqual(len(resp.data), 2)

    def test_update_own_reply(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "R1"}, format="json")
        r_id = resp.data["id"]
        
        resp = self.client.patch(f"/api/community/replies/{r_id}/", {"body": "R1 Updated"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["body"], "R1 Updated")

    def test_delete_own_reply(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "R1"}, format="json")
        r_id = resp.data["id"]
        
        resp = self.client.delete(f"/api/community/replies/{r_id}/")
        self.assertEqual(resp.status_code, 204)
        
        resp = self.client.get(f"/api/community/discussions/{d_id}/replies/")
        self.assertEqual(len(resp.data), 0)

    def test_create_report(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self._auth(self.other_user)
        resp = self.client.post("/api/community/reports/", {
            "target_type": "DISCUSSION",
            "target_id": d_id,
            "reason": "Spam"
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], "PENDING")

    def test_duplicate_report(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self._auth(self.other_user)
        self.client.post("/api/community/reports/", {"target_type": "DISCUSSION", "target_id": d_id, "reason": "Spam"}, format="json")
        resp = self.client.post("/api/community/reports/", {"target_type": "DISCUSSION", "target_id": d_id, "reason": "Spam 2"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("active report", str(resp.data))

    def test_moderator_hide_content(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self._auth(self.mod)
        resp = self.client.post(f"/api/community/moderation/hide/DISCUSSION/{d_id}/", {"note": "Bad"}, format="json")
        self.assertEqual(resp.status_code, 204)
        
        # Normal user cannot see it
        self._auth(self.other_user)
        resp = self.client.get(f"/api/community/discussions/{d_id}/")
        self.assertEqual(resp.status_code, 404)
        
        resp = self.client.get("/api/community/discussions/")
        self.assertEqual(len(resp.data), 0)
        
        # Mod can see it
        self._auth(self.mod)
        resp = self.client.get(f"/api/community/discussions/{d_id}/")
        self.assertEqual(resp.status_code, 200)

    def test_moderator_list_and_resolve_reports(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self._auth(self.other_user)
        resp = self.client.post("/api/community/reports/", {"target_type": "DISCUSSION", "target_id": d_id, "reason": "Spam"}, format="json")
        r_id = resp.data["id"]
        
        self._auth(self.user)
        resp = self.client.get("/api/community/moderation/reports/")
        self.assertEqual(resp.status_code, 403)
        
        self._auth(self.mod)
        resp = self.client.get("/api/community/moderation/reports/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        
        resp = self.client.patch(f"/api/community/moderation/reports/{r_id}/", {"action": "RESOLVED"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "RESOLVED")

    def test_rate_limiting_anti_spam(self):
        self._auth(self.user)
        
        # Setup rate limiting to a low max
        AntiSpamService.MAX_ITEMS = 2
        
        self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        self.client.post("/api/community/discussions/", {"title": "T2", "body": "B2"}, format="json")
        
        resp = self.client.post("/api/community/discussions/", {"title": "T3", "body": "B3"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("too frequently", str(resp.data))
        
        # Reset back
        AntiSpamService.MAX_ITEMS = 5

    def test_delete_other_discussion_forbidden(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        
        self._auth(self.other_user)
        resp = self.client.delete(f"/api/community/discussions/{d_id}/")
        self.assertEqual(resp.status_code, 403)

    def test_update_other_reply_forbidden(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "R1"}, format="json")
        r_id = resp.data["id"]
        
        self._auth(self.other_user)
        resp = self.client.patch(f"/api/community/replies/{r_id}/", {"body": "Hacked"}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_delete_other_reply_forbidden(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {"title": "T1", "body": "B1"}, format="json")
        d_id = resp.data["id"]
        resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "R1"}, format="json")
        r_id = resp.data["id"]
        
        self._auth(self.other_user)
        resp = self.client.delete(f"/api/community/replies/{r_id}/")
        self.assertEqual(resp.status_code, 403)

    def test_forged_author_user_id_ignored(self):
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {
            "title": "T1", 
            "body": "B1", 
            "author_user_id": str(self.other_user.id)
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["author_user_id"], str(self.user.id))

    def test_pagination(self):
        self._auth(self.user)
        for i in range(25):
            self.client.post("/api/community/discussions/", {"title": f"T{i}", "body": f"B{i}"}, format="json")
            
        resp = self.client.get("/api/community/discussions/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.data) <= 20)  # Pagination limit

    @patch("community.serializers.get_book_by_id")
    @patch("community.services.get_book_by_id")
    def test_discussion_enriched_fields_and_search(self, mock_get_book, mock_get_book_serializer):
        mock_get_book.return_value = self.valid_book_data
        mock_get_book_serializer.return_value = self.valid_book_data
        self._auth(self.user)
        resp = self.client.post("/api/community/discussions/", {
            "title": "Borges and Hexagonal Galleries",
            "body": "A deep thesis on the infinite library labyrinth.",
            "book_id": "book-123",
            "topic_type": "PHILOSOPHICAL_THESIS"
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        d_id = resp.data["id"]

        self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "Fascinating perspective."}, format="json")

        detail_resp = self.client.get(f"/api/community/discussions/{d_id}/")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.data["reply_count"], 1)
        self.assertIn("author", detail_resp.data)
        self.assertEqual(detail_resp.data["author"]["username"], self.user.username)
        self.assertIn("book", detail_resp.data)
        self.assertEqual(detail_resp.data["book"]["title"], "Test Book")

        search_resp = self.client.get("/api/community/discussions/?q=Hexagonal")
        self.assertEqual(search_resp.status_code, 200)
        self.assertTrue(any(d["id"] == d_id for d in search_resp.data))

        search_none = self.client.get("/api/community/discussions/?q=NonExistentGibberishPhrase")
        self.assertEqual(search_none.status_code, 200)
        self.assertFalse(any(d["id"] == d_id for d in search_none.data))

        topic_resp = self.client.get("/api/community/discussions/?topic_type=PHILOSOPHICAL_THESIS")
        self.assertEqual(topic_resp.status_code, 200)
        self.assertTrue(any(d["id"] == d_id for d in topic_resp.data))

    def test_create_reply_with_citations(self):
        self._auth(self.user)
        d_resp = self.client.post("/api/community/discussions/", {"title": "Thesis", "body": "Body text"}, format="json")
        d_id = d_resp.data["id"]

        resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {
            "body": "A response with specific page citation.",
            "page_reference": "p. 114",
            "chapter_reference": "Chapter 4",
            "passage_excerpt": "The garden of forking paths is an incomplete, contradictory picture.",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["page_reference"], "p. 114")
        self.assertEqual(resp.data["chapter_reference"], "Chapter 4")
        self.assertEqual(resp.data["passage_excerpt"], "The garden of forking paths is an incomplete, contradictory picture.")
        self.assertIsNone(resp.data["parent_id"])

    def test_create_nested_reply_success(self):
        self._auth(self.user)
        d_resp = self.client.post("/api/community/discussions/", {"title": "Thesis", "body": "Body text"}, format="json")
        d_id = d_resp.data["id"]

        r1_resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "Direct reply by Reader A"}, format="json")
        r1_id = r1_resp.data["id"]

        self._auth(self.other_user)
        r2_resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {
            "body": "Response to Reader A by Reader B",
            "parent_id": r1_id,
        }, format="json")
        self.assertEqual(r2_resp.status_code, 201)
        self.assertEqual(r2_resp.data["parent_id"], r1_id)
        self.assertEqual(r2_resp.data["author"]["username"], self.other_user.username)

    def test_create_nested_reply_depth_limit(self):
        self._auth(self.user)
        d_resp = self.client.post("/api/community/discussions/", {"title": "Thesis", "body": "Body text"}, format="json")
        d_id = d_resp.data["id"]

        r1_resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "Level 1 direct reply"}, format="json")
        r1_id = r1_resp.data["id"]

        self._auth(self.other_user)
        r2_resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {
            "body": "Level 2 nested reply",
            "parent_id": r1_id,
        }, format="json")
        r2_id = r2_resp.data["id"]

        # Attempt Level 3 reply (replying to Level 2 nested reply)
        r3_resp = self.client.post(f"/api/community/discussions/{d_id}/replies/", {
            "body": "Level 3 illegal reply",
            "parent_id": r2_id,
        }, format="json")
        self.assertEqual(r3_resp.status_code, 400)
        self.assertIn("cannot exceed 1 level of nesting", str(r3_resp.data))

    def test_create_nested_reply_mismatched_discussion(self):
        self._auth(self.user)
        d1 = self.client.post("/api/community/discussions/", {"title": "Disc 1", "body": "B1"}, format="json").data["id"]
        d2 = self.client.post("/api/community/discussions/", {"title": "Disc 2", "body": "B2"}, format="json").data["id"]

        r1 = self.client.post(f"/api/community/discussions/{d1}/replies/", {"body": "Reply on Disc 1"}, format="json").data["id"]

        # Attempt to attach reply under Disc 2 with parent from Disc 1
        resp = self.client.post(f"/api/community/discussions/{d2}/replies/", {
            "body": "Sneaky nested reply",
            "parent_id": r1,
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("does not belong to this discussion", str(resp.data))

    def test_update_own_reply_with_citations_and_nested_route(self):
        self._auth(self.user)
        d_id = self.client.post("/api/community/discussions/", {"title": "Disc", "body": "B"}, format="json").data["id"]
        r_id = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "Original text"}, format="json").data["id"]

        # Update via nested route /discussions/<d_id>/replies/<r_id>/
        patch_resp = self.client.patch(f"/api/community/discussions/{d_id}/replies/{r_id}/", {
            "body": "Updated text",
            "page_reference": "p. 42",
        }, format="json")
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.data["body"], "Updated text")
        self.assertEqual(patch_resp.data["page_reference"], "p. 42")

    def test_update_other_user_reply_forbidden(self):
        self._auth(self.user)
        d_id = self.client.post("/api/community/discussions/", {"title": "Disc", "body": "B"}, format="json").data["id"]
        r_id = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "User A text"}, format="json").data["id"]

        self._auth(self.other_user)
        patch_resp = self.client.patch(f"/api/community/discussions/{d_id}/replies/{r_id}/", {"body": "Hacked"}, format="json")
        self.assertEqual(patch_resp.status_code, 403)

    def test_delete_own_reply_cascade_children(self):
        self._auth(self.user)
        d_id = self.client.post("/api/community/discussions/", {"title": "Disc", "body": "B"}, format="json").data["id"]
        r1_id = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "Parent reply"}, format="json").data["id"]

        self._auth(self.other_user)
        self.client.post(f"/api/community/discussions/{d_id}/replies/", {
            "body": "Child reply",
            "parent_id": r1_id,
        }, format="json")

        replies_before = self.client.get(f"/api/community/discussions/{d_id}/replies/").data
        self.assertEqual(len(replies_before), 2)

        # User A deletes their parent reply
        self._auth(self.user)
        del_resp = self.client.delete(f"/api/community/discussions/{d_id}/replies/{r1_id}/")
        self.assertEqual(del_resp.status_code, 204)

        # Both parent and child reply should now be soft deleted
        replies_after = self.client.get(f"/api/community/discussions/{d_id}/replies/").data
        self.assertEqual(len(replies_after), 0)

        # Discussion still exists
        d_check = self.client.get(f"/api/community/discussions/{d_id}/")
        self.assertEqual(d_check.status_code, 200)

    def test_delete_other_user_reply_forbidden(self):
        self._auth(self.user)
        d_id = self.client.post("/api/community/discussions/", {"title": "Disc", "body": "B"}, format="json").data["id"]
        r_id = self.client.post(f"/api/community/discussions/{d_id}/replies/", {"body": "User A text"}, format="json").data["id"]

        self._auth(self.other_user)
        del_resp = self.client.delete(f"/api/community/discussions/{d_id}/replies/{r_id}/")
        self.assertEqual(del_resp.status_code, 403)

    def test_nested_route_mismatched_discussion_404(self):
        self._auth(self.user)
        d1 = self.client.post("/api/community/discussions/", {"title": "Disc 1", "body": "B1"}, format="json").data["id"]
        d2 = self.client.post("/api/community/discussions/", {"title": "Disc 2", "body": "B2"}, format="json").data["id"]
        r1 = self.client.post(f"/api/community/discussions/{d1}/replies/", {"body": "Reply 1"}, format="json").data["id"]

        # Accessing r1 under d2 should return 404
        patch_resp = self.client.patch(f"/api/community/discussions/{d2}/replies/{r1}/", {"body": "Invalid"}, format="json")
        self.assertEqual(patch_resp.status_code, 404)

        del_resp = self.client.delete(f"/api/community/discussions/{d2}/replies/{r1}/")
        self.assertEqual(del_resp.status_code, 404)



