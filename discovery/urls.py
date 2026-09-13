"""
Discovery URL configuration — /api/books/ routes.

Mounted at /api/books/ by the root URLconf.
"""

from django.urls import path

from . import views
from . import library_views
from . import reviews_views

urlpatterns = [
    path("", views.book_list, name="book-list"),
    path("import/", library_views.book_import, name="book-import"),
    # Book detail
    path("<str:book_id>/", views.book_detail, name="book-detail"),
    # Aggregate rating
    path("<str:book_id>/rating/", reviews_views.book_rating, name="book-rating"),
    # Reviews — list + create
    path("<str:book_id>/reviews/", reviews_views.review_list_create, name="review-list-create"),
    # Reviews — single review detail
    path("<str:book_id>/reviews/<str:review_id>/", reviews_views.review_detail, name="review-detail"),
    # Reviews — update
    path("<str:book_id>/reviews/<str:review_id>/update/", reviews_views.review_update, name="review-update"),
    # Reviews — delete
    path("<str:book_id>/reviews/<str:review_id>/delete/", reviews_views.review_delete, name="review-delete"),
]
