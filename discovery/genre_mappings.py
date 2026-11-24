"""
Genre-to-subject mappings for Akashic Library discovery.

Maps editorial classification categories (e.g., "Architectural Theory & Spatial Poetics")
to validated Open Library subject tags (e.g., "architecture", "architectural theory").
"""

from typing import Final

# Canonical mapping from Akashic genre slug to validated Open Library subject tags.
GENRE_TO_SUBJECTS: Final[dict[str, list[str]]] = {
    "fiction": [
        "fiction",
        "classic literature",
        "short stories",
    ],
    "philosophy": [
        "philosophy",
        "ethics",
        "metaphysics",
        "epistemology",
    ],
    "science-fiction": [
        "science fiction",
        "speculative fiction",
        "dystopian",
    ],
    "history": [
        "history",
        "archaeology",
        "ancient history",
        "civilization",
    ],
    "poetry": [
        "poetry",
        "essays",
        "lyric poetry",
    ],
    "science": [
        "cosmology",
        "theoretical physics",
        "natural history",
        "astronomy",
        "quantum physics",
    ],
    "architecture": [
        "architectural theory",
        "space (architecture)",
        "architectural design",
        "architectural history",
    ],
    "memoir": [
        "memoir",
        "autobiography",
        "diaries",
        "personal narratives",
        "letters",
    ],
}

# Lookup table mapping various naming forms, slugs, and editorial titles to the canonical genre key.
NAME_TO_GENRE_KEY: Final[dict[str, str]] = {
    # Fiction
    "fiction": "fiction",
    "classic literature": "fiction",
    "literary fiction": "fiction",
    # Philosophy
    "philosophy": "philosophy",
    "ethics": "philosophy",
    "metaphysics": "philosophy",
    # Science Fiction
    "science-fiction": "science-fiction",
    "science fiction": "science-fiction",
    "scifi": "science-fiction",
    "sci-fi": "science-fiction",
    "speculative fiction": "science-fiction",
    # History & Lore
    "history": "history",
    "history & lore": "history",
    "history and lore": "history",
    "archaeology": "history",
    # Poetry & Essays
    "poetry": "poetry",
    "poetry & essays": "poetry",
    "poetry and essays": "poetry",
    "essays": "poetry",
    # Natural Philosophy & Cosmology
    "science": "science",
    "natural philosophy": "science",
    "natural philosophy & cosmology": "science",
    "natural philosophy and cosmology": "science",
    "cosmology": "science",
    "physics": "science",
    # Architectural Theory & Spatial Poetics
    "architecture": "architecture",
    "architectural theory": "architecture",
    "architectural theory & spatial poetics": "architecture",
    "architectural theory and spatial poetics": "architecture",
    "spatial poetics": "architecture",
    # Memoir, Marginalia & Solitude
    "memoir": "memoir",
    "memoir, marginalia & solitude": "memoir",
    "memoir, marginalia and solitude": "memoir",
    "memoirs": "memoir",
    "autobiography": "memoir",
    "biography": "memoir",
}


def resolve_subject_aliases(subject: str) -> list[str]:
    """Resolve an incoming subject or editorial genre to validated Open Library subject aliases.

    Parameters
    ----------
    subject : str
        The requested subject string, which may be an editorial title
        (e.g., 'Architectural Theory & Spatial Poetics'), a slug ('architecture'),
        or a raw subject query ('philosophy').

    Returns
    -------
    list[str]
        A list of validated Open Library subject strings for searching/filtering.
    """
    if not subject or not subject.strip():
        return []

    cleaned = subject.strip().lower()
    genre_key = NAME_TO_GENRE_KEY.get(cleaned)

    if genre_key and genre_key in GENRE_TO_SUBJECTS:
        return GENRE_TO_SUBJECTS[genre_key]

    if cleaned in GENRE_TO_SUBJECTS:
        return GENRE_TO_SUBJECTS[cleaned]

    # Return the cleaned string directly if no alias group matches.
    return [cleaned]

