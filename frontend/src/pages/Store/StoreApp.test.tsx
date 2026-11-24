import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreApp } from './StoreApp';

describe('StoreApp Root & Routing', () => {
  it('renders StoreApp home view with shell layout', () => {
    render(
      <StoreApp
        currentView="store"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stories worth keeping. Worlds worth unboxing.' })).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works-section')).toBeInTheDocument();
    expect(screen.getByTestId('choose-from-section')).toBeInTheDocument();
    expect(screen.getByTestId('why-akashic-section')).toBeInTheDocument();
    expect(screen.getByTestId('common-questions-section')).toBeInTheDocument();
    expect(screen.getByTestId('store-footer')).toBeInTheDocument();
  });

  it('renders authentic allbooks catalogue view when route is store-allbooks', () => {
    render(
      <StoreApp
        currentView="store-allbooks"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    expect(screen.getByRole('heading', { name: 'Explore our selections' })).toBeInTheDocument();
  });

  it('renders gifting page when route is store-gifting', () => {
    render(
      <StoreApp
        currentView="store-gifting"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    expect(screen.getByTestId('store-gifting-page')).toBeInTheDocument();
    expect(screen.getByText(/A gift so good you’re going to want to borrow it/i)).toBeInTheDocument();
  });

  it('renders shopping bag cart view when route is store-merch', async () => {
    render(
      <StoreApp
        currentView="store-merch"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    expect(await screen.findByText(/Your Reading Box/i)).toBeInTheDocument();
  });

  it('renders faq placeholder view when route is store-faq', () => {
    render(
      <StoreApp
        currentView="store-faq"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    expect(screen.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeInTheDocument();
    expect(screen.getByText(/Roadmap: Stage 6/i)).toBeInTheDocument();
  });
});
