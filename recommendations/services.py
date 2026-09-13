"""
Recommendations Services — business logic for book recommendations and external integrations.
"""

from typing import Any

from discovery.exceptions import BookNotFoundError
from discovery.repository import get_book_by_id
from discovery.library_repository import list_favorites, list_user_library
from recommendations.repository import get_recommended_books, get_popular_books


class RecommendationService:
    """Service for generating book recommendations."""

    @classmethod
    def get_personalized_recommendations(
        cls, user_id: str, limit: int = 20, skip: int = 0
    ) -> list[dict[str, Any]]:
        """Return personalized recommendations for a user.
        
        Extracts subjects and authors from the user's favorites and reading shelves,
        then queries for similar books. Fallback to popular books if no history.
        """
        favorites = list_favorites(user_id)
        
        # Get library entries (reading, read, want_to_read)
        library_data = list_user_library(user_id, page_size=100)
        library_entries = [entry["book_id"] for entry in library_data.get("results", [])]
        
        interacted_book_ids = set(favorites + library_entries)
        
        if not interacted_book_ids:
            # Cold start
            books = get_popular_books(limit=limit, skip=skip, exclude_book_ids=interacted_book_ids)
            for b in books:
                b["recommendation_reason"] = "Popular in Akashic Library"
            return books

        # Extract authors and subjects from interacted books
        authors = set()
        subjects = set()
        
        # We cap the number of books we inspect to avoid massive queries
        sample_ids = list(interacted_book_ids)[:20]
        
        for bid in sample_ids:
            try:
                book = get_book_by_id(bid)
                for author in book.get("authors", []):
                    authors.add(author.get("name", ""))
                for subject in book.get("subjects", []):
                    subjects.add(subject)
            except BookNotFoundError:
                continue

        # Clean empty strings
        authors.discard("")
        subjects.discard("")

        if not authors and not subjects:
            books = get_popular_books(limit=limit, skip=skip, exclude_book_ids=interacted_book_ids)
            for b in books:
                b["recommendation_reason"] = "Popular in Akashic Library"
            return books

        books = get_recommended_books(
            authors=list(authors),
            subjects=list(subjects),
            exclude_book_ids=interacted_book_ids,
            limit=limit,
            skip=skip
        )
        
        # Tag reasons
        for b in books:
            b_authors = {a.get("name") for a in b.get("authors", [])}
            b_subjects = set(b.get("subjects", []))
            
            if b_subjects.intersection(subjects):
                b["recommendation_reason"] = "Because you like related subjects"
            elif b_authors.intersection(authors):
                b["recommendation_reason"] = "Because you like these authors"
            else:
                b["recommendation_reason"] = "Recommended for you"
                
        return books

    @classmethod
    def get_similar_books(
        cls, book_id: str, limit: int = 20, skip: int = 0
    ) -> list[dict[str, Any]]:
        """Return books similar to a target book."""
        book = get_book_by_id(book_id)
        
        authors = [a.get("name", "") for a in book.get("authors", []) if a.get("name")]
        subjects = book.get("subjects", [])
        
        books = get_recommended_books(
            authors=authors,
            subjects=subjects,
            exclude_book_ids={book_id},
            limit=limit,
            skip=skip
        )
        
        for b in books:
            b["recommendation_reason"] = "Similar to this book"
            
        return books


class ExternalIntegrationService:
    """Service for safely resolving external provider links without runtime API requests."""

    @classmethod
    def get_external_links(cls, book_id: str) -> dict[str, str]:
        """Return a mapping of provider names to their external URLs.
        
        Relies purely on the stored `sources` and `identifiers` data in MongoDB,
        protecting the application from external API outages.
        """
        book = get_book_by_id(book_id)
        links = {}
        
        # 1. Google Books
        sources = book.get("sources", {})
        if "google_books" in sources:
            gb_id = sources["google_books"].get("id")
            if gb_id:
                links["google_books"] = f"https://books.google.com/books?id={gb_id}"
                
        # 2. Open Library
        if "open_library" in sources:
            ol_id = sources["open_library"].get("id")
            if ol_id:
                links["open_library"] = f"https://openlibrary.org/works/{ol_id}"
                
        # 3. Goodreads (via ISBN fallback)
        identifiers = book.get("identifiers", {})
        isbn13 = identifiers.get("isbn13")
        if isbn13:
            links["goodreads"] = f"https://www.goodreads.com/book/isbn/{isbn13}"
        elif identifiers.get("isbn10"):
            links["goodreads"] = f"https://www.goodreads.com/book/isbn/{identifiers.get('isbn10')}"
            
        return links
