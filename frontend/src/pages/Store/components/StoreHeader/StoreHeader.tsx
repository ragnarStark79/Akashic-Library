import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  Compass,
  Settings,
  Library,
  LogOut,
  Menu,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import type { StoreHeaderProps } from '../../types/store';
import { STORE_NAV_ITEMS } from '../../routes/storeNavigation';
import { subscribeCartCount } from '@/services/storeService';
import { StoreNavButton } from './StoreNavButton';
import { StoreMobileMenu } from '../StoreMobileMenu/StoreMobileMenu';
import styles from './StoreHeader.module.css';

export function StoreHeader({
  activeView,
  onNavigate,
  onExitPortalToLibrary,
  onSignInClick,
  onSignOutClick,
  user,
  className = '',
}: StoreHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hideOuterNav, setHideOuterNav] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastScrollYRef = useRef(0);

  // Subscribe to live shopping bag counter
  useEffect(() => {
    const unsubscribe = subscribeCartCount((count) => {
      setCartCount(count);
    });
    return unsubscribe;
  }, []);

  // Detect scroll state and scroll direction (hide brand and account on scroll down)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      // Directional hide/reveal with 50px top threshold and 6px delta deadzone
      if (currentScrollY > 50) {
        const delta = currentScrollY - lastScrollYRef.current;
        if (delta > 6) {
          setHideOuterNav(true);
        } else if (delta < -6) {
          setHideOuterNav(false);
        }
      } else {
        setHideOuterNav(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
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
    <>
      <header
        className={`
          ${styles.headerWrapper}
          ${isScrolled ? styles.headerScrolled : ''}
          ${className}
        `.trim()}
        role="banner"
        data-testid="store-header"
      >
        <div className={styles.headerInner}>
          {/* ── LEFT: Akashic Store Brand & Logo (Placed cleanly directly over hero) ── */}
          <div className={`${styles.headerTitleCol} ${hideOuterNav ? styles.outerNavHidden : ''}`.trim()}>
            <a
              href="?view=store"
              className={styles.brand}
              onClick={(e) => {
                e.preventDefault();
                onNavigate('store');
              }}
              aria-label="Akashic Store Home"
            >
              <div className={styles.brandLogoWrap} aria-hidden="true">
                <Sparkles size={20} />
              </div>
              <div className={styles.brandText}>
                <span className={styles.brandTitle}>Akashic Store</span>
                <span className={styles.brandBadge}>Curated Editions</span>
              </div>
            </a>
          </div>

          {/* ── CENTRE: Individual Separated Navigation Pills with Character Hover Stagger ── */}
          <nav className={styles.desktopNav} aria-label="Store Navigation">
            <ul className={styles.navList}>
              {STORE_NAV_ITEMS.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <li key={item.id} className={styles.navItem}>
                    <StoreNavButton
                      label={item.label}
                      isActive={isActive}
                      badge={item.id === 'store-merch' ? cartCount : undefined}
                      onClick={() => onNavigate(item.id)}
                      data-testid={`store-nav-${item.id}`}
                    />
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ── RIGHT: Library Sanctuary & Account Controls ── */}
          <div className={`${styles.actions} ${hideOuterNav ? styles.outerNavHidden : ''}`.trim()}>
            {/* Library Sanctuary Action with Character Stagger */}
            <StoreNavButton
              label="Library Sanctuary"
              icon={<Compass size={16} aria-hidden="true" />}
              onClick={onExitPortalToLibrary}
              ariaLabel="Return to Akashic Library Sanctuary"
              data-testid="store-return-sanctuary-btn"
              className={styles.sanctuaryButton}
            />

            {/* Authenticated Patron Pill or Guest Sign-In */}
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
                  data-testid="store-account-menu-trigger"
                >
                  <span className={styles.avatarInitials} aria-hidden="true">
                    {initials}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`${styles.chevronIcon} ${isDropdownOpen ? styles.chevronOpen : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {isDropdownOpen && (
                  <div
                    className={styles.userDropdown}
                    role="menu"
                    aria-label="User account menu"
                  >
                    <div className={styles.dropdownHeader}>
                      <span className={styles.dropdownGreeting}>Signed in as</span>
                      <strong className={styles.dropdownUserName}>{displayName}</strong>
                    </div>
                    <div className={styles.dropdownDivider} role="separator" />

                    {user.role === 'ADMIN' && (
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigate('store-admin');
                        }}
                        data-testid="header-admin-link"
                      >
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    {user.role === 'STORE_MANAGER' && (!user.manager_status || user.manager_status === 'APPROVED') && (
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigate('store-manager');
                        }}
                        data-testid="header-store-manager-link"
                      >
                        <Sparkles size={16} aria-hidden="true" />
                        <span>Store Manager Portal</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        window.location.href = '/?view=account-settings';
                      }}
                    >
                      <Settings size={16} aria-hidden="true" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        window.location.href = '/?view=library';
                      }}
                    >
                      <Library size={16} aria-hidden="true" />
                      <span>My Library Shelves</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onExitPortalToLibrary();
                      }}
                    >
                      <Compass size={16} aria-hidden="true" />
                      <span>Return to Library</span>
                    </button>

                    <div className={styles.dropdownDivider} role="separator" />

                    <button
                      type="button"
                      role="menuitem"
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onSignOutClick();
                      }}
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <StoreNavButton
                label="Sign In"
                icon={<LogIn size={15} aria-hidden="true" />}
                variant="accent"
                onClick={onSignInClick}
                ariaLabel="Sign In"
                data-testid="store-signin-button"
              />
            )}

            {/* Mobile Menu Circular Hamburger Toggle */}
            <button
              type="button"
              className={styles.menuToggleButton}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              aria-expanded={isMobileMenuOpen}
              data-testid="store-mobile-menu-trigger"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer ── */}
      <StoreMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeView={activeView}
        onNavigate={(view) => {
          setIsMobileMenuOpen(false);
          onNavigate(view);
        }}
        onExitPortalToLibrary={() => {
          setIsMobileMenuOpen(false);
          onExitPortalToLibrary();
        }}
        onSignInClick={() => {
          setIsMobileMenuOpen(false);
          onSignInClick();
        }}
        onSignOutClick={() => {
          setIsMobileMenuOpen(false);
          onSignOutClick();
        }}
        user={user}
      />
    </>
  );
}

export default StoreHeader;
