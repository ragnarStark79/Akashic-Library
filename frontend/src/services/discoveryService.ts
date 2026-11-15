import type {
  BookListItem,
  BookDetail,
  BookDetailCover,
  BookSearchResponse,
  SearchFilters,
  GenreInfo,
  BookReview,
  BookReviewsResponse,
  BookAggregateRating,
  CreateReviewPayload,
  UpdateReviewPayload,
  ReviewReply,
  AddToLibraryResult,
  BookAnnotation,
  CreateAnnotationPayload,
  UpdateAnnotationPayload,
  AnnotationListResponse,
} from '../types/discovery';
import {
  queryPreviewCatalog,
  getPreviewBookById,
  PREVIEW_BOOKS_FIXTURES,
  getPreviewReviews,
  getPreviewRating,
} from './previewFixtures';

const BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export type DiscoveryDataMode = 'demo' | 'api';

/**
 * Determine the active data mode for the Discovery frontend.
 * - 'demo': Uses deterministic local fixtures exclusively; zero HTTP requests to Django.
 * - 'api': Communicates with live Django backend endpoints (/api/books/...).
 */
export function getDiscoveryDataMode(): DiscoveryDataMode {
  const envMode = (import.meta.env?.VITE_DISCOVERY_DATA_MODE as string | undefined)?.toLowerCase();
  if (envMode === 'demo') return 'demo';
  if (envMode === 'api') return 'api';
  // In production builds, default to real API mode unless explicitly configured otherwise
  if (import.meta.env?.PROD) return 'api';
  // In development, default to demo mode for stable, isolated UI development
  return 'demo';
}

export interface DiscoveryRequestOptions {
  signal?: AbortSignal;
}

export const APPROVED_GENRES: GenreInfo[] = [
  {
    id: 'fiction',
    name: 'Fiction',
    description: 'Literary narratives, classical prose, and inventive short stories from timeless traditions.',
    iconName: 'book',
    subgenres: ['Literary Fiction', 'Short Stories', 'Magical Realism', 'Modernist Prose'],
    sampleThemes: ['Identity & Memory', 'The Human Condition', 'Allegorical Journeys'],
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    description: 'Ontological investigations, existential inquiry, ethics, and epistemology across centuries.',
    iconName: 'circle',
    subgenres: ['Metaphysics', 'Continental Philosophy', 'Ethics', 'Phenomenology'],
    sampleThemes: ['Consciousness & Void', 'Labyrinths & Mirrors', 'Time & Recurrence'],
  },
  {
    id: 'science-fiction',
    name: 'Science Fiction',
    description: 'Speculative horizons, cosmic scale, time dilation, and encounters with alien wonder.',
    iconName: 'orbit',
    subgenres: ['Cosmic Lore', 'Utopian Thought', 'Cybernetics', 'Temporal Paradox'],
    sampleThemes: ['Counterfactual Realities', 'Sentient Cosms', 'Technological Transcendence'],
  },
  {
    id: 'history',
    name: 'History & Lore',
    description: 'Chronicles of ancient civilizations, archival manuscripts, and historical shifts.',
    iconName: 'scroll',
    subgenres: ['Ancient World', 'Cultural Histories', 'Historical Essays', 'Archaeology'],
    sampleThemes: ['Empires & Ruins', 'Preservation of Codexes', 'Historiography'],
  },
  {
    id: 'poetry',
    name: 'Poetry & Essays',
    description: 'Lyrical reflections, metaphysical verse, aphorisms, and contemplative prose.',
    iconName: 'pen-tool',
    subgenres: ['Metaphysical Verse', 'Modernist Poetry', 'Literary Criticism', 'Aphorisms'],
    sampleThemes: ['Elegiac Reverie', 'Concise Conceits', 'The Sublime in Nature'],
  },
  {
    id: 'science',
    name: 'Natural Philosophy & Cosmology',
    description: 'Treatises on celestial mechanics, mathematical reality, cosmology, and the laws of nature.',
    iconName: 'atom',
    subgenres: ['Cosmology', 'Theoretical Physics', 'Mathematics', 'Biophilia'],
    sampleThemes: ['Quantum Mystery', 'The Flow of Time', 'Structure of the Cosmos'],
  },
  {
    id: 'architecture',
    name: 'Architectural Theory & Spatial Poetics',
    description: 'The metaphysics of spaces, memory in rooms, imaginary cities, and structural form.',
    iconName: 'compass',
    subgenres: ['Spatial Memory', 'Urban Poetics', 'Architectural Form', 'Invisible Cities'],
    sampleThemes: ['Poetics of Space', 'Constructed Sanctuaries', 'Labyrinthine Design'],
  },
  {
    id: 'memoir',
    name: 'Memoir, Marginalia & Solitude',
    description: 'Personal journals, reflections from cloistered studies, and reader marginalia.',
    iconName: 'bookmark',
    subgenres: ['Diaries', 'Epistolary', 'Essays on Solitude', 'Autobiographical Fragments'],
    sampleThemes: ['Solitary Contemplation', 'Life in the Stacks', 'The Art of Reading'],
  },
];

