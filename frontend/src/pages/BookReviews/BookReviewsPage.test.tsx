import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BookReviewsPage } from './BookReviewsPage';
import * as discoveryService from '@/services/discoveryService';
import * as AuthContext from '@/context/AuthContext';
import type { BookDetail, BookReviewsResponse, BookAggregateRating, BookReview, ReviewReply } from '@/types/discovery';
import type { User } from '@/types/auth';

vi.mock('@/services/discoveryService');

const mockBook: BookDetail = {
  id: 'book-ficciones-01',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  description: 'A labyrinthine collection of philosophical fictions.',
  identifiers: {
    isbn10: '0140188249',
    isbn13: '978-0140188240',
  },
  publication: {
    publisher: 'Editorial Sur',
    published_date: '1944',
    language: 'es',
    page_count: 174,
  },
  subjects: ['Speculative Philosophy', 'Labyrinths'],
  covers: ['https://covers.openlibrary.org/b/id/10832290-L.jpg'],
  rating: 4.8,
  review_count: 38,
  quote: 'A labyrinth of symbols, mirrors, and infinite corridors.',
};

const mockRatingData: BookAggregateRating = {
  average_rating: 4.8,
  rating_count: 38,
  distribution: {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 5,
    '5': 30,
  },
};

const mockReviewsResponse: BookReviewsResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'rev-01',
      book_id: 'book-ficciones-01',
      user_id: 'usr-1',
      rating: 5,
      title: 'The architecture of eternity disguised as short prose',
      body: 'Reading Ficciones is less like consuming literature and more like discovering an ancient calculus.',
      contains_spoiler: false,
      helpful_count: 24,
      moderation_status: 'APPROVED',
      created_at: '2024-10-14T10:00:00Z',
      updated_at: '2024-10-14T10:00:00Z',
      reply_count: 1,
      author: {
        id: 'usr-1',
        username: 'marcus_aureliano',
        display_name: 'Marcus Aureliano',
      },
    },
    {
      id: 'rev-02',
      book_id: 'book-ficciones-01',
      user_id: 'usr-2',
      rating: 5,
      title: 'A masterclass in compression and philosophical rigor',
      body: 'Every paragraph contains enough conceptual density to sustain an entire trilogy.',
      contains_spoiler: true,
      helpful_count: 19,
      moderation_status: 'APPROVED',
      created_at: '2024-09-28T14:30:00Z',
      updated_at: '2024-09-28T14:30:00Z',
      reply_count: 0,
      author: {
        id: 'usr-2',
        username: 'clara_beauchamp',
        display_name: 'Clara Beauchamp',
      },
    },
  ],
};

const mockUserReview: BookReview = {
  id: 'rev-elena-01',
  book_id: 'book-ficciones-01',
  user_id: 'usr-elena-99',
  rating: 5,
  title: 'Elena Solanas Personal Inscription',
  body: 'An astounding journey through the labyrinth of Babel.',
  contains_spoiler: false,
  helpful_count: 0,
  moderation_status: 'APPROVED',
  created_at: '2024-11-01T10:00:00Z',
  updated_at: '2024-11-01T10:00:00Z',
  reply_count: 0,
  author: {
    id: 'usr-elena-99',
    username: 'patron_elena',
    display_name: 'Elena Solanas',
  },
};

