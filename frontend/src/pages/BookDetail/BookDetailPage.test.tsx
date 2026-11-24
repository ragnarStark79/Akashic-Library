import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookDetailPage } from './BookDetailPage';
import { AuthProvider } from '../../context/AuthContext';
import * as discoveryService from '../../services/discoveryService';
import * as authService from '../../services/authService';
import * as libraryService from '../../services/libraryService';
import * as recommendationService from '../../services/recommendationService';
import type { BookDetail, BookListItem } from '../../types/discovery';
import type { User } from '../../types/auth';
import type { LibraryEntry } from '../../types/library';

vi.mock('../../services/authService', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json', 'X-CSRFToken': 'mock-csrf-token' })),
  setDemoUser: vi.fn(),
}));

vi.mock('../../services/libraryService', () => {
  class AuthenticationRequiredError extends Error {
    constructor(msg = 'Authentication required') {
      super(msg);
      this.name = 'AuthenticationRequiredError';
    }
  }
  class PermissionDeniedError extends Error {
    constructor(msg = 'Permission denied') {
      super(msg);
      this.name = 'PermissionDeniedError';
    }
  }
  return {
    fetchUserLibrary: vi.fn(),
    getLibraryEntry: vi.fn(),
    addBookToLibrary: vi.fn(),
    updateLibraryEntry: vi.fn(),
    removeLibraryEntry: vi.fn(),
    toggleBookFavorite: vi.fn(),
    AuthenticationRequiredError,
    PermissionDeniedError,
  };
});

const mockBook: BookDetail = {
  id: '6af72791ebebc613760355ec',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  description:
    'A cornerstone of twentieth-century philosophical speculation. Divided into The Garden of Forking Paths and Artifices.',
  identifiers: {
    isbn10: '8806173677',
    isbn13: '9780802190734',
  },
  publication: {
    publisher: 'Editorial Sur',
    published_date: '1944',
    language: 'spa',
    page_count: 174,
  },
  subjects: ['Labyrinthine Fiction', 'Metaphysical Paradox', 'Infinite Recursion'],
  covers: ['https://covers.openlibrary.org/b/id/10832290-L.jpg'],
  rating: 4.8,
  review_count: 42,
  store: {
    available: false,
    product_id: null,
  },
};

const mockRelatedBooks: BookListItem[] = [
  {
    id: '6af72791ebebc613760355ed',
    title: 'Labyrinths',
    authors: ['Jorge Luis Borges'],
    cover_url: 'https://covers.openlibrary.org/b/id/10831408-L.jpg',
    language: 'en',
    published_date: '1962',
    rating: 4.9,
    review_count: 35,
    in_store: false,
  },
  {
    id: '6af760f9ebebc61376035600',
    title: 'The Aleph',
    authors: ['Jorge Luis Borges'],
    cover_url: null,
    language: 'spa',
    published_date: '1949',
    rating: 4.7,
    review_count: 20,
    in_store: false,
  },
];

const mockAuthenticatedUser: User = {
  id: 'user-rolex-123',
  username: 'rolex123',
  email: 'rolex@akashic.org',
  role: 'USER',
  display_name: 'Rolex Reader',
  bio: 'Patron of metaphysical literature',
  created_at: '2026-11-14T00:00:00Z',
  updated_at: '2026-11-14T00:00:00Z',
};

const mockLibraryEntryWantToRead: LibraryEntry = {
  id: 'entry-wtr-1',
  book_id: mockBook.id,
  status: 'WANT_TO_READ',
  favorited: false,
  created_at: '2026-11-14T10:00:00Z',
  updated_at: '2026-11-14T10:00:00Z',
  book: {
    id: mockBook.id,
    title: mockBook.title,
    authors: mockBook.authors,
    cover_url: typeof mockBook.covers[0] === 'string' ? mockBook.covers[0] : null,
  },
};

