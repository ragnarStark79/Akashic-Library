import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  ApplicationShell,
  RouteLoadingFallback,
  ChunkErrorBoundary,
} from '@/components/layout';
import { BookDetailModal } from '@/components/discovery';
import { SearchModal } from '@/components/layout';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { resolveActiveNavigation } from '@/utils/navigation';
import type { BookListItem, SearchFilters, SearchScope } from '@/types/discovery';

// Route-level dynamic code splitting for optimal initial bundle size and resilient page loading
const DiscoveryHomePage = lazy(() =>
  import('@/pages/DiscoveryHome').then((m) => ({ default: m.DiscoveryHomePage }))
);
const SearchResultsPage = lazy(() =>
  import('@/pages/SearchResults').then((m) => ({ default: m.SearchResultsPage }))
);
const GenresIndexPage = lazy(() =>
  import('@/pages/Genres').then((m) => ({ default: m.GenresIndexPage }))
);
const GenreDetailPage = lazy(() =>
  import('@/pages/Genres').then((m) => ({ default: m.GenreDetailPage }))
);
const BookDetailPage = lazy(() =>
  import('@/pages/BookDetail').then((m) => ({ default: m.BookDetailPage }))
);
const BookReviewsPage = lazy(() =>
  import('@/pages/BookReviews').then((m) => ({ default: m.BookReviewsPage }))
);
const ReadingRoomPage = lazy(() =>
  import('@/pages/ReadingRoom').then((m) => ({ default: m.ReadingRoomPage }))
);
const CommunityHubPage = lazy(() =>
  import('@/pages/Community').then((m) => ({ default: m.CommunityHubPage }))
);
const CommunityThreadPreview = lazy(() =>
  import('@/pages/Community').then((m) => ({ default: m.CommunityThreadPreview }))
);
const AuthPage = lazy(() =>
  import('@/pages/Auth').then((m) => ({ default: m.AuthPage }))
);
const PersonalLibraryPage = lazy(() =>
  import('@/pages/PersonalLibrary').then((m) => ({ default: m.PersonalLibraryPage }))
);
const AccountSettingsPage = lazy(() =>
  import('@/pages/AccountSettings').then((m) => ({ default: m.AccountSettingsPage }))
);
const ModerationConsolePage = lazy(() =>
  import('@/pages/Moderation/ModerationConsolePage').then((m) => ({ default: m.ModerationConsolePage }))
);


type ViewMode =
  | 'discover'
  | 'search'
  | 'genres'
  | 'genre-detail'
  | 'book-detail'
  | 'book-reviews'
  | 'reading-room'
  | 'library'
  | 'account-settings'
  | 'auth'
  | 'community'
  | 'community-thread'
  | 'moderation'
  | 'about';

