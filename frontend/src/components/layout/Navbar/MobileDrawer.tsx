import { useEffect, useRef } from 'react';
import { X, BookOpen, Search, LogIn, LogOut, ChevronRight, User as UserIcon, Settings, Library, Shield, Sparkles } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import type { NavItem } from '@/types/navigation';
import type { User } from '@/types/auth';
import styles from './MobileDrawer.module.css';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  activeId?: string | null;
  onNavigate?: (id: string, href: string) => void;
  onSearchClick?: () => void;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
  user?: User | null;
}

export function MobileDrawer({
  isOpen,
  onClose,
  items,
  activeId,
  onNavigate,
  onSearchClick,
  onSignInClick,
  onSignOutClick,
  user,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Capture active element before opening so focus can be returned
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  // Keyboard Escape listener, focus trap & restoration
  useEffect(() => {
    if (!isOpen) return;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLinkClick = (id: string, href: string) => {
    onNavigate?.(id, href);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${styles.open}`}
        onClick={onClose}
        data-testid="mobile-drawer-backdrop"
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className={`${styles.drawer} ${styles.open}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerBrand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <BookOpen size={18} />
            </div>
            <span className={styles.drawerBrandTitle}>Akashic Library</span>
          </div>

          <IconButton
            ref={closeButtonRef}
            variant="ghost"
            size="lg"
            className={styles.closeButton}
            icon={<X size={22} />}
            aria-label="Close menu"
            onClick={onClose}
          />
        </div>

        <nav className={styles.drawerNav} aria-label="Mobile Navigation">
          <ul className={styles.drawerList}>
            {items.map((item) => {
              const isActive = Boolean(activeId && item.id === activeId);
              return (
                <li key={item.id} className={styles.drawerItem}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(item.id, item.href);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`
                      ${styles.drawerLink}
                      ${isActive ? styles.active : ''}
                    `.trim()}
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
            <li className={styles.drawerItem}>
              <a
                href="/?view=store"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('store', '/?view=store');
                }}
                className={styles.drawerLink}
                style={{ color: 'var(--color-action-primary)', fontWeight: 700 }}
                data-testid="mobile-drawer-store-link"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  <span>Akashic Store</span>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </nav>

        <div className={styles.drawerFooter}>
          <Button
            variant="subtle"
            size="lg"
            fullWidth
            leftIcon={<Search size={18} />}
            onClick={() => {
              onSearchClick?.();
              onClose();
            }}
          >
            Search Catalog
          </Button>

          {user ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-inset)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                <UserIcon size={16} style={{ color: 'var(--color-action-primary)' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name || user.username}
                </span>
              </div>
              <Button
                variant="subtle"
                size="md"
                fullWidth
                leftIcon={<Settings size={18} />}
                onClick={() => {
                  handleLinkClick('account-settings', '/?view=account-settings');
                }}
              >
                Account Settings
              </Button>
              <Button
                variant="subtle"
                size="md"
                fullWidth
                leftIcon={<Library size={18} />}
                onClick={() => {
                  handleLinkClick('library', '#library');
                }}
              >
                My Library
              </Button>
              {(user.role === 'MODERATOR' || user.role === 'ADMIN') && (
                <Button
                  variant="subtle"
                  size="md"
                  fullWidth
                  leftIcon={<Shield size={18} />}
                  onClick={() => {
                    handleLinkClick('moderation', '/?view=moderation');
                  }}
                  data-testid="drawer-moderation-link"
                >
                  Moderation Console
                </Button>
              )}
              <Button
                variant="subtle"
                size="md"
                fullWidth
                leftIcon={<LogOut size={18} />}
                onClick={() => {
                  onSignOutClick?.();
                  onClose();
                }}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<LogIn size={18} />}
              onClick={() => {
                onSignInClick?.();
                onClose();
              }}
            >
              Sign In / Join
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
