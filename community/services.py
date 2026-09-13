import uuid
from datetime import datetime, timezone
from django.core.exceptions import ValidationError
from django.utils import timezone as django_timezone

from .constants import ModerationStatus, ReportStatus, TargetType, ModerationAction
from .repository import (
    insert_document, get_document, update_document, delete_document, 
    find_documents, count_documents
)
from discovery.repository import get_book_by_id
from discovery.exceptions import BookNotFoundError

def utcnow():
    # Use timezone-aware UTC datetime as integer timestamp for consistency with other parts of system, or just store float timestamp
    return datetime.now(timezone.utc).timestamp()

class AntiSpamService:
    RATE_LIMIT_SECONDS = 60
    MAX_ITEMS = 5

    @staticmethod
    def check_rate_limit(user_id: str):
        cutoff = utcnow() - AntiSpamService.RATE_LIMIT_SECONDS
        
        # Check discussions
        recent_discussions = count_documents(
            "discussions", 
            {"author_user_id": user_id, "created_at": {"$gte": cutoff}}
        )
        # Check replies
        recent_replies = count_documents(
            "replies", 
            {"author_user_id": user_id, "created_at": {"$gte": cutoff}}
        )
        
        if recent_discussions + recent_replies >= AntiSpamService.MAX_ITEMS:
            raise ValidationError("You are posting too frequently. Please wait a moment.")

class CommunityService:
    @staticmethod
    def create_discussion(user_id: str, title: str, body: str, book_id: str = None, topic_type: str = "GENERAL") -> dict:
        title = title.strip()
        body = body.strip()
        
        if not title or not body:
            raise ValidationError("Title and body are required.")
            
        if len(title) > 255:
            raise ValidationError("Title is too long.")
            
        if len(body) > 10000:
            raise ValidationError("Body is too long.")
            
        if book_id:
            try:
                get_book_by_id(book_id)
            except BookNotFoundError:
                raise ValidationError(f"Book with id {book_id} not found.")

        AntiSpamService.check_rate_limit(user_id)

        doc_id = str(uuid.uuid4())
        now = utcnow()
        
        doc = {
            "_id": doc_id,
            "book_id": book_id,
            "topic_type": topic_type,
            "author_user_id": user_id,
            "title": title,
            "body": body,
            "created_at": now,
            "updated_at": now,
            "moderation_status": ModerationStatus.VISIBLE,
            "deleted_at": None
        }
        
        insert_document("discussions", doc)
        return doc

    @staticmethod
    def get_discussion(doc_id: str, for_moderator: bool = False) -> dict:
        doc = get_document("discussions", doc_id)
        if not doc:
            return None
            
        if doc.get("deleted_at") is not None:
            return None
            
        if not for_moderator and doc.get("moderation_status") != ModerationStatus.VISIBLE:
            return None
            
        return doc

    @staticmethod
    def list_discussions(filters: dict = None, skip: int = 0, limit: int = 20, for_moderator: bool = False):
        query = {"deleted_at": None}
        if not for_moderator:
            query["moderation_status"] = ModerationStatus.VISIBLE
            
        if filters:
            if "book_id" in filters:
                query["book_id"] = filters["book_id"]
            if "topic_type" in filters:
                query["topic_type"] = filters["topic_type"]
            if "author_user_id" in filters:
                query["author_user_id"] = filters["author_user_id"]
            if for_moderator and "moderation_status" in filters:
                query["moderation_status"] = filters["moderation_status"]
                
        # Sort by created_at DESC
        return find_documents("discussions", query, skip=skip, limit=limit, sort_by=[("created_at", -1)])

    @staticmethod
    def update_discussion(user_id: str, doc_id: str, title: str = None, body: str = None) -> dict:
        doc = get_document("discussions", doc_id)
        if not doc or doc.get("deleted_at"):
            raise ValidationError("Discussion not found.")
            
        if doc["author_user_id"] != user_id:
            raise ValidationError("You can only edit your own discussions.")
            
        updates = {"updated_at": utcnow()}
        
        if title is not None:
            title = title.strip()
            if not title or len(title) > 255:
                raise ValidationError("Invalid title.")
            updates["title"] = title
            
        if body is not None:
            body = body.strip()
            if not body or len(body) > 10000:
                raise ValidationError("Invalid body.")
            updates["body"] = body
            
        update_document("discussions", doc_id, updates)
        return get_document("discussions", doc_id)

    @staticmethod
    def delete_discussion(user_id: str, doc_id: str):
        doc = get_document("discussions", doc_id)
        if not doc or doc.get("deleted_at"):
            return
            
        if doc["author_user_id"] != user_id:
            raise ValidationError("You can only delete your own discussions.")
            
        update_document("discussions", doc_id, {"deleted_at": utcnow()})

