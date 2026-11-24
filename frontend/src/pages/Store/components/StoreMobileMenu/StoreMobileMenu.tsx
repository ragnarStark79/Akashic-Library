import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Compass, ArrowRight } from 'lucide-react';
import type { StoreMobileMenuProps } from '../../types/store';
import { STORE_NAV_ITEMS } from '../../routes/storeNavigation';
import { subscribeCartCount } from '@/services/storeService';
import styles from './StoreMobileMenu.module.css';

export function StoreMobileMenu({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  onExitPortalToLibrary,
  onSignInClick,
  onSignOutClick,
  user,
}: StoreMobileMenuProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeCartCount((c) => setCartCount(c));
    return unsub;
  }, []);

  // Body scroll locking while drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const displayName = user?.display_name || user?.username || '';
  const initials = displayName.slice(0, 2).toUpperCase() || 'P';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.open : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Store navigation menu"
        inert={!isOpen ? true : undefined}
      >
        {/* Organic Background Shape SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 386 712"
          fill="none"
          className={styles.drawerBgSvg}
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M115.415-56.646c27.361-10.951 55.489-16.17 84.985-10.076 40.714 8.42 64.637 33.98 75.035 73.257 9.349 35.348 3.777 70.616-.769 105.961-4.86 37.766-10.042 75.565-12.734 113.514-1.993 28.09 5.481 54.869 20.638 79.162 14.419 23.106 34.405 37.375 61.693 41.433 30.041 4.465 59.172-.835 88.412-6.653 26.135-5.192 52.289-10.684 78.69-13.939 22.265-2.747 44.838-1.383 65.775 8.431 38.064 17.842 51.287 57.852 44.901 96.147-5.782 34.664-24.948 61.621-49.555 85.474-26.279 25.482-57.556 44.224-87.22 65.142-28.385 20.025-55.476 41.366-73.798 71.673-9.327 15.437-16.063 31.796-14.646 50.393 2.044 26.803 18.243 46.689 45.101 55.529a130 130 0 0 0 4.836 1.485l-139.704 55.662a1143 1143 0 0 1-16.076-9.954c-23.207-14.664-45.445-30.911-63.44-51.988-21.556-25.244-32.204-53.705-17.969-85.831 6.78-15.297 16.202-30.236 27.474-42.541 21.248-23.189 45.199-43.868 67.023-66.553 10.99-11.421 21.425-24.013 29.233-37.716 15.33-26.925 5.653-54.263-21.962-68.343-17.177-8.762-35.531-13.481-54.297-17.195-27.909-5.514-56.046-10.232-83.497-17.516-15.707-4.173-31.138-11.277-45.104-19.692-22.108-13.327-29.728-34.941-28.254-60.155 1.445-24.649 11.284-46.711 20.765-68.939 5.78-13.545 11.193-27.25 16.537-40.967 1.371-3.514 2.093-7.336 2.693-1"
          />
        </svg>

        <div className={styles.drawerContent}>
          {/* Header */}
          <div className={styles.drawerHeader}>
            <div className={styles.drawerBrand}>
              <div className={styles.drawerBrandIcon}>
                <Sparkles size={18} />
              </div>
              <span className={styles.drawerBrandTitle}>Akashic Store</span>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <div className={styles.navSection}>
            <ul className={styles.navList}>
              {STORE_NAV_ITEMS.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <li key={item.id} className={styles.navItem}>
                    <button
                      type="button"
                      className={`${styles.navButton} ${isActive ? styles.active : ''}`}
                      onClick={() => onNavigate(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className={styles.navLabel}>
                        {item.label}
                        {item.id === 'store-merch' && cartCount > 0 && (
                          <span style={{
                            marginLeft: '8px',
                            backgroundColor: 'var(--store-accent-pink, #FF007A)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontWeight: 700
                          }}>
                            {cartCount}
                          </span>
                        )}
                      </span>
                      {item.description && (
                        <span className={styles.navDescription}>{item.description}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Portal Transition Button: Return to Library */}
          <div className={styles.portalSection}>
            <button
              type="button"
              className={styles.portalButton}
              onClick={onExitPortalToLibrary}
              aria-label="Return to Library Sanctuary"
            >
              <span className={styles.portalButtonInner}>
                <Compass size={20} />
                <span>Return to Library</span>
              </span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Footer Auth State */}
          <div className={styles.drawerFooter}>
            {user ? (
              <div className={styles.userCard}>
                <div className={styles.userInfo}>
                  <div className={styles.userInitials}>{initials}</div>
                  <div className={styles.userNameWrap}>
                    <span className={styles.userDisplayName}>{displayName}</span>
                    <span className={styles.userRole}>
                      {user.role ? user.role.toLowerCase() : 'patron'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.signOutButton}
                  onClick={onSignOutClick}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.signInFullButton}
                onClick={onSignInClick}
              >
                Sign In to Akashic
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
