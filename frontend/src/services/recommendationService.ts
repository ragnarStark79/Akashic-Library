/**
 * Recommendations and External Access Service
 * Integrates with Django recommendation and external link resolution endpoints:
 * - GET /api/recommendations/ (Personalized recommendations)
 * - GET /api/recommendations/books/<book_id>/similar/ (Similar-book recommendations)
 * - GET /api/recommendations/books/<book_id>/external/ (External resources and verified access options)
 */

import type {
  RecommendationResponse,
  RecommendationBook,
  ExternalLinksResponse,
  BookListItem,
} from '@/types/discovery';
import { getAuthHeaders } from './authService';
import { getDiscoveryDataMode } from './discoveryService';

const BASE_URL =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

/**
 * Validates that an external URL has a safe http/https protocol.
 * Rejects javascript:, data:, and malformed URIs.
 */
export function isSafeExternalUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes backend recommendation books into standard BookListItem representation,
 * safely resolving author dictionaries and cover arrays.
 */
export function normalizeRecommendationBook(
  item: RecommendationBook
): BookListItem & { recommendation_reason?: string } {
  // Normalize authors
  let normalizedAuthors: string[] = [];
  if (Array.isArray(item.authors)) {
    normalizedAuthors = item.authors
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a && typeof a === 'object' && 'name' in a) return (a as { name: string }).name;
        return '';
      })
      .filter(Boolean);
  }

  // Normalize cover
  let coverUrl: string | null = item.cover_url || null;
  if (!coverUrl && Array.isArray(item.covers) && item.covers.length > 0) {
    const firstCover = item.covers[0];
    if (typeof firstCover === 'string') {
      coverUrl = firstCover;
    } else if (firstCover && typeof firstCover === 'object' && 'url' in firstCover) {
      // Find primary cover if available
      const primary = (item.covers as Array<{ url: string; is_primary?: boolean }>).find(
        (c) => c.is_primary
      );
      coverUrl = primary ? primary.url : (firstCover as { url: string }).url;
    }
  }

  return {
    id: item.id,
    title: item.title,
    authors: normalizedAuthors.length ? normalizedAuthors : ['Unknown Author'],
    cover_url: coverUrl,
    language: null,
    published_date: null,
    rating: item.rating ?? null,
    review_count: item.review_count ?? 0,
    recommendation_reason: item.recommendation_reason,
  };
}

/**
 * Fetch personalized recommendations for the authenticated user.
 */
export async function fetchPersonalizedRecommendations(options?: {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<RecommendationResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return {
      count: 2,
      page: options?.page || 1,
      page_size: options?.pageSize || 10,
      results: [
        {
          id: '6af72791ebebc613760355ec',
          title: 'Ficciones',
          authors: [{ name: 'Jorge Luis Borges' }],
          covers: [{ url: 'https://covers.openlibrary.org/b/id/10832290-L.jpg', is_primary: true }],
          subjects: ['Short Stories', 'Magical Realism'],
          recommendation_reason: 'Because you like related subjects',
        },
        {
          id: '6af72791ebebc613760355ed',
          title: 'The Dispossessed',
          authors: [{ name: 'Ursula K. Le Guin' }],
          covers: [{ url: 'https://covers.openlibrary.org/b/id/10831408-L.jpg', is_primary: true }],
          subjects: ['Science Fiction', 'Utopian'],
          recommendation_reason: 'Popular in Akashic Library',
        },
      ],
    };
  }

  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.pageSize) params.set('page_size', String(options.pageSize));

  const qs = params.toString();
  const url = `${BASE_URL}/recommendations/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
    signal: options?.signal,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Authentication required for personalized recommendations.');
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Unable to retrieve personalized recommendations.');
  }

  return (await res.json()) as RecommendationResponse;
}

/**
 * Fetch books similar to a target book.
 */
export async function fetchSimilarBooks(
  bookId: string,
  options?: {
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
  }
): Promise<RecommendationResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return {
      count: 1,
      page: options?.page || 1,
      page_size: options?.pageSize || 10,
      results: [
        {
          id: '6af760f9ebebc61376035600',
          title: 'Invisible Cities',
          authors: [{ name: 'Italo Calvino' }],
          covers: [],
          subjects: ['Magical Realism', 'Architecture'],
          recommendation_reason: 'Similar to this book',
        },
      ],
    };
  }

  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.pageSize) params.set('page_size', String(options.pageSize));

  const qs = params.toString();
  const url = `${BASE_URL}/recommendations/books/${bookId}/similar/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    signal: options?.signal,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Unable to retrieve similar books.');
  }

  return (await res.json()) as RecommendationResponse;
}

/**
 * Fetch external links and verified access options for a book.
 */
export async function fetchExternalLinks(
  bookId: string,
  options?: { signal?: AbortSignal }
): Promise<ExternalLinksResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    return {
      open_library: 'https://openlibrary.org',
      access_options: [
        {
          type: 'INFORMATION',
          label: 'Open Library Catalogue Record',
          provider: 'Open Library',
          url: 'https://openlibrary.org',
          availability: 'Online Record',
          description: 'Bibliographic catalogue record and metadata.',
        },
      ],
    };
  }

  const url = `${BASE_URL}/recommendations/books/${bookId}/external/`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    signal: options?.signal,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Unable to retrieve external links.');
  }

  return (await res.json()) as ExternalLinksResponse;
}
