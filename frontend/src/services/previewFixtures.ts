import type {
  BookListItem,
  BookDetail,
  SearchFilters,
  BookSearchResponse,
  BookReview,
  BookReviewsResponse,
  BookAggregateRating,
} from '../types/discovery';

/**
 * Akashic Library — Phase 2A Frontend Preview Fixtures
 *
 * NOTE: These deterministic fixtures are strictly for frontend visual review,
 * component testing, and interaction verification in development mode.
 * They are clearly marked and segregated from live catalogue information.
 */

export const PREVIEW_BOOKS_FIXTURES: (BookListItem & { subjects: string[]; description: string; publisher: string })[] = [
  // ── 1. Philosophy ──
  {
    id: 'demo-phil-01',
    title: 'Ficciones',
    authors: ['Jorge Luis Borges'],
    cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    language: 'es',
    published_date: '1944',
    rating: 4.9,
    review_count: 142,
    subjects: ['Philosophy', 'Fiction'],
    description: '[Preview Fixture] A labyrinthine collection of philosophical fictions exploring infinite libraries, labyrinthine time, and counterfeit realities.',
    publisher: 'Editorial Sur [Preview]',
    in_store: true,
  },
  {
    id: 'demo-phil-02',
    title: 'Tractatus Logico-Philosophicus',
    authors: ['Ludwig Wittgenstein'],
    cover_url: null, // Fallback cover test case
    language: 'de',
    published_date: '1921',
    rating: 4.8,
    review_count: 98,
    subjects: ['Philosophy'],
    description: '[Preview Fixture] A rigorous exploration into the limits of thought, language, and logical propositions: "Whereof one cannot speak, thereof one must be silent."',
    publisher: 'Kegan Paul [Preview]',
    in_store: false,
  },
  {
    id: 'demo-phil-03',
    title: 'The Myth of Sisyphus',
    authors: ['Albert Camus'],
    cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
    language: 'fr',
    published_date: '1942',
    rating: 4.7,
    review_count: 85,
    subjects: ['Philosophy'],
    description: '[Preview Fixture] An existential meditation on absurdity, freedom, and the lucidity of conscious revolt.',
    publisher: 'Gallimard [Preview]',
    in_store: true,
  },
  {
    id: 'demo-phil-04',
    title: 'Labyrinths: Selected Stories',
    authors: ['Jorge Luis Borges'],
    cover_url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '1962',
    rating: 4.9,
    review_count: 112,
    subjects: ['Philosophy', 'Fiction'],
    description: '[Preview Fixture] Seminal translations including The Library of Babel, Tlön, Uqbar, Orbis Tertius, and The Garden of Forking Paths.',
    publisher: 'New Directions [Preview]',
    in_store: true,
  },

  // ── 2. Fiction & Literature ──
  {
    id: 'demo-fic-01',
    title: 'Invisible Cities',
    authors: ['Italo Calvino'],
    cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&q=80&w=600',
    language: 'it',
    published_date: '1972',
    rating: 4.9,
    review_count: 88,
    subjects: ['Fiction', 'Architectural Theory & Spatial Poetics'],
    description: '[Preview Fixture] Marco Polo describes imaginary cities of memory, desire, signs, and thin structures to the aging emperor Kublai Khan.',
    publisher: 'Einaudi [Preview]',
    in_store: true,
  },
  {
    id: 'demo-fic-02',
    title: 'To the Lighthouse',
    authors: ['Virginia Woolf'],
    cover_url: null, // Fallback cover test case
    language: 'en',
    published_date: '1927',
    rating: 4.6,
    review_count: 73,
    subjects: ['Fiction'],
    description: '[Preview Fixture] A landmark modernist triumph illuminating human interiority, the passage of time, and artistic longing.',
    publisher: 'Hogarth Press [Preview]',
    in_store: true,
  },
  {
    id: 'demo-fic-03',
    title: 'The Aleph',
    authors: ['Jorge Luis Borges'],
    cover_url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=600',
    language: 'es',
    published_date: '1949',
    rating: 4.8,
    review_count: 67,
    subjects: ['Fiction', 'Philosophy'],
    description: '[Preview Fixture] A point in space that contains all other points: anyone gazing into it can see the entire universe simultaneously without confusion.',
    publisher: 'Editorial Losada [Preview]',
    in_store: false,
  },
  {
    id: 'demo-fic-04',
    title: 'The Trial',
    authors: ['Franz Kafka'],
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
    language: 'de',
    published_date: '1925',
    rating: 4.7,
    review_count: 94,
    subjects: ['Fiction', 'Philosophy'],
    description: '[Preview Fixture] Josef K. is arrested and prosecuted by a remote, inaccessible bureaucratic authority without ever learning the nature of his crime.',
    publisher: 'Verlag Die Schmiede [Preview]',
    in_store: true,
  },

  // ── 3. Science Fiction & Speculative ──
  {
    id: 'demo-scifi-01',
    title: 'Solaris',
    authors: ['Stanisław Lem'],
    cover_url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&q=80&w=600',
    language: 'pl',
    published_date: '1961',
    rating: 4.7,
    review_count: 63,
    subjects: ['Science Fiction', 'Philosophy'],
    description: '[Preview Fixture] Human researchers struggle to understand an enigmatic sentient oceanic planet that materializes their deepest repressed memories.',
    publisher: 'Wydawnictwo MON [Preview]',
    in_store: true,
  },
  {
    id: 'demo-scifi-02',
    title: 'The Dispossessed',
    authors: ['Ursula K. Le Guin'],
    cover_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '1974',
    rating: 4.8,
    review_count: 81,
    subjects: ['Science Fiction', 'Philosophy'],
    description: '[Preview Fixture] An ambiguous utopia contrasting the anarchist moon Anarres with the capitalist mother planet Urras through the eyes of a temporal physicist.',
    publisher: 'Harper & Row [Preview]',
    in_store: true,
  },
  {
    id: 'demo-scifi-03',
    title: 'Cyberiad: Fables for the Cybernetic Age',
    authors: ['Stanisław Lem'],
    cover_url: null, // Fallback cover test case
    language: 'pl',
    published_date: '1965',
    rating: 4.8,
    review_count: 42,
    subjects: ['Science Fiction'],
    description: '[Preview Fixture] The whimsical, mathematically profound adventures of the master constructors Trurl and Klapaucius across robotic kingdoms.',
    publisher: 'Wydawnictwo Literackie [Preview]',
    in_store: false,
  },

  // ── 4. Natural Philosophy & Cosmology ──
  {
    id: 'demo-cosmo-01',
    title: 'The Order of Time',
    authors: ['Carlo Rovelli'],
    cover_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '2017',
    rating: 4.7,
    review_count: 59,
    subjects: ['Natural Philosophy & Cosmology', 'Philosophy'],
    description: '[Preview Fixture] A poetic dismantling of the illusion of uniform time, exploring loop quantum gravity and thermal entropy.',
    publisher: 'Riverhead Books [Preview]',
    in_store: true,
  },
  {
    id: 'demo-cosmo-02',
    title: 'Helgoland: Making Sense of the Quantum Revolution',
    authors: ['Carlo Rovelli'],
    cover_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '2020',
    rating: 4.6,
    review_count: 38,
    subjects: ['Natural Philosophy & Cosmology', 'Philosophy'],
    description: '[Preview Fixture] An ontological inquiry into relational quantum mechanics, arguing that reality exists solely as interactions between relations.',
    publisher: 'Adelphi Edizioni [Preview]',
    in_store: true,
  },
  {
    id: 'demo-cosmo-03',
    title: 'Cosmicomics',
    authors: ['Italo Calvino'],
    cover_url: null, // Fallback cover test case
    language: 'it',
    published_date: '1965',
    rating: 4.8,
    review_count: 52,
    subjects: ['Natural Philosophy & Cosmology', 'Fiction'],
    description: '[Preview Fixture] Imaginative cosmological fables narrated by the timeless entity Qfwfq through the eras of the Big Bang, solar genesis, and cellular emergence.',
    publisher: 'Einaudi [Preview]',
    in_store: false,
  },

  // ── 5. Architectural Theory & Spatial Poetics ──
  {
    id: 'demo-arch-01',
    title: 'The Poetics of Space',
    authors: ['Gaston Bachelard'],
    cover_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600',
    language: 'fr',
    published_date: '1958',
    rating: 4.9,
    review_count: 76,
    subjects: ['Architectural Theory & Spatial Poetics', 'Philosophy'],
    description: '[Preview Fixture] A lyrical phenomenological investigation of domestic architecture, the nest, drawers, corners, and the intimate spaces of the soul.',
    publisher: 'PUF [Preview]',
    in_store: true,
  },
  {
    id: 'demo-arch-02',
    title: 'Species of Spaces and Other Pieces',
    authors: ['Georges Perec'],
    cover_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600',
    language: 'fr',
    published_date: '1974',
    rating: 4.7,
    review_count: 34,
    subjects: ['Architectural Theory & Spatial Poetics'],
    description: '[Preview Fixture] An exhaustive taxonomy of spaces: from the page and the bed to the street, the apartment building, the city, and the cosmos.',
    publisher: 'Galilée [Preview]',
    in_store: true,
  },

  // ── 6. History & Lore ──
  {
    id: 'demo-hist-01',
    title: 'The Name of the Rose',
    authors: ['Umberto Eco'],
    cover_url: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=600',
    language: 'it',
    published_date: '1980',
    rating: 4.8,
    review_count: 104,
    subjects: ['History & Lore', 'Fiction', 'Philosophy'],
    description: '[Preview Fixture] A semiotic murder mystery set inside a fourteenth-century Benedictine monastery housing a secret, labyrinthine library.',
    publisher: 'Bompiani [Preview]',
    in_store: true,
  },
  {
    id: 'demo-hist-02',
    title: 'The Cheese and the Worms',
    authors: ['Carlo Ginzburg'],
    cover_url: null, // Fallback cover test case
    language: 'it',
    published_date: '1976',
    rating: 4.6,
    review_count: 48,
    subjects: ['History & Lore'],
    description: '[Preview Fixture] A microhistorical masterpiece uncovering the cosmological universe of a sixteenth-century miller named Menocchio.',
    publisher: 'Einaudi [Preview]',
    in_store: true,
  },

  // ── 7. Poetry & Essays ──
  {
    id: 'demo-poet-01',
    title: 'The Book of Disquiet',
    authors: ['Fernando Pessoa'],
    cover_url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '1982',
    rating: 4.9,
    review_count: 91,
    subjects: ['Poetry & Essays', 'Memoir, Marginalia & Solitude'],
    description: '[Preview Fixture] The melancholy, iridescent prose fragments of assistant bookkeeper Bernardo Soares gazing out over the streets of Lisbon.',
    publisher: 'Ática [Preview]',
    in_store: true,
  },
  {
    id: 'demo-poet-02',
    title: 'Duino Elegies and The Sonnets to Orpheus',
    authors: ['Rainer Maria Rilke'],
    cover_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=600',
    language: 'de',
    published_date: '1923',
    rating: 4.9,
    review_count: 67,
    subjects: ['Poetry & Essays'],
    description: '[Preview Fixture] Monumental metaphysical poetry confronting terror, transcendent beauty, angels, and the transience of earth.',
    publisher: 'Insel-Verlag [Preview]',
    in_store: false,
  },

  // ── 8. Memoir, Marginalia & Solitude ──
  {
    id: 'demo-mem-01',
    title: 'A Pattern Language for Solitude',
    authors: ['Akashic Curator Circle'],
    cover_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '2023',
    rating: 4.8,
    review_count: 29,
    subjects: ['Memoir, Marginalia & Solitude', 'Architectural Theory & Spatial Poetics'],
    description: '[Preview Fixture] Curated fragments on reading sanctuaries, cloistered marginalia, and the intellectual necessity of uninterrupted solitude.',
    publisher: 'Sanctuary Press [Preview]',
    in_store: true,
  },
  {
    id: 'demo-mem-02',
    title: 'Marginalia: Readers Writing in Books',
    authors: ['H. J. Jackson'],
    cover_url: null, // Fallback cover test case
    language: 'en',
    published_date: '2001',
    rating: 4.5,
    review_count: 24,
    subjects: ['Memoir, Marginalia & Solitude'],
    description: '[Preview Fixture] An exploration of the passionate handwritten notes, debates, and drawings left in the margins by centuries of readers.',
    publisher: 'Yale University Press [Preview]',
    in_store: true,
  },
  {
    id: 'demo-mem-03',
    title: 'The Solitary Summer',
    authors: ['Elizabeth von Arnim'],
    cover_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600',
    language: 'en',
    published_date: '1899',
    rating: 4.6,
    review_count: 18,
    subjects: ['Memoir, Marginalia & Solitude'],
    description: '[Preview Fixture] Reflections on spending a summer immersed in nature, books, and deliberate independence from social distraction.',
    publisher: 'Macmillan [Preview]',
    in_store: false,
  },
  {
    id: 'demo-mem-04',
    title: 'The Book of Sand',
    authors: ['Jorge Luis Borges'],
    cover_url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=600',
    language: 'es',
    published_date: '1975',
    rating: 4.7,
    review_count: 36,
    subjects: ['Fiction', 'Philosophy'],
    description: '[Preview Fixture] A monstrous volume with infinite pages that cannot be reopened to the same leaf twice, bought from a mysterious Bible peddler.',
    publisher: 'Emecé [Preview]',
    in_store: true,
  },
];

