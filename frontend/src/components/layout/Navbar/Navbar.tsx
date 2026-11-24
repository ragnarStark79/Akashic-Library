import { useState, useRef, useEffect } from 'react';
import { BookOpen, Search, Menu, ChevronDown, Library, LogOut, Settings, Shield, Sparkles } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import type { NavbarProps } from '@/types/navigation';
import { DEFAULT_NAV_ITEMS } from './navConfig';
import { MobileDrawer } from './MobileDrawer';
import styles from './Navbar.module.css';

export function Navbar({
  activeId,
  onNavigate,
  onSearchClick,
  onSignInClick,
  onSignOutClick,
  user,
  className = '',
}: NavbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleLinkClick = (id: string, href: string) => {
    setIsDropdownOpen(false);
    onNavigate?.(id, href);
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  const displayName = user?.display_name || user?.username || '';
  const initials = displayName.slice(0, 2).toUpperCase() || 'P';

  return (
    <header className={`${styles.navbarWrapper} ${className}`.trim()}>
      <nav className={styles.pillNav} aria-label="Main Navigation">
        {/* ── Brand Logo ── */}
        <a
          href="#discover"
          className={styles.brand}
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('discover', '#discover');
          }}
          aria-label="Akashic Library Home"
        >
          <div className={styles.brandIcon} aria-hidden="true">
            <BookOpen size={18} />
          </div>
          <span className={styles.brandTitle}>Akashic Library</span>
        </a>

        {/* ── Desktop Navigation Links ── */}
        <div className={styles.desktopNav}>
          <ul className={styles.navList}>
            {DEFAULT_NAV_ITEMS.map((item) => {
              const isActive = Boolean(activeId && item.id === activeId);
              return (
                <li key={item.id} className={styles.navItem}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(item.id, item.href);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`
                      ${styles.navLink}
                      ${isActive ? styles.active : ''}
                    `.trim()}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Action Controls (Right) ── */}
        <div className={styles.actions}>
          {/* Search Capsule Trigger (responsive: full pill on desktop, icon circle on mobile) */}
          <button
            type="button"
            className={styles.searchCapsule}
            onClick={onSearchClick}
            aria-label="Search catalog"
          >
            <Search size={16} className={styles.searchCapsuleIcon} aria-hidden="true" />
            <span className={styles.searchCapsuleText}>Search folios...</span>
            <kbd className={styles.searchCapsuleKbd} aria-hidden="true">⌘K</kbd>
          </button>

          {/* Store Portal Capsule Trigger */}
          <button
            type="button"
            className={styles.storePortalButton}
            onClick={() => handleLinkClick('store', '/?view=store')}
            aria-label="Enter Akashic Store"
            data-testid="navbar-store-portal-btn"
          >
            <Sparkles size={14} className={styles.storeSparkleIcon} aria-hidden="true" />
            <span>Store</span>
          </button>

          {user ? (
            <div className={styles.userMenuWrapper} ref={dropdownRef}>
              <button
                ref={triggerRef}
                type="button"
                className={styles.userPill}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isDropdownOpen}
                aria-label={`Account menu for ${displayName}`}
              >
                <span className={styles.avatarInitials} aria-hidden="true">
                  {initials}
                </span>
                <ChevronDown
                  size={14}
                  className={`${styles.userChevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isDropdownOpen && (
                <div
                  className={styles.userDropdownMenu}
                  role="menu"
                  aria-label="User account menu"
                >
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownGreeting}>Signed in as</span>
                    <strong className={styles.dropdownUser}>{displayName}</strong>
                  </div>
                  <div className={styles.dropdownDivider} role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => handleLinkClick('account-settings', '/?view=account-settings')}
                  >
                    <Settings size={16} aria-hidden="true" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => handleLinkClick('library', '#library')}
                  >
                    <Library size={16} aria-hidden="true" />
                    <span>My Library</span>
                  </button>
                  {(user?.role === 'MODERATOR' || user?.role === 'ADMIN') && (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => handleLinkClick('moderation', '/?view=moderation')}
                      data-testid="navbar-moderation-link"
                    >
                      <Shield size={16} aria-hidden="true" />
                      <span>Moderation Console</span>
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => handleLinkClick('store', '/?view=store')}
                    data-testid="navbar-store-link"
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    <span>Akashic Store</span>
                  </button>
                  <div className={styles.dropdownDivider} role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSignOutClick?.();
                    }}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onSignInClick}
            >
              Sign In
            </Button>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <div className={styles.mobileMenuToggle}>
            <IconButton
              variant="subtle"
              size="md"
              icon={<Menu size={20} />}
              aria-label="Open navigation menu"
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen(true)}
            />
          </div>
        </div>
      </nav>

      {/* ── Responsive Mobile Navigation Drawer ── */}
      <MobileDrawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        items={DEFAULT_NAV_ITEMS}
        activeId={activeId}
        onNavigate={onNavigate}
        onSearchClick={onSearchClick}
        onSignInClick={onSignInClick}
        onSignOutClick={onSignOutClick}
        user={user}
      />
    </header>
  );
}
