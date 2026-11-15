import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';
import { RouteLoadingFallback } from '../RouteLoadingFallback/RouteLoadingFallback';

const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    const error = new Error('Failed to fetch dynamically imported module /assets/BookDetail.js');
    error.name = 'TypeError';
    throw error;
  }
  return <div>Scholarly Content Loaded Successfully</div>;
};

describe('ChunkErrorBoundary & RouteLoadingFallback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ChunkErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText('Scholarly Content Loaded Successfully')).toBeInTheDocument();
  });

  it('catches chunk load failure and renders accessible error boundary alert', () => {
    render(
      <ChunkErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ChunkErrorBoundary>
    );

    expect(screen.getByTestId('chunk-error-boundary')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Archival Module Retrieval Interrupted')
    ).toBeInTheDocument();
    expect(screen.getByTestId('chunk-retry-button')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-home-button')).toBeInTheDocument();
  });

  it('triggers onNavigateHome when return button clicked', () => {
    const mockNavigateHome = vi.fn();
    render(
      <ChunkErrorBoundary onNavigateHome={mockNavigateHome}>
        <ProblemChild shouldThrow={true} />
      </ChunkErrorBoundary>
    );

    fireEvent.click(screen.getByTestId('chunk-home-button'));
    expect(mockNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('renders accessible route loading fallback with status role and polite announcement', () => {
    render(<RouteLoadingFallback label="Loading archival view..." subtext="Accessing records" />);

    const fallback = screen.getByTestId('route-loading-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute('role', 'status');
    expect(fallback).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Loading archival view...')).toBeInTheDocument();
    expect(screen.getByText('Accessing records')).toBeInTheDocument();
  });
});
