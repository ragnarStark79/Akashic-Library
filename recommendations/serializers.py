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

class AccessOptionSerializer(serializers.Serializer):
    """Serializer for a single verified legal access option."""
    type = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    provider = serializers.CharField(read_only=True)
    url = serializers.URLField(read_only=True, allow_null=True, required=False)
    availability = serializers.CharField(read_only=True, allow_null=True, required=False)
    jurisdiction = serializers.CharField(read_only=True, allow_null=True, required=False)
    description = serializers.CharField(read_only=True, allow_null=True, required=False)

class ExternalLinksSerializer(serializers.Serializer):
    """Serializer for external resource links mapping and access options."""
    
    google_books = serializers.URLField(read_only=True, required=False)
    open_library = serializers.URLField(read_only=True, required=False)
    goodreads = serializers.URLField(read_only=True, required=False)
    access_options = AccessOptionSerializer(many=True, read_only=True, required=False)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not ret.get("access_options"):
            ret.pop("access_options", None)
        return ret