// Fallback catalog alias for backwards compatibility
export const CATALOG_FALLBACK: BookListItem[] = PREVIEW_BOOKS_FIXTURES;

/**
 * Fetch books matching filters.
 * In demo mode, queries local deterministic preview fixtures without network calls.
 * In api mode, initiates an HTTP request to the Django backend.
 */
export async function fetchBooks(
  filters: Partial<SearchFilters> = {},
  options?: DiscoveryRequestOptions
): Promise<BookSearchResponse> {
  const mode = getDiscoveryDataMode();

  // ── DEMO PREVIEW MODE: ZERO NETWORK CALLS ──
  if (mode === 'demo') {
    return queryPreviewCatalog(filters);
  }

  // ── LIVE API MODE: ACTUAL DJANGO BACKEND REQUEST ──
  const params = new URLSearchParams();

  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.title?.trim()) params.set('title', filters.title.trim());
  if (filters.subject?.trim()) params.set('subject', filters.subject.trim());
  if (filters.author?.trim()) params.set('author', filters.author.trim());
  if (filters.isbn?.trim()) params.set('isbn', filters.isbn.trim());
  if (filters.language?.trim()) params.set('language', filters.language.trim());
  if (filters.year_from) params.set('year_from', filters.year_from.toString());
  if (filters.year_to) params.set('year_to', filters.year_to.toString());
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.page_size) params.set('page_size', filters.page_size.toString());
  if (filters.featured) params.set('featured', 'true');

  const url = `${BASE_URL}/books/?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: options?.signal,
    });

    if (response.ok) {
      const data = await response.json();
      let results: BookListItem[] = data.results || (Array.isArray(data) ? data : []);

      if (filters.sort) {
        results = sortBooks(results, filters.sort);
      }

      return {
        count: typeof data.count === 'number' ? data.count : results.length,
        upstream_count: typeof data.upstream_count === 'number' ? data.upstream_count : null,
        next: data.next || null,
        previous: data.previous || null,
        results,
      };
    }
  } catch (err: unknown) {
    // If request was deliberately aborted, re-throw so the caller can ignore it
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    // Return empty results on API network/server errors; do not mask with demo fixtures
  }

  // In live API mode, return honest empty results if backend returned error or no matching folios
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
}

/**
 * Extract primary cover URL safely from either BookListItem or BookDetail.
 */
export function getPrimaryCoverUrl(book: BookDetail | BookListItem | null): string | null {
  if (!book) return null;
  if ('cover_url' in book && book.cover_url) return book.cover_url;
  if ('covers' in book && Array.isArray(book.covers) && book.covers.length > 0) {
    const first = book.covers[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first && 'url' in first) {
      return (first as BookDetailCover).url || null;
    }
  }
  return null;
}

/**
 * Fetch a single book detail by ID.
 */
export async function fetchBookById(
  id: string,
  options?: DiscoveryRequestOptions
): Promise<BookDetail | null> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo' || id.startsWith('demo-')) {
    return getPreviewBookById(id);
  }

  try {
    const response = await fetch(`${BASE_URL}/books/${id}/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options?.signal,
    });
    if (response.ok) {
      const data = await response.json();
      // Normalize description if backend returns structured object { type, value }
      if (data.description && typeof data.description === 'object' && 'value' in data.description) {
        data.description = (data.description as { value: string }).value;
      }
      return data;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
  }

  return null;
}

