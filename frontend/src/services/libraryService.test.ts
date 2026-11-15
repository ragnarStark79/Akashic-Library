import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLibraryEntry,
  AuthenticationRequiredError,
  PermissionDeniedError,
} from './libraryService';

describe('libraryService - getLibraryEntry', () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('200: returns parsed LibraryEntry when book is on user reading shelf', async () => {
    const mockEntry = {
      id: 'entry-123',
      book_id: 'book-abc',
      status: 'READING',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockEntry,
    } as Response);

    const result = await getLibraryEntry('book-abc');
    expect(result).toEqual(mockEntry);
  });

  it('404: returns null for verified missing reading shelf entry', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not on user shelf' }),
    } as Response);

    const result = await getLibraryEntry('book-missing');
    expect(result).toBeNull();
  });

  it('401: throws AuthenticationRequiredError on unauthenticated session failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Authentication required' }),
    } as Response);

    await expect(getLibraryEntry('book-abc')).rejects.toThrow(
      AuthenticationRequiredError
    );
  });

  it('403: throws PermissionDeniedError on forbidden authorization failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Forbidden access' }),
    } as Response);

    await expect(getLibraryEntry('book-abc')).rejects.toThrow(
      PermissionDeniedError
    );
  });

  it('500: throws Error when server encounters internal error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Internal server error' }),
    } as Response);

    await expect(getLibraryEntry('book-abc')).rejects.toThrow(
      'Failed to check shelf membership: HTTP 500'
    );
  });

  it('Network Error: propagates fetch network rejection', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getLibraryEntry('book-abc')).rejects.toThrow('Failed to fetch');
  });
});
