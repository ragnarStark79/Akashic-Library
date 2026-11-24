import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from './Navbar';
import { MobileDrawer } from './MobileDrawer';
import { DEFAULT_NAV_ITEMS } from './navConfig';

describe('MobileDrawer Accessibility & Interaction Audit', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('1. moves focus to the close button inside the drawer when opened', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /Close menu/i });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('2. traps Tab and Shift+Tab focus within the open drawer', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /Close menu/i });
    const signInBtn = screen.getByRole('button', { name: /Sign In \/ Join/i });

    // Focus starts on closeBtn
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first element (closeBtn) wraps to last element (signInBtn)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(signInBtn);

    // Tab from last element (signInBtn) wraps to first element (closeBtn)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('3. closes the drawer on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <MobileDrawer
        isOpen={true}
        onClose={handleClose}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('4. returns focus to the original menu button after closing in Navbar', () => {
    render(<Navbar activeId="discover" />);
    const menuToggle = screen.getByRole('button', { name: /Open navigation menu/i });

    // Focus and click the toggle button
    menuToggle.focus();
    expect(document.activeElement).toBe(menuToggle);
    fireEvent.click(menuToggle);

    // Drawer is now open, focus moved inside to close button
    const closeBtn = screen.getByRole('button', { name: /Close menu/i });
    expect(document.activeElement).toBe(closeBtn);

    // Press Escape to dismiss drawer
    fireEvent.keyDown(window, { key: 'Escape' });

    // Focus should be restored back to the menu toggle button
    expect(document.activeElement).toBe(menuToggle);
  });

  it('5. locks body scrolling when open', () => {
    expect(document.body.style.overflow).toBe('');
    const { rerender } = render(
      <MobileDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MobileDrawer
        isOpen={false}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
  });

  it('6. restores body scrolling after closing', () => {
    const { rerender } = render(
      <MobileDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MobileDrawer
        isOpen={false}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('7. closes the drawer when clicking the backdrop', () => {
    const handleClose = vi.fn();
    render(
      <MobileDrawer
        isOpen={true}
        onClose={handleClose}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    const backdrop = screen.getByTestId('mobile-drawer-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('8. does not close when clicking inside the drawer surface', () => {
    const handleClose = vi.fn();
    render(
      <MobileDrawer
        isOpen={true}
        onClose={handleClose}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    const dialog = screen.getByRole('dialog', { name: /Mobile Navigation/i });
    fireEvent.click(dialog);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('9. provides complete ARIA attributes on dialog, navigation and links', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
        activeId="discover"
      />
    );
    const dialog = screen.getByRole('dialog', { name: /Mobile Navigation/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const activeLink = screen.getByRole('link', { name: /Home/i });
    expect(activeLink).toHaveAttribute('aria-current', 'page');

    const nonActiveLink = screen.getByRole('link', { name: /Genres/i });
    expect(nonActiveLink).not.toHaveAttribute('aria-current');
  });

  it('10. verifies touch targets have accessible height classes', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={DEFAULT_NAV_ITEMS}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /Close menu/i });
    expect(closeBtn.className).toMatch(/closeButton|_lg_/);

    const drawerLinks = screen.getAllByRole('link', { name: /Home|Genres|Community/i });
    drawerLinks.forEach((link) => {
      expect(link.className).toMatch(/drawerLink/);
    });
  });
});

