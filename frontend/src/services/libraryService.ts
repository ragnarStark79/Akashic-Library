/**
 * Personal Library Service
 * Communicates with the Django /api/library/ endpoints.
 * Integrates reading shelves (WANT_TO_READ, READING, READ) and favorites.
 */

import type { LibraryResponse, LibraryEntry, ReadingStatus } from '@/types/library';
import { getAuthHeaders } from './authService';
import { getDiscoveryDataMode } from './discoveryService';

const BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

// In-memory demo library store for deterministic local testing & development
let demoLibraryEntries: LibraryEntry[] = [
  {
    id: 'lib-entry-1',
    book_id: '6af72791ebebc613760355ec',
    status: 'READING',
    favorited: true,
    created_at: '2026-11-10T10:00:00Z',
    updated_at: '2026-11-14T08:30:00Z',
    book: {
      id: '6af72791ebebc613760355ec',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      cover_url: 'https://covers.openlibrary.org/b/id/10832290-L.jpg',
    },
  },
  {
    id: 'lib-entry-2',
    book_id: '6af72791ebebc613760355ed',
    status: 'WANT_TO_READ',
    favorited: false,
    created_at: '2026-11-11T14:20:00Z',
    updated_at: '2026-11-11T14:20:00Z',
    book: {
      id: '6af72791ebebc613760355ed',
      title: 'The Dispossessed',
      authors: ['Ursula K. Le Guin'],
      cover_url: 'https://covers.openlibrary.org/b/id/10831408-L.jpg',
    },
  },
  {
    id: 'lib-entry-3',
    book_id: '6af760f9ebebc61376035600',
    status: 'READ',
    favorited: true,
    created_at: '2026-11-05T09:15:00Z',
    updated_at: '2026-11-09T18:00:00Z',
    book: {
      id: '6af760f9ebebc61376035600',
      title: 'Invisible Cities',
      authors: ['Italo Calvino'],
      cover_url: null,
    },
  },
];

export function resetDemoLibrary(entries?: LibraryEntry[]) {
  demoLibraryEntries = entries ? [...entries] : [];
}

/**
 * Fetch the authenticated user's library (paginated).
 */
export async function fetchUserLibrary(options?: {
  page?: number;
  pageSize?: number;
  statusFilter?: ReadingStatus | 'ALL';
  signal?: AbortSignal;
}): Promise<LibraryResponse> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('demo_library') === 'empty') {
        return {
          count: 0,
          next: null,
          previous: null,
          results: [],
        };
      }
    }

    let filtered = [...demoLibraryEntries];
    if (options?.statusFilter && options.statusFilter !== 'ALL') {
      filtered = filtered.filter((entry) => entry.status === options.statusFilter);
    }
    return {
      count: filtered.length,
      next: null,
      previous: null,
      results: filtered,
    };
  }

  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.pageSize) params.set('page_size', String(options.pageSize));

  const qs = params.toString();
  const url = `${BASE_URL}/library/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    signal: options?.signal,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Authentication required to access Personal Library.');
    }
    throw new Error('Unable to retrieve Personal Library.');
  }

  const data: LibraryResponse = await res.json();

  // If a client-side filter is specified, filter the results accordingly
  if (options?.statusFilter && options.statusFilter !== 'ALL') {
    const filteredResults = data.results.filter((entry) => entry.status === options.statusFilter);
    return {
      ...data,
      count: filteredResults.length,
      results: filteredResults,
    };
  }

  return data;
}

export class AuthenticationRequiredError extends Error {
  constructor(message = 'Patron authentication required to access personal reading shelf') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = 'Access to this reading shelf entry is restricted') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Retrieve the authenticated user's library entry for a specific book.
 * Returns the LibraryEntry if the book is on the user's shelf, or null if not found (404).
 * Throws AuthenticationRequiredError if patron is unauthenticated (HTTP 401).
 * Throws PermissionDeniedError if shelf entry access is forbidden (HTTP 403).
 * Accepts an optional AbortSignal to support request cancellation on route transitions.
 */
export async function getLibraryEntry(
  bookId: string,
  options?: { signal?: AbortSignal }
): Promise<LibraryEntry | null> {
  // Support explicit test semantics when requested via URL search parameters
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const shelfTest = urlParams.get('shelf_test');
    if (shelfTest === '401') {
      throw new AuthenticationRequiredError('Simulated patron session expired / unauthenticated (HTTP 401)');
    }
    if (shelfTest === '403') {
      throw new PermissionDeniedError('Simulated forbidden reading shelf access (HTTP 403)');
    }
  }

  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    const entry = demoLibraryEntries.find((e) => e.book_id === bookId);
    return entry || null;
  }

  try {
    const res = await fetch(`${BASE_URL}/library/${bookId}/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
      signal: options?.signal,
    });

    // 404 is the expected REST signal that this book is not on the patron's shelf.
    if (res.status === 404) {
      return null;
    }

    // 401 indicates an unauthenticated session or expired credentials.
    if (res.status === 401) {
      throw new AuthenticationRequiredError();
    }

    // 403 indicates a forbidden/restricted access attempt.
    if (res.status === 403) {
      throw new PermissionDeniedError();
    }

    if (!res.ok) {
      throw new Error(`Failed to check shelf membership: HTTP ${res.status}`);
    }

    return (await res.json()) as LibraryEntry;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (
      err instanceof AuthenticationRequiredError ||
      err instanceof PermissionDeniedError ||
      (err instanceof Error && err.message.startsWith('Failed to check shelf membership'))
    ) {
      throw err;
    }
    // Network or other client error
    throw err;
  }
}

