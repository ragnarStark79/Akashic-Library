"""
URL configuration for the recommendations app.
"""

from django.urls import path

from recommendations.views import (
    PersonalizedRecommendationView,
    SimilarBooksView,
    ExternalLinksView,
)

urlpatterns = [
    path(
        "",
        PersonalizedRecommendationView.as_view(),
        name="personalized",
    ),
    path(
        "books/<str:book_id>/similar/",
        SimilarBooksView.as_view(),
        name="similar-books",
    ),
    path(
        "books/<str:book_id>/external/",
        ExternalLinksView.as_view(),
        name="external-links",
    ),
]
