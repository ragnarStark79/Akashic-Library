import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryHomePage } from './DiscoveryHome';
import { AuthProvider } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import * as discoveryService from '../../services/discoveryService';
import * as recommendationService from '../../services/recommendationService';
import type { User } from '../../types/auth';

vi.mock('../../services/authService', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  setDemoUser: vi.fn(),
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

const mockFeatured = [
  {
    id: 'book-1',
    title: 'Ficciones',
    authors: ['Jorge Luis Borges'],
    cover_url: 'https://example.com/cover.jpg',
    review_count: 12,
  },
];

const mockRecommendations = {
  count: 1,
  page: 1,
  page_size: 4,
  results: [
    {
      id: 'rec-1',
      title: 'The Aleph',
      authors: [{ name: 'Jorge Luis Borges' }],
      covers: [{ url: 'https://example.com/aleph.jpg', is_primary: true }],
      subjects: ['Metaphysics'],
      recommendation_reason: 'Because you like related subjects',
    },
  ],
};

describe('DiscoveryHomePage', () => {
  const onSearchSubmit = vi.fn();
  const onGenreSelect = vi.fn();
  const onBookSelect = vi.fn();
  const onNavigateAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(discoveryService, 'fetchFeaturedBooks').mockResolvedValue(mockFeatured);
  });

  const renderComponent = async () => {
    return render(
      <AuthProvider>
        <DiscoveryHomePage
          onSearchSubmit={onSearchSubmit}
          onGenreSelect={onGenreSelect}
          onBookSelect={onBookSelect}
          onNavigateAuth={onNavigateAuth}
        />
      </AuthProvider>
    );
  };

  it('renders hero, search form, and from the archives section', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
    await renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Every book opens a new universe/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByText('Borges')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ficciones')).toBeInTheDocument();
    });
  });

  it('renders guest invitation card for #recommendations section when unauthenticated', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
    await renderComponent();

    const section = document.getElementById('recommendations');
    expect(section).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /Unlock Curated Recommendations for Your Reading Desk/i })
    ).toBeInTheDocument();

    const authBtn = screen.getByRole('button', { name: /Authenticate at Custodial Desk/i });
    expect(authBtn).toBeInTheDocument();

    fireEvent.click(authBtn);
    expect(onNavigateAuth).toHaveBeenCalledTimes(1);
  });

  it('renders personalized recommendations with reasons for authenticated patron', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    vi.spyOn(recommendationService, 'fetchPersonalizedRecommendations').mockResolvedValue(mockRecommendations);

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Curated for Elena Solanas/i })).toBeInTheDocument();
      expect(screen.getByText('The Aleph')).toBeInTheDocument();
      expect(screen.getByText('Because you like related subjects')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /Curated recommendations carousel track/i })).toBeInTheDocument();
    });
  });

  it('renders carousel navigation buttons and handles horizontal scrolling when recommendations > 3', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
    const multiRecommendations = {
      count: 4,
      page: 1,
      page_size: 10,
      results: [
        {
          id: 'rec-1',
          title: 'The Aleph',
          authors: [{ name: 'Jorge Luis Borges' }],
          covers: [{ url: 'https://example.com/aleph.jpg', is_primary: true }],
          subjects: ['Metaphysics'],
          recommendation_reason: 'Because you like related subjects',
        },
        {
          id: 'rec-2',
          title: 'Labyrinths',
          authors: [{ name: 'Jorge Luis Borges' }],
          covers: [{ url: 'https://example.com/labyrinths.jpg', is_primary: true }],
          subjects: ['Metaphysics'],
          recommendation_reason: 'Because you like related subjects',
        },
        {
          id: 'rec-3',
          title: 'Alvar Aalto: Complete Works',
          authors: [{ name: 'Karl Fleig' }],
          covers: [{ url: 'https://example.com/aalto-wide.jpg', is_primary: true }],
          subjects: ['Architecture'],
          recommendation_reason: 'Popular in Architectural Theory',
        },
        {
          id: 'rec-4',
          title: 'Invisible Cities',
          authors: [{ name: 'Italo Calvino' }],
          covers: [],
          subjects: ['Magical Realism'],
          recommendation_reason: 'Popular in Akashic Library',
        },
      ],
    };
    vi.spyOn(recommendationService, 'fetchPersonalizedRecommendations').mockResolvedValue(multiRecommendations);

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Curated recommendations carousel track/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Scroll recommendations left/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Scroll recommendations right/i })).toBeInTheDocument();
    });

    const track = screen.getByRole('region', { name: /Curated recommendations carousel track/i });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;

    const rightBtn = screen.getByRole('button', { name: /Scroll recommendations right/i });
    fireEvent.click(rightBtn);
    expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    const leftBtn = screen.getByRole('button', { name: /Scroll recommendations left/i });
    fireEvent.click(leftBtn);
    expect(scrollBySpy).toHaveBeenCalledTimes(2);
  });

  it('handles curated query chips click', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
    await renderComponent();

    const borgesChip = screen.getByRole('button', { name: 'Borges' });
    fireEvent.click(borgesChip);

    expect(onSearchSubmit).toHaveBeenCalledWith('Borges', 'everything');
  });
});
