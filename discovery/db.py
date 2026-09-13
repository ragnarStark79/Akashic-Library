"""
MongoDB connection management for the discovery domain.

Design:
  - A single MongoClient is created lazily on first access (not at import time).
  - The client is thread-safe (pymongo MongoClient manages a connection pool).
  - Connection URI and database name come from Django settings (env vars).
  - If MongoDB is unavailable, a MongoDBUnavailableError is raised at the
    point of use — never at startup — so Django system checks still pass.

Usage (internal, within the discovery app only):
    from discovery.db import get_db
    db = get_db()
    collection = db["books"]
"""

import logging
import threading

from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Return the shared MongoClient, creating it on first call."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                uri = getattr(settings, "MONGODB_URI", "mongodb://localhost:27017/")
                _client = MongoClient(
                    uri,
                    serverSelectionTimeoutMS=5000,  # 5-second selection timeout
                    connectTimeoutMS=5000,
                    socketTimeoutMS=10000,
                )
    return _client


def get_db():
    """Return the configured MongoDB database object.

    Raises
    ------
    discovery.exceptions.MongoDBUnavailableError
        If the MongoDB server cannot be reached.
    """
    # Import here to avoid circular import (exceptions imports nothing from db).
    from discovery.exceptions import MongoDBUnavailableError

    client = get_client()
    db_name = getattr(settings, "MONGODB_NAME", "akashic_discovery")
    try:
        # ping is a cheap operation that verifies the connection is alive.
        client.admin.command("ping")
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        logger.error("MongoDB unavailable: %s", exc)
        raise MongoDBUnavailableError("MongoDB is currently unavailable.") from exc
    return client[db_name]


def reset_client() -> None:
    """Close and reset the client — used in tests to swap in a mock client."""
    global _client
    with _lock:
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
            _client = None
