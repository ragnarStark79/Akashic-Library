import { useState, useEffect } from 'react';
import type { StoreViewMode } from './types/store';
import type { User } from '@/types/auth';
import { StoreLayout } from './StoreLayout';
import { StoreHero, StoreHeroLoader } from './components/StoreHero';
import { StoreTopBooksSection } from './components/StoreBooksSection';
import { HowItWorksSection } from './components/HowItWorks';
import { ChooseFromSection } from './components/ChooseFrom';
import { WhyAkashicSection } from './components/WhyAkashic';
import { CommonQuestionsSection } from './components/CommonQuestions';
import { StorePlaceholder } from './components/StoreCommon/StorePlaceholder';
import { StoreAllBooksPage } from './pages/AllBooks/StoreAllBooksPage';
import { StoreManagerPage } from './pages/StoreManager/StoreManagerPage';
import { AdminDashboardPage } from './pages/Admin/AdminDashboardPage';
import { BookDetailPage } from './pages/BookDetail/BookDetailPage';
import { StoreCartPage } from './pages/Cart/StoreCartPage';
import { StoreCheckoutPage } from './pages/Checkout/StoreCheckoutPage';
import { StorePaymentPage } from './pages/Payment/StorePaymentPage';
import { StoreOrderSuccessPage } from './pages/OrderSuccess/StoreOrderSuccessPage';
import { StoreGiftingPage } from './pages/Gifting/StoreGiftingPage';

export interface StoreAppProps {
  currentView: StoreViewMode;
  currentProductId?: string;
  onNavigateStore: (view: StoreViewMode, productId?: string) => void;
  onExitPortalToLibrary: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  user: User | null;
}

export function StoreApp({
  currentView,
  currentProductId,
  onNavigateStore,
  onExitPortalToLibrary,
  onSignInClick,
  onSignOutClick,
  user,
}: StoreAppProps) {
  // Track whether the store loading experience has completed this session
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return !window.sessionStorage.getItem('akashic_store_loaded');
    }
    return true;
  });

  const handleLoaderComplete = () => {
    setIsLoading(false);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem('akashic_store_loaded', 'true');
      } catch {
        // Safe fallback in restricted environments
      }
    }
  };

  const handleExitPortal = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem('akashic_store_loaded');
      } catch {
        // Safe fallback
      }
    }
    onExitPortalToLibrary();
  };

  // ── Strict Role Redirection Enforcement ──
  useEffect(() => {
    if (currentView === 'store-manager') {
      if (user?.role === 'ADMIN') {
        onNavigateStore('store-admin');
      } else if (user && user.role !== 'STORE_MANAGER') {
        onNavigateStore('store');
      }
    } else if (currentView === 'store-admin') {
      if (user?.role === 'STORE_MANAGER' && (!user.manager_status || user.manager_status === 'APPROVED')) {
        onNavigateStore('store-manager');
      } else if (user && user.role !== 'ADMIN') {
        onNavigateStore('store');
      }
    }
  }, [currentView, user, onNavigateStore]);

  if (currentView === 'store-admin') {
    return (
      <AdminDashboardPage
        user={user}
        onNavigateStore={onNavigateStore}
        onSignOutClick={onSignOutClick}
      />
    );
  }

  if (currentView === 'store-manager') {
    return (
      <StoreManagerPage
        user={user}
        onNavigateStore={onNavigateStore}
        onSignInClick={onSignInClick}
        onSignOutClick={onSignOutClick}
      />
    );
  }

  return (
    <StoreLayout
      activeView={currentView}
      onNavigate={onNavigateStore}
      onExitPortalToLibrary={handleExitPortal}
      onSignInClick={onSignInClick}
      onSignOutClick={onSignOutClick}
      user={user}
    >
      {/* ── Intentional Loading Experience (Plays once on entrance) ── */}
      {isLoading && (
        <StoreHeroLoader onComplete={handleLoaderComplete} />
      )}

      {/* ── View Dispatcher ── */}
      {currentView === 'store' ? (
        <>
          <StoreHero
            onExploreClick={() => onNavigateStore('store-allbooks')}
            onEditionsClick={() => onNavigateStore('store-allbooks')}
            isInitialLoading={isLoading}
          />
          <StoreTopBooksSection
            onSelectBook={(book) => {
              onNavigateStore('store-book-detail', book?.id);
            }}
          />
          <HowItWorksSection onBecomeMemberClick={onSignInClick} />
          <ChooseFromSection
            onSelectCategory={(category) => {
              const targetGenre = category.slug === 'all' ? 'all' : category.label;
              if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                params.set('view', 'store-allbooks');
                if (targetGenre.toLowerCase() !== 'all') {
                  params.set('genre', targetGenre);
                } else {
                  params.delete('genre');
                }
                window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
              }
              onNavigateStore('store-allbooks');
            }}
            onSignUpClick={onSignInClick}
          />
          <WhyAkashicSection onExploreClick={() => onNavigateStore('store-allbooks')} />
          <CommonQuestionsSection />
        </>
      ) : currentView === 'store-allbooks' ? (
        <StoreAllBooksPage
          onSelectBook={(book) => {
            onNavigateStore('store-book-detail', book?.id);
          }}
          onNavigateHome={() => onNavigateStore('store')}
        />
      ) : currentView === 'store-gifting' ? (
        <StoreGiftingPage
          onNavigateStore={onNavigateStore}
          onSignInClick={onSignInClick}
        />
      ) : currentView === 'store-book-detail' ? (
        <BookDetailPage
          productId={currentProductId}
          onNavigateBack={() => onNavigateStore('store-allbooks')}
          onNavigateStore={onNavigateStore}
          onSignInClick={onSignInClick}
        />
      ) : currentView === 'store-merch' ? (
        <StoreCartPage
          onNavigateStore={onNavigateStore}
          onSignInClick={onSignInClick}
        />
      ) : currentView === 'store-checkout' ? (
        <StoreCheckoutPage
          onNavigateStore={onNavigateStore}
          user={user}
        />
      ) : currentView === 'store-payment' ? (
        <StorePaymentPage
          onNavigateStore={onNavigateStore}
        />
      ) : currentView === 'store-order-success' ? (
        <StoreOrderSuccessPage
          onNavigateStore={onNavigateStore}
        />
      ) : (
        <StorePlaceholder
          view={currentView}
          onNavigateHome={() => onNavigateStore('store')}
          onExitPortalToLibrary={handleExitPortal}
        />
      )}
    </StoreLayout>
  );
}

export default StoreApp;