/**
 * Filter and paginate preview fixtures in local development mode.
 * GUARANTEES zero HTTP calls to Django backend.
 */
export function queryPreviewCatalog(filters: Partial<SearchFilters> = {}): BookSearchResponse {
  let filtered = [...PREVIEW_BOOKS_FIXTURES];

  // 1. Filter by free-text query (q)
  if (filters.q?.trim()) {
    const qLower = filters.q.trim().toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(qLower) ||
        b.authors.some((a) => a.toLowerCase().includes(qLower)) ||
        b.description.toLowerCase().includes(qLower)
    );
  }

  // 2. Filter by subject / discipline
  if (filters.subject?.trim()) {
    const subjectQuery = filters.subject.trim().toLowerCase();
    filtered = filtered.filter((b) =>
      b.subjects.some((s) => s.toLowerCase().includes(subjectQuery) || subjectQuery.includes(s.toLowerCase()))
    );
  }

  // 3. Filter by author
  if (filters.author?.trim()) {
    const authorQuery = filters.author.trim().toLowerCase();
    filtered = filtered.filter((b) =>
      b.authors.some((a) => a.toLowerCase().includes(authorQuery))
    );
  }

  // 4. Filter by language
  if (filters.language?.trim()) {
    filtered = filtered.filter((b) => b.language === filters.language?.trim());
  }

  // 5. Filter by year range
  if (filters.year_from) {
    filtered = filtered.filter(
      (b) => parseInt(b.published_date || '0', 10) >= (filters.year_from || 0)
    );
  }
  if (filters.year_to) {
    filtered = filtered.filter(
      (b) => parseInt(b.published_date || '9999', 10) <= (filters.year_to || 9999)
    );
  }

  // 6. Sort
  if (filters.sort === 'title') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (filters.sort === 'date') {
    filtered.sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));
  }

  // 7. Paginate
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(1, filters.page_size || 12);
  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    count: totalCount,
    next: start + pageSize < totalCount ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: paginated.map((b) => ({
      id: b.id,
      title: b.title,
      authors: b.authors,
      cover_url: b.cover_url,
      language: b.language,
      published_date: b.published_date,
      rating: b.rating,
      review_count: b.review_count,
      in_store: b.in_store,
    })),
  };
}

