from rest_framework import serializers

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
    
class DiscussionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    body = serializers.CharField(max_length=10000, required=False)

class ReplySerializer(serializers.Serializer):
    id = serializers.CharField(source="_id", read_only=True)
    discussion_id = serializers.CharField(read_only=True)
    author_user_id = serializers.CharField(read_only=True)
    body = serializers.CharField(max_length=10000)
    created_at = serializers.FloatField(read_only=True)
    updated_at = serializers.FloatField(read_only=True)
    moderation_status = serializers.CharField(read_only=True)

class ReplyUpdateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=10000, required=True)

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
    
class ModerationActionSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)

class ReportResolutionSerializer(serializers.Serializer):
    action = serializers.CharField() # RESOLVED or DISMISSED
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)
