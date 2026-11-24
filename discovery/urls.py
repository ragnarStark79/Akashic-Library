"""
Discovery URL configuration — /api/books/ routes.

Mounted at /api/books/ by the root URLconf.
"""

from django.urls import path

from . import views
from . import library_views
from . import reviews_views
from . import annotations_views

urlpatterns = [
    path("", views.book_list, name="book-list"),
    path("import/", library_views.book_import, name="book-import"),
    # Book detail
    path("<str:book_id>/", views.book_detail, name="book-detail"),
    # Annotations & Reading Room
    path("<str:book_id>/my-annotations/", annotations_views.user_book_annotations, name="user-book-annotations"),
    path("<str:book_id>/annotations/", annotations_views.annotation_list_create, name="annotation-list-create"),
    path("<str:book_id>/annotations/<str:annotation_id>/", annotations_views.annotation_detail, name="annotation-detail"),
    path("<str:book_id>/annotations/<str:annotation_id>/update/", annotations_views.annotation_update, name="annotation-update"),
    path("<str:book_id>/annotations/<str:annotation_id>/delete/", annotations_views.annotation_delete, name="annotation-delete"),
    # Current user's own review
    path("<str:book_id>/my-review/", reviews_views.user_book_review, name="user-book-review"),
    # Aggregate rating
    path("<str:book_id>/rating/", reviews_views.book_rating, name="book-rating"),
    # Reviews — list + create
    path("<str:book_id>/reviews/", reviews_views.review_list_create, name="review-list-create"),
    # Reviews — single review detail (GET/PATCH/DELETE)
    path("<str:book_id>/reviews/<str:review_id>/", reviews_views.review_detail, name="review-detail"),
    # Reviews — update
    path("<str:book_id>/reviews/<str:review_id>/update/", reviews_views.review_update, name="review-update"),
    # Reviews — delete
    path("<str:book_id>/reviews/<str:review_id>/delete/", reviews_views.review_delete, name="review-delete"),
    # Review replies — list + create
    path("<str:book_id>/reviews/<str:review_id>/replies/", reviews_views.review_replies_list_create, name="review-replies"),
    # Review replies — delete
    path("<str:book_id>/reviews/<str:review_id>/replies/<str:reply_id>/delete/", reviews_views.review_reply_delete, name="review-reply-delete"),
    path("<str:book_id>/reviews/<str:review_id>/replies/<str:reply_id>/", reviews_views.review_reply_delete, name="review-reply-detail"),
]
