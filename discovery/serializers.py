"""
Discovery API serializers — response representation for book data.

These serializers convert raw MongoDB document dicts to stable
frontend-friendly JSON shapes.  They are read-only (output only).
"""

from rest_framework import serializers


class AuthorSerializer(serializers.Serializer):
    """Author subdocument."""
    name = serializers.CharField(default="")


class BookListItemSerializer(serializers.Serializer):
    """Compact book representation for GET /api/books/ list responses."""
    id = serializers.CharField()
    title = serializers.CharField()
    authors = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    language = serializers.SerializerMethodField()
    published_date = serializers.SerializerMethodField()
    # Placeholders for future features — always empty/null until those systems exist.
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    in_store = serializers.SerializerMethodField()

    def get_authors(self, obj):
        return [a.get("name", "") for a in (obj.get("authors") or [])]

    def get_cover_url(self, obj):
        covers = obj.get("covers") or []
        return covers[0].get("url") if covers else None

    def get_language(self, obj):
        return (obj.get("publication") or {}).get("language")

    def get_published_date(self, obj):
        return (obj.get("publication") or {}).get("published_date")

    def get_rating(self, obj):
        """Average community rating from Akashic Library reviews."""
        try:
            from .reviews_repository import get_aggregate_rating
            agg = get_aggregate_rating(obj["id"])
            return agg["average_rating"]
        except Exception:
            return None

    def get_review_count(self, obj):
        """Number of approved reviews from Akashic Library community."""
        try:
            from .reviews_repository import get_aggregate_rating
            agg = get_aggregate_rating(obj["id"])
            return agg["rating_count"]
        except Exception:
            return 0

    def get_in_store(self, obj):
        store_info = obj.get("store") or {}
        return store_info.get("available", False)


class IdentifierSerializer(serializers.Serializer):
    isbn10 = serializers.CharField(allow_null=True, default=None)
    isbn13 = serializers.CharField(allow_null=True, default=None)


class PublicationSerializer(serializers.Serializer):
    publisher = serializers.CharField(allow_null=True, default=None)
    published_date = serializers.CharField(allow_null=True, default=None)
    language = serializers.CharField(allow_null=True, default=None)
    page_count = serializers.IntegerField(allow_null=True, default=None)


class BookDetailSerializer(serializers.Serializer):
    """Full book representation for GET /api/books/<id>/ detail responses."""
    id = serializers.CharField()
    title = serializers.CharField()
    authors = serializers.SerializerMethodField()
    description = serializers.CharField(allow_null=True, default=None)
    identifiers = serializers.SerializerMethodField()
    publication = serializers.SerializerMethodField()
    subjects = serializers.ListField(child=serializers.CharField(), default=list)
    covers = serializers.SerializerMethodField()
    # Placeholders — null/empty until future steps add these systems.
    community = serializers.SerializerMethodField()
    store = serializers.SerializerMethodField()

    def get_authors(self, obj):
        return [a.get("name", "") for a in (obj.get("authors") or [])]

    def get_identifiers(self, obj):
        ids = obj.get("identifiers") or {}
        return IdentifierSerializer(ids).data

    def get_publication(self, obj):
        pub = obj.get("publication") or {}
        return PublicationSerializer(pub).data

    def get_covers(self, obj):
        return [c.get("url") for c in (obj.get("covers") or []) if c.get("url")]

    def get_community(self, obj):
        """Aggregate community rating — Akashic Library reviews only."""
        try:
            from .reviews_repository import get_aggregate_rating
            agg = get_aggregate_rating(obj["id"])
            return {
                "average_rating": agg["average_rating"],
                "rating_count": agg["rating_count"],
                "distribution": agg["distribution"],
            }
        except Exception:
            return {"average_rating": None, "rating_count": 0, "distribution": {}}

    def get_store(self, obj):
        store_info = obj.get("store") or {}
        return {
            "available": store_info.get("available", False),
            "product_id": store_info.get("product_id")
        }
