import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StoreMobileMenu } from './StoreMobileMenu';
import type { User } from '@/types/auth';

const mockUser: User = {
  id: '456',
  username: 'rolex',
  email: 'rolex@akashic.local',
  display_name: 'Rolex Scholar',
  role: 'USER',
  bio: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('StoreMobileMenu Component', () => {
  it('renders when open with dialog accessibility attributes', () => {
    render(
      <StoreMobileMenu
        isOpen={true}
        onClose={vi.fn()}
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Store navigation menu' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: /All Books/i })).toBeInTheDocument();
  });

  it('triggers onNavigate when a drawer link is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <StoreMobileMenu
        isOpen={true}
        onClose={vi.fn()}
        activeView="store"
        onNavigate={handleNavigate}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Store navigation menu' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Gifting/i }));
    expect(handleNavigate).toHaveBeenCalledWith('store-gifting');
  });

  it('triggers onExitPortalToLibrary when Return to Library button is clicked', () => {
    const handleExit = vi.fn();
    render(
      <StoreMobileMenu
        isOpen={true}
        onClose={vi.fn()}
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={handleExit}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Store navigation menu' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Return to Library/i }));
    expect(handleExit).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked or Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <StoreMobileMenu
        isOpen={true}
        onClose={handleClose}
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={vi.fn()}
        user={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Close menu/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('displays user profile and sign out action when authenticated', () => {
    const handleSignOut = vi.fn();
    render(
      <StoreMobileMenu
        isOpen={true}
        onClose={vi.fn()}
        activeView="store"
        onNavigate={vi.fn()}
        onExitPortalToLibrary={vi.fn()}
        onSignInClick={vi.fn()}
        onSignOutClick={handleSignOut}
        user={mockUser}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Store navigation menu' });
    expect(within(dialog).getByText('Rolex Scholar')).toBeInTheDocument();
    const signOutBtn = within(dialog).getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutBtn);
    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });
});
