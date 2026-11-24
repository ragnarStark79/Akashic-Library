import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchResultsPage } from './SearchResults';
import * as discoveryService from '../../services/discoveryService';
import type { BookSearchResponse } from '../../types/discovery';

const mockResponse: BookSearchResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 'b-regression-01',
      title: 'Regression Guard Folio',
      authors: ['Senior QA Architect'],
      published_date: '2026',
      language: 'en',
      rating: 5.0,
      review_count: 1,
      cover_url: null,
    },
  ],
};

describe('SearchResults Infinite Loop & Request Stability Regression Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers exactly ONE request on initial mount and NEVER calls onFiltersChange inside effects', async () => {
    const fetchSpy = vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockResponse);
    const onFiltersChangeSpy = vi.fn();

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges', subject: 'Philosophy' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
        onFiltersChange={onFiltersChangeSpy}
      />
    );

    await waitFor(() => {
      const cards = screen.getAllByRole('article', { name: /Regression Guard Folio/i });
      expect(cards.length).toBeGreaterThan(0);
    });

    // Exactly 1 fetch invocation on mount
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // CRITICAL: onFiltersChange must NOT be called automatically during mount / inside effects
    // Calling it inside effects was the exact root cause of the 1,011 requests/25s loop!
    expect(onFiltersChangeSpy).toHaveBeenCalledTimes(0);
  });

  it('does NOT trigger repeated requests when re-rendered with identical filter values', async () => {
    const fetchSpy = vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockResponse);
    const onFiltersChangeSpy = vi.fn();

    const { rerender } = render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges', page: 1 }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
        onFiltersChange={onFiltersChangeSpy}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('article', { name: /Regression Guard Folio/i }).length).toBeGreaterThan(0);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Re-render multiple times with new object references containing identical scalar values
    rerender(
      <SearchResultsPage
        initialFilters={{ q: 'Borges', page: 1 }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
        onFiltersChange={onFiltersChangeSpy}
      />
    );

    rerender(
      <SearchResultsPage
        initialFilters={{ q: 'Borges', page: 1 }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
        onFiltersChange={onFiltersChangeSpy}
      />
    );

    // Still exactly 1 fetch invocation; zero loop triggers
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onFiltersChangeSpy).toHaveBeenCalledTimes(0);
  });

  it('triggers exactly ONE new request only when user deliberately changes filters', async () => {
    const fetchSpy = vi.spyOn(discoveryService, 'fetchBooks').mockResolvedValue(mockResponse);
    const onFiltersChangeSpy = vi.fn();

    render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
        onFiltersChange={onFiltersChangeSpy}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('article', { name: /Regression Guard Folio/i }).length).toBeGreaterThan(0);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onFiltersChangeSpy).toHaveBeenCalledTimes(0);

    // User submits a new query
    const searchInput = screen.getByLabelText(/Search codex query/i);
    fireEvent.change(searchInput, { target: { value: 'Calvino' } });

    const searchForm = searchInput.closest('form');
    fireEvent.submit(searchForm!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    // onFiltersChange is called exactly once as a direct result of user submission
    expect(onFiltersChangeSpy).toHaveBeenCalledTimes(1);
    expect(onFiltersChangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'Calvino', page: 1 })
    );
  });

  it('guarantees zero calls to window.fetch in demo mode', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.stubEnv('VITE_DISCOVERY_DATA_MODE', 'demo');

    try {
      const response = await discoveryService.fetchBooks({ q: 'Borges' });

      // Must return deterministic fixtures
      expect(response.results.length).toBeGreaterThan(0);

      // Must NEVER have invoked network fetch!
      expect(fetchMock).toHaveBeenCalledTimes(0);
    } finally {
      vi.unstubAllEnvs();
      global.fetch = originalFetch;
    }
  });

  it('aborts in-flight request when query parameters change rapidly', async () => {
    const capturedSignals: AbortSignal[] = [];

    vi.spyOn(discoveryService, 'fetchBooks').mockImplementation((_filters, options) => {
      if (options?.signal) {
        capturedSignals.push(options.signal);
      }
      // Return a pending promise that checks the abort signal
      return new Promise<BookSearchResponse>((resolve, reject) => {
        const timer = setTimeout(() => resolve(mockResponse), 500);
        options?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const { rerender } = render(
      <SearchResultsPage
        initialFilters={{ q: 'Borges' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    expect(capturedSignals.length).toBe(1);
    expect(capturedSignals[0]!.aborted).toBe(false);

    // Rapidly change query before the first request finishes
    rerender(
      <SearchResultsPage
        initialFilters={{ q: 'Camus' }}
        onNavigateHome={vi.fn()}
        onBookSelect={vi.fn()}
      />
    );

    // The FIRST request signal must now be aborted by the effect cleanup
    await waitFor(() => {
      expect(capturedSignals[0]!.aborted).toBe(true);
    });

    // The second request signal should be active
    expect(capturedSignals.length).toBe(2);
    expect(capturedSignals[1]!.aborted).toBe(false);
  });
});
