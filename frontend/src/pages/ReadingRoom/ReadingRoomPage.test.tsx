import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadingRoomPage } from './ReadingRoomPage';
import { AuthProvider } from '../../context/AuthContext';
import * as discoveryService from '../../services/discoveryService';
import * as authService from '../../services/authService';
import type { BookDetail, BookAnnotation, AnnotationListResponse } from '../../types/discovery';
import type { User } from '../../types/auth';

vi.mock('../../services/authService', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json', 'X-CSRFToken': 'mock-csrf-token' })),
  setDemoUser: vi.fn(),
}));

const mockBook: BookDetail = {
  id: '6af72791ebebc613760355ec',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  description: 'A labyrinth of metaphysical short stories.',
  identifiers: { isbn10: '8806173677', isbn13: '9780802190734' },
  publication: { publisher: 'Editorial Sur', published_date: '1944', language: 'spa', page_count: 174 },
  subjects: ['Labyrinthine Fiction'],
  covers: ['https://covers.openlibrary.org/b/id/10832290-L.jpg'],
};

const mockUser: User = {
  id: 'user_a_123',
  username: 'test_reader_a',
  email: 'reader_a@example.com',
  display_name: 'Reader Aleph',
  role: 'USER',
  bio: 'Sanctuary archivist and marginalia patron.',
  created_at: '2026-11-14T00:00:00Z',
  updated_at: '2026-11-14T00:00:00Z',
};

const mockPrivateAnnotation: BookAnnotation = {
  id: 'ann_priv_1',
  book_id: '6af72791ebebc613760355ec',
  user_id: 'user_a_123',
  content: 'The garden bifurcates into infinite divergent futures.',
  visibility: 'PRIVATE',
  page_reference: 'p. 24',
  chapter_reference: 'The Garden of Forking Paths',
  passage_excerpt: 'an infinite series of times',
  created_at: '2026-11-14T10:00:00Z',
  updated_at: '2026-11-14T10:00:00Z',
  author: {
    id: 'user_a_123',
    username: 'test_reader_a',
    display_name: 'Reader Aleph',
  },
};

const mockSharedAnnotation: BookAnnotation = {
  id: 'ann_pub_1',
  book_id: '6af72791ebebc613760355ec',
  user_id: 'user_b_456',
  content: 'Borges presents time not as a line, but as an ever-branching labyrinth.',
  visibility: 'SHARED',
  page_reference: 'p. 88',
  chapter_reference: 'The Library of Babel',
  passage_excerpt: 'The universe (which others call the Library)',
  created_at: '2026-11-14T11:00:00Z',
  updated_at: '2026-11-14T11:00:00Z',
  author: {
    id: 'user_b_456',
    username: 'test_reader_b',
    display_name: 'Scholarly Reader',
  },
};

const mockMyAnnotationsResponse: AnnotationListResponse = {
  count: 2,
  results: [
    mockPrivateAnnotation,
    {
      ...mockSharedAnnotation,
      id: 'ann_pub_mine',
      user_id: 'user_a_123',
      content: 'My shared reflection on the circular ruins.',
      author: {
        id: 'user_a_123',
        username: 'test_reader_a',
        display_name: 'Reader Aleph',
      },
    },
  ],
  counts: {
    shared_count: 1,
    my_private_count: 1,
    my_shared_count: 1,
    my_total_count: 2,
  },
};

const mockSharedAnnotationsResponse: AnnotationListResponse = {
  count: 1,
  results: [mockSharedAnnotation],
  counts: {
    shared_count: 1,
    my_private_count: 0,
    my_shared_count: 0,
    my_total_count: 0,
  },
};

async function renderWithAuth(ui: React.ReactElement, user: User | null = mockUser) {
  vi.mocked(authService.getCurrentUser).mockResolvedValue(user);
  const result = render(<AuthProvider>{ui}</AuthProvider>);
  await waitFor(() => {
    expect(authService.getCurrentUser).toHaveBeenCalled();
  });
  return result;
}

