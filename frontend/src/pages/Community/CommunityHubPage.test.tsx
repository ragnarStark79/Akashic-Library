import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommunityHubPage } from './CommunityHubPage';
import * as communityService from '@/services/communityService';
import * as AuthContext from '@/context/AuthContext';
import type { Discussion } from '@/types/community';

vi.mock('@/services/communityService');

const mockDiscussions: Discussion[] = [
  {
    id: 'disc-1',
    title: 'Does the labyrinth in Borges represent spatial geometry or temporal branching?',
    body: 'In examining The Garden of Forking Paths, Tsui Pen riddle hinges on an infinite web of divergent futures.',
    topic_type: 'PHILOSOPHICAL_THESIS',
    author_user_id: 'user-1',
    created_at: 1700000000,
    updated_at: 1700000000,
    moderation_status: 'VISIBLE',
    book_id: 'book-borges',
    author: {
      id: 'user-1',
      username: 'aurelius',
      display_name: 'Aurelius Vance',
    },
    reply_count: 5,
    book: {
      id: 'book-borges',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      cover_url: null,
    },
  },
  {
    id: 'disc-2',
    title: 'Memory and melancholia: Translating subtle grief in Marco Polo dialogues',
    body: 'How Calvino structures the invisible cities as reflections of loss.',
    topic_type: 'LITERARY_TRANSLATION',
    author_user_id: 'user-2',
    created_at: 1700005000,
    updated_at: 1700005000,
    moderation_status: 'VISIBLE',
    author: {
      id: 'user-2',
      username: 'beatrice',
      display_name: 'Beatrice Thorne',
    },
    reply_count: 2,
    book: null,
  },
];

describe('CommunityHubPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(communityService.listDiscussions).mockResolvedValue(mockDiscussions);
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        username: 'aurelius',
        email: 'aurelius@akashic.vault',
        role: 'USER',
        display_name: 'Aurelius Vance',
        bio: '',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
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

  it('1. renders editorial page title, subtitle, and primary actions', async () => {
    render(
      <CommunityHubPage
        onSelectDiscussion={vi.fn()}
        onNavigateBook={vi.fn()}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /The Agora of Contemplation: Community Dialogues/i,
      })
    ).toBeDefined();

    expect(screen.getByRole('button', { name: /Begin a new dialogue/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Does the labyrinth in Borges/i)).toBeDefined();
    });
  });

  it('2. renders category filters and filters discussions when clicked', async () => {
    render(
      <CommunityHubPage
        onSelectDiscussion={vi.fn()}
        onNavigateBook={vi.fn()}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    const thesisTab = screen.getByRole('tab', { name: /Philosophical Theses/i });
    fireEvent.click(thesisTab);

    await waitFor(() => {
      expect(communityService.listDiscussions).toHaveBeenCalledWith(
        expect.objectContaining({ topic_type: 'PHILOSOPHICAL_THESIS' })
      );
    });
  });

  it('3. displays discussion cards with author, topic, reply count, and book anchor', async () => {
    const handleSelect = vi.fn();
    const handleBook = vi.fn();

    render(
      <CommunityHubPage
        onSelectDiscussion={handleSelect}
        onNavigateBook={handleBook}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Aurelius Vance').length).toBeGreaterThan(0);
      expect(screen.getByText(/5 Contemplative Responses/i)).toBeDefined();
      expect(screen.getByText(/Anchored to: Ficciones/i)).toBeDefined();
    });

    // Click book anchor badge
    const bookBadge = screen.getByRole('button', { name: /Open Book Details for Ficciones/i });
    fireEvent.click(bookBadge);
    expect(handleBook).toHaveBeenCalledWith('book-borges');

    // Click Enter Dialogue
    const enterBtn = screen.getByRole('button', { name: /Enter dialogue: Does the labyrinth/i });
    fireEvent.click(enterBtn);
    expect(handleSelect).toHaveBeenCalledWith('disc-1');
  });

  it('4. filters discussions by in-page search query', async () => {
    render(
      <CommunityHubPage
        onSelectDiscussion={vi.fn()}
        onNavigateBook={vi.fn()}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    const searchInput = screen.getByRole('searchbox', {
      name: /Filter community dialogues by keyword/i,
    });
    fireEvent.change(searchInput, { target: { value: 'Borges' } });

    await waitFor(() => {
      expect(communityService.listDiscussions).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Borges' })
      );
    });
  });

  it('5. renders empty state when no discussions exist', async () => {
    vi.mocked(communityService.listDiscussions).mockResolvedValueOnce([]);

    render(
      <CommunityHubPage
        onSelectDiscussion={vi.fn()}
        onNavigateBook={vi.fn()}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-community-state')).toBeDefined();
      expect(screen.getByText(/The Chamber of Discourse Awaits/i)).toBeDefined();
    });
  });

  it('6. opens composer dialog and handles discussion creation', async () => {
    vi.mocked(communityService.createDiscussion).mockResolvedValueOnce({
      id: 'disc-new',
      title: 'New Inscription',
      body: 'New Body',
      topic_type: 'GENERAL',
      author_user_id: 'user-1',
      created_at: 1700010000,
      updated_at: 1700010000,
      moderation_status: 'VISIBLE',
    });

    const handleSelect = vi.fn();

    render(
      <CommunityHubPage
        onSelectDiscussion={handleSelect}
        onNavigateBook={vi.fn()}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={vi.fn()}
      />
    );

    const openBtn = screen.getByRole('button', { name: /Begin a new dialogue/i });
    fireEvent.click(openBtn);

    expect(screen.getByRole('dialog')).toBeDefined();

    const titleInput = screen.getByLabelText(/Dialogue Title \*/i);
    const bodyInput = screen.getByLabelText(/Contemplation \/ Thesis Body \*/i);

    fireEvent.change(titleInput, { target: { value: 'New Inscription' } });
    fireEvent.change(bodyInput, { target: { value: 'New Body text here...' } });

    const submitBtn = screen.getByRole('button', { name: /Inscribe Dialogue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(communityService.createDiscussion).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Inscription',
          body: 'New Body text here...',
        })
      );
      expect(handleSelect).toHaveBeenCalledWith('disc-new');
    });
  });

  it('7. displays authentication prompt if unauthenticated visitor opens composer', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
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

    const handleSignIn = vi.fn();

    render(
      <CommunityHubPage
        onSelectDiscussion={vi.fn()}
        onNavigateBook={vi.fn()}
        onNavigateReviews={vi.fn()}
        onNavigateReadingRoom={vi.fn()}
        onSignInRequest={handleSignIn}
      />
    );

    const openBtn = screen.getByRole('button', { name: /Begin a new dialogue/i });
    fireEvent.click(openBtn);

    expect(screen.getByText(/Please Present Your Akashic Seal/i)).toBeDefined();

    const signInBtn = screen.getByRole('button', { name: /Sign In to Inscribe/i });
    fireEvent.click(signInBtn);

    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });
});
