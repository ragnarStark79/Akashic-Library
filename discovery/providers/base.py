"""
Abstract BookProvider interface.

All external book data providers must implement this interface.
Provider-specific response formats must never leak past the normalize() method.
"""

import abc
from typing import Any

from discovery.models import NormalizedBook


class BookProvider(abc.ABC):
    """Abstract base class for external book data providers.

    Subclasses must implement:
      - search(query, page) → list[NormalizedBook]
      - get_by_id(external_id) → NormalizedBook | None
      - normalize(raw) → NormalizedBook | None

    Provider code is responsible for:
      - Making the HTTP request
      - Handling timeouts
      - Handling HTTP errors
      - Parsing the provider-specific response format
      - Normalizing to NormalizedBook

    Provider code must NOT:
      - Write directly to the database
      - Raise exceptions that contain credentials or API keys in their messages
      - Log credentials
    """

    #: Short identifier used as the source_name in MongoDB documents.
    name: str = ""

    @abc.abstractmethod
    def search(self, query: str, *, page: int = 1) -> list[NormalizedBook]:
        """Search the provider for books matching query.

        Returns a list of NormalizedBook objects (may be empty).

        Raises
        ------
        discovery.exceptions.ProviderError        On HTTP/network errors.
        discovery.exceptions.ProviderTimeoutError On timeout.
        """

    @abc.abstractmethod
    def get_by_id(self, external_id: str) -> NormalizedBook | None:
        """Fetch a single book from the provider by its provider-specific ID.

        Returns None if not found.

        Raises
        ------
        discovery.exceptions.ProviderError        On HTTP/network errors.
        discovery.exceptions.ProviderTimeoutError On timeout.
        """

    @abc.abstractmethod
    def normalize(self, raw: dict[str, Any]) -> NormalizedBook | None:
        """Normalize a raw provider response item into a NormalizedBook.

        Returns None if the item should be skipped (e.g., missing title).
        Must not raise on malformed data — return None instead.
        """
