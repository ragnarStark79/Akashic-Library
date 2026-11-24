import type { StoreLayoutProps } from './types/store';
import { StoreHeader } from './components/StoreHeader';
import { StoreFooter } from './components/StoreFooter';
import './styles/storeTokens.css';
import styles from './StoreLayout.module.css';

export function StoreLayout({
  activeView,
  onNavigate,
  onExitPortalToLibrary,
  onSignInClick,
  onSignOutClick,
  user,
  children,
}: StoreLayoutProps) {
  return (
    <div className={`${styles.storeRoot} storeTheme`}>
      <StoreHeader
        activeView={activeView}
        onNavigate={onNavigate}
        onExitPortalToLibrary={onExitPortalToLibrary}
        onSignInClick={onSignInClick}
        onSignOutClick={onSignOutClick}
        user={user}
      />

      <main className={styles.mainContent} id="store-main">
        {children}
      </main>

      <StoreFooter
        onNavigate={onNavigate}
        onExitPortalToLibrary={onExitPortalToLibrary}
      />
    </div>
  );
}
