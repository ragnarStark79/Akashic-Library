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

