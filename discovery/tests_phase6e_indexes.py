"""Phase 6E: MongoDB Indexing, Idempotent Initialization & Query Plan Tests.

Verifies:
  1. init_mongo_indexes management command execution.
  2. Idempotent multi-run behavior without errors or index conflicts.
  3. Targeted collection execution via --collection argument.
  4. Compound index creation on annotations with exact ESR ordering:
     - idx_annotations_book_visibility_created
     - idx_annotations_book_user_created
     - idx_annotations_user_created
  5. MongoDB explain() query execution plans confirming IXSCAN usage.
"""

from io import StringIO
from django.core.management import call_command
from django.test import SimpleTestCase
from discovery.db import get_db
from discovery.annotations_repository import (
    ANNOTATIONS_COLLECTION,
    create_annotation,
    VISIBILITY_SHARED,
    VISIBILITY_PRIVATE,
)
from pymongo import DESCENDING


class Phase6EMongoIndexingTests(SimpleTestCase):
    """Test suite for Phase 6E MongoDB indexes and query execution plans."""

    def setUp(self):
        super().setUp()
        self.db = get_db()
        self.annotations_col = self.db[ANNOTATIONS_COLLECTION]

    def test_init_mongo_indexes_command_execution(self):
        """Management command initializes all required collections and indexes."""
        out = StringIO()
        call_command("init_mongo_indexes", stdout=out)
        output = out.getvalue()

        self.assertIn("annotations:", output)
        self.assertIn("idx_annotations_book_visibility_created", output)
        self.assertIn("idx_annotations_book_user_created", output)
        self.assertIn("idx_annotations_user_created", output)
        self.assertIn("reviews:", output)
        self.assertIn("library_entries:", output)
        self.assertIn("books:", output)
        self.assertIn("discussions:", output)

    def test_init_mongo_indexes_idempotency(self):
        """Running the command repeatedly does not raise error or corrupt index metadata."""
        out1 = StringIO()
        call_command("init_mongo_indexes", stdout=out1)

        out2 = StringIO()
        call_command("init_mongo_indexes", stdout=out2)

        indexes = self.annotations_col.index_information()
        self.assertIn("idx_annotations_book_visibility_created", indexes)
        self.assertIn("idx_annotations_book_user_created", indexes)
        self.assertIn("idx_annotations_user_created", indexes)

    def test_init_mongo_indexes_selective_collection(self):
        """Passing --collection limits index verification to specified target."""
        out = StringIO()
        call_command("init_mongo_indexes", collection="annotations", stdout=out)
        output = out.getvalue()

        self.assertIn("annotations:", output)
        self.assertNotIn("library_entries:", output)
        self.assertNotIn("discussions:", output)

    def test_annotations_compound_indexes_fields_and_directions(self):
        """Verify field composition and sort direction for annotations compound indexes."""
        call_command("init_mongo_indexes", collection="annotations", stdout=StringIO())
        info = self.annotations_col.index_information()

        # 1. Book + Visibility + CreatedAt
        book_vis_idx = info.get("idx_annotations_book_visibility_created")
        self.assertIsNotNone(book_vis_idx)
        self.assertEqual(
            book_vis_idx["key"],
            [("book_id", 1), ("visibility", 1), ("created_at", -1)],
        )

        # 2. Book + User + CreatedAt
        book_usr_idx = info.get("idx_annotations_book_user_created")
        self.assertIsNotNone(book_usr_idx)
        self.assertEqual(
            book_usr_idx["key"],
            [("book_id", 1), ("user_id", 1), ("created_at", -1)],
        )

        # 3. User + CreatedAt
        usr_idx = info.get("idx_annotations_user_created")
        self.assertIsNotNone(usr_idx)
        self.assertEqual(
            usr_idx["key"],
            [("user_id", 1), ("created_at", -1)],
        )

    def test_annotations_query_explain_plan_uses_ixscan(self):
        """Explain plan confirms MongoDB uses idx_annotations_book_visibility_created index scan."""
        call_command("init_mongo_indexes", collection="annotations", stdout=StringIO())

        # Seed sample data
        test_book = "book-explain-test-001"
        create_annotation(
            book_id=test_book,
            user_id="usr-test-1",
            content="Sample annotation for index explain test",
            visibility=VISIBILITY_SHARED,
        )

        cursor = self.annotations_col.find(
            {"book_id": test_book, "visibility": VISIBILITY_SHARED}
        ).sort("created_at", DESCENDING)

        explain_plan = cursor.explain()

        # Verify explain plan structure
        query_planner = explain_plan.get("queryPlanner", {})
        winning_plan = query_planner.get("winningPlan", {})

        # Walk through the winningPlan stages to find IXSCAN
        stages = []
        current = winning_plan
        while current:
            stage_name = current.get("stage")
            if stage_name:
                stages.append(stage_name)
            # Check inputStage / inputStages
            if "inputStage" in current:
                current = current["inputStage"]
            elif "inputStages" in current and current["inputStages"]:
                current = current["inputStages"][0]
            else:
                current = None

        # Confirm IXSCAN stage is present in the winning plan
        self.assertIn("IXSCAN", stages)

        # Clean up seeded test doc
        self.annotations_col.delete_many({"book_id": test_book})
