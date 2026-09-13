# Akashic Library Backend

This is the Django backend for the Akashic Library project. It provides robust API services for library management, book discovery, commerce, and community discussions.

## Architecture Overview

The backend uses a polyglot persistence architecture, strictly isolating relational/transactional data from document/discovery data.

### Database Responsibilities

**PostgreSQL**:
- Users, Roles, and Authentication (Django native sessions)
- Store Products and Inventory Levels
- Cart and Cart Items
- Orders and Payments
- *Responsibility: Identity, security, and ACID transactional commerce.*

**MongoDB**:
- Books (Discovery data from external providers)
- Personal Library (Shelves, Favorites)
- Reviews and Ratings
- Community Discussions, Replies, and Moderation Reports
- *Responsibility: Fast reads, flexible document schemas, and user-generated content.*

### Domain Dependency Map

```text
[Accounts]
   ↓
[Library] / [Favorites] / [Reviews] / [Cart] / [Orders] / [Community]
(All domains depend on user identity)

[Discovery]
   ↓
[Library] / [Reviews] / [Recommendations] / [Community]
(Provides the foundational book data)

[Store]
   ↓
[Cart]
   ↓
[Orders] (Checkout Flow)
(Strict linear progression from product to order)

[Community]
   ↓
[Moderation]
(Moderators review and hide/restore community content)
```

## Setup & Installation

### 1. Requirements
- Python 3.10+
- PostgreSQL 14+
- MongoDB 6.0+

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in the required variables (database credentials, secret key, etc.).
```bash
cp .env.example .env
```
*(See `docs/ENVIRONMENT.md` for full details.)*

### 3. Virtual Environment
Create and activate a virtual environment, then install dependencies:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Database Setup
Ensure PostgreSQL and MongoDB are running. Run Django migrations to set up the PostgreSQL schema:
```bash
python manage.py migrate
```

### 5. Running the Server
```bash
python manage.py runserver
```

### 6. Running Tests
The test suite uses an in-memory SQLite database and `mongomock` for isolation.
```bash
python manage.py test --settings=Akashic_Library.test_settings --verbosity=2
```

## Frontend Integration

The backend is designed to be consumed by a React Single Page Application (SPA).
- **Authentication**: Session cookies (`sessionid` and `csrftoken`). JWT is **not** used.
- **API Base Path**: `/api/`
- **Documentation**: See `docs/FRONTEND_INTEGRATION.md` and `docs/API_REFERENCE.md` for detailed integration contracts.

*Note: The frontend must only communicate with the Django REST API. It must never connect directly to PostgreSQL or MongoDB.*
