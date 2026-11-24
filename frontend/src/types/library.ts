/**
 * Personal Library Types
 * Conforms strictly to the Django /api/library/ contract.
 */

export type ReadingStatus = 'WANT_TO_READ' | 'READING' | 'READ' | 'ABANDONED';

export interface LibraryBookSnippet {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
}

export interface LibraryEntry {
  id: string;
  book_id: string;
  status: ReadingStatus;
  favorited: boolean;
  created_at: string;
  updated_at: string;
  book: LibraryBookSnippet;
}

export interface LibraryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LibraryEntry[];
}

export interface AddLibraryPayload {
  status: ReadingStatus;
}

export interface UpdateLibraryPayload {
  status: ReadingStatus;
}

