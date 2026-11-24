import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchResultsPage } from './SearchResults';
import * as discoveryService from '../../services/discoveryService';
import type { BookSearchResponse } from '../../types/discovery';

const mockBooksResponse: BookSearchResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'b-1',
      title: 'The Aleph',
      authors: ['Jorge Luis Borges'],
      published_date: '1949',
      language: 'es',
      rating: 4.9,
      review_count: 88,
      cover_url: null,
    },
    {
      id: 'b-2',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      published_date: '1944',
      language: 'es',
      rating: 4.8,
      review_count: 120,
      cover_url: null,
    },
  ],
};

const emptyResponse: BookSearchResponse = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

describe('SearchResultsPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search input, queries catalog, and displays results', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooksResponse);

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Borges')).toBeInTheDocument();

    await waitFor(() => {
      const alephCards = screen.getAllByRole('article', { name: /The Aleph/i });
      expect(alephCards.length).toBeGreaterThan(0);
      const ficcionesCards = screen.getAllByRole('article', { name: /Ficciones/i });
      expect(ficcionesCards.length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders active filter chips and allows clearing them', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooksResponse);

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges', subject: 'Philosophy' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Discipline: Philosophy/i)).toBeInTheDocument();
    });

    const clearAllBtn = screen.getByRole('button', { name: /Clear all/i });
    expect(clearAllBtn).toBeInTheDocument();
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Discipline: Philosophy/i)).not.toBeInTheDocument();
    });
  });

  it('handles sort selection changes', async () => {
    const fetchSpy = vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooksResponse);

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      const alephCards = screen.getAllByRole('article', { name: /The Aleph/i });
      expect(alephCards.length).toBeGreaterThan(0);
    });

    const sortSelect = screen.getByLabelText(/Sort search results/i);
    fireEvent.change(sortSelect, { target: { value: 'title' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'title' }),
        expect.anything()
      );
    });
  });

  it('displays empty state when no books match the query', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(emptyResponse);

    render(
      <SearchResultsPage
        initialFilters={{ q: 'NonexistentBook123' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No Folios Discovered')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Clear All Filters/i })).toBeInTheDocument();
  });

  it('calls onNavigateHome when breadcrumb Sanctuary link is clicked', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooksResponse);
    const handleNavigateHome = vi.fn();

    render(
      <SearchResultsPage
        initialFilters={{}}
        onNavigateHome={handleNavigateHome}
        onBookSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sanctuary/i })).toBeInTheDocument();
    });

    const sanctuaryBtn = screen.getByRole('button', { name: /Sanctuary/i });
    fireEvent.click(sanctuaryBtn);
    expect(handleNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('calls onBookSelect when a book card is selected', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooksResponse);
    const handleBookSelect = vi.fn();

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges' }}
        onNavigateHome={vi.fn()}
        onBookSelect={handleBookSelect}
      />
    );

    await waitFor(() => {
      const alephCards = screen.getAllByRole('article', { name: /The Aleph/i });
      expect(alephCards.length).toBeGreaterThan(0);
    });

    const alephCards = screen.getAllByRole('article', { name: /The Aleph/i });
    fireEvent.click(alephCards[0]!);
    expect(handleBookSelect).toHaveBeenCalledWith(mockBooksResponse.results[0]);
  });

  it('supports selecting a search scope and submitting scoped queries', async () => {
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockBooksResponse);
    const handleFiltersChange = vi.fn();

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Rebecca Yarros' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
        onFiltersChange={handleFiltersChange}
      />
    );

    const scopeSelect = screen.getByLabelText(/Search scope/i);
    expect(scopeSelect).toHaveValue('everything');

    fireEvent.change(scopeSelect, { target: { value: 'author' } });
    expect(scopeSelect).toHaveValue('author');

    const form = scopeSelect.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(handleFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search_scope: 'author',
          author: 'Rebecca Yarros',
          q: '',
        })
      );
    });
  });

  it('renders upstream count when global archives contain additional records', async () => {
    const upstreamResponse: BookSearchResponse = {
      count: 4,
      upstream_count: 142,
      next: null,
      previous: null,
      results: mockBooksResponse.results,
    };
    vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(upstreamResponse);

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Architecture' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/from 142 catalogued across Open Library/i)).toBeInTheDocument();
    });
  });
});
