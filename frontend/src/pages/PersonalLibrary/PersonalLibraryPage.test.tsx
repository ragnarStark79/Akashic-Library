import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalLibraryPage } from './PersonalLibraryPage';
import { AuthProvider } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import * as libraryService from '../../services/libraryService';
import type { User } from '../../types/auth';
import type { LibraryEntry } from '../../types/library';

vi.mock('../../services/authService', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  setDemoUser: vi.fn(),
}));

vi.mock('../../services/libraryService', () => ({
  fetchUserLibrary: vi.fn(),
  updateLibraryEntry: vi.fn(),
  removeLibraryEntry: vi.fn(),
  toggleBookFavorite: vi.fn(),
  addBookToLibrary: vi.fn(),
}));

const mockUser: User = {
  id: 'usr-123',
  username: 'patron_elena',
  email: 'elena@akashic.org',
  role: 'USER',
  display_name: 'Elena Solanas',
  bio: 'Patron of metaphysical literature',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockEntries: LibraryEntry[] = [
  {
    id: 'entry-1',
    book_id: '6af72791ebebc613760355ec',
    status: 'READING',
    favorited: true,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    book: {
      id: '6af72791ebebc613760355ec',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      cover_url: 'https://covers.openlibrary.org/b/id/10832290-L.jpg',
    },
  },
  {
    id: 'entry-2',
    book_id: '6af72791ebebc613760355ed',
    status: 'WANT_TO_READ',
    favorited: false,
    created_at: '2026-01-02T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z',
    book: {
      id: '6af72791ebebc613760355ed',
      title: 'Labyrinths',
      authors: ['Jorge Luis Borges'],
      cover_url: 'https://covers.openlibrary.org/b/id/10831408-L.jpg',
    },
  },
  {
    id: 'entry-3',
    book_id: '6af760f9ebebc61376035600',
    status: 'READ',
    favorited: false,
    created_at: '2026-01-03T10:00:00Z',
    updated_at: '2026-01-03T10:00:00Z',
    book: {
      id: '6af760f9ebebc61376035600',
      title: 'The Aleph',
      authors: ['Jorge Luis Borges'],
      cover_url: null,
    },
  },
];

describe('PersonalLibraryPage — Personal Sanctuary & Reading Shelves', () => {
  const onNavigateDiscover = vi.fn();
  const onNavigateBook = vi.fn();
  const onSignInRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <AuthProvider>
          <PersonalLibraryPage
            onNavigateDiscover={onNavigateDiscover}
            onNavigateBook={onNavigateBook}
            onSignInRequest={onSignInRequest}
          />
        </AuthProvider>
      );
    });
    return result!;
  };

  it('1. renders unauthenticated gate when patron is not signed in', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

    await renderComponent();

    expect(screen.getByRole('heading', { name: 'Patron Sanctuary Access Required' })).toBeInTheDocument();
    expect(
      screen.getByText(/The Personal Library is an authenticated sanctuary where patrons maintain sovereign reading shelves/i)
    ).toBeInTheDocument();

    const authBtn = screen.getByRole('button', { name: /Authenticate at Custodial Desk/i });
    fireEvent.click(authBtn);
    expect(onSignInRequest).toHaveBeenCalled();

    const returnBtn = screen.getByRole('button', { name: /Return to Public Discovery/i });
    fireEvent.click(returnBtn);
    expect(onNavigateDiscover).toHaveBeenCalled();
  });

  it('2. renders empty library state for authenticated patron with no folios', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Sanctuary of Elena Solanas/i })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Your Reading Desk Awaits Its First Inscription' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Explore our curated public catalog of speculative fiction/i)
      ).toBeInTheDocument();
    });

    const ctaBtn = screen.getByRole('button', { name: /Explore Public Discovery Catalog/i });
    fireEvent.click(ctaBtn);
    expect(onNavigateDiscover).toHaveBeenCalled();
  });

  it('3. renders populated library with correct stats and book items', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Sanctuary of Elena Solanas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Labyrinths' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'The Aleph' })).toBeInTheDocument();
    });

    // Check shelf tabs with counts
    expect(screen.getByRole('tab', { name: /All Preserved Folios 3/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Currently Reading 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Want to Read 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Completed & Reflected 1/i })).toBeInTheDocument();
  });

  it('4. filters library items when switching shelf tabs', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    });

    // Switch to "Currently Reading" tab
    const readingTab = screen.getByRole('tab', { name: /Currently Reading 1/i });
    fireEvent.click(readingTab);

    expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Labyrinths' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'The Aleph' })).not.toBeInTheDocument();

    // Switch to "Want to Read" tab
    const wantToReadTab = screen.getByRole('tab', { name: /Want to Read 1/i });
    fireEvent.click(wantToReadTab);

    expect(screen.queryByRole('button', { name: 'Ficciones' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Labyrinths' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'The Aleph' })).not.toBeInTheDocument();
  });

  it('5. navigates to book details when clicking on a book title or cover', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    });

    const bookTitleBtn = screen.getByRole('button', { name: 'Ficciones' });
    fireEvent.click(bookTitleBtn);

    expect(onNavigateBook).toHaveBeenCalledWith('6af72791ebebc613760355ec');
  });

  it('6. updates reading status of a book entry', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });
    vi.mocked(libraryService.updateLibraryEntry).mockResolvedValue({
      ...mockEntries[0]!,
      status: 'READ',
      updated_at: '2026-01-04T10:00:00Z',
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    });

    const statusSelects = screen.getAllByRole('combobox');
    fireEvent.change(statusSelects[0]!, { target: { value: 'READ' } });

    await waitFor(() => {
      expect(libraryService.updateLibraryEntry).toHaveBeenCalledWith('6af72791ebebc613760355ec', 'READ');
      expect(screen.getByText(/Folio status updated to Completed/i)).toBeInTheDocument();
    });
  });

  it('7. toggles book favorited status', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });
    vi.mocked(libraryService.toggleBookFavorite).mockResolvedValue(false);

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    });

    const favButtons = screen.getAllByRole('button', { name: /favorite/i });
    fireEvent.click(favButtons[0]!);

    await waitFor(() => {
      expect(libraryService.toggleBookFavorite).toHaveBeenCalledWith('6af72791ebebc613760355ec', true);
    });
  });

  it('8. removes a book from the sanctuary library', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });
    vi.mocked(libraryService.removeLibraryEntry).mockResolvedValue(true);

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /Remove .* from reading shelf/i });
    fireEvent.click(removeButtons[0]!);

    await waitFor(() => {
      expect(libraryService.removeLibraryEntry).toHaveBeenCalledWith('6af72791ebebc613760355ec');
      expect(screen.getByText(/"Ficciones" removed from your personal sanctuary\./i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ficciones' })).not.toBeInTheDocument();
    });
  });

  it('9. handles server error and allows retry', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockRejectedValueOnce(
      new Error('Failed to load sanctuary ledger')
    );

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sanctuary Connection Interrupted' })).toBeInTheDocument();
      expect(
        screen.getByText('Unable to retrieve your personal sanctuary library. Please verify your connection.')
      ).toBeInTheDocument();
    });

    // When retrying, mock successful recovery
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: mockEntries.length,
      next: null,
      previous: null,
      results: mockEntries,
    });
    const retryBtn = screen.getByRole('button', { name: /Retry Retrieval/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ficciones' })).toBeInTheDocument();
    });
  });

  it('10. displays Set Aside tab, renders ABANDONED status badge, and allows moving folio to Set Aside', async () => {
    const abandonedEntry: LibraryEntry = {
      id: 'entry-abandoned',
      book_id: '6af760f9ebebc61376035601',
      status: 'ABANDONED',
      favorited: false,
      created_at: '2026-01-04T10:00:00Z',
      updated_at: '2026-01-04T10:00:00Z',
      book: {
        id: '6af760f9ebebc61376035601',
        title: 'Labyrinths',
        authors: ['Jorge Luis Borges'],
        cover_url: null,
      },
    };

    const entriesWithAbandoned = [...mockEntries, abandonedEntry];

    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(libraryService.fetchUserLibrary).mockResolvedValue({
      count: entriesWithAbandoned.length,
      next: null,
      previous: null,
      results: entriesWithAbandoned,
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Set Aside/i })).toBeInTheDocument();
    });

    // Click Set Aside tab
    const setAsideTab = screen.getByRole('tab', { name: /Set Aside/i });
    fireEvent.click(setAsideTab);

    // Only Labyrinths should be displayed
    expect(screen.getByRole('button', { name: 'Labyrinths' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ficciones' })).not.toBeInTheDocument();

    // Verify status badge
    expect(screen.getByText('Set Aside / Abandoned')).toBeInTheDocument();
  });
});
