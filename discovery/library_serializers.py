"""
Library API serializers — response representation for favorites and shelves.

All serializers are read-only (output only).
"""

from rest_framework import serializers

from .library_repository import READING_STATUSES


class BookSnippetSerializer(serializers.Serializer):
    """Compact book snippet embedded in library responses.

    Only the fields needed for a shelf card are included.
    Full detail is available via GET /api/books/<id>/.
    """
    id = serializers.CharField()
    title = serializers.CharField()
    authors = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    def get_authors(self, obj):
        return [a.get("name", "") for a in (obj.get("authors") or [])]

    def get_cover_url(self, obj):
        covers = obj.get("covers") or []
        return covers[0].get("url") if covers else None


class LibraryEntrySerializer(serializers.Serializer):
    """Full library entry — shelf status + favorited flag + book snippet."""
    id = serializers.CharField()
    book_id = serializers.CharField()
    status = serializers.CharField()
    favorited = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    # Embedded book snippet — populated by the service layer.
    book = serializers.SerializerMethodField()

    def get_book(self, obj):
        book_doc = obj.get("_book")
        if not book_doc:
            return {"id": obj.get("book_id"), "title": "", "authors": [], "cover_url": None}
        return BookSnippetSerializer(book_doc).data


class FavoriteSerializer(serializers.Serializer):
    """Serializer for a single favorite entry."""
    id = serializers.CharField()
    book_id = serializers.CharField()
    created_at = serializers.DateTimeField()
    book = serializers.SerializerMethodField()

    def get_book(self, obj):
        book_doc = obj.get("_book")
        if not book_doc:
            return {"id": obj.get("book_id"), "title": "", "authors": [], "cover_url": None}
        return BookSnippetSerializer(book_doc).data


class ImportRequestSerializer(serializers.Serializer):
    """Validates a POST /api/books/import/ request body."""
    provider = serializers.CharField(max_length=64)
    external_id = serializers.CharField(max_length=256)

    def validate_provider(self, value):
        return value.strip().lower()

    def validate_external_id(self, value):
        v = value.strip()
        if not v:
            raise serializers.ValidationError("external_id must not be blank.")
        return v


class LibraryAddSerializer(serializers.Serializer):
    """Validates POST /api/library/<book_id>/ body."""
    status = serializers.ChoiceField(choices=list(READING_STATUSES))


class LibraryUpdateSerializer(serializers.Serializer):
    """Validates PATCH /api/library/<book_id>/ body."""
    status = serializers.ChoiceField(choices=list(READING_STATUSES))
