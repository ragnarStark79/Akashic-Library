"""
Discovery domain exceptions.

Keeping exceptions in a dedicated module avoids circular imports between
db.py, repository.py, services.py, and views.py.
"""


class DiscoveryError(Exception):
    """Base exception for the discovery domain."""


class MongoDBUnavailableError(DiscoveryError):
    """Raised when the MongoDB server cannot be reached."""


class BookNotFoundError(DiscoveryError):
    """Raised when a book cannot be found by its local ID."""


class ProviderError(DiscoveryError):
    """Raised when an external book provider request fails."""


class ProviderTimeoutError(ProviderError):
    """Raised when an external provider request times out."""


class InvalidQueryError(DiscoveryError):
    """Raised when the search query parameters are invalid."""


class LibraryEntryExistsError(DiscoveryError):
    """Raised when a library entry already exists (duplicate shelf add)."""


class LibraryEntryNotFoundError(DiscoveryError):
    """Raised when a library entry is not found for the user/book combination."""


class ReviewNotFoundError(DiscoveryError):
    """Raised when a review cannot be found by its ID."""


class ReviewPermissionError(DiscoveryError):
    """Raised when a user attempts to modify a review they do not own."""


class DuplicateReviewError(DiscoveryError):
    """Raised when a user tries to create a second active review for the same book."""
