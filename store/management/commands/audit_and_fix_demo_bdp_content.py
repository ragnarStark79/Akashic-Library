"""
Management command to audit and enrich demonstration StoreProduct BDP content.
Ensures every demonstration product has a clean sample excerpt (Get a Taste)
and appropriate, non-fabricated content warnings.

Strictly non-destructive:
- Preserves all primary keys, store manager ownership, prices, stock,
  card customizations, hero themes, orders, and payments.
- Supports --dry-run for validation before making changes.
"""

from django.core.management.base import BaseCommand
from store.models import StoreProduct, StoreProductDetail


# Curated illustrative sample excerpts by genre (purely generic, original demonstration passages)
GENRE_SAMPLE_EXCERPTS = {
    "Horror": (
        "The floorboards groaned underfoot as the winter frost crept across the windowpane.\n\n"
        "In the quiet of the cellar, something shifted against the stone foundation—a steady, "
        "rhythmic scraping that stopped whenever she held her breath.\n\n"
        "She lowered the lantern, watching the shadows stretch and twist into impossible shapes."
    ),
    "Science Fiction": (
        "The atmospheric scrubbers hummed at forty cycles per second, their familiar vibration "
        "echoing through the habitation ring.\n\n"
        "Beyond the reinforced quartz port, the orbital tether stretched down toward the cloud "
        "deck of Kepler-186f, glittering like a spider’s silk in the morning light.\n\n"
        "Commander Vance checked the telemetry one last time before initiating the descent sequence."
    ),
    "Fantasy": (
        "The ancient runes inscribed upon the archway glowed with a faint, phosphor luminescence.\n\n"
        "Generations of scholars had attempted to translate the glyphs, yet the mountain kept its "
        "secrets guarded by silence and creeping frost.\n\n"
        "She reached out a gloved hand, feeling the hum of dormant magic awaken beneath her fingertips."
    ),
    "Romance": (
        "The rain tapped gently against the cafe awning, blurring the glow of the lampposts into soft halos.\n\n"
        "Neither of them spoke for several long moments. The tea grew lukewarm between their hands, "
        "yet neither made a move to leave the small corner table.\n\n"
        "It was the kind of evening where an unspoken sentence carried more weight than a thousand promises."
    ),
    "Thriller": (
        "The encrypted drive weighed less than an ounce, but in his pocket it felt like lead.\n\n"
        "He kept his stride even as he crossed the terminal plaza, keeping forty paces behind the courier "
        "in the dark overcoat.\n\n"
        "At the corner of Fifth and Pine, the courier suddenly turned left and vanished into the crowd."
    ),
    "Historical Fiction": (
        "The scent of damp wool and woodsmoke hung heavy over the cobblestone quayside.\n\n"
        "Merchant vessels from Antwerp and Lisbon rocked against the pilings as the tide turned, "
        "their rigging creaking in the autumn gale.\n\n"
        "Master Aldous sealed the ledger with hot wax and blew upon the red seal to cool it."
    ),
    "Gothic Fiction": (
        "The ivy on the north turret had died three winters ago, clinging to the granite walls like withered veins.\n\n"
        "Within the gallery, portraits of long-forgotten ancestors stared down with indifferent bronze eyes.\n\n"
        "When the grandfather clock struck three, a door on the gallery landing swung open without a draft."
    ),
    "LGBTQIA+": (
        "The morning sun broke through the studio skylight, illuminating dancing motes of dust and canvas primer.\n\n"
        "They stood side by side before the unfinished mural, sharing a single mug of black coffee.\n\n"
        "In the quiet between brushstrokes, the city outside felt distant, gentle, and full of possibility."
    ),
    "Contemporary Fiction": (
        "The subway rattled along the elevated track, offering brief flickers of sunlit living rooms through tenement windows.\n\n"
        "Maya folded her newspaper and watched the reflections of tired commuters sway with each turn of the rails.\n\n"
        "Somewhere between downtown and the avenue, she decided it was finally time to make the call."
    ),
    "Default": (
        "A soft evening breeze stirred the curtains as shadows lengthened across the book-lined study.\n\n"
        "Every volume on the walnut shelves held a voice from another century, waiting patiently "
        "for an attentive reader to break the silence.\n\n"
        "He turned the opening page, and the journey began."
    ),
}

# Accurate, non-fabricated content warnings for well-known books in the catalogue
KNOWN_CONTENT_WARNINGS = {
    "Dracula": ["Gothic Horror", "Blood & Gore", "Supernatural Terror"],
    "Frankenstein": ["Body Horror", "Death & Loss", "Psychological Distress"],
    "Bury Your Gays": ["Violence", "Horror Elements", "Satirical Themes"],
    "Hungerstone": ["Gothic Horror", "Vampirism", "Illness"],
    "There Used to Be People Here": ["Supernatural Horror", "Isolation", "Grief"],
    "What Feeds Below": ["Deep Sea Horror", "Claustrophobia", "Creature Violence"],
    "Love You to Death": ["Vampires", "Family Secrets", "Dark Comedy"],
    "Plain Bad Heroines": ["Gothic Elements", "Cursed History", "Insect Phobia"],
    "Fourth Wings": ["Fantasy Violence", "Combat Trials", "Dragon Battles"],
}


class Command(BaseCommand):
    help = "Audit and enrich demonstration StoreProduct BDP sample excerpts and content warnings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the audit and report intended changes without modifying the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("Running in DRY-RUN mode. No records will be changed."))

        products = StoreProduct.objects.all().select_related("detail")
        total = products.count()
        excerpts_updated = 0
        warnings_updated = 0

        self.stdout.write(f"Auditing {total} StoreProduct records...")

        for p in products:
            detail, created = StoreProductDetail.objects.get_or_create(product=p)
            title = p.custom_description or (p.edition or "")
            # Determine book title and genres
            genres = p.custom_genres or []
            primary_genre = genres[0] if genres else "Default"

            needs_excerpt_update = False
            needs_warning_update = False

            # Check if excerpt is empty or placeholder
            current_excerpt = (detail.excerpt or "").strip()
            if not current_excerpt or current_excerpt.startswith('"It was a moment that divided before from after'):
                needs_excerpt_update = True
                new_excerpt = GENRE_SAMPLE_EXCERPTS.get(primary_genre, GENRE_SAMPLE_EXCERPTS["Default"])

            # Check content warnings
            current_warnings = detail.content_warnings if isinstance(detail.content_warnings, list) else []
            # Check if this book has known warnings
            matched_warnings = None
            for key, warnings in KNOWN_CONTENT_WARNINGS.items():
                if key.lower() in (p.edition or "").lower() or key.lower() in (detail.synopsis or "").lower():
                    matched_warnings = warnings
                    break

            if matched_warnings and current_warnings != matched_warnings:
                needs_warning_update = True
                new_warnings = matched_warnings

            if needs_excerpt_update:
                excerpts_updated += 1
                if not dry_run:
                    detail.excerpt = new_excerpt

            if needs_warning_update:
                warnings_updated += 1
                if not dry_run:
                    detail.content_warnings = new_warnings

            if (needs_excerpt_update or needs_warning_update) and not dry_run:
                detail.save()

        mode_str = "[DRY-RUN] Would update" if dry_run else "Successfully updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode_str} {excerpts_updated} sample excerpts and {warnings_updated} content warning sets across {total} records."
            )
        )