/**
 * Fetch community reviews for a single book.
 */
export async function fetchBookReviews(
  bookId: string,
  options?: DiscoveryRequestOptions & { page?: number; page_size?: number }
): Promise<BookReviewsResponse> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return getPreviewReviews(bookId, options?.page, options?.page_size);
  }
  try {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.page_size) params.set('page_size', String(options.page_size));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${BASE_URL}/books/${bookId}/reviews/${qs}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options?.signal,
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
  }
  return { count: 0, next: null, previous: null, results: [] };
}

/**
 * Fetch aggregate rating metrics for a single book.
 */
export async function fetchBookRating(
  bookId: string,
  options?: DiscoveryRequestOptions
): Promise<BookAggregateRating> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return getPreviewRating(bookId);
  }
  try {
    const response = await fetch(`${BASE_URL}/books/${bookId}/rating/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options?.signal,
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
  }
  return {
    average_rating: null,
    rating_count: 0,
    distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  };
}

/**
 * Submit a reader review / contemplation for a book via authenticated Django endpoint.
 */
export async function createBookReview(
  bookId: string,
  payload: CreateReviewPayload
): Promise<BookReview> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo') {
    return {
      id: `preview-rev-${Date.now()}`,
      book_id: bookId,
      user_id: 'demo-user-id',
      rating: payload.rating,
      title: payload.title || null,
      body: payload.body,
      contains_spoiler: Boolean(payload.contains_spoiler),
      helpful_count: 0,
      moderation_status: 'APPROVED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: 'demo-user-id',
        username: 'patron_preview',
        display_name: 'Patron Preview',
      },
    };
  }

  const csrfMatch =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
      : null;
  const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/reviews/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (response.status === 201) {
    return (await response.json()) as BookReview;
  }

  if (response.status === 409) {
    throw new Error('You have already submitted a review for this book.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication required to submit a review.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = 'Invalid review submission.';
    if (typeof errorData === 'object' && errorData !== null) {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to submit review (${response.status})`);
}

/**
 * Fetch the authenticated user's own review for a specific book.
 * Returns null if the user has not reviewed this book, or is unauthenticated.
 */
