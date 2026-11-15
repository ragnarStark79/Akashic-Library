/**
 * Personal Library / Sanctuary Page
 * Matches Phase 4A Design Reference:
 * - Populated: akashic_library_personal_sanctuary_desktop
 * - Empty / New User: akashic_library_personal_sanctuary_empty_states_new_user
 * Integrates directly with verified Django /api/library/ endpoints.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Bookmark,
  CheckCircle,
  Compass,
  Feather,
  Heart,
  Lock,
  Sparkles,
  Trash2,
  Archive,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { LibraryEntry, ReadingStatus } from '@/types/library';
import {
  fetchUserLibrary,
  updateLibraryEntry,
  removeLibraryEntry,
  toggleBookFavorite,
} from '@/services/libraryService';
import styles from './PersonalLibraryPage.module.css';

export interface PersonalLibraryPageProps {
  onNavigateDiscover: () => void;
  onNavigateBook: (bookId: string) => void;
  onNavigateReadingRoom?: (bookId: string) => void;
  onSignInRequest: () => void;
}

type ShelfTab = 'ALL' | ReadingStatus;

export const PersonalLibraryPage: React.FC<PersonalLibraryPageProps> = ({
  onNavigateDiscover,
  onNavigateBook,
  onNavigateReadingRoom,
  onSignInRequest,
}) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShelfTab>('ALL');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load authenticated user library
  const loadLibrary = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchUserLibrary({ page: 1, pageSize: 100, signal });
      setEntries(response.results);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Unable to retrieve your personal sanctuary library. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const controller = new AbortController();
    loadLibrary(controller.signal);
    return () => controller.abort();
  }, [loadLibrary]);

  // Handle status update (Move between shelves)
  const handleStatusChange = async (bookId: string, newStatus: ReadingStatus) => {
    try {
      const updated = await updateLibraryEntry(bookId, newStatus);
      setEntries((prev) =>
        prev.map((item) => (item.book_id === bookId ? { ...item, status: updated.status } : item))
      );
      setActionFeedback(`Folio status updated to ${getStatusLabel(newStatus)}.`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback('Failed to update shelf status.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Handle removal from library
  const handleRemove = async (bookId: string, bookTitle: string) => {
    try {
      await removeLibraryEntry(bookId);
      setEntries((prev) => prev.filter((item) => item.book_id !== bookId));
      setActionFeedback(`"${bookTitle}" removed from your personal sanctuary.`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback('Unable to remove folio from library.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async (bookId: string, currentFav: boolean) => {
    try {
      const newFavState = await toggleBookFavorite(bookId, currentFav);
      setEntries((prev) =>
        prev.map((item) => (item.book_id === bookId ? { ...item, favorited: newFavState } : item))
      );
    } catch {
      setActionFeedback('Unable to update favorite status.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Counts by status
  const totalCount = entries.length;
  const readingCount = entries.filter((e) => e.status === 'READING').length;
  const wantToReadCount = entries.filter((e) => e.status === 'WANT_TO_READ').length;
  const readCount = entries.filter((e) => e.status === 'READ').length;
  const abandonedCount = entries.filter((e) => e.status === 'ABANDONED').length;

  // Filtered entries by current active tab
  const displayedEntries =
    activeTab === 'ALL'
      ? entries
      : entries.filter((entry) => entry.status === activeTab);

  function getStatusLabel(status: ReadingStatus): string {
    switch (status) {
      case 'READING':
        return 'Currently Reading';
      case 'WANT_TO_READ':
        return 'Want to Read';
      case 'READ':
        return 'Completed';
      case 'ABANDONED':
        return 'Set Aside / Abandoned';
    }
  }

  function getStatusBadgeClass(status: ReadingStatus): string {
    switch (status) {
      case 'READING':
        return `${styles.statusBadge} ${styles.statusReading}`;
      case 'WANT_TO_READ':
        return `${styles.statusBadge} ${styles.statusWantToRead}`;
      case 'READ':
        return `${styles.statusBadge} ${styles.statusRead}`;
      case 'ABANDONED':
        return `${styles.statusBadge} ${styles.statusAbandoned}`;
    }
  }

  // ── Unauthenticated State ──
  if (!authLoading && !isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.ambientBloomTop} aria-hidden="true" />
        <div className={styles.ambientBloomBottom} aria-hidden="true" />

        <div className={styles.container}>
          <div className={styles.authRequiredCard}>
            <div className={styles.emptyIconWrapper}>
              <Lock size={44} />
            </div>
            <h2 className={styles.emptyTitle}>Patron Sanctuary Access Required</h2>
            <p className={styles.emptyDesc}>
              The Personal Library is an authenticated sanctuary where patrons maintain sovereign
              reading shelves, reading desks, and private marginalia.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <button
                type="button"
                className={styles.exploreCtaBtn}
                onClick={onSignInRequest}
              >
                <span>Authenticate at Custodial Desk</span>
              </button>
              <button
                type="button"
                className={styles.shelfTabButton}
                onClick={onNavigateDiscover}
              >
                <span>Return to Public Discovery</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading State ──
  if (loading || authLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container} style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <div className={styles.loadingSpinner} aria-label="Loading Personal Sanctuary" />
          <p style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--color-action-primary)' }}>
            Retrieving personal folios from the sanctuary ledger...
          </p>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyStateContainer}>
            <h2 className={styles.emptyTitle}>Sanctuary Connection Interrupted</h2>
            <p className={styles.emptyDesc}>{error}</p>
            <button
              type="button"
              className={styles.exploreCtaBtn}
              onClick={() => loadLibrary()}
            >
              <span>Retry Retrieval</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.ambientBloomTop} aria-hidden="true" />
      <div className={styles.ambientBloomBottom} aria-hidden="true" />

      <div className={styles.container}>
        {/* ── Sanctuary Header Banner ── */}
        <header className={styles.sanctuaryHeader}>
          <div className={styles.headerMain}>
            <div className={styles.eyebrow}>
              <Sparkles size={14} />
              <span>Personal Sanctuary</span>
            </div>
            <h1 className={styles.title}>
              Sanctuary of {user?.display_name || user?.username || 'Patron'}
            </h1>
            <p className={styles.subtitle}>
              Your contemplative reading desk, categorized folios, and sovereign reading shelves.
            </p>
          </div>

          <div className={styles.headerMetaGroup}>
            <div className={styles.metaStatCard}>
              <span className={styles.statNumber}>{totalCount}</span>
              <span className={styles.statLabel}>Total Preserved</span>
            </div>
            <div className={styles.metaStatCard}>
              <span className={styles.statNumber}>{readingCount}</span>
              <span className={styles.statLabel}>Active Desk</span>
            </div>
            <div className={styles.metaStatCard}>
              <span className={styles.statNumber}>{readCount}</span>
              <span className={styles.statLabel}>Completed</span>
            </div>
          </div>
        </header>

        {/* Action feedback toast/banner */}
        {actionFeedback && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-action-primary)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: 'var(--space-6)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(24, 92, 88, 0.2)',
            }}
            role="status"
          >
            <CheckCircle size={16} />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* ── Shelf Navigation (Tabs) ── */}
        <nav className={styles.shelfTabsNav} aria-label="Reading Shelves" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            className={`${styles.shelfTabButton} ${activeTab === 'ALL' ? styles.shelfTabButtonActive : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <BookOpen size={16} />
            <span>All Preserved Folios</span>
            <span className={styles.tabBadge}>{totalCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'READING'}
            className={`${styles.shelfTabButton} ${activeTab === 'READING' ? styles.shelfTabButtonActive : ''}`}
            onClick={() => setActiveTab('READING')}
          >
            <Bookmark size={16} />
            <span>Currently Reading</span>
            <span className={styles.tabBadge}>{readingCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'WANT_TO_READ'}
            className={`${styles.shelfTabButton} ${activeTab === 'WANT_TO_READ' ? styles.shelfTabButtonActive : ''}`}
            onClick={() => setActiveTab('WANT_TO_READ')}
          >
            <Compass size={16} />
            <span>Want to Read</span>
            <span className={styles.tabBadge}>{wantToReadCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'READ'}
            className={`${styles.shelfTabButton} ${activeTab === 'READ' ? styles.shelfTabButtonActive : ''}`}
            onClick={() => setActiveTab('READ')}
          >
            <CheckCircle size={16} />
            <span>Completed & Reflected</span>
            <span className={styles.tabBadge}>{readCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ABANDONED'}
            className={`${styles.shelfTabButton} ${activeTab === 'ABANDONED' ? styles.shelfTabButtonActive : ''}`}
            onClick={() => setActiveTab('ABANDONED')}
          >
            <Archive size={16} />
            <span>Set Aside</span>
            <span className={styles.tabBadge}>{abandonedCount}</span>
          </button>
        </nav>

        {/* ── Library Grid / Empty States ── */}
        {entries.length === 0 ? (
          /* Empty State for New User (Reference: akashic_library_personal_sanctuary_empty_states_new_user) */
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyIconWrapper}>
              <BookOpen size={48} />
            </div>
            <h2 className={styles.emptyTitle}>Your Reading Desk Awaits Its First Inscription</h2>
            <p className={styles.emptyDesc}>
              Explore our curated public catalog of speculative fiction, metaphysical treatises, and
              timeless world literature. When you discover resonant works, add them to your reading
              shelf to build your personal sanctuary.
            </p>
            <button
              type="button"
              className={styles.exploreCtaBtn}
              onClick={onNavigateDiscover}
            >
              <Compass size={18} />
              <span>Explore Public Discovery Catalog</span>
            </button>
          </div>
        ) : displayedEntries.length === 0 ? (
          /* Empty shelf within populated library */
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyIconWrapper}>
              <Bookmark size={36} />
            </div>
            <h3 className={styles.emptyTitle}>No folios shelved under this status</h3>
            <p className={styles.emptyDesc}>
              You currently have no works categorized as {getStatusLabel(activeTab as ReadingStatus)}.
            </p>
            <button
              type="button"
              className={styles.shelfTabButton}
              onClick={() => setActiveTab('ALL')}
            >
              <span>View All Preserved Folios</span>
            </button>
          </div>
        ) : (
          /* Populated Book Card Grid (Reference: akashic_library_personal_sanctuary_desktop) */
          <div className={styles.libraryGrid}>
            {displayedEntries.map((entry) => {
              const authors = entry.book.authors?.length
                ? entry.book.authors.join(', ')
                : 'Unknown Author';

              return (
                <article
                  key={entry.id}
                  className={styles.bookEntryCard}
                  aria-label={`${entry.book.title} by ${authors}`}
                >
                  {/* Physical 2:3 Cover Jacket */}
                  <div
                    className={styles.coverWrapper}
                    onClick={() => onNavigateBook(entry.book_id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${entry.book.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onNavigateBook(entry.book_id);
                      }
                    }}
                  >
                    {entry.book.cover_url ? (
                      <img
                        src={entry.book.cover_url}
                        alt={`Cover binding for ${entry.book.title}`}
                        className={styles.coverImage}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.fallbackCover}>
                        <BookOpen size={24} style={{ color: 'var(--color-action-primary)' }} />
                        <div className={styles.fallbackTitle}>{entry.book.title}</div>
                        <div className={styles.fallbackAuthor}>{authors}</div>
                      </div>
                    )}
                  </div>

                  {/* Card Content Body */}
                  <div className={styles.cardContent}>
                    <button
                      type="button"
                      className={styles.bookTitleLink}
                      onClick={() => onNavigateBook(entry.book_id)}
                      title={entry.book.title}
                    >
                      {entry.book.title}
                    </button>

                    <span className={styles.bookAuthors} title={authors}>
                      {authors}
                    </span>

                    <span className={getStatusBadgeClass(entry.status)}>
                      {getStatusLabel(entry.status)}
                    </span>

                    {/* Shelf Action Bar */}
                    <div className={styles.cardActions}>
                      <select
                        aria-label={`Change reading status for ${entry.book.title}`}
                        className={styles.statusSelect}
                        value={entry.status}
                        onChange={(e) =>
                          handleStatusChange(entry.book_id, e.target.value as ReadingStatus)
                        }
                      >
                        <option value="WANT_TO_READ">Want to Read</option>
                        <option value="READING">Currently Reading</option>
                        <option value="READ">Completed</option>
                        <option value="ABANDONED">Set Aside</option>
                      </select>

                      {onNavigateReadingRoom && (
                        <button
                          type="button"
                          className={styles.readingRoomBtn}
                          onClick={() => onNavigateReadingRoom(entry.book_id)}
                          title="Open Reading Room"
                          aria-label={`Open Reading Room for ${entry.book.title}`}
                        >
                          <Feather size={13} />
                          <span>Reading Room</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className={`${styles.favIconBtn} ${entry.favorited ? styles.favActive : ''}`}
                        onClick={() => handleToggleFavorite(entry.book_id, entry.favorited)}
                        title={entry.favorited ? 'Remove from favorites' : 'Mark as favorite'}
                        aria-label={entry.favorited ? 'Remove from favorites' : 'Mark as favorite'}
                      >
                        <Heart
                          size={16}
                          fill={entry.favorited ? 'currentColor' : 'none'}
                        />
                      </button>

                      <button
                        type="button"
                        className={styles.actionIconBtn}
                        onClick={() => handleRemove(entry.book_id, entry.book.title)}
                        title="Remove from reading shelf"
                        aria-label={`Remove ${entry.book.title} from reading shelf`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

