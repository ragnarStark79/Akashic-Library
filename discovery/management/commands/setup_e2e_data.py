import logging
import os
from bson import ObjectId
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from accounts.models import User
from discovery.repository import get_db, COLLECTION_NAME
from discovery.annotations_repository import ANNOTATIONS_COLLECTION
from discovery.reviews_repository import REVIEWS_COLLECTION, REPLIES_COLLECTION
from discovery.library_repository import LIBRARY_COLLECTION, FAVORITES_COLLECTION
from store.models import StoreProduct, StoreStatus

DISCUSSIONS_COLLECTION = "discussions"
COMM_REPLIES_COLLECTION = "replies"
REPORTS_COLLECTION = "reports"
AUDITS_COLLECTION = "moderation_audits"

logger = logging.getLogger(__name__)

TEST_BOOK_1_ID = "6b0000000000000000000001"
TEST_BOOK_2_ID = "6b0000000000000000000002"

ALLOWED_E2E_POSTGRES_DBS = {"akashic_library_e2e", "akashic_e2e_postgres"}
ALLOWED_E2E_MONGO_DBS = {"akashic_discovery_e2e", "akashic_e2e_mongo"}
BLOCKED_DBS = {"akashic_library", "postgres", "production", "akashic_discovery"}


def verify_e2e_isolation():
    """Verify target environment is strictly a dedicated E2E database."""
    if not getattr(settings, "IS_E2E_ENVIRONMENT", False):
        raise CommandError(
            "SAFETY VIOLATION: setup_e2e_data may ONLY be executed with dedicated E2E settings "
            "(--settings=Akashic_Library.e2e_settings). Refusing execution against non-E2E settings."
        )

    pg_name = connection.settings_dict.get("NAME", "")
    if pg_name in BLOCKED_DBS or (pg_name not in ALLOWED_E2E_POSTGRES_DBS and not pg_name.endswith("_e2e")):
        raise CommandError(
            f"SAFETY VIOLATION: PostgreSQL database '{pg_name}' is not an authorized E2E database. "
            f"Allowed databases must end with '_e2e' or be in {ALLOWED_E2E_POSTGRES_DBS}. Aborting."
        )

    mongo_name = getattr(settings, "MONGODB_NAME", "")
    if mongo_name in BLOCKED_DBS or (mongo_name not in ALLOWED_E2E_MONGO_DBS and not mongo_name.endswith("_e2e")):
        raise CommandError(
            f"SAFETY VIOLATION: MongoDB database '{mongo_name}' is not an authorized E2E database. "
            f"Allowed databases must end with '_e2e' or be in {ALLOWED_E2E_MONGO_DBS}. Aborting."
        )


