import logging
from bson import ObjectId
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from accounts.models import User
from discovery.repository import get_db, COLLECTION_NAME
from discovery.annotations_repository import ANNOTATIONS_COLLECTION
from discovery.reviews_repository import REVIEWS_COLLECTION, REPLIES_COLLECTION
from discovery.library_repository import LIBRARY_COLLECTION, FAVORITES_COLLECTION
from store.models import StoreProduct

DISCUSSIONS_COLLECTION = "discussions"
COMM_REPLIES_COLLECTION = "replies"
REPORTS_COLLECTION = "reports"
AUDITS_COLLECTION = "moderation_audits"

logger = logging.getLogger(__name__)

TEST_BOOK_IDS = ["6b0000000000000000000001", "6b0000000000000000000002"]

ALLOWED_E2E_POSTGRES_DBS = {"akashic_library_e2e", "akashic_e2e_postgres"}
ALLOWED_E2E_MONGO_DBS = {"akashic_discovery_e2e", "akashic_e2e_mongo"}
BLOCKED_DBS = {"akashic_library", "postgres", "production", "akashic_discovery"}


def verify_e2e_isolation():
    """Verify target environment is strictly a dedicated E2E database."""
    if not getattr(settings, "IS_E2E_ENVIRONMENT", False):
        raise CommandError(
            "SAFETY VIOLATION: cleanup_e2e_data may ONLY be executed with dedicated E2E settings "
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
    help = "Safely clean up ONLY isolated test accounts and test fixtures in dedicated E2E database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--run-id",
            type=str,
            default="",
            help="Optional test-run identifier to clean only records created by that specific run.",
        )
        parser.add_argument(
            "--all-e2e",
            action="store_true",
            help="Clean all E2E test fixtures within the isolated E2E database.",
        )

    def handle(self, *args, **options):
        verify_e2e_isolation()

        run_id = options.get("run_id", "").strip()
        all_e2e = options.get("all_e2e", False)

        pg_name = connection.settings_dict.get("NAME")
        mongo_name = getattr(settings, "MONGODB_NAME")
        self.stdout.write(f"Cleaning up E2E test data (PostgreSQL: {pg_name}, MongoDB: {mongo_name}, run_id: '{run_id}')...")

        # 1. Identify test users
        user_qs = User.objects.filter(username__startswith="test_e2e_")
        if run_id:
            user_qs = user_qs.filter(bio__contains=f"[{run_id}]")

        test_users = list(user_qs)
        test_user_ids = [str(u.id) for u in test_users]
        self.stdout.write(f"  Found {len(test_users)} test users to clean up: {[u.username for u in test_users]}")

        db = get_db()

        # 2. Delete test records from MongoDB
        user_filter = {"$in": test_user_ids}
        book_filter = {"$in": TEST_BOOK_IDS}

        # Books
        book_query = {"_id": {"$in": [ObjectId(bid) for bid in TEST_BOOK_IDS]}}
        if run_id:
            book_query["e2e_run_id"] = run_id

        del_books = db[COLLECTION_NAME].delete_many(book_query)
        self.stdout.write(f"  ✓ Deleted {del_books.deleted_count} test books from MongoDB")

        # Annotations
        del_ann = db[ANNOTATIONS_COLLECTION].delete_many({
            "$or": [
                {"user_id": user_filter},
                {"book_id": book_filter}
            ]
        })
        self.stdout.write(f"  ✓ Deleted {del_ann.deleted_count} test annotations")

        # Reviews & Replies
        del_rev = db[REVIEWS_COLLECTION].delete_many({
            "$or": [
                {"user_id": user_filter},
                {"book_id": book_filter}
            ]
        })
        del_rev_rep = db[REPLIES_COLLECTION].delete_many({
            "$or": [
                {"user_id": user_filter},
                {"book_id": book_filter}
            ]
        })
        self.stdout.write(f"  ✓ Deleted {del_rev.deleted_count} reviews, {del_rev_rep.deleted_count} review replies")

        # Library & Favorites
        del_lib = db[LIBRARY_COLLECTION].delete_many({
            "$or": [
                {"user_id": user_filter},
                {"book_id": book_filter}
            ]
        })
        del_fav = db[FAVORITES_COLLECTION].delete_many({
            "$or": [
                {"user_id": user_filter},
                {"book_id": book_filter}
            ]
        })
        self.stdout.write(f"  ✓ Deleted {del_lib.deleted_count} library entries, {del_fav.deleted_count} favorites")

        # Community Discussions & Replies
        del_disc = db[DISCUSSIONS_COLLECTION].delete_many({
            "$or": [
                {"author_user_id": user_filter},
                {"book_id": book_filter}
            ]
        })
        del_comm_rep = db[COMM_REPLIES_COLLECTION].delete_many({
            "$or": [
                {"author_user_id": user_filter}
            ]
        })
        self.stdout.write(f"  ✓ Deleted {del_disc.deleted_count} discussions, {del_comm_rep.deleted_count} community replies")

        # Reports & Moderation Audits
        del_rep = db[REPORTS_COLLECTION].delete_many({
            "$or": [
                {"reporter_user_id": user_filter}
            ]
        })
        del_aud = db[AUDITS_COLLECTION].delete_many({
            "$or": [
                {"moderator_user_id": user_filter}
            ]
        })
        self.stdout.write(f"  ✓ Deleted {del_rep.deleted_count} reports, {del_aud.deleted_count} moderation audits")

        # 3. Clean StoreProduct fixture in PostgreSQL
        del_sp, _ = StoreProduct.objects.filter(book_reference__in=TEST_BOOK_IDS).delete()
        self.stdout.write(f"  ✓ Deleted {del_sp} StoreProducts in PostgreSQL")

        # 4. Clean Users in PostgreSQL
        del_users = 0
        for u in test_users:
            u.delete()
            del_users += 1
        self.stdout.write(f"  ✓ Deleted {del_users} test users in PostgreSQL")

        self.stdout.write(self.style.SUCCESS("Dedicated E2E test data cleanup complete."))
