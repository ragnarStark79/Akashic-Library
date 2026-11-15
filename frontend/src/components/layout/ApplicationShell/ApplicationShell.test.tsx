import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationShell } from './ApplicationShell';

describe('ApplicationShell Component', () => {
  it('renders skip to main content link targeting #main-content', () => {
    render(
      <ApplicationShell>
        <div>Content</div>
      </ApplicationShell>
    );
    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders main landmark with id="main-content" and renders children', () => {
    render(
      <ApplicationShell>
        <div data-testid="page-child">Test Page Content</div>
      </ApplicationShell>
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(screen.getByTestId('page-child')).toBeInTheDocument();
    expect(screen.getByText('Test Page Content')).toBeInTheDocument();
  });

  it('renders Navbar and Footer by default', () => {
    render(
      <ApplicationShell>
        <p>Body</p>
      </ApplicationShell>
    );
    // Navbar landmark
    expect(screen.getByRole('navigation', { name: /Main navigation/i })).toBeInTheDocument();
    // Footer landmark
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('can hide footer when showFooter={false}', () => {
    render(
      <ApplicationShell showFooter={false}>
        <p>Body</p>
      </ApplicationShell>
    );
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('passes onNavigate callback to Navbar', () => {
    const handleNavigate = vi.fn();
    render(
      <ApplicationShell activeNavId="discover" onNavigate={handleNavigate}>
        <p>Body</p>
      </ApplicationShell>
    );
    const genresLink = screen.getAllByRole('link', { name: /Genres/i })[0];
    expect(genresLink).toBeDefined();
    genresLink!.click();
    expect(handleNavigate).toHaveBeenCalledWith('genres', '#genres');
  });
});
