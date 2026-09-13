from rest_framework import serializers

class RecommendationBookSerializer(serializers.Serializer):
    """Serializer for recommended books, extending standard book shape with explanations."""

    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    authors = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        read_only=True,
    )
    description = serializers.CharField(read_only=True, allow_null=True)
    covers = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        read_only=True,
    )
    subjects = serializers.ListField(child=serializers.CharField(), read_only=True)
    recommendation_reason = serializers.CharField(read_only=True)

class RecommendationResponseSerializer(serializers.Serializer):
    """Paginated recommendation list."""

    count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    results = RecommendationBookSerializer(many=True)

class ExternalLinksSerializer(serializers.Serializer):
    """Serializer for external resource links mapping."""
    
    google_books = serializers.URLField(read_only=True, required=False)
    open_library = serializers.URLField(read_only=True, required=False)
    goodreads = serializers.URLField(read_only=True, required=False)
