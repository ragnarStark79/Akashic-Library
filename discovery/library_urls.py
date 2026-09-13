"""
Library URL configuration — /api/library/ routes.

Mounted at /api/library/ by the root URLconf.
"""

from django.urls import path

from . import library_views

urlpatterns = [
    # GET  /api/library/                    — list user library
    path("", library_views.library_list, name="library-list"),
    # GET    /api/library/<book_id>/        — get single entry
    path("<str:book_id>/", library_views.library_entry_detail, name="library-entry-detail"),
    # POST   /api/library/<book_id>/add/    — add book to shelf
    path("<str:book_id>/add/", library_views.library_entry_add, name="library-entry-add"),
    # PATCH  /api/library/<book_id>/update/ — update shelf status
    path("<str:book_id>/update/", library_views.library_entry_update, name="library-entry-update"),
    # DELETE /api/library/<book_id>/remove/ — remove from library
    path("<str:book_id>/remove/", library_views.library_entry_remove, name="library-entry-remove"),
    # POST   /api/library/<book_id>/favorite/   — favorite a book
    path("<str:book_id>/favorite/", library_views.favorite_add, name="favorite-add"),
    # DELETE /api/library/<book_id>/unfavorite/ — unfavorite a book
    path("<str:book_id>/unfavorite/", library_views.favorite_remove, name="favorite-remove"),
]