class ReplyService:
    @staticmethod
    def create_reply(user_id: str, discussion_id: str, body: str) -> dict:
        body = body.strip()
        if not body:
            raise ValidationError("Body is required.")
        if len(body) > 10000:
            raise ValidationError("Body is too long.")
            
        discussion = CommunityService.get_discussion(discussion_id)
        if not discussion:
            raise ValidationError("Discussion not found or hidden.")
            
        AntiSpamService.check_rate_limit(user_id)

        doc_id = str(uuid.uuid4())
        now = utcnow()
        
        doc = {
            "_id": doc_id,
            "discussion_id": discussion_id,
            "author_user_id": user_id,
            "body": body,
            "created_at": now,
            "updated_at": now,
            "moderation_status": ModerationStatus.VISIBLE,
            "deleted_at": None
        }
        
        insert_document("replies", doc)
        return doc

    @staticmethod
    def get_reply(doc_id: str, for_moderator: bool = False) -> dict:
        doc = get_document("replies", doc_id)
        if not doc or doc.get("deleted_at"):
            return None
        if not for_moderator and doc.get("moderation_status") != ModerationStatus.VISIBLE:
            return None
        return doc

    @staticmethod
    def list_replies(discussion_id: str, skip: int = 0, limit: int = 50, for_moderator: bool = False):
        query = {"discussion_id": discussion_id, "deleted_at": None}
        if not for_moderator:
            query["moderation_status"] = ModerationStatus.VISIBLE
            
        return find_documents("replies", query, skip=skip, limit=limit, sort_by=[("created_at", 1)])

    @staticmethod
    def update_reply(user_id: str, doc_id: str, body: str) -> dict:
        doc = get_document("replies", doc_id)
        if not doc or doc.get("deleted_at"):
            raise ValidationError("Reply not found.")
            
        if doc["author_user_id"] != user_id:
            raise ValidationError("You can only edit your own replies.")
            
        body = body.strip()
        if not body or len(body) > 10000:
            raise ValidationError("Invalid body.")
            
        update_document("replies", doc_id, {"body": body, "updated_at": utcnow()})
        return get_document("replies", doc_id)

    @staticmethod
    def delete_reply(user_id: str, doc_id: str):
        doc = get_document("replies", doc_id)
        if not doc or doc.get("deleted_at"):
            return
            
        if doc["author_user_id"] != user_id:
            raise ValidationError("You can only delete your own replies.")
            
        update_document("replies", doc_id, {"deleted_at": utcnow()})

class ModerationService:
    @staticmethod
    def report_content(user_id: str, target_type: str, target_id: str, reason: str, details: str = "") -> dict:
        if target_type not in [TargetType.DISCUSSION, TargetType.REPLY]:
            raise ValidationError("Invalid target type.")
            
        # Verify target exists
        if target_type == TargetType.DISCUSSION:
            target = get_document("discussions", target_id)
        else:
            target = get_document("replies", target_id)
            
        if not target or target.get("deleted_at"):
            raise ValidationError("Target not found.")
            
        # Prevent duplicate active reports
        existing = count_documents("reports", {
            "reporter_user_id": user_id,
            "target_type": target_type,
            "target_id": target_id,
            "status": {"$in": [ReportStatus.PENDING, ReportStatus.REVIEWED]}
        })
        if existing > 0:
            raise ValidationError("You already have an active report for this content.")
            
        doc_id = str(uuid.uuid4())
        doc = {
            "_id": doc_id,
            "reporter_user_id": user_id,
            "target_type": target_type,
            "target_id": target_id,
            "reason": reason[:100],
            "details": details[:1000],
            "status": ReportStatus.PENDING,
            "created_at": utcnow(),
            "resolved_at": None,
            "resolved_by_user_id": None,
            "resolution_note": None
        }
        
        insert_document("reports", doc)
        return doc

    @staticmethod
    def _create_audit(moderator_id: str, target_type: str, target_id: str, action: str, note: str = ""):
        doc = {
            "_id": str(uuid.uuid4()),
            "moderator_user_id": moderator_id,
            "target_type": target_type,
            "target_id": target_id,
            "action": action,
            "note": note,
            "created_at": utcnow()
        }
        insert_document("moderation_audits", doc)

    @staticmethod
    def hide_content(moderator_id: str, target_type: str, target_id: str, note: str = ""):
        collection = "discussions" if target_type == TargetType.DISCUSSION else "replies"
        target = get_document(collection, target_id)
        if not target:
            raise ValidationError("Target not found.")
            
        update_document(collection, target_id, {"moderation_status": ModerationStatus.HIDDEN})
        ModerationService._create_audit(moderator_id, target_type, target_id, ModerationAction.HIDE, note)

    @staticmethod
    def restore_content(moderator_id: str, target_type: str, target_id: str, note: str = ""):
        collection = "discussions" if target_type == TargetType.DISCUSSION else "replies"
        target = get_document(collection, target_id)
        if not target:
            raise ValidationError("Target not found.")
            
        update_document(collection, target_id, {"moderation_status": ModerationStatus.VISIBLE})
        ModerationService._create_audit(moderator_id, target_type, target_id, ModerationAction.RESTORE, note)

    @staticmethod
    def resolve_report(moderator_id: str, report_id: str, action: str, note: str = "") -> dict:
        # action is RESOLVE or DISMISS
        report = get_document("reports", report_id)
        if not report:
            raise ValidationError("Report not found.")
            
        if action not in [ReportStatus.RESOLVED, ReportStatus.DISMISSED]:
            raise ValidationError("Invalid resolution action.")
            
        updates = {
            "status": action,
            "resolved_at": utcnow(),
            "resolved_by_user_id": moderator_id,
            "resolution_note": note
        }
        
        update_document("reports", report_id, updates)
        
        audit_action = ModerationAction.RESOLVE_REPORT if action == ReportStatus.RESOLVED else ModerationAction.DISMISS_REPORT
        ModerationService._create_audit(moderator_id, report["target_type"], report["target_id"], audit_action, note)
        
        return get_document("reports", report_id)

    @staticmethod
    def get_report(report_id: str) -> dict:
        return get_document("reports", report_id)

    @staticmethod
    def list_reports(filters: dict = None, skip: int = 0, limit: int = 50):
        query = {}
        if filters:
            if "status" in filters:
                query["status"] = filters["status"]
            if "target_type" in filters:
                query["target_type"] = filters["target_type"]
                
        return find_documents("reports", query, skip=skip, limit=limit, sort_by=[("created_at", -1)])
