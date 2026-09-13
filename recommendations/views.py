"""
Recommendations Views — API endpoints for recommendations and external integrations.
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound

from discovery.exceptions import BookNotFoundError, MongoDBUnavailableError
from recommendations.services import RecommendationService, ExternalIntegrationService
from recommendations.serializers import (
    RecommendationResponseSerializer,
    ExternalLinksSerializer,
)


def _get_pagination_params(request):
    try:
        page = int(request.query_params.get("page", 1))
    except ValueError:
        page = 1
    page = max(1, page)

    try:
        page_size = int(request.query_params.get("page_size", 20))
    except ValueError:
        page_size = 20
    page_size = min(max(1, page_size), 100)

    skip = (page - 1) * page_size
    return page, page_size, skip


class PersonalizedRecommendationView(APIView):
    """
    GET /api/recommendations/
    Return personalized book recommendations for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        page, page_size, skip = _get_pagination_params(request)
        
        try:
            results = RecommendationService.get_personalized_recommendations(
                user_id=str(request.user.id),
                limit=page_size,
                skip=skip
            )
        except MongoDBUnavailableError as exc:
            return Response({"detail": str(exc)}, status=503)

        # For simple pagination, we can just say count is large enough for next page if len(results) == page_size
        # Since we're not running a full aggregation count for complex recommendation ranking, 
        # we'll approximate the count.
        count = skip + len(results) + (1 if len(results) == page_size else 0)

        data = {
            "count": count,
            "page": page,
            "page_size": page_size,
            "results": results,
        }
        
        serializer = RecommendationResponseSerializer(data)
        return Response(serializer.data)


class SimilarBooksView(APIView):
    """
    GET /api/recommendations/books/<book_id>/similar/
    Return books similar to the target book. Publicly accessible.
    """
    # Publicly accessible, uses default IsAuthenticatedOrReadOnly

    def get(self, request, book_id: str, *args, **kwargs):
        page, page_size, skip = _get_pagination_params(request)
        
        try:
            results = RecommendationService.get_similar_books(
                book_id=book_id,
                limit=page_size,
                skip=skip
            )
        except BookNotFoundError:
            raise NotFound(detail="Book not found.")
        except MongoDBUnavailableError as exc:
            return Response({"detail": str(exc)}, status=503)

        count = skip + len(results) + (1 if len(results) == page_size else 0)
        
        data = {
            "count": count,
            "page": page,
            "page_size": page_size,
            "results": results,
        }
        
        serializer = RecommendationResponseSerializer(data)
        return Response(serializer.data)


class ExternalLinksView(APIView):
    """
    GET /api/books/<book_id>/external/
    Return external resource links for a given book. Publicly accessible.
    """
    # Publicly accessible, uses default IsAuthenticatedOrReadOnly

    def get(self, request, book_id: str, *args, **kwargs):
        try:
            links = ExternalIntegrationService.get_external_links(book_id=book_id)
        except BookNotFoundError:
            raise NotFound(detail="Book not found.")
        except MongoDBUnavailableError as exc:
            return Response({"detail": str(exc)}, status=503)

        serializer = ExternalLinksSerializer(links)
        return Response(serializer.data)
