import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar Component', () => {
  it('renders the brand logo and title', () => {
    render(<Navbar />);
    expect(screen.getByText('Akashic Library')).toBeInTheDocument();
  });

  it('renders primary navigation links with accessible labels', () => {
    render(<Navbar activeId="discover" />);
    const link = screen.getByRole('link', { name: /^Home$/i });
    expect(link).toBeDefined();
    // Active item should have aria-current="page"
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('marks non-active links without aria-current', () => {
    render(<Navbar activeId="discover" />);
    const genreLinks = screen.getAllByRole('link', { name: /Genres/i });
    expect(genreLinks[0]).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate when a link is clicked', () => {
    const handleNavigate = vi.fn();
    render(<Navbar activeId="discover" onNavigate={handleNavigate} />);
    const genreLinks = screen.getAllByRole('link', { name: /Genres/i });
    expect(genreLinks[0]).toBeDefined();
    fireEvent.click(genreLinks[0]!);
    expect(handleNavigate).toHaveBeenCalledWith('genres', '#genres');
  });

  it('calls onSearchClick when the search trigger button is clicked', () => {
    const handleSearch = vi.fn();
    render(<Navbar onSearchClick={handleSearch} />);
    const searchBtn = screen.getByRole('button', { name: /Search catalog/i });
    fireEvent.click(searchBtn);
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('calls onSignInClick when the sign in button is clicked', () => {
    const handleSignIn = vi.fn();
    render(<Navbar onSignInClick={handleSignIn} />);
    const signInBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(signInBtn);
    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });

  it('opens and closes mobile drawer on toggle and escape key', () => {
    render(<Navbar activeId="discover" />);
    const toggleBtn = screen.getByRole('button', { name: /Open navigation menu/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Click toggle to open drawer
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /Mobile navigation/i })).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Mobile navigation/i })).not.toBeInTheDocument();
  });

  it('closes mobile drawer when close button inside drawer is clicked', () => {
    render(<Navbar activeId="discover" />);
    const toggleBtn = screen.getByRole('button', { name: /Open navigation menu/i });
    fireEvent.click(toggleBtn);

    const closeBtn = screen.getByRole('button', { name: /Close menu/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: /Mobile navigation/i })).not.toBeInTheDocument();
  });

  it('renders search capsule with "Search folios..." on desktop', () => {
    render(<Navbar />);
    expect(screen.getByText('Search folios...')).toBeInTheDocument();
  });

  it('toggles profile dropdown with Account Settings, My Library and Sign Out when authenticated', () => {
    const handleSignOut = vi.fn();
    const handleNavigate = vi.fn();
    const mockUser = {
      id: 'usr-1',
      username: 'patron_elena',
      email: 'elena@akashic.vault',
      display_name: 'Elena Solanas',
      role: 'USER',
      bio: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(
      <Navbar
        user={mockUser}
        onSignOutClick={handleSignOut}
        onNavigate={handleNavigate}
      />
    );

    // Profile pill trigger
    const profileBtn = screen.getByRole('button', { name: /Account menu for Elena Solanas/i });
    expect(profileBtn).toHaveAttribute('aria-expanded', 'false');

    // Open dropdown
    fireEvent.click(profileBtn);
    expect(profileBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: /User account menu/i })).toBeInTheDocument();
    expect(screen.getAllByText('Elena Solanas').length).toBeGreaterThanOrEqual(1);

    // Verify Account Settings item
    const settingsItem = screen.getByRole('menuitem', { name: /Account Settings/i });
    expect(settingsItem).toBeInTheDocument();
    fireEvent.click(settingsItem);
    expect(handleNavigate).toHaveBeenCalledWith('account-settings', '/?view=account-settings');

    // Reopen and verify My Library item
    fireEvent.click(profileBtn);
    const libraryItem = screen.getByRole('menuitem', { name: /My Library/i });
    fireEvent.click(libraryItem);
    expect(handleNavigate).toHaveBeenCalledWith('library', '#library');

    // Reopen and test Sign Out
    fireEvent.click(profileBtn);
    const signOutItem = screen.getByRole('menuitem', { name: /Sign Out/i });
    fireEvent.click(signOutItem);
    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });

  it('closes profile dropdown on Escape key', () => {
    const mockUser = {
      id: 'usr-1',
      username: 'patron_elena',
      email: 'elena@akashic.vault',
      display_name: 'Elena Solanas',
      role: 'USER',
      bio: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<Navbar user={mockUser} />);
    const profileBtn = screen.getByRole('button', { name: /Account menu for Elena Solanas/i });

    fireEvent.click(profileBtn);
    expect(screen.getByRole('menu', { name: /User account menu/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: /User account menu/i })).not.toBeInTheDocument();
  });

  it('renders Moderation Console link for MODERATOR and ADMIN, but hides it for USER and STORE_MANAGER', () => {
    const baseUser = {
      id: 'usr-mod',
      username: 'mod_elena',
      email: 'mod@akashic.vault',
      display_name: 'Elena Moderator',
      bio: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // 1. MODERATOR role
    const { unmount } = render(<Navbar user={{ ...baseUser, role: 'MODERATOR' }} />);
    let profileBtn = screen.getByRole('button', { name: /Account menu for Elena Moderator/i });
    fireEvent.click(profileBtn);
    expect(screen.getByRole('menuitem', { name: /Moderation Console/i })).toBeInTheDocument();
    unmount();

    // 2. ADMIN role
    const { unmount: unmountAdmin } = render(<Navbar user={{ ...baseUser, role: 'ADMIN' }} />);
    profileBtn = screen.getByRole('button', { name: /Account menu for Elena Moderator/i });
    fireEvent.click(profileBtn);
    expect(screen.getByRole('menuitem', { name: /Moderation Console/i })).toBeInTheDocument();
    unmountAdmin();

    // 3. USER role
    const { unmount: unmountUser } = render(<Navbar user={{ ...baseUser, role: 'USER' }} />);
    profileBtn = screen.getByRole('button', { name: /Account menu for Elena Moderator/i });
    fireEvent.click(profileBtn);
    expect(screen.queryByRole('menuitem', { name: /Moderation Console/i })).not.toBeInTheDocument();
    unmountUser();

    // 4. STORE_MANAGER role
    render(<Navbar user={{ ...baseUser, role: 'STORE_MANAGER' }} />);
    profileBtn = screen.getByRole('button', { name: /Account menu for Elena Moderator/i });
    fireEvent.click(profileBtn);
    expect(screen.queryByRole('menuitem', { name: /Moderation Console/i })).not.toBeInTheDocument();
  });
});