class Command(BaseCommand):
    help = "Seed isolated disposable test users and fixture books for E2E testing in dedicated E2E database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--run-id",
            type=str,
            default="",
            help="Optional test-run identifier for granular fixture lifecycle ownership.",
        )

    def handle(self, *args, **options):
        verify_e2e_isolation()

        run_id = options.get("run_id", "").strip()
        e2e_pass = os.getenv("E2E_TEST_PASSWORD", getattr(settings, "E2E_TEST_PASSWORD", "E2eDisposablePass_2026!"))

        pg_name = connection.settings_dict.get("NAME")
        mongo_name = getattr(settings, "MONGODB_NAME")
        self.stdout.write(f"Setting up E2E test data (PostgreSQL: {pg_name}, MongoDB: {mongo_name}, run_id: '{run_id}')...")

        test_users_data = [
            {
                "username": "test_e2e_patron_a",
                "email": "test_patron_a@akashic.local",
                "role": "USER",
                "display_name": "Patron Alpha",
                "bio": f"E2E Patron A [{run_id}]" if run_id else "A seeker of speculative labyrinthine fiction.",
            },
            {
                "username": "test_e2e_patron_b",
                "email": "test_patron_b@akashic.local",
                "role": "USER",
                "display_name": "Patron Beta",
                "bio": f"E2E Patron B [{run_id}]" if run_id else "Bibliophile wandering through esoteric libraries.",
            },
            {
                "username": "test_e2e_moderator",
                "email": "test_mod@akashic.local",
                "role": "MODERATOR",
                "display_name": "Curator Moderator",
                "bio": f"E2E Curator [{run_id}]" if run_id else "Preserving harmony across library discussions.",
            },
            {
                "username": "test_e2e_store_mgr",
                "email": "test_store@akashic.local",
                "role": "STORE_MANAGER",
                "display_name": "Store Keeper",
                "bio": f"E2E Store Mgr [{run_id}]" if run_id else "Curator of physical folios and library bindings.",
            },
            {
                "username": "test_e2e_admin",
                "email": "test_admin@akashic.local",
                "role": "ADMIN",
                "display_name": "Archivist Admin",
                "bio": f"E2E Admin [{run_id}]" if run_id else "Chief archivist of the Akashic Library.",
            },
        ]

        db = get_db()

        # 0. Clean prior test artifacts within this isolated E2E database
        prior_users = list(User.objects.filter(username__startswith="test_e2e_"))
        prior_user_ids = [str(u.id) for u in prior_users]
        test_book_filter = {"$in": [TEST_BOOK_1_ID, TEST_BOOK_2_ID]}
        user_filter = {"$in": prior_user_ids}

        db[ANNOTATIONS_COLLECTION].delete_many({"$or": [{"user_id": user_filter}, {"book_id": test_book_filter}]})
        db[REVIEWS_COLLECTION].delete_many({"$or": [{"user_id": user_filter}, {"book_id": test_book_filter}]})
        db[REPLIES_COLLECTION].delete_many({"$or": [{"user_id": user_filter}, {"book_id": test_book_filter}]})
        db[LIBRARY_COLLECTION].delete_many({"$or": [{"user_id": user_filter}, {"book_id": test_book_filter}]})
        db[FAVORITES_COLLECTION].delete_many({"$or": [{"user_id": user_filter}, {"book_id": test_book_filter}]})
        db[DISCUSSIONS_COLLECTION].delete_many({"$or": [{"author_user_id": user_filter}, {"book_id": test_book_filter}]})
        db[COMM_REPLIES_COLLECTION].delete_many({"author_user_id": user_filter})
        db[REPORTS_COLLECTION].delete_many({"reporter_user_id": user_filter})
        db[AUDITS_COLLECTION].delete_many({"moderator_user_id": user_filter})

        # 1. Setup Users
        user_ids = {}
        for u_data in test_users_data:
            user, created = User.objects.get_or_create(
                username=u_data["username"],
                defaults={
                    "email": u_data["email"],
                    "role": u_data["role"],
                    "display_name": u_data["display_name"],
                    "bio": u_data["bio"],
                }
            )
            user.email = u_data["email"]
            user.role = u_data["role"]
            user.display_name = u_data["display_name"]
            user.bio = u_data["bio"]
            user.set_password(e2e_pass)
            user.save()
            user_ids[u_data["username"]] = str(user.id)
            status_str = "created" if created else "updated"
            self.stdout.write(f"  ✓ User {user.username} ({user.role}): {status_str}")

        # 2. Setup MongoDB Test Books
        books_col = db[COLLECTION_NAME]

        book_1 = {
            "_id": ObjectId(TEST_BOOK_1_ID),
            "title": "Ficciones Test Edition",
            "authors": [{"name": "Jorge Luis Borges"}],
            "description": "A legendary labyrinth of speculative stories, infinite libraries, and philosophical parables.",
            "genres": ["Fiction", "Philosophy"],
            "subjects": ["Short stories", "Argentine literature", "Labyrinths"],
            "identifiers": {
                "isbn13": "9780140188219",
                "isbn10": "0140188214"
            },
            "publication": {
                "publisher": "Penguin Classics",
                "published_date": "1998",
                "page_count": 174
            },
            "cover": {
                "large": "https://covers.openlibrary.org/b/id/8231856-L.jpg",
                "medium": "https://covers.openlibrary.org/b/id/8231856-M.jpg",
                "small": "https://covers.openlibrary.org/b/id/8231856-S.jpg"
            },
            "sources": {
                "google_books": {"id": "gb_ficciones_123"},
                "open_library": {"id": "OL27479W", "ia_id": "ficciones_borges_ia", "work_id": "OL27479W"}
            },
            "public_domain": True,
            "public_domain_source": "Standard Ebooks Archive",
            "public_domain_url": "https://standardebooks.org/ebooks/borges/ficciones",
            "jurisdiction": "Worldwide",
            "external_links": {
                "merchant": "Independent Booksellers Guild",
                "purchase": "https://www.independentbookstore.com/ficciones"
            },
            "e2e_run_id": run_id
        }

        book_2 = {
            "_id": ObjectId(TEST_BOOK_2_ID),
            "title": "One Hundred Years of Solitude Test Edition",
            "authors": [{"name": "Gabriel García Márquez"}],
            "description": "The multi-generational story of the Buendía family in Macondo.",
            "genres": ["Fiction"],
            "subjects": ["Latin American Literature", "Family Saga"],
            "identifiers": {
                "isbn13": "9780060883287"
            },
            "publication": {
                "publisher": "Harper & Row",
                "published_date": "1970",
                "page_count": 417
            },
            "cover": {
                "large": "https://covers.openlibrary.org/b/id/8231857-L.jpg",
                "medium": "https://covers.openlibrary.org/b/id/8231857-M.jpg",
                "small": "https://covers.openlibrary.org/b/id/8231857-S.jpg"
            },
            "sources": {
                "google_books": {"id": "gb_solitude_456"},
                "open_library": {"id": "OL27480W"}
            },
            "e2e_run_id": run_id
        }

        books_col.replace_one({"_id": ObjectId(TEST_BOOK_1_ID)}, book_1, upsert=True)
        books_col.replace_one({"_id": ObjectId(TEST_BOOK_2_ID)}, book_2, upsert=True)
        self.stdout.write(f"  ✓ Seeded MongoDB test books: {TEST_BOOK_1_ID}, {TEST_BOOK_2_ID}")

        # 3. Setup StoreProduct in PostgreSQL for OUR_STORE access classification
        sp, created = StoreProduct.objects.get_or_create(
            book_reference=TEST_BOOK_1_ID,
            defaults={
                "edition": "Collector's Folio Edition",
                "condition": "New",
                "price": "28.50",
                "status": StoreStatus.IN_STOCK,
            }
        )
        if not created:
            sp.status = StoreStatus.IN_STOCK
            sp.save()
        self.stdout.write(f"  ✓ Seeded StoreProduct for {TEST_BOOK_1_ID} (OUR_STORE)")

        self.stdout.write(self.style.SUCCESS("Dedicated E2E test data setup complete."))
