"""
Alias to seed_demo_store_catalog for backward compatibility with previous scripts.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed store catalogue (aliases to seed_demo_store_catalog)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the seeding process without committing database changes.",
        )

    def handle(self, *args, **options):
        call_command("seed_demo_store_catalog", dry_run=options.get("dry_run", False))
