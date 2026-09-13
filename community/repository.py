from pymongo import ASCENDING, DESCENDING, IndexModel
from discovery.db import get_db

def _get_collection(name: str):
    db = get_db()
    if db is None:
        raise Exception("MongoDB is not available")
    return db[name]

def setup_indexes():
    db = get_db()
    if db is None:
        return
    
    # Discussions
    db.discussions.create_indexes([
        IndexModel([("book_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("author_user_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("moderation_status", ASCENDING), ("created_at", DESCENDING)]),
    ])
    
    # Replies
    db.replies.create_indexes([
        IndexModel([("discussion_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("author_user_id", ASCENDING), ("created_at", DESCENDING)]),
    ])
    
    # Reports
    db.reports.create_indexes([
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("target_type", ASCENDING), ("target_id", ASCENDING)]),
        IndexModel([("reporter_user_id", ASCENDING), ("created_at", DESCENDING)]),
    ])
    
    # Moderation Audits
    db.moderation_audits.create_indexes([
        IndexModel([("target_type", ASCENDING), ("target_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("moderator_user_id", ASCENDING), ("created_at", DESCENDING)]),
    ])

def insert_document(collection: str, doc: dict):
    _get_collection(collection).insert_one(doc)

def get_document(collection: str, doc_id: str):
    return _get_collection(collection).find_one({"_id": doc_id})

def update_document(collection: str, doc_id: str, updates: dict):
    _get_collection(collection).update_one({"_id": doc_id}, {"$set": updates})

def delete_document(collection: str, doc_id: str):
    _get_collection(collection).delete_one({"_id": doc_id})

def find_documents(collection: str, query: dict, skip: int = 0, limit: int = 20, sort_by: list = None):
    cursor = _get_collection(collection).find(query)
    if sort_by:
        cursor = cursor.sort(sort_by)
    cursor = cursor.skip(skip).limit(limit)
    return list(cursor)

def count_documents(collection: str, query: dict) -> int:
    return _get_collection(collection).count_documents(query)