/**
 * Add a book to the authenticated user's library with a specific reading status.
 */
export async function addBookToLibrary(
  bookId: string,
  status: ReadingStatus = 'WANT_TO_READ',
  bookSnippet?: { title: string; authors: string[]; cover_url: string | null }
): Promise<LibraryEntry> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    const existingIndex = demoLibraryEntries.findIndex((e) => e.book_id === bookId);
    if (existingIndex >= 0 && demoLibraryEntries[existingIndex]) {
      demoLibraryEntries[existingIndex]!.status = status;
      demoLibraryEntries[existingIndex]!.updated_at = new Date().toISOString();
      return demoLibraryEntries[existingIndex]!;
    }
    const newEntry: LibraryEntry = {
      id: `lib-entry-${Date.now()}`,
      book_id: bookId,
      status,
      favorited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      book: {
        id: bookId,
        title: bookSnippet?.title || 'Unknown Title',
        authors: bookSnippet?.authors || ['Unknown Author'],
        cover_url: bookSnippet?.cover_url || null,
      },
    };
    demoLibraryEntries.unshift(newEntry);
    return newEntry;
  }

  const res = await fetch(`${BASE_URL}/library/${bookId}/add/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  if (res.status === 409) {
    // Already in library; fetch existing or update status
    return updateLibraryEntry(bookId, status);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to add book to library.');
  }

  return (await res.json()) as LibraryEntry;
}

/**
 * Update the reading status of a book already in the library.
 */
export async function updateLibraryEntry(
  bookId: string,
  status: ReadingStatus
): Promise<LibraryEntry> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    const entry = demoLibraryEntries.find((e) => e.book_id === bookId);
    if (!entry) throw new Error('Book not found in library.');
    entry.status = status;
    entry.updated_at = new Date().toISOString();
    return entry;
  }

  const res = await fetch(`${BASE_URL}/library/${bookId}/update/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to update library status.');
  }

  return (await res.json()) as LibraryEntry;
}

/**
 * Remove a book from the authenticated user's library.
 */
export async function removeLibraryEntry(bookId: string): Promise<boolean> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    demoLibraryEntries = demoLibraryEntries.filter((e) => e.book_id !== bookId);
    return true;
  }

  const res = await fetch(`${BASE_URL}/library/${bookId}/remove/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return res.status === 204 || res.ok;
}

/**
 * Toggle favorite flag for a book in the library.
 */
export async function toggleBookFavorite(bookId: string, currentlyFavorited: boolean): Promise<boolean> {
  const mode = getDiscoveryDataMode();

  if (mode === 'demo') {
    const entry = demoLibraryEntries.find((e) => e.book_id === bookId);
    if (entry) {
      entry.favorited = !currentlyFavorited;
    }
    return !currentlyFavorited;
  }

  const endpoint = currentlyFavorited ? 'unfavorite' : 'favorite';
  const method = currentlyFavorited ? 'DELETE' : 'POST';

  const res = await fetch(`${BASE_URL}/library/${bookId}/${endpoint}/`, {
    method,
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return res.ok || res.status === 204;
}
