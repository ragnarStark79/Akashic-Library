import uuid
import re
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
            if "book_id" in filters and filters["book_id"]:
                query["book_id"] = filters["book_id"]
            if "topic_type" in filters and filters["topic_type"] and filters["topic_type"] != "ALL":
                query["topic_type"] = filters["topic_type"]
            if "author_user_id" in filters and filters["author_user_id"]:
                query["author_user_id"] = filters["author_user_id"]
            if "q" in filters and filters["q"]:
                q_val = str(filters["q"]).strip()
                if q_val:
                    query["$or"] = [
                        {"title": {"$regex": re.escape(q_val), "$options": "i"}},
                        {"body": {"$regex": re.escape(q_val), "$options": "i"}}
                    ]
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
    def create_reply(
        user_id: str,
        discussion_id: str,
        body: str,
        parent_id: str = None,
        book_id: str = None,
        page_reference: str = None,
        chapter_reference: str = None,
        passage_excerpt: str = None,
    ) -> dict:
        body = body.strip() if body else ""
        if not body:
            raise ValidationError("Body is required.")
        if len(body) > 10000:
            raise ValidationError("Body is too long.")
            
        discussion = CommunityService.get_discussion(discussion_id)
        if not discussion:
            raise ValidationError("Discussion not found or hidden.")

        # If parent_id provided, validate parent reply
        if parent_id:
            parent = get_document("replies", parent_id)
            if not parent or parent.get("deleted_at") is not None:
                raise ValidationError("Parent reply not found.")
            if str(parent.get("discussion_id")) != str(discussion_id):
                raise ValidationError("Parent reply does not belong to this discussion.")
            if parent.get("moderation_status") != ModerationStatus.VISIBLE:
                raise ValidationError("Parent reply not found or hidden.")
            # Enforce 1-level nesting maximum: parent must not be a nested reply itself
            if parent.get("parent_id"):
                raise ValidationError("Nested responses cannot exceed 1 level of nesting.")

        # Validate citation fields if present
        if page_reference:
            page_reference = page_reference.strip()
            if len(page_reference) > 50:
                raise ValidationError("Page reference is too long (max 50 characters).")
        else:
            page_reference = None

        if chapter_reference:
            chapter_reference = chapter_reference.strip()
            if len(chapter_reference) > 100:
                raise ValidationError("Chapter reference is too long (max 100 characters).")
        else:
            chapter_reference = None

        if passage_excerpt:
            passage_excerpt = passage_excerpt.strip()
            if len(passage_excerpt) > 1000:
                raise ValidationError("Passage excerpt is too long (max 1000 characters).")
        else:
            passage_excerpt = None
            
        AntiSpamService.check_rate_limit(user_id)

        doc_id = str(uuid.uuid4())
        now = utcnow()
        
        doc = {
            "_id": doc_id,
            "discussion_id": discussion_id,
            "parent_id": parent_id or None,
            "author_user_id": user_id,
            "body": body,
            "book_id": book_id or discussion.get("book_id"),
            "page_reference": page_reference,
            "chapter_reference": chapter_reference,
            "passage_excerpt": passage_excerpt,
            "created_at": now,
            "updated_at": now,
            "moderation_status": ModerationStatus.VISIBLE,
            "deleted_at": None,
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
    def update_reply(
        user_id: str,
        doc_id: str,
        body: str = None,
        page_reference: str = None,
        chapter_reference: str = None,
        passage_excerpt: str = None,
    ) -> dict:
        doc = get_document("replies", doc_id)
        if not doc or doc.get("deleted_at"):
            raise ValidationError("Reply not found.")
            
        if doc["author_user_id"] != user_id:
            raise ValidationError("You can only edit your own replies.")
            
        updates = {"updated_at": utcnow()}

        if body is not None:
            body = body.strip()
            if not body or len(body) > 10000:
                raise ValidationError("Invalid body.")
            updates["body"] = body

        if page_reference is not None:
            page_reference = page_reference.strip()
            if len(page_reference) > 50:
                raise ValidationError("Page reference is too long (max 50 characters).")
            updates["page_reference"] = page_reference or None

        if chapter_reference is not None:
            chapter_reference = chapter_reference.strip()
            if len(chapter_reference) > 100:
                raise ValidationError("Chapter reference is too long (max 100 characters).")
            updates["chapter_reference"] = chapter_reference or None

        if passage_excerpt is not None:
            passage_excerpt = passage_excerpt.strip()
            if len(passage_excerpt) > 1000:
                raise ValidationError("Passage excerpt is too long (max 1000 characters).")
            updates["passage_excerpt"] = passage_excerpt or None
            
        update_document("replies", doc_id, updates)
        return get_document("replies", doc_id)

    @staticmethod
    def delete_reply(user_id: str, doc_id: str):
        doc = get_document("replies", doc_id)
        if not doc or doc.get("deleted_at"):
            return
            
        if doc["author_user_id"] != user_id:
            raise ValidationError("You can only delete your own replies.")
            
        now = utcnow()
        update_document("replies", doc_id, {"deleted_at": now})
        # Cascade soft-delete any child responses under this reply
        from .repository import _get_collection
        _get_collection("replies").update_many(
            {"parent_id": doc_id, "deleted_at": None},
            {"$set": {"deleted_at": now}}
        )

class ModerationService:
    @staticmethod
    def get_target_details(target_type: str, target_id: str) -> dict:
        norm_type = (target_type or "").strip().upper()
        if norm_type == "DISCUSSION_REPLY":
            norm_type = TargetType.REPLY

        details = {
            "target_type": norm_type,
            "target_id": target_id,
            "target_content": "",
            "target_title": "",
            "target_author": {"id": "", "username": "Patron", "display_name": "Akashic Patron"},
            "target_status": ModerationStatus.VISIBLE,
            "context": {},
        }

        try:
            if norm_type == TargetType.DISCUSSION:
                doc = get_document("discussions", target_id)
                if doc:
                    details["target_title"] = doc.get("title", "")
                    details["target_content"] = doc.get("body", "")[:500]
                    details["target_status"] = doc.get("moderation_status", ModerationStatus.VISIBLE)
                    details["target_author"] = ModerationService._resolve_user(doc.get("author_user_id"))
                    book_id = doc.get("book_id")
                    if book_id:
                        details["context"]["book_id"] = book_id
                        try:
                            b = get_book_by_id(book_id)
                            if b:
                                details["context"]["book_title"] = b.get("title")
                        except Exception:
                            pass

            elif norm_type == TargetType.REPLY:
                doc = get_document("replies", target_id)
                if doc:
                    details["target_content"] = doc.get("body", "")[:500]
                    details["target_status"] = doc.get("moderation_status", ModerationStatus.VISIBLE)
                    details["target_author"] = ModerationService._resolve_user(doc.get("author_user_id"))
                    details["context"]["discussion_id"] = doc.get("discussion_id")
                    if doc.get("parent_id"):
                        details["context"]["parent_reply_id"] = doc.get("parent_id")
                    book_id = doc.get("book_id")
                    if book_id:
                        details["context"]["book_id"] = book_id

            elif norm_type == TargetType.REVIEW:
                from discovery.reviews_repository import _get_col
                from bson import ObjectId, errors
                try:
                    col = _get_col()
                    doc = col.find_one({"_id": ObjectId(target_id)})
                    if doc:
                        rating = doc.get("rating", 5)
                        details["target_title"] = doc.get("title") or f"{rating} Star Review"
                        details["target_content"] = doc.get("body", "")[:500]
                        mod_st = doc.get("moderation_status", "APPROVED")
                        details["target_status"] = ModerationStatus.HIDDEN if mod_st in ["REJECTED", "HIDDEN"] else ModerationStatus.VISIBLE
                        details["target_author"] = ModerationService._resolve_user(doc.get("user_id"))
                        book_id = doc.get("book_id")
                        if book_id:
                            details["context"]["book_id"] = book_id
                            try:
                                b = get_book_by_id(book_id)
                                if b:
                                    details["context"]["book_title"] = b.get("title")
                            except Exception:
                                pass
                except Exception:
                    pass

            elif norm_type == TargetType.REVIEW_REPLY:
                from discovery.reviews_repository import _get_replies_col
                from bson import ObjectId, errors
                try:
                    col = _get_replies_col()
                    doc = col.find_one({"_id": ObjectId(target_id)})
                    if doc:
                        details["target_content"] = doc.get("body", "")[:500]
                        mod_st = doc.get("moderation_status", "VISIBLE")
                        details["target_status"] = ModerationStatus.HIDDEN if mod_st == "HIDDEN" else ModerationStatus.VISIBLE
                        details["target_author"] = ModerationService._resolve_user(doc.get("user_id"))
                        details["context"]["review_id"] = doc.get("review_id")
                        book_id = doc.get("book_id")
                        if book_id:
                            details["context"]["book_id"] = book_id
                except Exception:
                    pass

            elif norm_type == TargetType.ANNOTATION:
                from discovery.annotations_repository import _get_collection, VISIBILITY_SHARED
                from bson import ObjectId, errors
                try:
                    col = _get_collection()
                    doc = col.find_one({"_id": ObjectId(target_id)})
                    if doc:
                        if doc.get("visibility") == VISIBILITY_SHARED:
                            details["target_content"] = doc.get("content", "")[:500]
                            mod_st = doc.get("moderation_status", "VISIBLE")
                            details["target_status"] = ModerationStatus.HIDDEN if mod_st == "HIDDEN" else ModerationStatus.VISIBLE
                            details["target_author"] = ModerationService._resolve_user(doc.get("user_id"))
                            book_id = doc.get("book_id")
                            if book_id:
                                details["context"]["book_id"] = book_id
                                try:
                                    b = get_book_by_id(book_id)
                                    if b:
                                        details["context"]["book_title"] = b.get("title")
                                except Exception:
                                    pass
                        else:
                            details["target_content"] = "[Private Content - Redacted]"
                            details["target_status"] = "PRIVATE"
                except Exception:
                    pass

        except Exception:
            pass

        return details

    @staticmethod
    def _resolve_user(user_id: str) -> dict:
        if not user_id:
            return {"id": "", "username": "Patron", "display_name": "Akashic Patron"}
        try:
            from accounts.models import User
            u = User.objects.filter(id=user_id).first()
            if u:
                return {
                    "id": str(u.id),
                    "username": u.username,
                    "display_name": getattr(u, "display_name", "") or u.username,
                }
        except Exception:
            pass
        return {"id": str(user_id), "username": "Patron", "display_name": "Akashic Patron"}

    @staticmethod
    def report_content(user_id: str, target_type: str, target_id: str, reason: str, details: str = "") -> dict:
        reason = (reason or "").strip()
        if not reason:
            raise ValidationError("Reason is required.")
        if len(reason) > 100:
            raise ValidationError("Reason is too long (max 100 characters).")

        details = (details or "").strip()
        if len(details) > 1000:
            raise ValidationError("Details is too long (max 1000 characters).")

        norm_type = (target_type or "").strip().upper()
        if norm_type == "DISCUSSION_REPLY":
            norm_type = TargetType.REPLY

        if norm_type not in TargetType.CHOICES:
            raise ValidationError(f"Invalid target type '{target_type}'. Must be one of: {', '.join(TargetType.CHOICES)}")

        target_author_id = None
        context_info = {}

        if norm_type == TargetType.DISCUSSION:
            target = get_document("discussions", target_id)
            if not target or target.get("deleted_at") or target.get("moderation_status") == ModerationStatus.HIDDEN:
                raise ValidationError("Target not found or already hidden.")
            target_author_id = target.get("author_user_id")
            context_info = {"book_id": target.get("book_id"), "title": target.get("title")}

        elif norm_type == TargetType.REPLY:
            target = get_document("replies", target_id)
            if not target or target.get("deleted_at") or target.get("moderation_status") == ModerationStatus.HIDDEN:
                raise ValidationError("Target not found or already hidden.")
            target_author_id = target.get("author_user_id")
            context_info = {"discussion_id": target.get("discussion_id"), "book_id": target.get("book_id")}

        elif norm_type == TargetType.REVIEW:
            from discovery.reviews_repository import _get_col
            from bson import ObjectId, errors
            try:
                col = _get_col()
                target = col.find_one({"_id": ObjectId(target_id)})
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid review ID.")
            if not target or target.get("moderation_status") in ["REJECTED", "HIDDEN"]:
                raise ValidationError("Target not found or already hidden.")
            target_author_id = target.get("user_id")
            context_info = {"book_id": target.get("book_id"), "title": target.get("title")}

        elif norm_type == TargetType.REVIEW_REPLY:
            from discovery.reviews_repository import _get_replies_col
            from bson import ObjectId, errors
            try:
                col = _get_replies_col()
                target = col.find_one({"_id": ObjectId(target_id)})
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid review reply ID.")
            if not target or target.get("moderation_status") in ["HIDDEN", "REJECTED"]:
                raise ValidationError("Target not found or already hidden.")
            target_author_id = target.get("user_id")
            context_info = {"review_id": target.get("review_id"), "book_id": target.get("book_id")}

        elif norm_type == TargetType.ANNOTATION:
            from discovery.annotations_repository import _get_collection, VISIBILITY_SHARED
            from bson import ObjectId, errors
            try:
                col = _get_collection()
                target = col.find_one({"_id": ObjectId(target_id)})
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid annotation ID.")
            if not target or target.get("moderation_status") in ["HIDDEN", "REJECTED"]:
                raise ValidationError("Target not found or already hidden.")
            if target.get("visibility") != VISIBILITY_SHARED:
                raise ValidationError("Private annotations cannot be reported.")
            target_author_id = target.get("user_id")
            context_info = {"book_id": target.get("book_id")}

        # Self-reporting prevention
        if target_author_id and str(target_author_id) == str(user_id):
            raise ValidationError("You cannot report your own content.")

        # Prevent duplicate active reports
        existing = count_documents("reports", {
            "reporter_user_id": str(user_id),
            "target_type": norm_type,
            "target_id": str(target_id),
            "status": {"$in": ReportStatus.ACTIVE_STATUSES}
        })
        if existing > 0:
            raise ValidationError("You already have an active report for this content.")

        # Rate limiting check (max 10 reports per 60s)
        cutoff = utcnow() - 60
        recent = count_documents("reports", {
            "reporter_user_id": str(user_id),
            "created_at": {"$gte": cutoff}
        })
        if recent >= 10:
            raise ValidationError("You are reporting too frequently. Please wait a moment.")

        doc_id = str(uuid.uuid4())
        doc = {
            "_id": doc_id,
            "reporter_user_id": str(user_id),
            "target_type": norm_type,
            "target_id": str(target_id),
            "target_author_id": str(target_author_id) if target_author_id else None,
            "reason": reason[:100],
            "details": details[:1000],
            "context": context_info,
            "status": ReportStatus.PENDING,
            "created_at": utcnow(),
            "resolved_at": None,
            "resolved_by_user_id": None,
            "resolution_note": None
        }

        insert_document("reports", doc)
        return doc

    @staticmethod
    def _create_audit(moderator_id: str, target_type: str, target_id: str, action: str, note: str = "", report_id: str = None):
        doc = {
            "_id": str(uuid.uuid4()),
            "moderator_user_id": str(moderator_id),
            "target_type": target_type,
            "target_id": str(target_id),
            "report_id": str(report_id) if report_id else None,
            "action": action,
            "note": note,
            "created_at": utcnow()
        }
        insert_document("moderation_audits", doc)

    @staticmethod
    def hide_content(moderator_id: str, target_type: str, target_id: str, note: str = "", report_id: str = None):
        norm_type = (target_type or "").strip().upper()
        if norm_type == "DISCUSSION_REPLY":
            norm_type = TargetType.REPLY

        if norm_type == TargetType.DISCUSSION:
            target = get_document("discussions", target_id)
            if not target:
                raise ValidationError("Target not found.")
            prev_status = target.get("moderation_status", ModerationStatus.VISIBLE)
            update_document("discussions", target_id, {
                "moderation_status": ModerationStatus.HIDDEN,
                "previous_moderation_status": prev_status
            })
        elif norm_type == TargetType.REPLY:
            target = get_document("replies", target_id)
            if not target:
                raise ValidationError("Target not found.")
            prev_status = target.get("moderation_status", ModerationStatus.VISIBLE)
            update_document("replies", target_id, {
                "moderation_status": ModerationStatus.HIDDEN,
                "previous_moderation_status": prev_status
            })
        elif norm_type == TargetType.REVIEW:
            from discovery.reviews_repository import _get_col
            from bson import ObjectId, errors
            try:
                col = _get_col()
                oid = ObjectId(target_id)
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid review ID.")
            target = col.find_one({"_id": oid})
            if not target:
                raise ValidationError("Target not found.")
            prev_status = target.get("moderation_status", "APPROVED")
            col.update_one(
                {"_id": oid},
                {"$set": {"moderation_status": "REJECTED", "previous_moderation_status": prev_status}}
            )
        elif norm_type == TargetType.REVIEW_REPLY:
            from discovery.reviews_repository import _get_replies_col
            from bson import ObjectId, errors
            try:
                col = _get_replies_col()
                oid = ObjectId(target_id)
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid reply ID.")
            target = col.find_one({"_id": oid})
            if not target:
                raise ValidationError("Target not found.")
            prev_status = target.get("moderation_status", "VISIBLE")
            col.update_one(
                {"_id": oid},
                {"$set": {"moderation_status": "HIDDEN", "previous_moderation_status": prev_status}}
            )
        elif norm_type == TargetType.ANNOTATION:
            from discovery.annotations_repository import _get_collection
            from bson import ObjectId, errors
            try:
                col = _get_collection()
                oid = ObjectId(target_id)
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid annotation ID.")
            target = col.find_one({"_id": oid})
            if not target:
                raise ValidationError("Target not found.")
            prev_status = target.get("moderation_status", "VISIBLE")
            col.update_one(
                {"_id": oid},
                {"$set": {"moderation_status": "HIDDEN", "previous_moderation_status": prev_status}}
            )
        else:
            raise ValidationError(f"Invalid target type '{target_type}'.")

        ModerationService._create_audit(moderator_id, norm_type, target_id, ModerationAction.HIDE, note, report_id=report_id)

    @staticmethod
    def restore_content(moderator_id: str, target_type: str, target_id: str, note: str = "", report_id: str = None):
        norm_type = (target_type or "").strip().upper()
        if norm_type == "DISCUSSION_REPLY":
            norm_type = TargetType.REPLY

        if norm_type == TargetType.DISCUSSION:
            target = get_document("discussions", target_id)
            if not target:
                raise ValidationError("Target not found.")
            restored_status = target.get("previous_moderation_status", ModerationStatus.VISIBLE)
            update_document("discussions", target_id, {
                "moderation_status": restored_status,
                "previous_moderation_status": None
            })
        elif norm_type == TargetType.REPLY:
            target = get_document("replies", target_id)
            if not target:
                raise ValidationError("Target not found.")
            restored_status = target.get("previous_moderation_status", ModerationStatus.VISIBLE)
            update_document("replies", target_id, {
                "moderation_status": restored_status,
                "previous_moderation_status": None
            })
        elif norm_type == TargetType.REVIEW:
            from discovery.reviews_repository import _get_col
            from bson import ObjectId, errors
            try:
                col = _get_col()
                oid = ObjectId(target_id)
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid review ID.")
            target = col.find_one({"_id": oid})
            if not target:
                raise ValidationError("Target not found.")
            restored_status = target.get("previous_moderation_status", "APPROVED")
            col.update_one(
                {"_id": oid},
                {"$set": {"moderation_status": restored_status}, "$unset": {"previous_moderation_status": ""}}
            )
        elif norm_type == TargetType.REVIEW_REPLY:
            from discovery.reviews_repository import _get_replies_col
            from bson import ObjectId, errors
            try:
                col = _get_replies_col()
                oid = ObjectId(target_id)
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid reply ID.")
            target = col.find_one({"_id": oid})
            if not target:
                raise ValidationError("Target not found.")
            restored_status = target.get("previous_moderation_status", "VISIBLE")
            col.update_one(
                {"_id": oid},
                {"$set": {"moderation_status": restored_status}, "$unset": {"previous_moderation_status": ""}}
            )
        elif norm_type == TargetType.ANNOTATION:
            from discovery.annotations_repository import _get_collection
            from bson import ObjectId, errors
            try:
                col = _get_collection()
                oid = ObjectId(target_id)
            except (errors.InvalidId, TypeError):
                raise ValidationError("Invalid annotation ID.")
            target = col.find_one({"_id": oid})
            if not target:
                raise ValidationError("Target not found.")
            restored_status = target.get("previous_moderation_status", "VISIBLE")
            col.update_one(
                {"_id": oid},
                {"$set": {"moderation_status": restored_status}, "$unset": {"previous_moderation_status": ""}}
            )
        else:
            raise ValidationError(f"Invalid target type '{target_type}'.")

        ModerationService._create_audit(moderator_id, norm_type, target_id, ModerationAction.RESTORE, note, report_id=report_id)

    @staticmethod
    def resolve_report(moderator_id: str, report_id: str, action: str, note: str = "") -> dict:
        report = get_document("reports", report_id)
        if not report:
            raise ValidationError("Report not found.")

        action_norm = (action or "").strip().upper()
        if action_norm not in [ReportStatus.RESOLVED, ReportStatus.DISMISSED]:
            raise ValidationError("Invalid resolution action. Must be RESOLVED or DISMISSED.")

        updates = {
            "status": action_norm,
            "resolved_at": utcnow(),
            "resolved_by_user_id": str(moderator_id),
            "resolution_note": (note or "").strip()[:1000]
        }

        update_document("reports", report_id, updates)

        audit_action = ModerationAction.RESOLVE_REPORT if action_norm == ReportStatus.RESOLVED else ModerationAction.DISMISS_REPORT
        ModerationService._create_audit(moderator_id, report["target_type"], report["target_id"], audit_action, note, report_id=report_id)

        return get_document("reports", report_id)

    @staticmethod
    def get_report(report_id: str) -> dict:
        return get_document("reports", report_id)

    @staticmethod
    def list_reports(filters: dict = None, skip: int = 0, limit: int = 50):
        query = {}
        if filters:
            if "status" in filters and filters["status"]:
                st = filters["status"].strip().upper()
                if st != "ALL":
                    query["status"] = st
            if "target_type" in filters and filters["target_type"]:
                tt = filters["target_type"].strip().upper()
                if tt != "ALL":
                    query["target_type"] = tt

        return find_documents("reports", query, skip=skip, limit=limit, sort_by=[("created_at", -1)])

    @staticmethod
    def list_audits(filters: dict = None, skip: int = 0, limit: int = 50):
        query = {}
        if filters:
            if "target_type" in filters and filters["target_type"]:
                query["target_type"] = filters["target_type"].strip().upper()
            if "target_id" in filters and filters["target_id"]:
                query["target_id"] = str(filters["target_id"])
            if "report_id" in filters and filters["report_id"]:
                query["report_id"] = str(filters["report_id"])
            if "action" in filters and filters["action"]:
                query["action"] = filters["action"].strip().upper()
        return find_documents("moderation_audits", query, skip=skip, limit=limit, sort_by=[("created_at", -1)])
