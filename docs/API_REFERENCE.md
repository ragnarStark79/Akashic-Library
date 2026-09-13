# API Reference

This document provides the definitive API inventory for the Akashic Library backend.

## General Information
- **Base URL**: `/api/`
- **Authentication**: Session-based (Django cookies). All endpoints requiring auth will return `401 Unauthorized` or `403 Forbidden` if the user is not authenticated.
- **Content Type**: `application/json` (except when noted).

---

## 1. Authentication (`/api/auth/`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| POST | `/api/auth/register/` | No | Any | Register a new user. Body: `{"username": "", "password": "", "email": ""}` |
| POST | `/api/auth/login/` | No | Any | Authenticate and create a session. Body: `{"username": "", "password": ""}` |
| POST | `/api/auth/logout/` | Yes | Any | Destroy the current session. |
| GET | `/api/auth/me/` | Yes | Any | Get the current user profile. Returns: `{"id": "", "username": "", "email": "", "role": ""}` |

---

## 2. Discovery / Books (`/api/books/`)

*Note: Discovery data is stored in MongoDB.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/books/` | No | Any | Search books. Query: `q`, `isbn`, `author`, `skip`, `limit` (max 100). |
| POST | `/api/books/import/` | Yes | Any | Import a book from external providers into the library. Body: `{"provider": "", "provider_book_id": ""}` |
| GET | `/api/books/<book_id>/` | No | Any | Get detailed book information. |
| GET | `/api/books/<book_id>/rating/` | No | Any | Get aggregate rating for a book. |

---

## 3. Reviews (`/api/books/<book_id>/reviews/`)

*Note: Reviews are stored in MongoDB.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/books/<book_id>/reviews/` | No | Any | List approved reviews. Query: `skip`, `limit`. |
| POST | `/api/books/<book_id>/reviews/` | Yes | Any | Create a new review. Body: `{"rating": 5, "review_text": ""}` |
| GET | `/api/books/<book_id>/reviews/<review_id>/` | No | Any | Get a single review. |
| PATCH | `/api/books/<book_id>/reviews/<review_id>/update/` | Yes | Any | Update own review. |
| DELETE | `/api/books/<book_id>/reviews/<review_id>/delete/` | Yes | Any | Delete own review. |

---

## 4. Library & Favorites (`/api/library/`)

*Note: Library/Favorites data is stored in MongoDB.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/library/` | Yes | Any | List user's library entries. Query: `status`, `skip`, `limit`. |
| GET | `/api/library/<book_id>/` | Yes | Any | Get single library entry. |
| POST | `/api/library/<book_id>/add/` | Yes | Any | Add book to a shelf. Body: `{"status": "WANT_TO_READ" \| "READING" \| "READ"}` |
| PATCH | `/api/library/<book_id>/update/` | Yes | Any | Update shelf status. Body: `{"status": "..."}` |
| DELETE | `/api/library/<book_id>/remove/` | Yes | Any | Remove book from library. |
| POST | `/api/library/<book_id>/favorite/` | Yes | Any | Add book to favorites. |
| DELETE | `/api/library/<book_id>/unfavorite/`| Yes | Any | Remove book from favorites. |

---

## 5. Store (`/api/store/`)

*Note: Store data is stored in PostgreSQL.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/store/products/` | No | Any | List available physical products. Paginated (Standard DRF envelope). |
| GET | `/api/store/products/<uuid>/` | No | Any | Get product details including stock. |
| POST | `/api/store/products/manage/` | Yes | STORE_MANAGER / ADMIN | Create a new product. |
| PATCH | `/api/store/products/<uuid>/manage/` | Yes | STORE_MANAGER / ADMIN | Update product details. |
| PATCH | `/api/store/products/<uuid>/inventory/` | Yes | STORE_MANAGER / ADMIN | Update inventory stock levels. Body: `{"quantity_on_hand": 10}` |

---

## 6. Cart (`/api/cart/`)

*Note: Cart data is stored in PostgreSQL.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/cart/` | Yes | Any | Get current user's cart summary. |
| GET | `/api/cart/items/` | Yes | Any | List cart items. |
| POST | `/api/cart/items/` | Yes | Any | Add item to cart. Body: `{"product_id": "<uuid>", "quantity": 1}` |
| GET | `/api/cart/items/<uuid>/` | Yes | Any | Get cart item detail. |
| PATCH | `/api/cart/items/<uuid>/` | Yes | Any | Update item quantity. Body: `{"quantity": 2}` |
| DELETE | `/api/cart/items/<uuid>/` | Yes | Any | Remove item from cart. |

---

## 7. Orders & Checkout (`/api/`)

*Note: Orders are stored in PostgreSQL.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| POST | `/api/checkout/` | Yes | Any | Process checkout from current cart. Returns `201 Created` with Order info. |
| GET | `/api/orders/` | Yes | Any | List user's orders. Paginated (Standard DRF envelope). |
| GET | `/api/orders/<uuid>/` | Yes | Any | Get order details and items. |

---

## 8. Community & Moderation (`/api/community/`)

*Note: Community data is stored in MongoDB.*

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/community/discussions/` | No | Any | List approved discussions. Query: `book_id`, `topic_type`, `skip`, `limit`. |
| POST | `/api/community/discussions/` | Yes | Any | Create discussion. Body: `{"book_id": "", "topic_type": "", "title": "", "body": ""}` |
| GET | `/api/community/discussions/<id>/` | No | Any | Get discussion details. |
| GET | `/api/community/discussions/<id>/replies/`| No | Any | List replies for a discussion. Query: `skip`, `limit`. |
| POST | `/api/community/discussions/<id>/replies/`| Yes | Any | Create a reply. Body: `{"body": ""}` |
| GET | `/api/community/replies/<id>/` | No | Any | Get reply details. |
| POST | `/api/community/reports/` | Yes | Any | Report content. Body: `{"target_type": "DISCUSSION\|REPLY", "target_id": "", "reason": "", "details": ""}` |
| GET | `/api/community/moderation/reports/` | Yes | MODERATOR / ADMIN | List moderation reports. |
| GET | `/api/community/moderation/reports/<id>/` | Yes | MODERATOR / ADMIN | Get report details. |
| POST | `/api/community/moderation/hide/<type>/<id>/`| Yes | MODERATOR / ADMIN | Hide content (DISCUSSION or REPLY). |
| POST | `/api/community/moderation/restore/<type>/<id>/`| Yes | MODERATOR / ADMIN | Restore hidden content. |

---

## 9. Recommendations (`/api/recommendations/`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/api/recommendations/` | Yes | Any | Get personalized book recommendations for user. |
| GET | `/api/recommendations/books/<book_id>/similar/`| No | Any | Get similar books based on attributes. |
| GET | `/api/recommendations/books/<book_id>/external/`| No | Any | Get external provider links (e.g., OpenLibrary, Google Books). |

---

## Pagination Contracts

### 1. DRF Pagination (PostgreSQL APIs)
Used for: `GET /api/store/products/`, `GET /api/orders/`.
Query Params: `page` (default 1).
Response Structure:
```json
{
    "count": 100,
    "next": "http://api.example.org/accounts/?page=4",
    "previous": "http://api.example.org/accounts/?page=2",
    "results": [ ... ]
}
```

### 2. MongoDB Pagination (MongoDB APIs)
Used for: Books list, Reviews list, Library list, Community Discussions/Replies.
Query Params: `skip` (default 0), `limit` (default 20, max 100).
Response Structure:
```json
[
    { ... },
    { ... }
]
```
*(Returns a flat JSON array. The frontend determines end-of-list when returned array length < `limit`)*
