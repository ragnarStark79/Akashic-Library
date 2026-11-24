import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GenresIndexPage } from './GenresIndex';
import { GenreDetailPage } from './GenreDetail';
import * as discoveryService from '../../services/discoveryService';
import type { BookSearchResponse } from '../../types/discovery';

const mockBooks: BookSearchResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 'phil-1',
      title: 'Tractatus Logico-Philosophicus',
      authors: ['Ludwig Wittgenstein'],
      published_date: '1921',
      language: 'de',
      rating: 4.8,
      review_count: 55,
      cover_url: null,
    },
  ],
};

describe('GenresIndexPage Component', () => {
  it('renders page header and featured discipline spotlight', () => {
    const handleGenreSelect = vi.fn();
    render(<GenresIndexPage onGenreSelect={handleGenreSelect} />);

    expect(screen.getByText('Wander Through the Archives')).toBeInTheDocument();
    expect(screen.getByText(/Featured Discipline Spotlight/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Philosophy' })).toBeInTheDocument();
  });

  it('renders all approved classification cards', () => {
    const handleGenreSelect = vi.fn();
    render(<GenresIndexPage onGenreSelect={handleGenreSelect} />);

    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Science Fiction')).toBeInTheDocument();
    expect(screen.getByText('History & Lore')).toBeInTheDocument();
    expect(screen.getByText('Poetry & Essays')).toBeInTheDocument();
    expect(screen.getByText('Natural Philosophy & Cosmology')).toBeInTheDocument();
  });

  it('calls onGenreSelect when a discipline card or explore button is clicked', () => {
    const handleGenreSelect = vi.fn();
    render(<GenresIndexPage onGenreSelect={handleGenreSelect} />);

    const explorePhilosophyBtn = screen.getByRole('button', { name: /Explore Philosophy/i });
    fireEvent.click(explorePhilosophyBtn);
    expect(handleGenreSelect).toHaveBeenCalledWith('philosophy');

    const scifiCard = screen.getByRole('button', { name: /Science Fiction/i });
    fireEvent.click(scifiCard);
    expect(handleGenreSelect).toHaveBeenCalledWith('science-fiction');
  });
});

describe('GenreDetailPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders genre dossier, breadcrumb and subdiscipline theme pills', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooks);
    const handleNavigateGenres = vi.fn();

    render(
      <GenreDetailPage
        genreId="philosophy"
        onNavigateGenres={handleNavigateGenres}
        onSearchWithinGenre={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Cartography of Ideas: Philosophy/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Classifications/i })).toBeInTheDocument();
    expect(screen.getByText('Metaphysics')).toBeInTheDocument();
    expect(screen.getByText('Ethics')).toBeInTheDocument();

    await waitFor(() => {
      const cards = screen.getAllByRole('article', { name: /Tractatus Logico-Philosophicus/i });
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('navigates back to genres index when clicking breadcrumb', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooks);
    const handleNavigateGenres = vi.fn();

    render(
      <GenreDetailPage
        genreId="philosophy"
        onNavigateGenres={handleNavigateGenres}
        onSearchWithinGenre={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    const breadcrumbBtn = screen.getByRole('button', { name: /Classifications/i });
    fireEvent.click(breadcrumbBtn);
    expect(handleNavigateGenres).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      const cards = screen.getAllByRole('article', { name: /Tractatus Logico-Philosophicus/i });
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('allows scoped searching within the genre', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooks);
    const handleSearchWithinGenre = vi.fn();

    render(
      <GenreDetailPage
        genreId="philosophy"
        onNavigateGenres={vi.fn()}
        onSearchWithinGenre={handleSearchWithinGenre}
        onBookSelect={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search within Philosophy.../i);
    fireEvent.change(searchInput, { target: { value: 'Ethics' } });
    fireEvent.submit(searchInput.closest('form')!);

    expect(handleSearchWithinGenre).toHaveBeenCalledWith('Philosophy', 'Ethics');

    await waitFor(() => {
      const cards = screen.getAllByRole('article', { name: /Tractatus Logico-Philosophicus/i });
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('loads books for the genre and calls onBookSelect when clicked', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooks);
    const handleBookSelect = vi.fn();

    render(
      <GenreDetailPage
        genreId="philosophy"
        onNavigateGenres={vi.fn()}
        onSearchWithinGenre={vi.fn()}
        onBookSelect={handleBookSelect}
      />
    );

    await waitFor(() => {
      const cards = screen.getAllByRole('article', { name: /Tractatus Logico-Philosophicus/i });
      expect(cards.length).toBeGreaterThan(0);
    });

    const cards = screen.getAllByRole('article', { name: /Tractatus Logico-Philosophicus/i });
    fireEvent.click(cards[0]!);
    expect(handleBookSelect).toHaveBeenCalledWith(mockBooks.results[0]);
  });
});