export async function fetchMyReview(bookId: string): Promise<BookReview | null> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/books/${bookId}/my-review/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    });

    if (response.status === 404 || response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch patron review (${response.status})`);
    }

    return (await response.json()) as BookReview;
  } catch (err) {
    if (err instanceof Error && err.message.includes('patron review')) {
      throw err;
    }
    return null;
  }
}

/**
 * Update an existing review authored by the current user.
 */
export async function updateBookReview(
  bookId: string,
  reviewId: string,
  payload: UpdateReviewPayload
): Promise<BookReview> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return {
      id: reviewId,
      book_id: bookId,
      user_id: 'demo-user-id',
      rating: payload.rating || 5,
      title: payload.title !== undefined ? payload.title : 'Updated Review',
      body: payload.body || 'Updated reflection text.',
      contains_spoiler: Boolean(payload.contains_spoiler),
      helpful_count: 0,
      moderation_status: 'APPROVED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: 'demo-user-id',
        username: 'patron_preview',
        display_name: 'Patron Preview',
      },
    };
  }

  const csrfMatch =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
      : null;
  const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/reviews/${reviewId}/update/`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return (await response.json()) as BookReview;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('You do not have permission to edit this review.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = 'Invalid review update.';
    if (typeof errorData === 'object' && errorData !== null) {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to update review (${response.status})`);
}

/**
 * Delete an existing review authored by the current user.
 */
export async function deleteBookReview(bookId: string, reviewId: string): Promise<void> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return;
  }

  const csrfMatch =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
      : null;
  const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/reviews/${reviewId}/delete/`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (response.status === 204 || response.status === 200) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('You do not have permission to delete this review.');
  }

  if (response.status === 404) {
    throw new Error('Review not found or already removed.');
  }

  throw new Error(`Failed to delete review (${response.status})`);
}

/**
 * Fetch all replies for a review.
 */
export async function fetchReviewReplies(bookId: string, reviewId: string): Promise<ReviewReply[]> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return [];
  }

  try {
    const response = await fetch(`${BASE_URL}/books/${bookId}/reviews/${reviewId}/replies/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch replies (${response.status})`);
    }

    return (await response.json()) as ReviewReply[];
  } catch (err) {
    if (err instanceof Error && err.message.includes('fetch replies')) {
      throw err;
    }
    return [];
  }
}

/**
 * Submit a reply to an approved review.
 */
