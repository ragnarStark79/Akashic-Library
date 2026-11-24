import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommunityThreadPage } from './CommunityThreadPage';
import * as communityService from '@/services/communityService';
import * as AuthContext from '@/context/AuthContext';
import type { User } from '@/types/auth';
import type { Discussion, DiscussionReply } from '@/types/community';

vi.mock('@/services/communityService');
vi.mock('@/context/AuthContext');

describe('CommunityThreadPage Component', () => {
  const mockDiscussion: Discussion = {
    id: 'disc-892',
    title: 'Does the labyrinth in Borges represent spatial geometry or temporal branching?',
    body: 'An ontological inquiry into the infinite maze of Tsui Pen and Stephen Albert.',
    topic_type: 'PHILOSOPHICAL_THESIS',
    author_user_id: 'user-marcus',
    created_at: 1730000000,
    updated_at: 1730000000,
    moderation_status: 'VISIBLE',
    book_id: 'book-ficciones',
    author: {
      id: 'user-marcus',
      username: 'marcus_aureliano',
      display_name: 'Marcus Aureliano',
    },
    book: {
      id: 'book-ficciones',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      cover_url: 'https://example.com/ficciones.jpg',
    },
  };

  const mockReplies: DiscussionReply[] = [
    {
      id: 'reply-1',
      discussion_id: 'disc-892',
      parent_id: null,
      author_user_id: 'user-clara',
      body: 'Marcus raises the quintessential inquiry. I caution against divesting physical geometry entirely.',
      book_id: 'book-ficciones',
      page_reference: 'p. 114',
      chapter_reference: 'Chapter 4',
      passage_excerpt: 'In all fictional works, each time a man is confronted with several alternatives...',
      created_at: 1730010000,
      updated_at: 1730010000,
      moderation_status: 'VISIBLE',
      author: {
        id: 'user-clara',
        username: 'clara_b',
        display_name: 'Clara Beauchamp',
      },
    },
    {
      id: 'reply-2',
      discussion_id: 'disc-892',
      parent_id: 'reply-1',
      author_user_id: 'user-active',
      body: 'Yet Clara, isn\'t that physical sequence intentionally subverted at the pavilion?',
      book_id: 'book-ficciones',
      page_reference: null,
      chapter_reference: null,
      passage_excerpt: null,
      created_at: 1730020000,
      updated_at: 1730020000,
      moderation_status: 'VISIBLE',
      author: {
        id: 'user-active',
        username: 'active_reader',
        display_name: 'Active Reader',
      },
    },
    {
      id: 'reply-3',
      discussion_id: 'disc-892',
      parent_id: null,
      author_user_id: 'user-active',
      body: 'My independent direct reflection on the Borges maze.',
      book_id: 'book-ficciones',
      page_reference: null,
      chapter_reference: null,
      passage_excerpt: null,
      created_at: 1730030000,
      updated_at: 1730030000,
      moderation_status: 'VISIBLE',
      author: {
        id: 'user-active',
        username: 'active_reader',
        display_name: 'Active Reader',
      },
    },
  ];

  const defaultProps = {
    discussionId: 'disc-892',
    onNavigateCommunity: vi.fn(),
    onNavigateBook: vi.fn(),
    onNavigateReviews: vi.fn(),
    onNavigateReadingRoom: vi.fn(),
    onSignInRequest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(communityService.getDiscussion).mockResolvedValue(mockDiscussion);
    vi.mocked(communityService.listReplies).mockResolvedValue(mockReplies);
    const mockUser: User = {
      id: 'user-active',
      username: 'active_reader',
      email: 'reader@test.com',
      role: 'USER',
      display_name: 'Active Reader',
      bio: 'Lover of labyrinths',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      intendedDestination: null,
      setIntendedDestination: vi.fn(),
    });
  });

  it('1. renders discussion card, author dossier, topic badge, and anchored book capsule', async () => {
    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Does the labyrinth in Borges represent/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Marcus Aureliano').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Philosophical Theses').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ficciones').length).toBeGreaterThan(0);
    expect(screen.getByTestId('master-discussion-card')).toBeInTheDocument();
    expect(screen.getByTestId('master-book-citation')).toBeInTheDocument();
  });

  it('2. renders direct replies (Level 1) and nested responses (Level 2) properly grouped', async () => {
    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('replies-stream')).toBeInTheDocument();
    });

    expect(screen.getByTestId('reply-card-reply-1')).toBeInTheDocument();
    expect(screen.getByText('Clara Beauchamp')).toBeInTheDocument();
    expect(screen.getByText(/caution against divesting physical geometry/i)).toBeInTheDocument();

    // Citation displayed
    expect(screen.getByText(/Chapter 4/i)).toBeInTheDocument();
    expect(screen.getByText(/In all fictional works/i)).toBeInTheDocument();

    // Nested reply rendered under reply-1
    expect(screen.getByTestId('nested-container-reply-1')).toBeInTheDocument();
    expect(screen.getByTestId('nested-reply-reply-2')).toBeInTheDocument();
    expect(screen.getByText(/↳ In response to Clara Beauchamp/i)).toBeInTheDocument();
  });

  it('3. renders empty state when discussion has no replies', async () => {
    vi.mocked(communityService.listReplies).mockResolvedValueOnce([]);

    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-conversation-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/A Pristine Literary Inscription/i)).toBeInTheDocument();
    expect(screen.getByText(/Inscribe the First Contemplation →/i)).toBeInTheDocument();
  });

  it('4. submits a direct reply successfully', async () => {
    const createdReply: DiscussionReply = {
      id: 'reply-new',
      discussion_id: 'disc-892',
      parent_id: null,
      author_user_id: 'user-active',
      body: 'A fresh contemplation on duration.',
      created_at: 1730030000,
      updated_at: 1730030000,
      moderation_status: 'VISIBLE',
      author: {
        id: 'user-active',
        username: 'active_reader',
        display_name: 'Active Reader',
      },
    };

    vi.mocked(communityService.createReply).mockResolvedValueOnce(createdReply);
    vi.mocked(communityService.listReplies).mockResolvedValueOnce(mockReplies).mockResolvedValueOnce([...mockReplies, createdReply]);

    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('discussion-reply-composer')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/Contemplation body/i);
    fireEvent.change(textarea, { target: { value: 'A fresh contemplation on duration.' } });

    const submitBtn = screen.getByRole('button', { name: /Inscribe Response/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(communityService.createReply).toHaveBeenCalledWith('disc-892', expect.objectContaining({
        body: 'A fresh contemplation on duration.',
        parent_id: null,
      }));
    });
  });

  it('5. starts replying to a specific direct reply and submits a nested response', async () => {
    const nestedReply: DiscussionReply = {
      id: 'reply-nested-new',
      discussion_id: 'disc-892',
      parent_id: 'reply-1',
      author_user_id: 'user-active',
      body: 'Direct response to Clara.',
      created_at: 1730030000,
      updated_at: 1730030000,
      moderation_status: 'VISIBLE',
    };

    vi.mocked(communityService.createReply).mockResolvedValueOnce(nestedReply);

    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Respond to Clara Beauchamp')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Respond to Clara Beauchamp'));

    expect(screen.getByText(/Inscribing in Response to Clara Beauchamp/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel Replying to Clara Beauchamp/i)).toBeInTheDocument();

    const textarea = screen.getByLabelText(/Contemplation body/i);
    fireEvent.change(textarea, { target: { value: 'Direct response to Clara.' } });

    const submitBtn = screen.getByRole('button', { name: /Inscribe Response/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(communityService.createReply).toHaveBeenCalledWith('disc-892', expect.objectContaining({
        body: 'Direct response to Clara.',
        parent_id: 'reply-1',
      }));
    });
  });

  it('6. shows edit and delete buttons only on the current user\'s replies', async () => {
    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('reply-card-reply-1')).toBeInTheDocument();
    });

    // Reply 1 is by Clara Beauchamp -> Current user is active_reader -> No edit/delete on Reply 1
    const reply1Card = screen.getByTestId('reply-card-reply-1');
    expect(reply1Card.querySelector('button[aria-label="Edit your reflection"]')).toBeNull();
    expect(reply1Card.querySelector('button[aria-label="Delete your reflection"]')).toBeNull();

    // Reply 2 is by active_reader -> Current user owns it -> Has edit/delete buttons
    const reply2Card = screen.getByTestId('nested-reply-reply-2');
    expect(reply2Card.querySelector('button[aria-label="Edit your nested response"]')).toBeInTheDocument();
    expect(reply2Card.querySelector('button[aria-label="Delete your nested response"]')).toBeInTheDocument();
  });

  it('7. opens accurate soft deletion dialog for nested response and executes deleteReply', async () => {
    vi.mocked(communityService.deleteReply).mockResolvedValueOnce(undefined);

    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('nested-reply-reply-2')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Delete your nested response');
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Retire Response from Conversation\?/i)).toBeInTheDocument();
    expect(screen.getByText(/The preceding contemplation and original dialogue will remain intact/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm Retirement/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Confirm Retirement/i));

    await waitFor(() => {
      expect(communityService.deleteReply).toHaveBeenCalledWith('disc-892', 'reply-2');
    });
  });

  it('7b. opens accurate soft deletion dialog for direct reply explaining child removal and original dialogue preservation', async () => {
    vi.mocked(communityService.deleteReply).mockResolvedValueOnce(undefined);

    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('reply-card-reply-3')).toBeInTheDocument();
    });

    const directReply3Card = screen.getByTestId('reply-card-reply-3');
    const deleteBtn = directReply3Card.querySelector('button[aria-label="Delete your reflection"]')!;
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Retire Contemplation from Conversation\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Removing this direct reply will also remove its nested reader responses/i)).toBeInTheDocument();
    expect(screen.getByText(/The original dialogue and volume record will remain intact/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm Retirement/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Confirm Retirement/i));

    await waitFor(() => {
      expect(communityService.deleteReply).toHaveBeenCalledWith('disc-892', 'reply-3');
    });
  });

  it('8. displays guest authentication intercept when unauthenticated reader visits composer', async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      intendedDestination: null,
      setIntendedDestination: vi.fn(),
    });

    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('guest-auth-intercept')).toBeInTheDocument();
    });

    expect(screen.getByText(/Authenticated Patron Required/i)).toBeInTheDocument();
    const signInBtn = screen.getByText(/Sign In to Inscribe/i);
    fireEvent.click(signInBtn);
    expect(defaultProps.onSignInRequest).toHaveBeenCalled();
  });

  it('9. triggers navigation callbacks for community return and book links', async () => {
    render(<CommunityThreadPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Return to Community Agora/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Return to Community Agora/i));
    expect(defaultProps.onNavigateCommunity).toHaveBeenCalled();

    // Click anchored volume link in sidebar
    fireEvent.click(screen.getByText(/View Book Details/i));
    expect(defaultProps.onNavigateBook).toHaveBeenCalledWith('book-ficciones');

    fireEvent.click(screen.getByText(/Read Public Reviews/i));
    expect(defaultProps.onNavigateReviews).toHaveBeenCalledWith('book-ficciones');

    fireEvent.click(screen.getByText(/Enter Reading Room/i));
    expect(defaultProps.onNavigateReadingRoom).toHaveBeenCalledWith('book-ficciones');
  });
});