function AppContent() {
  const { user, isAuthenticated, logout, intendedDestination, setIntendedDestination } = useAuth();

  const [view, setView] = useState<ViewMode>('discover');
  const [searchFilters, setSearchFilters] = useState<Partial<SearchFilters>>({
    q: '',
    title: '',
    author: '',
    isbn: '',
    subject: '',
    sort: 'relevance',
    page: 1,
    page_size: 12,
    search_scope: 'everything',
  });
  const [selectedGenreId, setSelectedGenreId] = useState<string>('philosophy');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<BookListItem | null>(null);
  const [isWriteReview, setIsWriteReview] = useState<boolean>(false);
  const [isComposeAnnotation, setIsComposeAnnotation] = useState<boolean>(false);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Sync state with URL params on initial load and browser back/forward
  const syncFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlView = (params.get('view') as ViewMode) || 'discover';

    setView(urlView);

    setSearchFilters({
      q: params.get('q') || '',
      title: params.get('title') || undefined,
      isbn: params.get('isbn') || undefined,
      subject: params.get('subject') || undefined,
      author: params.get('author') || undefined,
      language: params.get('language') || undefined,
      year_from: params.get('year_from') ? parseInt(params.get('year_from')!, 10) : undefined,
      year_to: params.get('year_to') ? parseInt(params.get('year_to')!, 10) : undefined,
      sort: (params.get('sort') as 'relevance' | 'title' | 'date') || 'relevance',
      page: params.get('page') ? parseInt(params.get('page')!, 10) : 1,
      page_size: 12,
      search_scope: (params.get('search_scope') as SearchScope) || undefined,
    });

    if (params.get('genre')) {
      setSelectedGenreId(params.get('genre')!);
    }

    if (params.get('id')) {
      if (urlView === 'community-thread') {
        setSelectedDiscussionId(params.get('id')!);
      } else {
        setSelectedBookId(params.get('id')!);
      }
    }

    if (params.get('discussion_id')) {
      setSelectedDiscussionId(params.get('discussion_id')!);
    }

    setIsWriteReview(params.get('write') === 'true');
    setIsComposeAnnotation(params.get('compose') === 'true');

    if (window.location.hash) {
      const hashId = window.location.hash.replace(/^#/, '');
      setTimeout(() => {
        const el = document.getElementById(hashId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, []);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  // Update URL helper
  const updateUrl = useCallback(
    (
      newView: ViewMode,
      newFilters?: Partial<SearchFilters>,
      newGenreId?: string,
      newBookId?: string,
      writeMode?: boolean,
      composeMode?: boolean,
      newDiscussionId?: string
    ) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams();
      params.set('view', newView);

      if (newView === 'search' && newFilters) {
        if (newFilters.q) params.set('q', newFilters.q);
        if (newFilters.title) params.set('title', newFilters.title);
        if (newFilters.author) params.set('author', newFilters.author);
        if (newFilters.isbn) params.set('isbn', newFilters.isbn);
        if (newFilters.subject) params.set('subject', newFilters.subject);
        if (newFilters.language) params.set('language', newFilters.language);
        if (newFilters.year_from) params.set('year_from', String(newFilters.year_from));
        if (newFilters.year_to) params.set('year_to', String(newFilters.year_to));
        if (newFilters.sort) params.set('sort', newFilters.sort);
        if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));
        if (newFilters.search_scope) params.set('search_scope', newFilters.search_scope);
      }

      if (newView === 'genre-detail' && newGenreId) {
        params.set('genre', newGenreId);
      }

      if ((newView === 'book-detail' || newView === 'book-reviews' || newView === 'reading-room') && newBookId) {
        params.set('id', newBookId);
        if (newView === 'book-reviews' && writeMode) {
          params.set('write', 'true');
        }
        if (newView === 'reading-room' && composeMode) {
          params.set('compose', 'true');
        }
      }

      if (newView === 'community-thread' && newDiscussionId) {
        params.set('id', newDiscussionId);
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState(null, '', newUrl);
    },
    []
  );

  // Navigation handlers
  const handleNavigate = useCallback(
    (id: string) => {
      if (id === 'recommendations') {
        if (view !== 'discover') {
          setView('discover');
          updateUrl('discover');
        }
        setTimeout(() => {
          const el = document.getElementById('recommendations');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        return;
      } else if (id === 'featured') {
        if (view !== 'discover') {
          setView('discover');
          updateUrl('discover');
        }
        setTimeout(() => {
          const el = document.getElementById('featured');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        return;
      } else if (id === 'discover') {
        setView('discover');
        updateUrl('discover');
      } else if (id === 'genres') {
        setView('genres');
        updateUrl('genres');
      } else if (id === 'library') {
        if (!isAuthenticated) {
          setIntendedDestination({ view: 'library' });
          setView('auth');
          updateUrl('auth');
        } else {
          setView('library');
          updateUrl('library');
        }
      } else if (id === 'account-settings') {
        if (!isAuthenticated) {
          setIntendedDestination({ view: 'account-settings' });
          setView('auth');
          updateUrl('auth');
        } else {
          setView('account-settings');
          updateUrl('account-settings');
        }
      } else {
        setView(id as ViewMode);
        updateUrl(id as ViewMode);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [view, isAuthenticated, setIntendedDestination, updateUrl]
  );

  const handleSignInClick = useCallback(() => {
    setIntendedDestination({ view: view === 'auth' ? 'discover' : view });
    setView('auth');
    updateUrl('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view, setIntendedDestination, updateUrl]);

  const handleSignOutClick = useCallback(async () => {
    await logout();
    setView('discover');
    updateUrl('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [logout, updateUrl]);

  const handleAuthSuccess = useCallback(() => {
    if (intendedDestination && intendedDestination.view !== 'auth') {
      const dest = intendedDestination.view as ViewMode;
      setIntendedDestination(null);
      setView(dest);
      updateUrl(dest, undefined, intendedDestination.genreId, intendedDestination.bookId);
    } else {
      setView('library');
      updateUrl('library');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [intendedDestination, setIntendedDestination, updateUrl]);

  // Global Meta+K / Ctrl+K keyboard shortcut listener for Catalog Search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSearchClick = useCallback(() => {
    setIsSearchModalOpen(true);
  }, []);

  const handleHomepageSearchSubmit = useCallback(
    (query: string, scope?: SearchScope) => {
      setSearchFilters(() => {
        const activeScope = scope || 'everything';
        const updated: Partial<SearchFilters> = {
          q: '',
          title: '',
          author: '',
          isbn: '',
          subject: '',
          sort: 'relevance',
          page: 1,
          page_size: 12,
          search_scope: activeScope,
        };

        if (activeScope === 'title') {
          updated.title = query;
        } else if (activeScope === 'author') {
          updated.author = query;
        } else if (activeScope === 'isbn') {
          updated.isbn = query;
        } else if (activeScope === 'subject') {
          updated.subject = query;
        } else {
          updated.q = query;
        }

        updateUrl('search', updated);
        return updated;
      });
      setView('search');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleGenreSelect = useCallback(
    (genreId: string) => {
      setSelectedGenreId(genreId);
      setView('genre-detail');
      updateUrl('genre-detail', undefined, genreId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleSearchWithinGenre = useCallback(
    (genreName: string, query: string) => {
      setSearchFilters((prev) => {
        const updated = { ...prev, q: query, subject: genreName, page: 1 };
        updateUrl('search', updated);
        return updated;
      });
      setView('search');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleSearchResultsFiltersChange = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setSearchFilters(newFilters);
      updateUrl('search', newFilters);
    },
    [updateUrl]
  );

  // Dynamic individual book selection navigation
  const handleBookSelect = useCallback(
    (book: BookListItem) => {
      setSelectedBookId(book.id);
      setView('book-detail');
      updateUrl('book-detail', undefined, undefined, book.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleBookSelectById = useCallback(
    (bookId: string) => {
      setSelectedBookId(bookId);
      setView('book-detail');
      updateUrl('book-detail', undefined, undefined, bookId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleNavigateToReviews = useCallback(
    (bookId: string, writeMode = false) => {
      setSelectedBookId(bookId);
      setIsWriteReview(writeMode);
      setView('book-reviews');
      updateUrl('book-reviews', undefined, undefined, bookId, writeMode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleNavigateToReadingRoom = useCallback(
    (bookId: string, composeMode = false) => {
      setSelectedBookId(bookId);
      setIsComposeAnnotation(composeMode);
      setView('reading-room');
      updateUrl('reading-room', undefined, undefined, bookId, undefined, composeMode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  const handleDiscussionSelect = useCallback(
    (discussionId: string) => {
      setSelectedDiscussionId(discussionId);
      setView('community-thread');
      updateUrl('community-thread', undefined, undefined, undefined, undefined, undefined, discussionId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateUrl]
  );

  // Centralized active route resolution for the capsule navbar
  const activeNavId = resolveActiveNavigation(view);

  return (
    <ApplicationShell
      activeNavId={activeNavId}
      onNavigate={handleNavigate}
      onSearchClick={handleSearchClick}
      onSignInClick={handleSignInClick}
      onSignOutClick={handleSignOutClick}
      user={user}
    >
      {/* ── Screen View Routing with Suspense and Recoverable Error Boundary ── */}
      <ChunkErrorBoundary onNavigateHome={() => handleNavigate('discover')}>
        <Suspense fallback={<RouteLoadingFallback />}>
          {view === 'discover' && (
            <DiscoveryHomePage
              onSearchSubmit={handleHomepageSearchSubmit}
              onGenreSelect={handleGenreSelect}
              onBookSelect={handleBookSelect}
              onNavigateAuth={handleSignInClick}
            />
          )}

          {view === 'search' && (
            <SearchResultsPage
              initialFilters={searchFilters}
              onNavigateHome={() => handleNavigate('discover')}
              onBookSelect={handleBookSelect}
              onFiltersChange={handleSearchResultsFiltersChange}
            />
          )}

          {view === 'genres' && <GenresIndexPage onGenreSelect={handleGenreSelect} />}

          {view === 'genre-detail' && (
            <GenreDetailPage
              genreId={selectedGenreId}
              onNavigateGenres={() => handleNavigate('genres')}
              onSearchWithinGenre={handleSearchWithinGenre}
              onBookSelect={handleBookSelect}
            />
          )}

          {view === 'book-detail' && (
            <BookDetailPage
              bookId={selectedBookId}
              onNavigateHome={() => handleNavigate('discover')}
              onNavigateCatalog={() => {
                setView('search');
                updateUrl('search', searchFilters);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateSubject={(subject) => handleHomepageSearchSubmit(subject, 'subject')}
              onBookSelect={handleBookSelect}
              onNavigateReviews={(writeMode) => handleNavigateToReviews(selectedBookId, writeMode)}
              onNavigateReadingRoom={(composeMode) => handleNavigateToReadingRoom(selectedBookId, composeMode)}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'book-reviews' && (
            <BookReviewsPage
              bookId={selectedBookId}
              initialWriteMode={isWriteReview}
              onNavigateBookDetail={() => handleBookSelectById(selectedBookId)}
              onNavigateHome={() => handleNavigate('discover')}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'reading-room' && (
            <ReadingRoomPage
              bookId={selectedBookId}
              initialComposeMode={isComposeAnnotation}
              onNavigateBookDetail={() => handleBookSelectById(selectedBookId)}
              onNavigateReviews={() => handleNavigateToReviews(selectedBookId)}
              onNavigateHome={() => handleNavigate('discover')}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'auth' && (
            <AuthPage
              onNavigateHome={() => handleNavigate('discover')}
              onAuthSuccess={handleAuthSuccess}
              initialTab={
                typeof window !== 'undefined'
                  ? ((new URLSearchParams(window.location.search).get('tab') as
                    | 'signin'
                    | 'register'
                    | 'recover') || 'signin')
                  : 'signin'
              }
            />
          )}

          {view === 'library' && (
            <PersonalLibraryPage
              onNavigateDiscover={() => handleNavigate('discover')}
              onNavigateBook={handleBookSelectById}
              onNavigateReadingRoom={handleNavigateToReadingRoom}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'account-settings' && (
            <AccountSettingsPage
              onNavigateHome={() => handleNavigate('discover')}
              onNavigateLibrary={() => handleNavigate('library')}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'community' && (
            <CommunityHubPage
              onSelectDiscussion={handleDiscussionSelect}
              onNavigateBook={handleBookSelectById}
              onNavigateReviews={(bookId) => handleNavigateToReviews(bookId)}
              onNavigateReadingRoom={(bookId) => handleNavigateToReadingRoom(bookId)}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'community-thread' && (
            <CommunityThreadPreview
              discussionId={selectedDiscussionId}
              onNavigateCommunity={() => handleNavigate('community')}
              onNavigateBook={handleBookSelectById}
              onNavigateReviews={(bookId) => handleNavigateToReviews(bookId)}
              onNavigateReadingRoom={(bookId) => handleNavigateToReadingRoom(bookId)}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'moderation' && (
            <ModerationConsolePage
              onNavigateHome={() => handleNavigate('discover')}
              onSignInRequest={handleSignInClick}
            />
          )}

          {view === 'about' && (
            <div style={{ padding: 'var(--space-16) var(--space-4)', textAlign: 'center' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-family-heading)',
                  color: 'var(--color-action-primary)',
                }}
              >
                About Akashic Library
              </h2>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  maxWidth: '500px',
                  margin: 'var(--space-4) auto',
                  lineHeight: 1.6,
                }}
              >
                An open custodial repository and digital sanctuary for curious minds, thoughtful discovery,
                literary curation, and quiet contemplation.
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('discover')}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--color-action-primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Return to Home
              </button>
            </div>
          )}
        </Suspense>
      </ChunkErrorBoundary>

      {/* ── Book Detail Modal (for quick-view overlays when needed) ── */}
      <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />

      {/* ── Search Modal Overlay ── */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearchSubmit={handleHomepageSearchSubmit}
      />
    </ApplicationShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