export async function createReviewReply(
  bookId: string,
  reviewId: string,
  body: string
): Promise<ReviewReply> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return {
      id: `rep-${Date.now()}`,
      review_id: reviewId,
      book_id: bookId,
      user_id: 'demo-user-id',
      body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: 'demo-user-id',
        username: 'patron_preview',
        display_name: 'Patron Preview',
      },
    };
  }

  const csrfMatch =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
      : null;
  const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/reviews/${reviewId}/replies/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ body }),
  });

  if (response.status === 201) {
    return (await response.json()) as ReviewReply;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication required to reply to reviews.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = 'Invalid reply submission.';
    if (errorData && typeof errorData === 'object') {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to submit reply (${response.status})`);
}

/**
 * Delete an existing reply authored by the current user.
 */
export async function deleteReviewReply(
  bookId: string,
  reviewId: string,
  replyId: string
): Promise<void> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return;
  }

  const csrfMatch =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
      : null;
  const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(
    `${BASE_URL}/books/${bookId}/reviews/${reviewId}/replies/${replyId}/delete/`,
    {
      method: 'DELETE',
      headers,
      credentials: 'include',
    }
  );

  if (response.status === 204 || response.status === 200) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('You do not have permission to delete this reply.');
  }

  if (response.status === 404) {
    throw new Error('Reply not found or already removed.');
  }

  throw new Error(`Failed to delete reply (${response.status})`);
}


/**
 * Add book to patron reading shelf via authenticated Django endpoint.
 * Returns honest authentication-aware feedback without fake persistence.
 */
export async function addBookToShelf(
  bookId: string,
  shelfStatus: 'WANT_TO_READ' | 'READING' | 'READ' = 'WANT_TO_READ'
): Promise<AddToLibraryResult> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo') {
    return {
      success: false,
      requiresAuth: true,
      message:
        'Patron Authentication Required: Adding folios to your Personal Reading Shelf requires signing in to your Akashic sanctuary account.',
    };
  }

  try {
    const csrfMatch =
      typeof document !== 'undefined'
        ? document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
        : null;
    const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    const response = await fetch(`${BASE_URL}/library/${bookId}/add/`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status: shelfStatus }),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        requiresAuth: true,
        message:
          'Patron Authentication Required: Adding folios to your Personal Reading Shelf requires signing in to your Akashic sanctuary account.',
      };
    }

    if (response.status === 201 || response.status === 200) {
      return {
        success: true,
        message: 'Folio successfully preserved in your personal Scriptorium reading shelf.',
      };
    }

    if (response.status === 409) {
      return {
        success: true,
        message: 'This folio is already preserved in your reading shelf.',
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: false,
      message: data.detail || 'Unable to add folio to reading shelf.',
    };
  } catch {
    return {
      success: false,
      message: 'Network error communicating with the library catalog.',
    };
  }
}

/**
 * Fetch related books for a given book using verified subjects and/or author.
 * Excludes the current book and deduplicates.
 */
export async function fetchRelatedBooks(
  book: BookDetail,
  options?: DiscoveryRequestOptions
): Promise<BookListItem[]> {
  const mode = getDiscoveryDataMode();

  // Pick primary specific subject
  let primarySubject: string | undefined;
  if (book.subjects && book.subjects.length > 0) {
    const specific = book.subjects.find(
      (s) => s.length > 4 && !['fiction', 'general', 'readers'].includes(s.toLowerCase())
    );
    primarySubject = specific || book.subjects[0];
  }

  const author = book.authors && book.authors.length > 0 ? book.authors[0] : undefined;
  let results: BookListItem[] = [];

  if (primarySubject) {
    try {
      const res = await fetchBooks({ subject: primarySubject, page_size: 8 }, options);
      results = res.results.filter((b) => b.id !== book.id);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  if (results.length < 3 && author) {
    try {
      const authorRes = await fetchBooks({ author, page_size: 8 }, options);
      const authorFiltered = authorRes.results.filter(
        (b) => b.id !== book.id && !results.some((existing) => existing.id === b.id)
      );
      results = [...results, ...authorFiltered];
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  if (results.length === 0 && mode === 'demo') {
    results = PREVIEW_BOOKS_FIXTURES.filter((b) => b.id !== book.id).slice(0, 5);
  }

  const uniqueMap = new Map<string, BookListItem>();
  for (const item of results) {
    if (item.id !== book.id && !uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  }

  return Array.from(uniqueMap.values()).slice(0, 5);
}

/**
 * Fetch featured books for the Discovery homepage spotlight.
 */
export async function fetchFeaturedBooks(
  options?: DiscoveryRequestOptions
): Promise<BookListItem[]> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return queryPreviewCatalog({ page_size: 4 }).results;
  }

  try {
    const res = await fetchBooks({ page_size: 4, featured: true }, options);
    if (res.results.length > 0) {
      return res.results.slice(0, 4);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
  }

  return [];
}

export function fetchGenres(): GenreInfo[] {
  return APPROVED_GENRES;
}

function sortBooks(books: BookListItem[], sort: 'relevance' | 'title' | 'date'): BookListItem[] {
  const clone = [...books];
  if (sort === 'title') {
    return clone.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === 'date') {
    return clone.sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));
  }
  return clone;
}

// ─── Phase 5B.2: Reading Room & Annotations Service ─────────────────────────

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch public shared annotations for a book.
 */
export async function fetchSharedAnnotations(
  bookId: string,
  params?: { page?: number; page_size?: number; sort?: string; signal?: AbortSignal }
): Promise<AnnotationListResponse> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return {
      count: 0,
      page: 1,
      page_size: params?.page_size || 20,
      results: [],
    };
  }

  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));
  if (params?.sort) query.set('sort', params.sort);

  const qs = query.toString();
  const url = `${BASE_URL}/books/${bookId}/annotations/${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal: params?.signal,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { count: 0, page: 1, page_size: params?.page_size || 20, results: [] };
    }
    throw new Error(`Failed to fetch shared annotations (${response.status})`);
  }

  return (await response.json()) as AnnotationListResponse;
}

/**
 * Fetch authenticated user's annotations (private and shared) for a book.
 */
