"""
Reviews API serializers — request validation and response representation.

Input serializers (create/update) enforce all rules:
  - rating: integer 1..5
  - body: required, max 10000 chars
  - title: optional, max 500 chars
  - contains_spoiler: bool, default False

NEVER accepted from client:
  - user_id
  - helpful_count
  - moderation_status
  - created_at / updated_at

Output serializers embed safe author info (id, username, display_name only).
Passwords, hashes, session tokens, or SECRET_KEY are NEVER exposed.
"""

from rest_framework import serializers

from .reviews_repository import MIN_RATING, MAX_RATING, MODERATION_STATUSES


# ─── Safe author representation ───────────────────────────────────────────────


class ReviewAuthorSerializer(serializers.Serializer):
    """Safe user info embedded in review responses.

    Only exposes: id (UUID), username, display_name.
    NEVER exposes: password, email, session, internal flags.
    """
    id = serializers.UUIDField()
    username = serializers.CharField()
    display_name = serializers.CharField(default="")


# ─── Review output ────────────────────────────────────────────────────────────


class ReviewDetailSerializer(serializers.Serializer):
    """Full review response (list and detail).

    The 'author' field is populated externally by the view layer,
    which looks up the Django User from PostgreSQL using the stored user_id.
    If the user no longer exists, author falls back to a minimal stub.
    """
    id = serializers.CharField()
    book_id = serializers.CharField()
    user_id = serializers.CharField()
    rating = serializers.IntegerField()
    title = serializers.CharField(allow_null=True, default=None)
    body = serializers.CharField()
    contains_spoiler = serializers.BooleanField()
    helpful_count = serializers.IntegerField()
    moderation_status = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    # Author embedded by the view layer.
    author = serializers.SerializerMethodField()

    def get_author(self, obj):
        author_obj = obj.get("_author")
        if author_obj is None:
            return {"id": obj.get("user_id"), "username": "[deleted]", "display_name": ""}
        return ReviewAuthorSerializer(author_obj).data


class AggregateRatingSerializer(serializers.Serializer):
    """Aggregate community rating for a book."""
    average_rating = serializers.FloatField(allow_null=True)
    rating_count = serializers.IntegerField()
    distribution = serializers.DictField(child=serializers.IntegerField())


# ─── Review input ─────────────────────────────────────────────────────────────


class ReviewCreateSerializer(serializers.Serializer):
    """Validates POST /api/books/<book_id>/reviews/ request body.

    Rejected fields (never accepted from client):
      user_id, helpful_count, moderation_status, created_at, updated_at
    """
    rating = serializers.IntegerField(
        min_value=MIN_RATING,
        max_value=MAX_RATING,
        help_text=f"Integer rating from {MIN_RATING} to {MAX_RATING}.",
    )
    body = serializers.CharField(
        min_length=1,
        max_length=10000,
        help_text="Review text (required, max 10000 characters).",
    )
    title = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        allow_null=True,
        default=None,
        help_text="Optional review headline (max 500 characters).",
    )
    contains_spoiler = serializers.BooleanField(
        default=False,
        required=False,
        help_text="Set to true if the review reveals plot details.",
    )

    def validate_body(self, value):
        """Strip surrounding whitespace; reject blank body."""
        stripped = (value or "").strip()
        if not stripped:
            raise serializers.ValidationError("Review body must not be blank.")
        return stripped

    def validate_title(self, value):
        """Strip; return None if empty."""
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ReviewUpdateSerializer(serializers.Serializer):
    """Validates PATCH /api/books/<book_id>/reviews/<id>/ request body.

    All fields optional — only provided fields are updated (PATCH semantics).

    Rejected fields (never accepted from client):
      user_id, helpful_count, moderation_status, created_at, updated_at
    """
    rating = serializers.IntegerField(
        min_value=MIN_RATING,
        max_value=MAX_RATING,
        required=False,
    )
    body = serializers.CharField(
        min_length=1,
        max_length=10000,
        required=False,
    )
    title = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    contains_spoiler = serializers.BooleanField(required=False)

    def validate_body(self, value):
        stripped = (value or "").strip()
        if not stripped:
            raise serializers.ValidationError("Review body must not be blank.")
        return stripped

    def validate_title(self, value):
        if value is None:
            return None
        return value.strip() or None