/**
 * Retrieve a single book detail by ID from preview fixtures.
 */
export function getPreviewBookById(id: string): BookDetail | null {
  const found = PREVIEW_BOOKS_FIXTURES.find((b) => b.id === id);
  if (!found) return null;

  return {
    id: found.id,
    title: found.title,
    authors: found.authors,
    description: found.description,
    identifiers: {
      isbn10: '0140188249',
      isbn13: '978-0-140-18824-0',
    },
    publication: {
      publisher: found.publisher,
      published_date: found.published_date ?? null,
      language: found.language ?? null,
      page_count: 224,
    },
    subjects: found.subjects,
    covers: found.cover_url ? [{ url: found.cover_url, is_primary: true }] : [],
    rating: found.rating,
    review_count: found.review_count,
  };
}

export const PREVIEW_REVIEWS_FIXTURES: BookReview[] = [
  {
    id: 'rev-01',
    book_id: 'demo-phil-01',
    user_id: 'usr-ma-01',
    rating: 5,
    title: 'The architecture of eternity disguised as short prose',
    body: 'Reading Ficciones is less like consuming literature and more like discovering an ancient, forgotten calculus for reality. “The Library of Babel” remains the most haunting distillation of human curiosity and existential dread ever committed to parchment. Essential reading for anyone interested in spatial poetics.',
    contains_spoiler: false,
    helpful_count: 24,
    moderation_status: 'APPROVED',
    created_at: '2024-10-14T10:00:00Z',
    updated_at: '2024-10-14T10:00:00Z',
    author: {
      id: 'usr-ma-01',
      username: 'marcus_aureliano',
      display_name: 'Marcus Aureliano',
    },
  },
  {
    id: 'rev-02',
    book_id: 'demo-phil-01',
    user_id: 'usr-cb-02',
    rating: 5,
    title: 'A masterclass in compression and philosophical rigor',
    body: 'Every paragraph contains enough conceptual density to sustain an entire trilogy. Borges does not waste a single syllable. “The Garden of Forking Paths” in particular anticipates quantum mechanics and multiversal branching with astonishing prescience.',
    contains_spoiler: false,
    helpful_count: 19,
    moderation_status: 'APPROVED',
    created_at: '2024-09-28T14:30:00Z',
    updated_at: '2024-09-28T14:30:00Z',
    author: {
      id: 'usr-cb-02',
      username: 'clara_beauchamp',
      display_name: 'Clara Beauchamp',
    },
  },
  {
    id: 'rev-03',
    book_id: 'demo-phil-01',
    user_id: 'usr-jv-03',
    rating: 4,
    title: 'Dazzling intellect, though intentionally austere',
    body: 'While Borges operates at the absolute peak of conceptual ingenuity, the prose maintains a deliberately formal distance. It is a work to be admired with an analytical lens rather than emotional immersion. Still, an indispensable cornerstone of world literature.',
    contains_spoiler: false,
    helpful_count: 11,
    moderation_status: 'APPROVED',
    created_at: '2024-08-12T09:15:00Z',
    updated_at: '2024-08-12T09:15:00Z',
    author: {
      id: 'usr-jv-03',
      username: 'julian_vance',
      display_name: 'Julian Vance',
    },
  },
];

