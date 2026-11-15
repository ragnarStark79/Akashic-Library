from rest_framework import serializers
from accounts.models import User
from community.repository import count_documents
from community.constants import ModerationStatus
from discovery.repository import get_book_by_id


class DiscussionAuthorSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    display_name = serializers.CharField(default="")


class DiscussionBookSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    authors = serializers.ListField(child=serializers.CharField(), default=list)
    cover_url = serializers.CharField(allow_null=True, required=False)


class DiscussionSerializer(serializers.Serializer):
    id = serializers.CharField(source="_id", read_only=True)
    book_id = serializers.CharField(required=False, allow_null=True)
    topic_type = serializers.CharField(required=False, default="GENERAL")
    author_user_id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=255)
    body = serializers.CharField(max_length=10000)
    created_at = serializers.FloatField(read_only=True)
    updated_at = serializers.FloatField(read_only=True)
    moderation_status = serializers.CharField(read_only=True)
    author = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    book = serializers.SerializerMethodField()

    def get_author(self, obj):
        author_id = obj.get("author_user_id")
        if not author_id:
            return {"id": "", "username": "Reader", "display_name": "Akashic Reader"}
        try:
            u = User.objects.filter(id=author_id).first()
            if u:
                return {
                    "id": str(u.id),
                    "username": u.username,
                    "display_name": getattr(u, "display_name", "") or u.username,
                }
        except Exception:
            pass
        return {"id": str(author_id), "username": "Reader", "display_name": "Akashic Patron"}

    def get_reply_count(self, obj):
        doc_id = obj.get("_id") or obj.get("id")
        if not doc_id:
            return 0
        try:
            return count_documents("replies", {
                "discussion_id": str(doc_id),
                "deleted_at": None,
                "moderation_status": ModerationStatus.VISIBLE,
            })
        except Exception:
            return 0

    def get_book(self, obj):
        book_id = obj.get("book_id")
        if not book_id:
            return None
        try:
            b = get_book_by_id(str(book_id))
            if b:
                return {
                    "id": str(b.get("_id")),
                    "title": b.get("title", ""),
                    "authors": b.get("authors", []),
                    "cover_url": b.get("cover_url"),
                }
        except Exception:
            pass
        return None
    
class DiscussionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    body = serializers.CharField(max_length=10000, required=False)

class ReplySerializer(serializers.Serializer):
    id = serializers.CharField(source="_id", read_only=True)
    discussion_id = serializers.CharField(read_only=True)
    parent_id = serializers.CharField(required=False, allow_null=True)
    author_user_id = serializers.CharField(read_only=True)
    body = serializers.CharField(max_length=10000)
    book_id = serializers.CharField(required=False, allow_null=True)
    page_reference = serializers.CharField(required=False, allow_null=True)
    chapter_reference = serializers.CharField(required=False, allow_null=True)
    passage_excerpt = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.FloatField(read_only=True)
    updated_at = serializers.FloatField(read_only=True)
    moderation_status = serializers.CharField(read_only=True)
    author = serializers.SerializerMethodField()

    def get_author(self, obj):
        author_id = obj.get("author_user_id")
        if not author_id:
            return {"id": "", "username": "Reader", "display_name": "Akashic Reader"}
        try:
            u = User.objects.filter(id=author_id).first()
            if u:
                return {
                    "id": str(u.id),
                    "username": u.username,
                    "display_name": getattr(u, "display_name", "") or u.username,
                }
        except Exception:
            pass
        return {"id": str(author_id), "username": "Reader", "display_name": "Akashic Patron"}

class ReplyCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=10000, required=True)
    parent_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    book_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    page_reference = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    chapter_reference = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    passage_excerpt = serializers.CharField(max_length=1000, required=False, allow_null=True, allow_blank=True)

class ReplyUpdateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=10000, required=False)
    page_reference = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    chapter_reference = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    passage_excerpt = serializers.CharField(max_length=1000, required=False, allow_null=True, allow_blank=True)

class ReportSerializer(serializers.Serializer):
    id = serializers.CharField(source="_id", read_only=True)
    reporter_user_id = serializers.CharField(read_only=True)
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    reason = serializers.CharField(max_length=100)
    details = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.FloatField(read_only=True)
    resolved_at = serializers.FloatField(read_only=True)
    resolved_by_user_id = serializers.CharField(read_only=True)
    resolution_note = serializers.CharField(read_only=True)

    # Contextual fields for moderation
    target_content = serializers.SerializerMethodField()
    target_title = serializers.SerializerMethodField()
    target_author = serializers.SerializerMethodField()
    target_status = serializers.SerializerMethodField()
    context = serializers.SerializerMethodField()

    def _get_target_details(self, obj):
        if not hasattr(self, "_cached_details"):
            self._cached_details = {}
        target_id = obj.get("target_id")
        target_type = obj.get("target_type")
        key = f"{target_type}:{target_id}"
        if key not in self._cached_details:
            from .services import ModerationService
            self._cached_details[key] = ModerationService.get_target_details(target_type, target_id)
        return self._cached_details[key]

    def get_target_content(self, obj):
        return self._get_target_details(obj).get("target_content", "")

    def get_target_title(self, obj):
        return self._get_target_details(obj).get("target_title", "")

    def get_target_author(self, obj):
        return self._get_target_details(obj).get("target_author", {})

    def get_target_status(self, obj):
        return self._get_target_details(obj).get("target_status", "VISIBLE")

    def get_context(self, obj):
        ctx = obj.get("context") or {}
        target_ctx = self._get_target_details(obj).get("context") or {}
        merged = {**target_ctx, **ctx}
        return merged
    
class ModerationActionSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    report_id = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)

class ReportResolutionSerializer(serializers.Serializer):
    action = serializers.CharField() # RESOLVED or DISMISSED
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)

class ModerationAuditSerializer(serializers.Serializer):
    id = serializers.CharField(source="_id", read_only=True)
    moderator_user_id = serializers.CharField(read_only=True)
    moderator_display_name = serializers.SerializerMethodField()
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    report_id = serializers.CharField(required=False, allow_null=True)
    action = serializers.CharField()
    note = serializers.CharField(read_only=True)
    created_at = serializers.FloatField(read_only=True)

    def get_moderator_display_name(self, obj):
        mod_id = obj.get("moderator_user_id")
        if not mod_id:
            return "Curator"
        try:
            from accounts.models import User
            u = User.objects.filter(id=mod_id).first()
            if u:
                return getattr(u, "display_name", "") or u.username
        except Exception:
            pass
        return "Curator"
