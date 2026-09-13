# Frontend Integration Guide

This document outlines how the React frontend should communicate with the Akashic Library Django backend.

## Architecture

```text
React SPA
   ↓
Django REST API (Session Authenticated)
   ↓
Services / Repositories
   ↓
PostgreSQL / MongoDB
```

**CRITICAL**: The React frontend must **NEVER** attempt to connect directly to PostgreSQL or MongoDB. All interactions must pass through the Django REST API.

## Base Configuration

- **Base URL**: All API calls should be prefixed with `/api/` (e.g., `https://backend.example.com/api/books/`).
- **Content-Type**: Requests with a body must send `Content-Type: application/json`.

## Authentication Flow

The backend uses **Session Authentication** (Django cookies). We do **not** use JWT.

1. **Login**: POST to `/api/auth/login/` with username/password. The server responds with `Set-Cookie` headers for `sessionid` and `csrftoken`.
2. **Persistence**: The browser will automatically send the `sessionid` cookie on subsequent requests to the API domain.
3. **Logout**: POST to `/api/auth/logout/`. The server clears the session cookie.
4. **Current User**: GET `/api/auth/me/` on app load to determine if a session is active and retrieve the user's role/details.

### Fetch/Axios Requirements
To ensure cookies are sent with cross-origin requests, the frontend HTTP client must be configured with credentials included.
- **Fetch**: `credentials: 'include'`
- **Axios**: `withCredentials: true`

## CSRF Protection

Django requires a CSRF token for all unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).

1. The `csrftoken` cookie is set by Django upon login or the first GET request.
2. For every unsafe request, the frontend must extract the value of the `csrftoken` cookie and send it in the `X-CSRFToken` HTTP header.

## Request/Response Formats

- **GET Requests**: Parameters should be sent in the query string (e.g., `?skip=0&limit=20`).
- **POST/PATCH/DELETE**: Data must be sent as a JSON payload in the request body.
- **Responses**: Always JSON, unless the endpoint explicitly returns `204 No Content`.

## Pagination Handling

The backend implements two distinct pagination strategies depending on the underlying database. The frontend must handle both.

### 1. Paginated Envelope (PostgreSQL / DRF)
Used for Store Products and Orders.
- **Request**: `?page=N` (defaults to 1)
- **Response**:
```json
{
  "count": 45,
  "next": "https://api/store/products/?page=2",
  "previous": null,
  "results": [...]
}
```

### 2. Flat Array (MongoDB)
Used for Books, Reviews, Library, and Community.
- **Request**: `?skip=N&limit=N` (limit max 100)
- **Response**: `[...]` (flat array)
- **Pagination Logic**: The frontend must calculate `skip` (e.g., `skip = (page - 1) * limit`). If the returned array length is less than `limit`, the frontend has reached the last page.

## Error Handling Reference

The frontend should be prepared to handle the following HTTP status codes gracefully:

| Status Code | Meaning | Frontend Action |
|---|---|---|
| **400 Bad Request** | Validation error (e.g., missing fields, negative quantities). | Display field-specific error messages if provided in the response body. |
| **401 Unauthorized** | The user is not logged in or the session expired. | Redirect to the Login page or show an auth modal. |
| **403 Forbidden** | The user is logged in but lacks the required Role (e.g., USER trying to access moderation). | Show a "Permission Denied" message or hide the UI element. |
| **404 Not Found** | The requested resource (book, item, order) does not exist or does not belong to the user. | Show a 404/Not Found page. |
| **500 Internal Server Error** | Unexpected backend crash. | Show a generic "Something went wrong" message. Do not retry immediately. |
| **503 Service Unavailable** | Database or external service (MongoDB/PostgreSQL) is down. | Show a "Service Unavailable" message and allow manual retry. |

*Note: Error responses generally return a JSON payload with a `detail` key, e.g., `{"detail": "Invalid skip parameter."}`.*