/**
 * Retrieve preview reviews for demo mode.
 */
export function getPreviewReviews(bookId: string, page = 1, pageSize = 10): BookReviewsResponse {
  // If the bookId matches demo-phil-01, return the sample reviews;
  // otherwise generate standard preview reviews for demo books or empty list.
  const matching = PREVIEW_REVIEWS_FIXTURES.filter(
    (r) => r.book_id === bookId || bookId === 'demo-phil-01' || bookId.includes('ficciones')
  );

  const start = (page - 1) * pageSize;
  const sliced = matching.slice(start, start + pageSize);
  return {
    count: matching.length,
    next: start + pageSize < matching.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: sliced,
  };
}

/**
 * Retrieve aggregate rating for demo mode.
 */
export function getPreviewRating(bookId: string): BookAggregateRating {
  const reviews = PREVIEW_REVIEWS_FIXTURES.filter(
    (r) => r.book_id === bookId || bookId === 'demo-phil-01' || bookId.includes('ficciones')
  );

  if (reviews.length === 0) {
    return {
      average_rating: null,
      rating_count: 0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    };
  }

  const dist: { '1': number; '2': number; '3': number; '4': number; '5': number } = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  let sum = 0;
  reviews.forEach((r) => {
    const key = String(r.rating) as '1' | '2' | '3' | '4' | '5';
    if (dist[key] !== undefined) {
      dist[key] += 1;
    }
    sum += r.rating;
  });

  return {
    average_rating: Number((sum / reviews.length).toFixed(1)),
    rating_count: reviews.length,
    distribution: dist,
  };
}

