"""
Annotations API Serializers — request validation and response representations.

Input serializers:
  - AnnotationCreateSerializer: content, visibility (default "PRIVATE"), page_reference,
    chapter_reference, passage_excerpt.
  - AnnotationUpdateSerializer: optional updates to above fields.

NEVER accepted from client:
  - user_id (derived strictly from request.user)
  - book_id (derived from URL path)
  - id, created_at, updated_at

Output serializers embed safe author info (id, username, display_name).
Passwords, emails, session tokens are NEVER exposed.
"""

from rest_framework import serializers

from .annotations_repository import VALID_VISIBILITIES, VISIBILITY_PRIVATE


class AnnotationAuthorSerializer(serializers.Serializer):
    """Safe user info embedded in annotation responses."""
    id = serializers.CharField()
    username = serializers.CharField()
    display_name = serializers.CharField(default="")


class AnnotationDetailSerializer(serializers.Serializer):
    """Full annotation response."""
    id = serializers.CharField()
    book_id = serializers.CharField()
    user_id = serializers.CharField()
    content = serializers.CharField()
    visibility = serializers.CharField()
    page_reference = serializers.CharField(allow_null=True, required=False, default=None)
    chapter_reference = serializers.CharField(allow_null=True, required=False, default=None)
    passage_excerpt = serializers.CharField(allow_null=True, required=False, default=None)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    author = serializers.SerializerMethodField()

    def get_author(self, obj):
        author_obj = obj.get("_author")
        if author_obj is None:
            return {"id": obj.get("user_id"), "username": "Reader", "display_name": ""}
        return AnnotationAuthorSerializer(author_obj).data


class AnnotationCreateSerializer(serializers.Serializer):
    """Validates POST /api/books/<book_id>/annotations/ payload."""
    content = serializers.CharField(required=True, min_length=1, max_length=5000)
    visibility = serializers.ChoiceField(
        choices=list(VALID_VISIBILITIES),
        default=VISIBILITY_PRIVATE,
        required=False,
    )
    page_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
        default=None,
    )
    chapter_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=150,
        default=None,
    )
    passage_excerpt = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=1000,
        default=None,
    )


class AnnotationUpdateSerializer(serializers.Serializer):
    """Validates PATCH /api/books/<book_id>/annotations/<annotation_id>/ payload."""
    content = serializers.CharField(required=False, min_length=1, max_length=5000)
    visibility = serializers.ChoiceField(choices=list(VALID_VISIBILITIES), required=False)
    page_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )
    chapter_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=150,
    )
    passage_excerpt = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=1000,
    )

