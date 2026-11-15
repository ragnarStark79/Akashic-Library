import React from 'react';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import type { ApplicationShellProps } from '../../../types/navigation';
import styles from './ApplicationShell.module.css';

export const ApplicationShell: React.FC<ApplicationShellProps> = ({
  children,
  activeNavId,
  onNavigate,
  onSearchClick,
  onSignInClick,
  onSignOutClick,
  user,
  className,
  showFooter = true,
}) => {
  return (
    <div className={`${styles.shell} ${className ?? ''}`}>
      {/* Skip to Content for Keyboard and Screen Reader Accessibility */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* Floating Pill Header / Navigation */}
      <Navbar
        activeId={activeNavId}
        onNavigate={onNavigate}
        onSearchClick={onSearchClick}
        onSignInClick={onSignInClick}
        onSignOutClick={onSignOutClick}
        user={user}
      />

      {/* Main Content Landmark */}
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>

      {/* Literary Editorial Footer */}
      {showFooter && (
        <Footer
          onNavigate={(href) => {
            if (onNavigate) {
              const matchedId = href.replace(/^#/, '');
              onNavigate(matchedId, href);
            }
          }}
        />
      )}
    </div>
  );
};

