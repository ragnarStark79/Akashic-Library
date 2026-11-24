import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StoreApp } from './StoreApp';
import { StoreLoadingFallback } from './components/StoreHero/StoreLoadingFallback';
import type { StoreViewMode } from './types/store';

describe('Store Lifecycle & Scenario Verification (Stage 1B.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('Scenario A (Normal Entry): launches StoreHeroLoader on initial entrance and completes to reveal StoreHero', async () => {
    const handleNavigateStore = vi.fn();
    const handleExitPortal = vi.fn();

    render(
      <StoreApp
        currentView="store"
        onNavigateStore={handleNavigateStore}
        onExitPortalToLibrary={handleExitPortal}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    // Initial entrance renders StoreHeroLoader landmark
    expect(screen.getByTestId('store-hero-loader')).toBeInTheDocument();

    // Advance timers through preload timeout and fade-out transition
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // StoreHeroLoader completes and sets session marker
    expect(sessionStorage.getItem('akashic_store_loaded')).toBe('true');
  });

  it('Scenario B & C (Direct Store URL & Refresh): StoreLoadingFallback renders Store-specific branding and never Part I folio text', () => {
    render(<StoreLoadingFallback />);

    // Renders dedicated Store loading fallback landmark
    expect(screen.getByTestId('store-loading-fallback')).toBeInTheDocument();
    expect(screen.getByText('Akashic Store')).toBeInTheDocument();
    expect(screen.getByText('Entering the Artisanal Sanctuary')).toBeInTheDocument();

    // Absolute negative assertion: Part I folio text must NOT exist anywhere in fallback
    expect(screen.queryByText(/Opening library folio/i)).toBeNull();
    expect(screen.queryByText(/Retrieving archival manuscripts/i)).toBeNull();
  });

  it('Scenario D (Internal Store Navigation): does not replay initial loader when moving between Store views', async () => {
    // Simulate that store was already loaded in this session
    sessionStorage.setItem('akashic_store_loaded', 'true');

    const { rerender } = render(
      <StoreApp
        currentView="store"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    // Loader is bypassed because session is already initialized
    expect(screen.queryByTestId('store-hero-loader')).toBeNull();
    expect(screen.getByTestId('store-hero-section')).toBeInTheDocument();

    // Navigate to All Books view
    rerender(
      <StoreApp
        currentView={'store-allbooks' as StoreViewMode}
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    // Still no loader replaying
    expect(screen.queryByTestId('store-hero-loader')).toBeNull();
    expect(screen.getByText('Explore our selections')).toBeInTheDocument();
  });

  it('Scenario E & F (Return to Sanctuary & Re-enter Store): clearing session allows clean re-entrance lifecycle', async () => {
    const handleExitPortal = vi.fn();

    sessionStorage.setItem('akashic_store_loaded', 'true');

    render(
      <StoreApp
        currentView="store"
        onNavigateStore={vi.fn()}
        onExitPortalToLibrary={handleExitPortal}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    // Click Library Sanctuary in header
    const sanctuaryBtn = screen.getByTestId('store-return-sanctuary-btn');
    act(() => {
      sanctuaryBtn.click();
    });

    expect(handleExitPortal).toHaveBeenCalledTimes(1);

    // Exit portal clears the session loaded flag for future clean re-entry
    expect(sessionStorage.getItem('akashic_store_loaded')).toBeNull();
  });
});