export async function fetchMyAnnotations(
  bookId: string,
  params?: { visibility?: string; sort?: string; signal?: AbortSignal }
): Promise<AnnotationListResponse> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return {
      count: 0,
      counts: {
        shared_count: 0,
        my_private_count: 0,
        my_shared_count: 0,
        my_total_count: 0,
      },
      results: [],
    };
  }

  const query = new URLSearchParams();
  if (params?.visibility) query.set('visibility', params.visibility);
  if (params?.sort) query.set('sort', params.sort);

  const qs = query.toString();
  const url = `${BASE_URL}/books/${bookId}/my-annotations/${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal: params?.signal,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      return {
        count: 0,
        counts: {
          shared_count: 0,
          my_private_count: 0,
          my_shared_count: 0,
          my_total_count: 0,
        },
        results: [],
      };
    }
    throw new Error(`Failed to fetch patron annotations (${response.status})`);
  }

  return (await response.json()) as AnnotationListResponse;
}

/**
 * Fetch a single annotation by ID.
 */
export async function fetchBookAnnotation(
  bookId: string,
  annotationId: string,
  signal?: AbortSignal
): Promise<BookAnnotation> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    throw new Error('Not available in demo mode');
  }

  const url = `${BASE_URL}/books/${bookId}/annotations/${annotationId}/`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch annotation (${response.status})`);
  }

  return (await response.json()) as BookAnnotation;
}

/**
 * Inscribe a new annotation for a book.
 */
export async function createBookAnnotation(
  bookId: string,
  payload: CreateAnnotationPayload
): Promise<BookAnnotation> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    const now = new Date().toISOString();
    return {
      id: `demo-ann-${Date.now()}`,
      book_id: bookId,
      user_id: 'demo-user-id',
      content: payload.content,
      visibility: payload.visibility || 'PRIVATE',
      page_reference: payload.page_reference || null,
      chapter_reference: payload.chapter_reference || null,
      passage_excerpt: payload.passage_excerpt || null,
      created_at: now,
      updated_at: now,
      author: {
        id: 'demo-user-id',
        username: 'patron_preview',
        display_name: 'Patron Preview',
      },
    };
  }

  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/annotations/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return (await response.json()) as BookAnnotation;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Patron authentication required to inscribe annotations.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = 'Invalid annotation submission.';
    if (typeof errorData === 'object' && errorData !== null) {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to create annotation (${response.status})`);
}

/**
 * Update an existing annotation owned by the current user.
 */
export async function updateBookAnnotation(
  bookId: string,
  annotationId: string,
  payload: UpdateAnnotationPayload
): Promise<BookAnnotation> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    const now = new Date().toISOString();
    return {
      id: annotationId,
      book_id: bookId,
      user_id: 'demo-user-id',
      content: payload.content || 'Updated note.',
      visibility: payload.visibility || 'PRIVATE',
      page_reference: payload.page_reference || null,
      chapter_reference: payload.chapter_reference || null,
      passage_excerpt: payload.passage_excerpt || null,
      created_at: now,
      updated_at: now,
      author: {
        id: 'demo-user-id',
        username: 'patron_preview',
        display_name: 'Patron Preview',
      },
    };
  }

  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/annotations/${annotationId}/`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return (await response.json()) as BookAnnotation;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('You do not have permission to edit this annotation.');
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    let msg = 'Invalid annotation update.';
    if (typeof errorData === 'object' && errorData !== null) {
      const details = Object.entries(errorData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join('; ');
      if (details) msg = details;
    }
    throw new Error(msg);
  }

  throw new Error(`Failed to update annotation (${response.status})`);
}

/**
 * Delete an existing annotation owned by the current user.
 */
export async function deleteBookAnnotation(bookId: string, annotationId: string): Promise<void> {
  const mode = getDiscoveryDataMode();
  if (mode === 'demo' || bookId.startsWith('demo-')) {
    return;
  }

  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${BASE_URL}/books/${bookId}/annotations/${annotationId}/`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (response.ok || response.status === 204) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('You do not have permission to delete this annotation.');
  }

  throw new Error(`Failed to delete annotation (${response.status})`);
}

