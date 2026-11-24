import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StoreHeader } from './StoreHeader';
import type { User } from '@/types/auth';

const mockUser: User = {
  id: '123',
  username: 'athena',
  email: 'athena@akashic.local',
  display_name: 'Athena Curates',
  role: 'USER',
  bio: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('StoreHeader Component', () => {
  it('renders store logo and brand title', () => {
    render(
      <StoreHeader
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Akashic Store')).toBeInTheDocument();
    expect(within(banner).getByText('Curated Editions')).toBeInTheDocument();
  });

  it('renders all store navigation items with active states', () => {
    render(
      <StoreHeader
        activeView="store-allbooks"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const banner = screen.getByRole('banner');
    const allBooksButton = within(banner).getByRole('button', { name: 'All Books' });
    expect(allBooksButton).toBeInTheDocument();
    expect(allBooksButton).toHaveAttribute('aria-current', 'page');

    const giftingButton = within(banner).getByRole('button', { name: 'Gifting' });
    expect(giftingButton).toBeInTheDocument();
    expect(giftingButton).not.toHaveAttribute('aria-current');
  });

  it('triggers onNavigate when a nav item is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <StoreHeader
        activeView="store"
        onNavigate={handleNavigate}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const banner = screen.getByRole('banner');
    fireEvent.click(within(banner).getByRole('button', { name: 'Gifting' }));
    expect(handleNavigate).toHaveBeenCalledWith('store-gifting');
  });

  it('triggers onExitPortalToLibrary when Library Sanctuary button is clicked', () => {
    const handleExit = vi.fn();
    render(
      <StoreHeader
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={handleExit}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const banner = screen.getByRole('banner');
    fireEvent.click(within(banner).getByRole('button', { name: /Library Sanctuary/i }));
    expect(handleExit).toHaveBeenCalledTimes(1);
  });

  it('displays unauthenticated state with Sign In and Explore buttons', () => {
    const handleSignIn = vi.fn();
    render(
      <StoreHeader
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={handleSignIn}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const banner = screen.getByRole('banner');
    const signInBtn = within(banner).getByRole('button', { name: 'Sign In' });
    expect(signInBtn).toBeInTheDocument();
    fireEvent.click(signInBtn);
    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });

  it('displays authenticated user pill and opens dropdown menu on click', () => {
    render(
      <StoreHeader
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={mockUser}
      />
    );

    const banner = screen.getByRole('banner');
    const userPill = within(banner).getByRole('button', { name: /Account menu for Athena Curates/i });
    expect(userPill).toHaveAttribute('aria-expanded', 'false');

    // Click to open dropdown
    fireEvent.click(userPill);
    expect(userPill).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'User account menu' });
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByText('Athena Curates')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Return to Library/i })).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    render(
      <StoreHeader
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={mockUser}
      />
    );

    const banner = screen.getByRole('banner');
    const userPill = within(banner).getByRole('button', { name: /Account menu for Athena Curates/i });
    fireEvent.click(userPill);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('hides outer brand and account controls on scroll down and reveals them on scroll up', () => {
    const { container } = render(
      <StoreHeader
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const titleCol = container.querySelector('._headerTitleCol_4dcf9c, [class*="headerTitleCol"]');
    const actionsCol = container.querySelector('._actions_4dcf9c, [class*="actions"]');
    expect(titleCol).not.toHaveClass(/outerNavHidden/);
    expect(actionsCol).not.toHaveClass(/outerNavHidden/);

    // Simulate scrolling down past threshold
    Object.defineProperty(window, 'scrollY', { value: 120, writable: true });
    fireEvent.scroll(window);

    expect(titleCol?.className).toMatch(/outerNavHidden/);
    expect(actionsCol?.className).toMatch(/outerNavHidden/);

    // Simulate scrolling back up
    Object.defineProperty(window, 'scrollY', { value: 80, writable: true });
    fireEvent.scroll(window);

    expect(titleCol?.className).not.toMatch(/outerNavHidden/);
    expect(actionsCol?.className).not.toMatch(/outerNavHidden/);
  });
});