describe('ReadingRoomPage', () => {
  const onNavigateBookDetail = vi.fn();
  const onNavigateReviews = vi.fn();
  const onSignInRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(discoveryService, 'fetchBookById').mockResolvedValue(mockBook);
    vi.spyOn(discoveryService, 'fetchMyAnnotations').mockResolvedValue(mockMyAnnotationsResponse);
    vi.spyOn(discoveryService, 'fetchSharedAnnotations').mockResolvedValue(mockSharedAnnotationsResponse);
    vi.spyOn(discoveryService, 'createBookAnnotation').mockResolvedValue({
      ...mockPrivateAnnotation,
      id: 'ann_new_99',
      content: 'Freshly inscribed marginal note.',
    });
    vi.spyOn(discoveryService, 'updateBookAnnotation').mockImplementation(async (_bookId, annId, payload) => ({
      ...mockPrivateAnnotation,
      id: annId,
      ...payload,
      updated_at: new Date().toISOString(),
    }));
    vi.spyOn(discoveryService, 'deleteBookAnnotation').mockResolvedValue(undefined);
  });

  it('renders Reading Room header, book provenance and Folio title', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Voices from the Reading Room/i);
    });

    expect(screen.getByText('Jorge Luis Borges')).toBeInTheDocument();
    expect(screen.getByText('Sanctuary Folio')).toBeInTheDocument();
    expect(screen.getByText(/Return to Folio Details/i)).toBeInTheDocument();
    expect(screen.getByText('(Ficciones)')).toBeInTheDocument();
  });

  it('navigates back to book detail when Return to Folio Details is clicked', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Return to Folio Details/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Return to Folio Details/i));
    expect(onNavigateBookDetail).toHaveBeenCalled();
  });

  it('navigates to reader reviews when View Public Reader Reviews is clicked', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View Public Reader Reviews/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /View Public Reader Reviews/i }));
    expect(onNavigateReviews).toHaveBeenCalledWith(false);
  });

  it('renders composer defaulting to Private visibility for authenticated user', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Record a Reflection/i })).toBeInTheDocument();
    });

    const privateRadio = screen.getByRole('radio', { name: /Private Reflection/i });
    expect(privateRadio).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByPlaceholderText(/Transcribe your contemplation, question, or marginal observation/i)).toBeInTheDocument();
  });

  it('submits a new private annotation through createBookAnnotation', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Record a Reflection/i })).toBeInTheDocument();
    });

    const contentTextarea = screen.getByPlaceholderText(/Transcribe your contemplation, question, or marginal observation/i);
    const excerptInput = screen.getByPlaceholderText(/Transcribe an excerpt or phrase/i);
    const pageInput = screen.getByPlaceholderText(/Page 114 • The Garden of Forking Paths/i);

    fireEvent.change(contentTextarea, { target: { value: 'Freshly inscribed marginal note.' } });
    fireEvent.change(excerptInput, { target: { value: 'The labyrinth bifurcates.' } });
    fireEvent.change(pageInput, { target: { value: 'p. 102' } });

    const submitBtn = screen.getByRole('button', { name: /Inscribe to Reading Desk/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(discoveryService.createBookAnnotation).toHaveBeenCalledWith('6af72791ebebc613760355ec', {
        content: 'Freshly inscribed marginal note.',
        visibility: 'PRIVATE',
        page_reference: 'p. 102',
        chapter_reference: null,
        passage_excerpt: 'The labyrinth bifurcates.',
      });
    });

    expect(await screen.findByText(/Private reflection inscribed to your personal reading desk/i)).toBeInTheDocument();
  });

  it('allows toggling visibility to Shared in composer', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Record a Reflection/i })).toBeInTheDocument();
    });

    const sharedRadio = screen.getByRole('radio', { name: /Shared Marginalia/i });
    fireEvent.click(sharedRadio);
    expect(sharedRadio).toHaveAttribute('aria-checked', 'true');

    const contentTextarea = screen.getByPlaceholderText(/Transcribe your contemplation, question, or marginal observation/i);
    fireEvent.change(contentTextarea, { target: { value: 'Public marginal reflection.' } });

    const submitBtn = screen.getByRole('button', { name: /Publish Shared Marginalia/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(discoveryService.createBookAnnotation).toHaveBeenCalledWith('6af72791ebebc613760355ec', {
        content: 'Public marginal reflection.',
        visibility: 'SHARED',
        page_reference: null,
        chapter_reference: null,
        passage_excerpt: null,
      });
    });
  });

  it('enters edit mode when Edit button on owned annotation card is clicked', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The garden bifurcates into infinite divergent futures.')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[0]!);

    expect(screen.getByRole('heading', { level: 2, name: /Edit Your Inscription/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel Edit/i })).toBeInTheDocument();

    // Cancel edit
    fireEvent.click(screen.getByRole('button', { name: /Cancel Edit/i }));
    expect(screen.getByRole('heading', { level: 2, name: /Record a Reflection/i })).toBeInTheDocument();
  });

  it('updates an annotation in place when saving edit changes', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The garden bifurcates into infinite divergent futures.')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[0]!);

    const contentTextarea = screen.getByPlaceholderText(/Transcribe your contemplation, question, or marginal observation/i);
    fireEvent.change(contentTextarea, { target: { value: 'Updated: Time is a labyrinth of bifurcations.' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(discoveryService.updateBookAnnotation).toHaveBeenCalledWith(
        '6af72791ebebc613760355ec',
        'ann_priv_1',
        expect.objectContaining({
          content: 'Updated: Time is a labyrinth of bifurcations.',
        })
      );
    });

    expect(await screen.findByText(/Marginalia successfully amended in your ledger/i)).toBeInTheDocument();
  });

  it('toggles visibility from Private to Shared using Make Shared button on card', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The garden bifurcates into infinite divergent futures.')).toBeInTheDocument();
    });

    const makeSharedBtn = screen.getByRole('button', { name: /Make Shared/i });
    fireEvent.click(makeSharedBtn);

    await waitFor(() => {
      expect(discoveryService.updateBookAnnotation).toHaveBeenCalledWith(
        '6af72791ebebc613760355ec',
        'ann_priv_1',
        { visibility: 'SHARED' }
      );
    });
  });

  it('opens confirmation modal and deletes annotation when confirmed', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The garden bifurcates into infinite divergent futures.')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtns[0]!);

    expect(screen.getByRole('heading', { level: 3, name: /Delete Your Annotation\?/i })).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /Delete Annotation/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(discoveryService.deleteBookAnnotation).toHaveBeenCalledWith(
        '6af72791ebebc613760355ec',
        'ann_priv_1'
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 3, name: /Delete Your Annotation\?/i })).not.toBeInTheDocument();
    });
  });

  it('filters annotations by tab: All Notes, My Private, Shared', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('The garden bifurcates into infinite divergent futures.')).toBeInTheDocument();
      expect(screen.getByText('My shared reflection on the circular ruins.')).toBeInTheDocument();
    });

    // Switch to "My Private" tab
    const privateTab = screen.getByRole('tab', { name: /My Private/i });
    fireEvent.click(privateTab);

    expect(screen.getByText('The garden bifurcates into infinite divergent futures.')).toBeInTheDocument();
    expect(screen.queryByText('My shared reflection on the circular ruins.')).not.toBeInTheDocument();

    // Switch to "Shared" tab
    const sharedTab = screen.getByRole('tab', { name: /Shared/i });
    fireEvent.click(sharedTab);

    expect(screen.queryByText('The garden bifurcates into infinite divergent futures.')).not.toBeInTheDocument();
    expect(screen.getByText('Borges presents time not as a line, but as an ever-branching labyrinth.')).toBeInTheDocument();
  });

  it('prompts unauthenticated visitor to sign in when attempting to inscribe', async () => {
    await renderWithAuth(
      <ReadingRoomPage
        bookId="6af72791ebebc613760355ec"
        onNavigateBookDetail={onNavigateBookDetail}
        onNavigateReviews={onNavigateReviews}
        onSignInRequest={onSignInRequest}
      />,
      null // unauthenticated user
    );

    await waitFor(() => {
      expect(screen.getByText('Borges presents time not as a line, but as an ever-branching labyrinth.')).toBeInTheDocument();
    });

    // Guest user should see the login prompt button in the composer
    const signInToInscribeBtn = screen.getByRole('button', { name: /Sign In to Inscribe Marginalia/i });
    fireEvent.click(signInToInscribeBtn);
    expect(onSignInRequest).toHaveBeenCalled();
  });
});