describe('BookDetailPage', () => {
  const onNavigateHome = vi.fn();
  const onNavigateCatalog = vi.fn();
  const onNavigateSubject = vi.fn();
  const onBookSelect = vi.fn();

  const renderWithAuth = async (ui: React.ReactElement) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<AuthProvider>{ui}</AuthProvider>);
    });
    return result!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockAuthenticatedUser);
    vi.mocked(libraryService.getLibraryEntry).mockResolvedValue(null);
    vi.spyOn(discoveryService, 'fetchBookById').mockResolvedValue(mockBook);
    vi.spyOn(discoveryService, 'fetchRelatedBooks').mockResolvedValue(mockRelatedBooks);
    vi.spyOn(discoveryService, 'fetchBookReviews').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'rev-1',
          book_id: mockBook.id,
          user_id: 'user-1',
          rating: 5,
          title: 'Philosophical Multiverse',
          body: 'Borges arrives at the multiverse through philosophical despair.',
          contains_spoiler: false,
          helpful_count: 184,
          moderation_status: 'APPROVED',
          created_at: '2026-11-10T12:00:00Z',
          updated_at: '2026-11-10T12:00:00Z',
          author: { id: 'user-1', username: 'elena_s', display_name: 'Elena Solanas' },
        },
      ],
    });
    vi.spyOn(discoveryService, 'fetchSharedAnnotations').mockResolvedValue({
      count: 1,
      results: [
        {
          id: 'ann-1',
          book_id: mockBook.id,
          user_id: 'user-1',
          content: 'The labyrinth is not merely geometric; it is temporal and linguistic.',
          visibility: 'SHARED',
          page_reference: 'Page 114',
          chapter_reference: null,
          passage_excerpt: 'Each sentence branched into divergent bifurcations.',
          created_at: '2026-11-12T12:00:00Z',
          updated_at: '2026-11-12T12:00:00Z',
          author: { id: 'user-1', username: 'elena_s', display_name: 'Elena Solanas' },
        },
      ],
    });
  });

  it('renders loading state initially', async () => {
    vi.spyOn(discoveryService, 'fetchBookById').mockReturnValue(new Promise(() => {}));
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );
    expect(screen.getByText(/Retrieving archival folio from the sanctuary stacks/i)).toBeInTheDocument();
  });

  it('renders book details and bibliographic record when loaded', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('Jorge Luis Borges').length).toBeGreaterThan(0);
    expect(screen.getByText('Editorial Sur')).toBeInTheDocument();
    expect(screen.getByText('1944')).toBeInTheDocument();
    expect(screen.getByText('9780802190734')).toBeInTheDocument();
    expect(screen.getByText('174 pages')).toBeInTheDocument();
    expect(screen.getAllByText('SPA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Labyrinthine Fiction').length).toBeGreaterThan(0);
  });

  it('renders not-found state when book does not exist', async () => {
    vi.spyOn(discoveryService, 'fetchBookById').mockResolvedValue(null);

    await renderWithAuth(
      <BookDetailPage
        bookId="nonexistent-id"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Archival folio #nonexistent-id could not be located in the catalog/i)).toBeInTheDocument();
    });

    const catalogBtn = screen.getByRole('button', { name: /Return to Catalog/i });
    fireEvent.click(catalogBtn);
    expect(onNavigateCatalog).toHaveBeenCalled();
  });

  it('navigates via breadcrumbs', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const catalogBreadcrumb = screen.getByTitle('Return to Catalog Search');
    fireEvent.click(catalogBreadcrumb);
    expect(onNavigateCatalog).toHaveBeenCalled();

    const subjectBreadcrumb = screen.getByRole('button', { name: 'Labyrinthine Fiction' });
    fireEvent.click(subjectBreadcrumb);
    expect(onNavigateSubject).toHaveBeenCalledWith('Labyrinthine Fiction');
  });

  it('switches between interactive folio tabs', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const themesTab = screen.getByRole('tab', { name: /Themes & Subjects/i });
    fireEvent.click(themesTab);
    expect(themesTab).toHaveAttribute('aria-selected', 'true');

    const editionsTab = screen.getByRole('tab', { name: /Editions & Ledger/i });
    fireEvent.click(editionsTab);
    expect(editionsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Store Availability/i)).toBeInTheDocument();
  });

  it('renders resonant kindred folios and invokes onBookSelect when clicked', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Labyrinths')).toBeInTheDocument();
    });

    const kindredCard = screen.getByRole('article', { name: /Labyrinths by Jorge Luis Borges/i });
    fireEvent.click(kindredCard);
    expect(onBookSelect).toHaveBeenCalledWith(mockRelatedBooks[0]);
  });

  it('displays honest catalogue labels without fabricated certification or accession numbers', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    expect(screen.getByText('Open Library Catalogue Record')).toBeInTheDocument();
    expect(screen.queryByText('Sanctuary Vault Certified')).not.toBeInTheDocument();

    expect(screen.getByText('Catalogue ISBN-13')).toBeInTheDocument();
    expect(screen.getByText('Catalogue ISBN-10')).toBeInTheDocument();
    expect(screen.queryByText('Standard ISBN-13')).not.toBeInTheDocument();
    expect(screen.queryByText('Standard ISBN-10')).not.toBeInTheDocument();

    expect(screen.getByText(/Search in Open Library/i)).toBeInTheDocument();
    expect(screen.getByText(/Search Internet Archive/i)).toBeInTheDocument();
    expect(screen.getByText(/Search WorldCat/i)).toBeInTheDocument();
  });

  it('renders archival fallback text when description is null or empty, with no fabricated quotes', async () => {
    const noDescBook = { ...mockBook, description: null };
    vi.spyOn(discoveryService, 'fetchBookById').mockResolvedValue(noDescBook);

    const { unmount } = await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const fallback1 = screen.getByText('No description is currently available for this catalogue record.');
    expect(fallback1).toBeInTheDocument();
    const overviewCard1 = fallback1.parentElement?.parentElement;
    expect(within(overviewCard1!).queryByRole('blockquote')).not.toBeInTheDocument();

    unmount();

    const emptyDescBook = { ...mockBook, description: '   ' };
    vi.spyOn(discoveryService, 'fetchBookById').mockResolvedValue(emptyDescBook);

    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const fallback2 = screen.getByText('No description is currently available for this catalogue record.');
    expect(fallback2).toBeInTheDocument();
    const overviewCard2 = fallback2.parentElement?.parentElement;
    expect(within(overviewCard2!).queryByRole('blockquote')).not.toBeInTheDocument();
  });

  it('renders book description as ordinary synopsis text without quotation marks or pull quote', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const desc = screen.getByText(mockBook.description!);
    expect(desc).toBeInTheDocument();
    const overviewCard = desc.parentElement?.parentElement;
    expect(within(overviewCard!).queryByRole('blockquote')).not.toBeInTheDocument();
  });

  it('renders decorative pull quote only when a genuine sourced quote is provided', async () => {
    const genuineQuoteText =
      '“The universe (which others call the Library) is composed of an indefinite and perhaps infinite number of hexagonal galleries...”';
    const bookWithQuote = { ...mockBook, quote: genuineQuoteText };
    vi.spyOn(discoveryService, 'fetchBookById').mockResolvedValue(bookWithQuote);

    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const desc = screen.getByText(mockBook.description!);
    expect(desc).toBeInTheDocument();
    const overviewCard = desc.parentElement?.parentElement;
    const blockquote = within(overviewCard!).getByRole('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent(genuineQuoteText);
  });

  it('opens and closes the Share & Citation dialog', async () => {
    await renderWithAuth(
      <BookDetailPage
        bookId="6af72791ebebc613760355ec"
        onNavigateHome={onNavigateHome}
        onNavigateCatalog={onNavigateCatalog}
        onNavigateSubject={onNavigateSubject}
        onBookSelect={onBookSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
    });

    const shareBtn = screen.getByRole('button', { name: /Share Folio Record/i });
    fireEvent.click(shareBtn);

    expect(screen.getByRole('dialog', { name: /Share Archival Folio/i })).toBeInTheDocument();
    expect(screen.getByText(/Bibliographic Citation \(MLA Style\)/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: /Share Archival Folio/i })).not.toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 4B.1 Regression Suite: Authenticated Actions & Shelf Selection
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Part 11.1 & 11.2: Add to Reading Shelf Dropdown & Status Selection', () => {
    it('opens dropdown menu showing Want to Read and Currently Reading, but NOT Mark as Read', async () => {
      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add this folio to reading shelf/i });
      expect(addBtn).toHaveAttribute('aria-haspopup', 'menu');
      expect(addBtn).toHaveAttribute('aria-expanded', 'false');

      // Click to open dropdown
      fireEvent.click(addBtn);

      expect(addBtn).toHaveAttribute('aria-expanded', 'true');
      const menu = screen.getByRole('menu', { name: /Reading shelf options/i });
      expect(menu).toBeInTheDocument();

      // Reading shelf options: Want to Read, Currently Reading, and Set Aside / Abandoned
      expect(screen.getByRole('menuitem', { name: /Want to Read/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Currently Reading/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Set Aside \/ Abandoned/i })).toBeInTheDocument();

      // Mark as Read / Completed must NOT be inside the dropdown
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
      expect(screen.queryByRole('menuitem', { name: /Mark as Read/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Completed/i })).not.toBeInTheDocument();
    });

    it('selecting Want to Read invokes addBookToLibrary with WANT_TO_READ and displays success', async () => {
      vi.mocked(libraryService.addBookToLibrary).mockResolvedValue(mockLibraryEntryWantToRead);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add this folio to reading shelf/i });
      fireEvent.click(addBtn);

      const wantToReadOpt = screen.getByRole('menuitem', { name: /Want to Read/i });
      fireEvent.click(wantToReadOpt);

      expect(libraryService.addBookToLibrary).toHaveBeenCalledWith(
        mockBook.id,
        'WANT_TO_READ',
        expect.objectContaining({ title: mockBook.title })
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Folio preserved on your Scriptorium shelf as Want to Read/i);
      });

      // Menu closes after selection
      expect(screen.queryByRole('menu', { name: /Reading shelf options/i })).not.toBeInTheDocument();
    });

    it('selecting Currently Reading invokes addBookToLibrary with READING and displays success', async () => {
      const mockEntryReading: LibraryEntry = {
        ...mockLibraryEntryWantToRead,
        status: 'READING',
      };
      vi.mocked(libraryService.addBookToLibrary).mockResolvedValue(mockEntryReading);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add this folio to reading shelf/i });
      fireEvent.click(addBtn);

      const readingOpt = screen.getByRole('menuitem', { name: /Currently Reading/i });
      fireEvent.click(readingOpt);

      expect(libraryService.addBookToLibrary).toHaveBeenCalledWith(
        mockBook.id,
        'READING',
        expect.objectContaining({ title: mockBook.title })
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Folio preserved on your Scriptorium shelf as Currently Reading/i);
      });

      expect(screen.queryByRole('menu', { name: /Reading shelf options/i })).not.toBeInTheDocument();
    });

    it('invokes updateLibraryEntry when book is already shelved', async () => {
      vi.mocked(libraryService.getLibraryEntry).mockResolvedValue(mockLibraryEntryWantToRead);
      const mockUpdatedEntry: LibraryEntry = {
        ...mockLibraryEntryWantToRead,
        status: 'READING',
      };
      vi.mocked(libraryService.updateLibraryEntry).mockResolvedValue(mockUpdatedEntry);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(libraryService.getLibraryEntry).toHaveBeenCalledWith(
          mockBook.id,
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
      });

      const addBtn = screen.getByRole('button', { name: /Add this folio to reading shelf/i });
      fireEvent.click(addBtn);

      const readingOpt = screen.getByRole('menuitem', { name: /Currently Reading/i });
      fireEvent.click(readingOpt);

      expect(libraryService.updateLibraryEntry).toHaveBeenCalledWith(mockBook.id, 'READING');
      expect(libraryService.addBookToLibrary).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Folio preserved on your Scriptorium shelf as Currently Reading/i);
      });
    });

    it('closes dropdown when Escape key is pressed or clicked outside', async () => {
      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add this folio to reading shelf/i });
      fireEvent.click(addBtn);
      expect(screen.getByRole('menu', { name: /Reading shelf options/i })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu', { name: /Reading shelf options/i })).not.toBeInTheDocument();

      // Open again and click outside
      fireEvent.click(addBtn);
      expect(screen.getByRole('menu', { name: /Reading shelf options/i })).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu', { name: /Reading shelf options/i })).not.toBeInTheDocument();
    });

    it('unauthenticated user selecting a shelf status receives authentication required feedback', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const addBtn = screen.getByRole('button', { name: /Add this folio to reading shelf/i });
      fireEvent.click(addBtn);

      const wantToReadOpt = screen.getByRole('menuitem', { name: /Want to Read/i });
      fireEvent.click(wantToReadOpt);

      expect(libraryService.addBookToLibrary).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Patron Authentication Required: Adding folios to your Personal Reading Shelf/i);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Part 11.3: Separate Mark as Read / Completed Action
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Part 11.3: Separate Mark as Read / Completed Action', () => {
    it('remains a separate button and sends READ status via addBookToLibrary when not on shelf', async () => {
      const mockReadEntry: LibraryEntry = {
        ...mockLibraryEntryWantToRead,
        status: 'READ',
      };
      vi.mocked(libraryService.addBookToLibrary).mockResolvedValue(mockReadEntry);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const markReadBtn = screen.getByRole('button', { name: /Mark as Read \/ Completed/i });
      expect(markReadBtn).toBeInTheDocument();

      fireEvent.click(markReadBtn);

      expect(libraryService.addBookToLibrary).toHaveBeenCalledWith(
        mockBook.id,
        'READ',
        expect.objectContaining({ title: mockBook.title })
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Folio marked as Completed in your personal reading archive/i);
      });
    });

    it('sends READ status via updateLibraryEntry when book already exists on shelf', async () => {
      vi.mocked(libraryService.getLibraryEntry).mockResolvedValue(mockLibraryEntryWantToRead);
      const mockReadEntry: LibraryEntry = {
        ...mockLibraryEntryWantToRead,
        status: 'READ',
      };
      vi.mocked(libraryService.updateLibraryEntry).mockResolvedValue(mockReadEntry);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(libraryService.getLibraryEntry).toHaveBeenCalledWith(
          mockBook.id,
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
      });

      const markReadBtn = screen.getByRole('button', { name: /Mark as Read \/ Completed/i });
      fireEvent.click(markReadBtn);

      expect(libraryService.updateLibraryEntry).toHaveBeenCalledWith(mockBook.id, 'READ');
      expect(libraryService.addBookToLibrary).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Folio marked as Completed in your personal reading archive/i);
      });
    });

    it('unauthenticated user clicking Mark as Read receives authentication required feedback', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Ficciones' })).toBeInTheDocument();
      });

      const markReadBtn = screen.getByRole('button', { name: /Mark as Read \/ Completed/i });
      fireEvent.click(markReadBtn);

      expect(libraryService.addBookToLibrary).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Patron Authentication Required: Marking folios as Completed requires signing in/i);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Part 11.4: Reading Room & Shared Marginalia Integration (Phase 5B.2)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Part 11.4: Reading Room & Shared Marginalia Integration', () => {
    it('renders Voices from the Reading Room section and displays shared annotations preview', async () => {
      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Voices from the Reading Room/i })
        ).toBeInTheDocument();
      });

      // Verify shared annotation preview card is rendered
      expect(screen.getByText('Elena Solanas')).toBeInTheDocument();
      expect(screen.getByText(/The labyrinth is not merely geometric/i)).toBeInTheDocument();
      expect(screen.getByText('Page 114')).toBeInTheDocument();
    });

    it('invokes onNavigateReadingRoom with false when View Full Reading Room is clicked', async () => {
      const handleNavigateReadingRoom = vi.fn();
      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
          onNavigateReadingRoom={handleNavigateReadingRoom}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Voices from the Reading Room/i })
        ).toBeInTheDocument();
      });

      const viewFullBtn = screen.getByRole('button', { name: /View Full Reading Room/i });
      fireEvent.click(viewFullBtn);
      expect(handleNavigateReadingRoom).toHaveBeenCalledWith(false);
    });

    it('invokes onNavigateReadingRoom with true when Inscribe a Note is clicked', async () => {
      const handleNavigateReadingRoom = vi.fn();
      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
          onNavigateReadingRoom={handleNavigateReadingRoom}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Voices from the Reading Room/i })
        ).toBeInTheDocument();
      });

      const inscribeBtn = screen.getByRole('button', { name: /Inscribe a Note/i });
      fireEvent.click(inscribeBtn);
      expect(handleNavigateReadingRoom).toHaveBeenCalledWith(true);
    });

    it('displays empty state when no shared annotations exist and allows entering Reading Room', async () => {
      vi.spyOn(discoveryService, 'fetchSharedAnnotations').mockResolvedValueOnce({
        count: 0,
        results: [],
      });

      const handleNavigateReadingRoom = vi.fn();
      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
          onNavigateReadingRoom={handleNavigateReadingRoom}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/No shared reflections have been added for this book yet/i)
        ).toBeInTheDocument();
      });

      const enterBtn = screen.getByRole('button', { name: /Enter Reading Room/i });
      fireEvent.click(enterBtn);
      expect(handleNavigateReadingRoom).toHaveBeenCalledWith(false);
    });
  });

  describe('Part 11.5: Reader Reviews Preview & Navigation Integration', () => {
    it('invokes onNavigateReviews with false when View All Reader Reviews is clicked', async () => {
      const handleNavigateReviews = vi.fn();
      await renderWithAuth(
        <BookDetailPage
          bookId="6af72791ebebc613760355ec"
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onBookSelect={onBookSelect}
          onNavigateReviews={handleNavigateReviews}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Voices from the Reading Room/i })).toBeInTheDocument();
      });

      const viewAllReviewsBtn = screen.getByRole('button', { name: /View All Reader Reviews/i });
      fireEvent.click(viewAllReviewsBtn);
      expect(handleNavigateReviews).toHaveBeenCalledWith(false);
    });
  });

  describe('Phase 6D.1: Kindred Explorations Responsive Carousel & Shelf Loading Reliability', () => {
    it('displays localized "Checking Shelf..." while shelf membership is loading', async () => {
      let resolveShelf: (val: LibraryEntry | null) => void = () => {};
      const shelfPromise = new Promise<LibraryEntry | null>((resolve) => {
        resolveShelf = resolve;
      });
      vi.mocked(libraryService.getLibraryEntry).mockReturnValueOnce(shelfPromise);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      // Initially during in-flight check, button displays localized checking state
      expect(screen.getByRole('button', { name: /Add this folio to reading shelf/i })).toHaveTextContent(/Checking Shelf\.\.\./i);
      expect(screen.getByRole('button', { name: /Add this folio to reading shelf/i })).toBeDisabled();

      // Once resolved with null (not in shelf)
      resolveShelf(null);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add this folio to reading shelf/i })).toHaveTextContent(/Add to Reading Shelf/i);
        expect(screen.getByRole('button', { name: /Add this folio to reading shelf/i })).not.toBeDisabled();
      });
    });

    it('isolates shelf check network errors without triggering page-level error', async () => {
      vi.mocked(libraryService.getLibraryEntry).mockRejectedValueOnce(new Error('Network 500 error'));

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      // Page should still render successfully
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: mockBook.title })).toBeInTheDocument();
      });

      // No page-level error displayed
      expect(screen.queryByText(/A network error occurred while retrieving this archival record/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/could not be located in the catalog/i)).not.toBeInTheDocument();

      // Button gracefully presents isolated non-blocking error retry state
      await waitFor(() => {
        expect(screen.getByTestId('shelf-error-button')).toHaveTextContent(/Shelf Sync Failed — Retry/i);
      });
    });

    it('renders Kindred Explorations carousel track and scrolls on arrow clicks without route changes', async () => {
      const mockKindredList: BookListItem[] = [
        { id: 'rel-1', title: 'The Aleph', authors: ['Jorge Luis Borges'], cover_url: null, language: 'es', review_count: 0 },
        { id: 'rel-2', title: 'Labyrinths', authors: ['Jorge Luis Borges'], cover_url: null, language: 'en', review_count: 0 },
        { id: 'rel-3', title: 'The Library of Babel', authors: ['Jorge Luis Borges'], cover_url: null, language: 'es', review_count: 0 },
        { id: 'rel-4', title: 'The Garden of Forking Paths', authors: ['Jorge Luis Borges'], cover_url: null, language: 'es', review_count: 0 },
        { id: 'rel-5', title: 'Universal History of Iniquity', authors: ['Jorge Luis Borges'], cover_url: null, language: 'es', review_count: 0 },
      ];

      vi.spyOn(recommendationService, 'fetchSimilarBooks').mockResolvedValueOnce({
        count: 5,
        page: 1,
        page_size: 5,
        results: mockKindredList,
      });

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Kindred Explorations/i })).toBeInTheDocument();
      });

      // Check track structure
      const track = screen.getByRole('region', { name: /Kindred folios carousel track/i });
      expect(track).toBeInTheDocument();

      // Verify scroll buttons exist
      const leftBtn = screen.getByRole('button', { name: /Scroll left/i });
      const rightBtn = screen.getByRole('button', { name: /Scroll right/i });
      expect(leftBtn).toBeInTheDocument();
      expect(rightBtn).toBeInTheDocument();

      // Mock scrollBy on the track element
      const scrollBySpy = vi.fn();
      track.scrollBy = scrollBySpy;

      fireEvent.click(rightBtn);
      expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));

      fireEvent.click(leftBtn);
      expect(scrollBySpy).toHaveBeenCalledTimes(2);

      // Verify no navigation occurred on scroll clicks
      expect(onNavigateHome).not.toHaveBeenCalled();
      expect(onNavigateCatalog).not.toHaveBeenCalled();
    });
  });

  describe('Phase 6E.4: API Error Semantics & Shelf Reliability', () => {
    it('200: renders shelved reading status when book is on user shelf', async () => {
      const mockEntry: LibraryEntry = {
        id: 'entry-99',
        book_id: mockBook.id,
        status: 'READING',
        favorited: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        book: {
          id: mockBook.id,
          title: mockBook.title,
          authors: mockBook.authors,
          cover_url: null,
        },
      };
      vi.mocked(libraryService.getLibraryEntry).mockResolvedValueOnce(mockEntry);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelf-dropdown-button')).toBeInTheDocument();
        expect(screen.getByTestId('shelf-dropdown-button')).toHaveTextContent(/Currently Reading/i);
      });
    });

    it('404: renders verified unshelved Add to Reading Shelf button', async () => {
      vi.mocked(libraryService.getLibraryEntry).mockResolvedValueOnce(null);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelf-dropdown-button')).toBeInTheDocument();
        expect(screen.getByTestId('shelf-dropdown-button')).toHaveTextContent(/Add to Reading Shelf/i);
      });
    });

    it('401: renders Sign In to Access Shelf button and calls onSignInRequest', async () => {
      vi.mocked(libraryService.getLibraryEntry).mockRejectedValueOnce(
        new libraryService.AuthenticationRequiredError()
      );
      const onSignInRequest = vi.fn();

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
          onSignInRequest={onSignInRequest}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelf-auth-button')).toBeInTheDocument();
        expect(screen.getByTestId('shelf-auth-button')).toHaveTextContent(/Sign In to Access Shelf/i);
      });

      fireEvent.click(screen.getByTestId('shelf-auth-button'));
      expect(onSignInRequest).toHaveBeenCalledTimes(1);
    });

    it('403: renders disabled Shelf Access Restricted button', async () => {
      vi.mocked(libraryService.getLibraryEntry).mockRejectedValueOnce(
        new libraryService.PermissionDeniedError()
      );

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelf-forbidden-button')).toBeInTheDocument();
        expect(screen.getByTestId('shelf-forbidden-button')).toHaveTextContent(/Shelf Access Restricted/i);
        expect(screen.getByTestId('shelf-forbidden-button')).toBeDisabled();
      });
    });

    it('500: renders Shelf Sync Failed button with retry capability', async () => {
      vi.mocked(libraryService.getLibraryEntry)
        .mockRejectedValueOnce(new Error('Failed to check shelf membership: HTTP 500'))
        .mockResolvedValueOnce(null);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelf-error-button')).toBeInTheDocument();
        expect(screen.getByTestId('shelf-error-button')).toHaveTextContent(/Shelf Sync Failed — Retry/i);
      });

      fireEvent.click(screen.getByTestId('shelf-error-button'));

      await waitFor(() => {
        expect(screen.getByTestId('shelf-dropdown-button')).toBeInTheDocument();
        expect(screen.getByTestId('shelf-dropdown-button')).toHaveTextContent(/Add to Reading Shelf/i);
      });
    });

    it('Network Error: catches network failure and retries successfully', async () => {
      vi.mocked(libraryService.getLibraryEntry)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(null);

      await renderWithAuth(
        <BookDetailPage
          bookId={mockBook.id}
          onNavigateHome={onNavigateHome}
          onNavigateCatalog={onNavigateCatalog}
          onNavigateSubject={onNavigateSubject}
          onBookSelect={onBookSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelf-error-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('shelf-error-button'));

      await waitFor(() => {
        expect(screen.getByTestId('shelf-dropdown-button')).toBeInTheDocument();
      });
    });
  });
});