const mockAuthenticatedUser: User = {
  id: 'usr-elena-99',
  username: 'patron_elena',
  email: 'elena@akashic.vault',
  display_name: 'Elena Solanas',
  role: 'USER',
  bio: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockReplies: ReviewReply[] = [
  {
    id: 'rep-01',
    review_id: 'rev-01',
    book_id: 'book-ficciones-01',
    user_id: 'usr-elena-99',
    body: 'A deeply resonant observation on Borges.',
    created_at: '2024-10-15T12:00:00Z',
    updated_at: '2024-10-15T12:00:00Z',
    author: {
      id: 'usr-elena-99',
      username: 'patron_elena',
      display_name: 'Elena Solanas',
    },
  },
];

describe('BookReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoveryService.fetchBookById).mockResolvedValue(mockBook);
    vi.mocked(discoveryService.fetchBookRating).mockResolvedValue(mockRatingData);
    vi.mocked(discoveryService.fetchBookReviews).mockResolvedValue(mockReviewsResponse);
    vi.mocked(discoveryService.fetchMyReview).mockResolvedValue(null);
    vi.mocked(discoveryService.fetchReviewReplies).mockResolvedValue(mockReplies);
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      intendedDestination: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setIntendedDestination: vi.fn(),
    });
  });

  it('renders contextual book header with breadcrumbs and accession ID', async () => {
    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Return to Book Details/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ficciones/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Acc. ID: #0140188249/i)).toBeInTheDocument();
      expect(screen.getByText(/Currently Viewing Reader Reviews/i)).toBeInTheDocument();
    });
  });

  it('navigates to book detail when breadcrumb or Overview Codex is clicked', async () => {
    const handleNavigateBookDetail = vi.fn();
    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={handleNavigateBookDetail}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Return to Book Details/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Return to Book Details/i }));
    expect(handleNavigateBookDetail).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Return to Codex Overview/i }));
    expect(handleNavigateBookDetail).toHaveBeenCalledTimes(2);
  });

  it('renders rating synthesis card with average score and breakdown bars', async () => {
    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('/ 5')).toBeInTheDocument();
      expect(screen.getByText(/Based on 38 reader inscriptions/i)).toBeInTheDocument();
      expect(screen.getByText('5 Stars')).toBeInTheDocument();
      expect(screen.getByText('1 Star')).toBeInTheDocument();
    });
  });

  it('displays reviewer cards with dates, ratings and thesis headlines', async () => {
    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Marcus Aureliano')).toBeInTheDocument();
      expect(screen.getByText('The architecture of eternity disguised as short prose')).toBeInTheDocument();
      expect(screen.getByText('Clara Beauchamp')).toBeInTheDocument();
    });
  });

  it('shows spoiler warning and toggles content visibility', async () => {
    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Spoiler Warning/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('A masterclass in compression and philosophical rigor')).not.toBeInTheDocument();

    const revealBtn = screen.getByRole('button', { name: /Reveal Contemplation/i });
    fireEvent.click(revealBtn);

    expect(screen.getByText('A masterclass in compression and philosophical rigor')).toBeInTheDocument();
  });

  it('renders unauthenticated gate with sign-in call to action when logged out', async () => {
    const handleSignInRequest = vi.fn();
    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={handleSignInRequest}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('unauthenticated-gate')).toBeInTheDocument();
      expect(screen.getByText('Patron Authentication Required')).toBeInTheDocument();
    });

    const authBtn = screen.getByRole('button', { name: /Authenticate & Inscribe/i });
    fireEvent.click(authBtn);
    expect(handleSignInRequest).toHaveBeenCalledTimes(1);
  });

  it('renders composer form for authenticated patron and allows review submission', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockAuthenticatedUser,
      isAuthenticated: true,
      loading: false,
      intendedDestination: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setIntendedDestination: vi.fn(),
    });

    vi.mocked(discoveryService.createBookReview).mockResolvedValue({
      id: 'rev-new',
      book_id: 'book-ficciones-01',
      user_id: mockAuthenticatedUser.id,
      rating: 5,
      title: 'A labyrinth of infinite wisdom',
      body: 'This folio is a profound exploration into the paradoxes of time and thought.',
      contains_spoiler: false,
      helpful_count: 0,
      moderation_status: 'APPROVED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: mockAuthenticatedUser.id,
        username: mockAuthenticatedUser.username,
        display_name: mockAuthenticatedUser.display_name,
      },
    });

    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Elena Solanas')).toBeInTheDocument();
      expect(screen.getByText(/Overall Appraisal/i)).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: /Select star rating/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Inscribe your review thesis/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Share your critical reflections/i)).toBeInTheDocument();
    });

    // Fill form
    const thesisInput = screen.getByPlaceholderText(/Inscribe your review thesis/i);
    fireEvent.change(thesisInput, { target: { value: 'A labyrinth of infinite wisdom' } });

    const bodyInput = screen.getByPlaceholderText(/Share your critical reflections/i);
    fireEvent.change(bodyInput, {
      target: { value: 'This folio is a profound exploration into the paradoxes of time and thought.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Contemplation for Archival Review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(discoveryService.createBookReview).toHaveBeenCalledWith('book-ficciones-01', {
        rating: 5,
        title: 'A labyrinth of infinite wisdom',
        body: 'This folio is a profound exploration into the paradoxes of time and thought.',
        contains_spoiler: false,
      });
      expect(
        screen.getByText(/Your contemplation has been accessioned and sealed into the Akashic catalogue/i)
      ).toBeInTheDocument();
    });
  });

  it('renders dedicated Your Review section when user has already reviewed', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockAuthenticatedUser,
      isAuthenticated: true,
      loading: false,
      intendedDestination: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setIntendedDestination: vi.fn(),
    });

    vi.mocked(discoveryService.fetchMyReview).mockResolvedValue(mockUserReview);

    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      const yourCard = screen.getByTestId('your-review-card');
      expect(yourCard).toBeInTheDocument();
      expect(within(yourCard).getByText('Elena Solanas Personal Inscription')).toBeInTheDocument();
      expect(within(yourCard).getByText('An astounding journey through the labyrinth of Babel.')).toBeInTheDocument();
      expect(within(yourCard).getByRole('button', { name: /Edit Your Review/i })).toBeInTheDocument();
      expect(within(yourCard).getByRole('button', { name: /Delete Your Review/i })).toBeInTheDocument();
    });
  });

  it('supports editing an existing review with pre-populated values and saving changes', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockAuthenticatedUser,
      isAuthenticated: true,
      loading: false,
      intendedDestination: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setIntendedDestination: vi.fn(),
    });

    vi.mocked(discoveryService.fetchMyReview).mockResolvedValue(mockUserReview);
    vi.mocked(discoveryService.updateBookReview).mockResolvedValue({
      ...mockUserReview,
      title: 'Updated Thesis on Borgesian Reality',
      body: 'Updated deep reflection on Borgesian metaphysics.',
    });

    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('your-review-card')).toBeInTheDocument();
    });

    // Click Edit Your Review inside your-review-card
    const yourCard = screen.getByTestId('your-review-card');
    fireEvent.click(within(yourCard).getByRole('button', { name: /Edit Your Review/i }));

    // Verify form pre-populated
    const thesisInput = screen.getByPlaceholderText(/Inscribe your review thesis/i) as HTMLInputElement;
    const bodyInput = screen.getByPlaceholderText(/Share your critical reflections/i) as HTMLTextAreaElement;
    expect(thesisInput.value).toBe('Elena Solanas Personal Inscription');
    expect(bodyInput.value).toBe('An astounding journey through the labyrinth of Babel.');
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel Edit/i })).toBeInTheDocument();

    // Change body and save
    fireEvent.change(bodyInput, { target: { value: 'Updated deep reflection on Borgesian metaphysics.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(discoveryService.updateBookReview).toHaveBeenCalledWith(
        'book-ficciones-01',
        mockUserReview.id,
        expect.objectContaining({
          body: 'Updated deep reflection on Borgesian metaphysics.',
        })
      );
      expect(screen.getByText(/Your contemplation has been updated in the Akashic archives/i)).toBeInTheDocument();
    });
  });

  it('supports review deletion through confirmation dialog', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockAuthenticatedUser,
      isAuthenticated: true,
      loading: false,
      intendedDestination: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setIntendedDestination: vi.fn(),
    });

    vi.mocked(discoveryService.fetchMyReview).mockResolvedValue(mockUserReview);
    vi.mocked(discoveryService.deleteBookReview).mockResolvedValue();

    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('your-review-card')).toBeInTheDocument();
    });

    const yourCard = screen.getByTestId('your-review-card');
    // Open confirmation dialog
    fireEvent.click(within(yourCard).getByRole('button', { name: /Delete Your Review/i }));
    expect(screen.getByText('Delete Your Review?')).toBeInTheDocument();

    // Cancel first
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText('Delete Your Review?')).not.toBeInTheDocument();
    expect(discoveryService.deleteBookReview).not.toHaveBeenCalled();

    // Open again and confirm
    fireEvent.click(within(yourCard).getByRole('button', { name: /Delete Your Review/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Review' }));

    await waitFor(() => {
      expect(discoveryService.deleteBookReview).toHaveBeenCalledWith('book-ficciones-01', mockUserReview.id);
      expect(screen.getByText(/Your contemplation has been withdrawn from the archives/i)).toBeInTheDocument();
    });
  });

  it('supports expanding replies, replying inline, and deleting own reply', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockAuthenticatedUser,
      isAuthenticated: true,
      loading: false,
      intendedDestination: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setIntendedDestination: vi.fn(),
    });

    vi.mocked(discoveryService.createReviewReply).mockResolvedValue({
      id: 'rep-new',
      review_id: 'rev-01',
      book_id: 'book-ficciones-01',
      user_id: mockAuthenticatedUser.id,
      body: 'I wholeheartedly concur with Marcus on this analysis.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: mockAuthenticatedUser.id,
        username: mockAuthenticatedUser.username,
        display_name: mockAuthenticatedUser.display_name,
      },
    });
    vi.mocked(discoveryService.deleteReviewReply).mockResolvedValue();

    render(
      <BookReviewsPage
        bookId="book-ficciones-01"
        onNavigateBookDetail={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    // Expand replies for rev-01
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View 1 Reply/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /View 1 Reply/i }));

    await waitFor(() => {
      expect(screen.getByTestId('replies-thread-rev-01')).toBeInTheDocument();
      expect(screen.getByText('A deeply resonant observation on Borges.')).toBeInTheDocument();
    });

    // Click Reply button on review card
    const replyTriggerBtn = screen.getByRole('button', { name: /Reply to review by Marcus Aureliano/i });
    fireEvent.click(replyTriggerBtn);

    expect(screen.getByTestId('reply-composer-rev-01')).toBeInTheDocument();

    // Type reply
    const textarea = screen.getByLabelText(/Reply text/i);
    fireEvent.change(textarea, { target: { value: 'I wholeheartedly concur with Marcus on this analysis.' } });

    // Submit reply
    const postReplyBtn = screen.getByRole('button', { name: /Post Reply/i });
    fireEvent.click(postReplyBtn);

    await waitFor(() => {
      expect(discoveryService.createReviewReply).toHaveBeenCalledWith(
        'book-ficciones-01',
        'rev-01',
        'I wholeheartedly concur with Marcus on this analysis.'
      );
      expect(screen.getByText('I wholeheartedly concur with Marcus on this analysis.')).toBeInTheDocument();
    });

    // Delete own reply
    const replyCard = screen.getByTestId('reply-card-rep-01');
    const deleteReplyBtn = within(replyCard).getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteReplyBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Your Reply?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Reply' }));

    await waitFor(() => {
      expect(discoveryService.deleteReviewReply).toHaveBeenCalledWith('book-ficciones-01', 'rev-01', 'rep-01');
    });
  });
});
