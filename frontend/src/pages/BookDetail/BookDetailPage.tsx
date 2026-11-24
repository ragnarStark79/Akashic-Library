import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  CheckCheck,
  Edit3,
  Share2,
  Users,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Copy,
  Check,
  Quote,
  ChevronDown,
  Eye,
  Landmark,
  Info,
  ShoppingBag,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import type { BookDetail, BookListItem, BookReview, BookAnnotation, AccessOption } from '../../types/discovery';
import type { LibraryEntry, ReadingStatus } from '../../types/library';
import {
  fetchBookById,
  fetchRelatedBooks,
  fetchBookReviews,
  fetchSharedAnnotations,
  getPrimaryCoverUrl,
} from '../../services/discoveryService';
import {
  getLibraryEntry,
  addBookToLibrary,
  updateLibraryEntry,
  AuthenticationRequiredError,
  PermissionDeniedError,
} from '../../services/libraryService';
import {
  fetchSimilarBooks,
  normalizeRecommendationBook,
  isSafeExternalUrl,
  fetchExternalLinks,
} from '../../services/recommendationService';
import { useAuth } from '../../context/AuthContext';
import { BookCard } from '../../components/discovery/BookCard';
import styles from './BookDetailPage.module.css';

export interface BookDetailPageProps {
  bookId: string;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onNavigateSubject?: (subject: string) => void;
  onBookSelect: (book: BookListItem) => void;
  onNavigateReviews?: (writeMode?: boolean) => void;
  onNavigateReadingRoom?: (composeMode?: boolean) => void;
  onSignInRequest?: () => void;
}

export const BookDetailPage: React.FC<BookDetailPageProps> = ({
  bookId,
  onNavigateHome,
  onNavigateCatalog,
  onNavigateSubject,
  onBookSelect,
  onNavigateReviews,
  onNavigateReadingRoom,
  onSignInRequest,
}) => {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState(false);

  // Kindred folios (related books)
  const [relatedBooks, setRelatedBooks] = useState<BookListItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const shelfRef = useRef<HTMLDivElement>(null);

  // Reviews
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [, setLoadingReviews] = useState(false);

  // Reading Room Shared Annotations Preview
  const [sharedAnnotations, setSharedAnnotations] = useState<BookAnnotation[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);

  // Interactive folio tabs
  const [activeTab, setActiveTab] = useState<'synopsis' | 'themes' | 'editions'>('synopsis');

  // Authentication & Personal Library integration
  const { isAuthenticated } = useAuth();
  const [existingLibraryEntry, setExistingLibraryEntry] = useState<LibraryEntry | null>(null);
  const [shelfState, setShelfState] = useState<
    'idle' | 'loading' | 'shelved' | 'unshelved' | 'auth' | 'forbidden' | 'error'
  >('idle');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Shelf addition status
  const [shelfSubmitting, setShelfSubmitting] = useState(false);
  const [shelfFeedback, setShelfFeedback] = useState<{
    type: 'success' | 'auth' | 'error';
    message: string;
  } | null>(null);

  // Share & citation modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);

  // Legal access & reading options
  const [accessOptions, setAccessOptions] = useState<AccessOption[]>([]);

  // Fetch primary book details
  useEffect(() => {
    if (!bookId) {
      setError('No book identifier was specified.');
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);
    setCoverError(false);
    setShelfFeedback(null);

    fetchBookById(bookId, { signal: abortController.signal })
      .then((data) => {
        if (!data) {
          setError(`Archival folio #${bookId} could not be located in the catalog.`);
          setBook(null);
        } else {
          setBook(data);
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setError('A network error occurred while retrieving this archival record.');
          setBook(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [bookId]);

  // Resolve legal access options and kindred recommendations once book is loaded
  useEffect(() => {
    if (!book) {
      setRelatedBooks([]);
      setReviews([]);
      setAccessOptions([]);
      return;
    }

    // Set verified access options from book or fetch from external service
    if (book.access_options && book.access_options.length > 0) {
      setAccessOptions(book.access_options);
    } else {
      fetchExternalLinks(book.id)
        .then((ext) => {
          if (ext.access_options && ext.access_options.length > 0) {
            setAccessOptions(ext.access_options);
          }
        })
        .catch(() => {
          setAccessOptions([]);
        });
    }

    const abortController = new AbortController();
    setLoadingRelated(true);
    setLoadingReviews(true);

    // Kindred folios: Query similar books recommendation endpoint with subject fallback
    fetchSimilarBooks(book.id, { signal: abortController.signal })
      .then((res) => {
        const filtered = (res.results || [])
          .filter((item) => item.id !== book.id)
          .map((item) => normalizeRecommendationBook(item));

        if (filtered.length > 0) {
          setRelatedBooks(filtered);
        } else {
          return fetchRelatedBooks(book, { signal: abortController.signal }).then((fallbackRes) => {
            setRelatedBooks(fallbackRes);
          });
        }
      })
      .catch(() => {
        fetchRelatedBooks(book, { signal: abortController.signal })
          .then((fallbackRes) => {
            setRelatedBooks(fallbackRes);
          })
          .catch(() => {
            setRelatedBooks([]);
          });
      })
      .finally(() => {
        setLoadingRelated(false);
      });

    fetchBookReviews(book.id, { signal: abortController.signal })
      .then((res) => {
        setReviews(res.results || []);
      })
      .catch(() => {
        setReviews([]);
      })
      .finally(() => {
        setLoadingReviews(false);
      });

    setLoadingAnnotations(true);
    fetchSharedAnnotations(book.id, { page_size: 3, sort: 'recent', signal: abortController.signal })
      .then((res) => {
        setSharedAnnotations(res.results || []);
      })
      .catch(() => {
        setSharedAnnotations([]);
      })
      .finally(() => {
        setLoadingAnnotations(false);
      });

    return () => {
      abortController.abort();
    };
  }, [book]);

  // Sync personal library entry state for this book with AbortController and explicit loading states
  useEffect(() => {
    if (!bookId) {
      setExistingLibraryEntry(null);
      setShelfState('unshelved');
      return;
    }

    if (!isAuthenticated) {
      setExistingLibraryEntry(null);
      setShelfState('unshelved');
      return;
    }

    const abortController = new AbortController();
    setShelfState('loading');

    getLibraryEntry(bookId, { signal: abortController.signal })
      .then((entry) => {
        if (!abortController.signal.aborted) {
          setExistingLibraryEntry(entry);
          setShelfState(entry ? 'shelved' : 'unshelved');
        }
      })
      .catch((err: unknown) => {
        if (!abortController.signal.aborted) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          if (err instanceof AuthenticationRequiredError) {
            setExistingLibraryEntry(null);
            setShelfState('auth');
            return;
          }
          if (err instanceof PermissionDeniedError) {
            setExistingLibraryEntry(null);
            setShelfState('forbidden');
            return;
          }
          // Network or 500 server error checking shelf membership — isolated from page state
          setExistingLibraryEntry(null);
          setShelfState('error');
        }
      });

    return () => {
      abortController.abort();
    };
  }, [bookId, isAuthenticated]);

  // Idempotent retry handler for reading shelf check recovery
  const handleRetryShelfCheck = useCallback(() => {
    if (!bookId) return;
    setShelfState('loading');
    getLibraryEntry(bookId)
      .then((entry) => {
        setExistingLibraryEntry(entry);
        setShelfState(entry ? 'shelved' : 'unshelved');
      })
      .catch((err: unknown) => {
        if (err instanceof AuthenticationRequiredError) {
          setExistingLibraryEntry(null);
          setShelfState('auth');
        } else if (err instanceof PermissionDeniedError) {
          setExistingLibraryEntry(null);
          setShelfState('forbidden');
        } else {
          setExistingLibraryEntry(null);
          setShelfState('error');
        }
      });
  }, [bookId]);

  // Dropdown dismissal on outside click or Escape key
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Reading shelf status handler: Want to Read / Currently Reading / Completed / Set Aside
  const handleSelectShelfStatus = async (status: ReadingStatus) => {
    setIsDropdownOpen(false);
    if (!book || shelfSubmitting) return;

    if (!isAuthenticated) {
      setShelfFeedback({
        type: 'auth',
        message:
          'Patron Authentication Required: Adding folios to your Personal Reading Shelf requires signing in to your Akashic sanctuary account.',
      });
      return;
    }

    setShelfSubmitting(true);
    setShelfFeedback(null);

    let statusLabel = 'Want to Read';
    if (status === 'READING') statusLabel = 'Currently Reading';
    else if (status === 'READ') statusLabel = 'Completed';
    else if (status === 'ABANDONED') statusLabel = 'Set Aside / Abandoned';

    try {
      if (existingLibraryEntry) {
        const updated = await updateLibraryEntry(book.id, status);
        setExistingLibraryEntry(updated);
      } else {
        const created = await addBookToLibrary(book.id, status, {
          title: book.title,
          authors: book.authors,
          cover_url: getPrimaryCoverUrl(book),
        });
        setExistingLibraryEntry(created);
      }
      setShelfState('shelved');
      setShelfFeedback({
        type: 'success',
        message: `Folio preserved on your Scriptorium shelf as ${statusLabel}.`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to update reading shelf.';
      setShelfFeedback({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setShelfSubmitting(false);
    }
  };

  // Separate Mark as Read / Completed handler
  const handleMarkAsRead = async () => {
    if (!book || shelfSubmitting) return;

    if (!isAuthenticated) {
      setShelfFeedback({
        type: 'auth',
        message:
          'Patron Authentication Required: Marking folios as Completed requires signing in to your Akashic sanctuary account.',
      });
      return;
    }

    setShelfSubmitting(true);
    setShelfFeedback(null);

    try {
      if (existingLibraryEntry) {
        const updated = await updateLibraryEntry(book.id, 'READ');
        setExistingLibraryEntry(updated);
      } else {
        const created = await addBookToLibrary(book.id, 'READ', {
          title: book.title,
          authors: book.authors,
          cover_url: getPrimaryCoverUrl(book),
        });
        setExistingLibraryEntry(created);
      }
      setShelfState('shelved');
      setShelfFeedback({
        type: 'success',
        message: 'Folio marked as Completed in your personal reading archive.',
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to mark folio as Completed.';
      setShelfFeedback({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setShelfSubmitting(false);
    }
  };

  // Carousel scrolling with container-proportional distance and reduced motion support
  const scrollShelf = (direction: 'left' | 'right') => {
    if (!shelfRef.current) return;
    const container = shelfRef.current;
    const scrollAmount = Math.max(container.clientWidth * 0.75, 200);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  // Share link copy
  const handleCopyLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, []);

  // Citation string builder
  const buildCitation = useCallback(() => {
    if (!book) return '';
    const author = book.authors?.join(', ') || 'Anonymous';
    const title = book.title;
    const publisher = book.publication?.publisher || 'Akashic Press';
    const year = book.publication?.published_date || 'n.d.';
    return `${author}. ${title}. ${publisher}, ${year}. Akashic Library Archival Ledger #${book.id}.`;
  }, [book]);

  const handleCopyCitation = useCallback(() => {
    const citation = buildCitation();
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  }, [buildCitation]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} aria-label="Loading archival folio" />
          <p style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--color-action-primary)' }}>
            Retrieving archival folio from the sanctuary stacks...
          </p>
        </div>
      </div>
    );
  }

  // Error / Not Found state
  if (error || !book) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>Archival Folio Unavailable</h2>
          <p className={styles.errorDesc}>
            {error || 'The requested folio could not be retrieved from the catalog.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={styles.shelfButton}
              onClick={onNavigateCatalog}
              style={{ minWidth: '160px' }}
            >
              Return to Catalog
            </button>
            <button
              type="button"
              className={styles.shelfButton}
              style={{ backgroundColor: 'var(--color-surface-inset)', color: 'var(--color-text-primary)' }}
              onClick={onNavigateHome}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const primaryCoverUrl = getPrimaryCoverUrl(book);
  const authorDisplay = book.authors?.length ? book.authors.join(', ') : 'Unknown Author';
  const primarySubject = book.subjects?.[0] || 'Literary Heritage';
  const isbn = book.identifiers?.isbn13 || book.identifiers?.isbn10 || '';
  const firstAuthorSurname = book.authors?.[0]
    ? book.authors[0].split(' ').pop()?.toUpperCase() || 'BORGES'
    : 'FOLIO';

  // Show decorative pull quote only if a genuine, explicitly sourced quotation exists
  const genuineQuote = book.quote?.trim() || null;

  return (
    <div className={styles.page}>
      {/* ── Ambient Background Lighting ── */}
      <div className={styles.ambientBloomTopRight} aria-hidden="true" />
      <div className={styles.ambientBloomTopLeft} aria-hidden="true" />

      <div className={styles.contentWrapper}>
        {/* ── Section 1: Breadcrumb & Provenance Bar ── */}
        <section className={styles.breadcrumbBar} aria-label="Folio Provenance">
          <nav className={styles.breadcrumbs} aria-label="Folio Breadcrumbs">
            <button
              type="button"
              className={styles.breadcrumbLink}
              onClick={onNavigateCatalog}
              title="Return to Catalog Search"
            >
              <ArrowLeft size={16} />
              <span>Catalog</span>
            </button>
            <span className={styles.breadcrumbSeparator}>/</span>
            {primarySubject && (
              <>
                <button
                  type="button"
                  className={styles.breadcrumbLink}
                  onClick={() => onNavigateSubject?.(primarySubject)}
                >
                  {primarySubject}
                </button>
                <span className={styles.breadcrumbSeparator}>/</span>
              </>
            )}
            <span className={styles.breadcrumbActive} title={book.title}>
              Folio • {book.title}
            </span>
          </nav>

          <div className={styles.provenanceBadgeGroup}>
            <span className={styles.vaultPill}>
              <span className={styles.vaultDot} />
              Open Library Catalogue Record
            </span>
            <span className={styles.accessionNumber}>
              Catalogue ID: {book.id}
            </span>
          </div>
        </section>

        {/* ── Section 2: Two-Column Main Stage ── */}
        <section className={styles.mainStage}>
          {/* Left Column: Physical Book Jacket & Bibliographic Record */}
          <div className={styles.leftColumn}>
            {/* Book Jacket Card with tactile shadow and physical spine depth */}
            <div className={styles.jacketCard}>
              <div className={styles.ribbonTag}>
                <BookOpen size={13} />
                <span>Folio Record • Sanctuary Archive</span>
              </div>

              {/* 2:3 Vertical Physical Book Representation */}
              <div className={styles.coverContainer}>
                {primaryCoverUrl && !coverError ? (
                  <>
                    <img
                      src={primaryCoverUrl}
                      alt={`Cover binding for ${book.title} by ${authorDisplay}`}
                      className={styles.coverImage}
                      decoding="async"
                      onError={() => setCoverError(true)}
                    />
                    <div className={styles.spineShadow} aria-hidden="true" />
                    <div className={styles.spineLine} aria-hidden="true" />
                    <div className={styles.embossSeal}>{firstAuthorSurname}</div>
                  </>
                ) : (
                  <div className={styles.fallbackCover}>
                    <div className={styles.fallbackHeader}>
                      <BookOpen size={16} />
                      <span>Akashic Codex</span>
                    </div>
                    <div className={styles.fallbackTitle}>{book.title}</div>
                    <div className={styles.fallbackAuthor}>{authorDisplay}</div>
                    <div className={styles.spineShadow} aria-hidden="true" />
                    <div className={styles.embossSeal}>{firstAuthorSurname}</div>
                  </div>
                )}
              </div>

              {/* Quick Action Shelf Bar */}
              <div className={styles.actionShelfBar}>
                <div className={styles.actionButtonRow}>
                  {/* Semantic Shelf Controls: Auth (401), Forbidden (403), Error (500/Net), Normal (200/404) */}
                  {shelfState === 'auth' ? (
                    <button
                      type="button"
                      className={styles.shelfButton}
                      onClick={() => (onSignInRequest ? onSignInRequest() : undefined)}
                      data-testid="shelf-auth-button"
                      aria-label="Sign in to access personal reading shelf"
                    >
                      <Lock size={18} />
                      <span>Sign In to Access Shelf</span>
                    </button>
                  ) : shelfState === 'forbidden' ? (
                    <button
                      type="button"
                      className={styles.shelfButton}
                      disabled
                      data-testid="shelf-forbidden-button"
                      aria-label="Access to reading shelf is restricted"
                    >
                      <ShieldAlert size={18} />
                      <span>Shelf Access Restricted</span>
                    </button>
                  ) : shelfState === 'error' ? (
                    <button
                      type="button"
                      className={styles.shelfButton}
                      onClick={handleRetryShelfCheck}
                      data-testid="shelf-error-button"
                      aria-label="Shelf sync failed, retry check"
                    >
                      <Bookmark size={18} />
                      <span>Shelf Sync Failed — Retry</span>
                    </button>
                  ) : (
                    <div className={styles.shelfDropdownContainer} ref={dropdownRef}>
                      <button
                        type="button"
                        className={styles.shelfButton}
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        disabled={shelfSubmitting || shelfState === 'loading'}
                        aria-haspopup="menu"
                        aria-expanded={isDropdownOpen}
                        aria-label="Add this folio to reading shelf"
                        data-testid="shelf-dropdown-button"
                      >
                        <Bookmark size={18} />
                        <span>
                          {shelfSubmitting
                            ? 'Preserving...'
                            : shelfState === 'loading'
                              ? 'Checking Shelf...'
                              : existingLibraryEntry?.status === 'WANT_TO_READ'
                                ? 'Want to Read'
                                : existingLibraryEntry?.status === 'READING'
                                  ? 'Currently Reading'
                                  : existingLibraryEntry?.status === 'READ'
                                    ? 'Completed'
                                    : existingLibraryEntry?.status === 'ABANDONED'
                                      ? 'Set Aside'
                                      : 'Add to Reading Shelf'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`${styles.dropdownChevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <div className={styles.shelfMenu} role="menu" aria-label="Reading shelf options">
                          <button
                            type="button"
                            role="menuitem"
                            className={`${styles.shelfMenuItem} ${existingLibraryEntry?.status === 'WANT_TO_READ' ? styles.shelfMenuItemActive : ''}`}
                            onClick={() => handleSelectShelfStatus('WANT_TO_READ')}
                            disabled={shelfSubmitting}
                          >
                            <div className={styles.shelfMenuLabel}>
                              <span className={styles.statusName}>Want to Read</span>
                              <span className={styles.statusDescription}>Preserve in your reading wishlist</span>
                            </div>
                            {existingLibraryEntry?.status === 'WANT_TO_READ' && (
                              <Check size={16} className={styles.statusCheck} />
                            )}
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className={`${styles.shelfMenuItem} ${existingLibraryEntry?.status === 'READING' ? styles.shelfMenuItemActive : ''}`}
                            onClick={() => handleSelectShelfStatus('READING')}
                            disabled={shelfSubmitting}
                          >
                            <div className={styles.shelfMenuLabel}>
                              <span className={styles.statusName}>Currently Reading</span>
                              <span className={styles.statusDescription}>Active contemplation and study</span>
                            </div>
                            {existingLibraryEntry?.status === 'READING' && (
                              <Check size={16} className={styles.statusCheck} />
                            )}
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className={`${styles.shelfMenuItem} ${existingLibraryEntry?.status === 'ABANDONED' ? styles.shelfMenuItemActive : ''}`}
                            onClick={() => handleSelectShelfStatus('ABANDONED')}
                            disabled={shelfSubmitting}
                          >
                            <div className={styles.shelfMenuLabel}>
                              <span className={styles.statusName}>Set Aside / Abandoned</span>
                              <span className={styles.statusDescription}>Paused or set aside for later</span>
                            </div>
                            {existingLibraryEntry?.status === 'ABANDONED' && (
                              <Check size={16} className={styles.statusCheck} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className={`${styles.iconActionButton} ${existingLibraryEntry?.status === 'READ' ? styles.iconActionButtonActive : ''}`}
                    onClick={handleMarkAsRead}
                    disabled={shelfSubmitting || shelfState === 'loading'}
                    title={existingLibraryEntry?.status === 'READ' ? 'Folio Completed' : 'Mark as Read / Completed'}
                    aria-label="Mark as Read / Completed"
                  >
                    <CheckCheck size={18} />
                  </button>

                  <button
                    type="button"
                    className={styles.iconActionButton}
                    onClick={() => {
                      const readingRoomEl = document.getElementById('reading-room');
                      readingRoomEl?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title="Transcribe Quote / Annotate"
                    aria-label="Transcribe Quote or Annotate"
                  >
                    <Edit3 size={18} />
                  </button>

                  <button
                    type="button"
                    className={styles.iconActionButton}
                    onClick={() => setShareModalOpen(true)}
                    title="Share Folio Record"
                    aria-label="Share Folio Record"
                  >
                    <Share2 size={18} />
                  </button>
                </div>

                {shelfFeedback && (
                  <div
                    className={`${styles.shelfFeedbackBanner} ${shelfFeedback.type === 'success'
                        ? styles.shelfFeedbackSuccess
                        : shelfFeedback.type === 'auth'
                          ? styles.shelfFeedbackAuth
                          : styles.shelfFeedbackError
                      }`}
                    role="alert"
                  >
                    {shelfFeedback.message}
                  </div>
                )}

                <div className={styles.patronCountPill}>
                  <Users size={15} style={{ color: 'var(--color-action-primary)' }} />
                  <span>
                    Preserved within the <strong className={styles.patronCountHighlight}>Open Library Archive</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Bibliographic Record Box */}
            <div className={styles.bibliographicBox}>
              <div className={styles.bibliographicHeader}>
                <h3 className={styles.bibliographicTitle}>Bibliographic Record</h3>
                <span className={styles.archiveVerifiedTag}>Archive Verified</span>
              </div>

              <dl className={styles.bibList}>
                <div className={styles.bibRow}>
                  <dt className={styles.bibLabel}>Original Publisher</dt>
                  <dd className={styles.bibValue}>
                    {book.publication?.publisher || 'Unrecorded by archive'}
                  </dd>
                </div>

                <div className={styles.bibRow}>
                  <dt className={styles.bibLabel}>Publication Year</dt>
                  <dd className={styles.bibValue}>
                    {book.publication?.published_date || 'Date unknown'}
                  </dd>
                </div>

                {book.identifiers?.isbn13 && (
                  <div className={styles.bibRow}>
                    <dt className={styles.bibLabel}>Catalogue ISBN-13</dt>
                    <dd className={`${styles.bibValue} ${styles.bibValueMono}`}>
                      {book.identifiers.isbn13}
                    </dd>
                  </div>
                )}

                {book.identifiers?.isbn10 && (
                  <div className={styles.bibRow}>
                    <dt className={styles.bibLabel}>Catalogue ISBN-10</dt>
                    <dd className={`${styles.bibValue} ${styles.bibValueMono}`}>
                      {book.identifiers.isbn10}
                    </dd>
                  </div>
                )}

                <div className={styles.bibRow}>
                  <dt className={styles.bibLabel}>Extent</dt>
                  <dd className={styles.bibValue}>
                    {book.publication?.page_count
                      ? `${book.publication.page_count} pages`
                      : 'Pagination unrecorded'}
                  </dd>
                </div>

                <div className={styles.bibRow}>
                  <dt className={styles.bibLabel}>Language Code</dt>
                  <dd className={styles.bibValue}>
                    {book.publication?.language
                      ? book.publication.language.toUpperCase()
                      : 'UNSPECIFIED'}
                  </dd>
                </div>

                {book.subjects && book.subjects.length > 0 && (
                  <div className={styles.bibSubjectsRow}>
                    <dt className={styles.bibLabel}>Archival Classifications</dt>
                    <dd className={styles.subjectChipList}>
                      {book.subjects.slice(0, 8).map((subject) => (
                        <span key={subject} className={styles.subjectChip}>
                          {subject}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              {/* External Scholarly Repositories & Legal Access Classifications */}
              <div className={styles.accessSection} aria-label="Access & Availability Options">
                <div className={styles.accessSectionHeader}>
                  <div className={styles.accessHeaderLeft}>
                    <ShieldCheck size={18} className={styles.accessHeaderIcon} />
                    <div>
                      <h3 className={styles.accessTitle}>Legal Access & Reading Options</h3>
                      <p className={styles.accessSubtitle}>
                        Source-verified acquisition and digital reading paths
                      </p>
                    </div>
                  </div>
                </div>

                {accessOptions.length > 0 ? (
                  <div className={styles.accessList}>
                    {accessOptions.map((opt, idx) => {
                      const isSafe = isSafeExternalUrl(opt.url);
                      return (
                        <div key={`${opt.type}-${opt.provider}-${idx}`} className={styles.accessItem}>
                          <div className={styles.accessItemTop}>
                            <div className={styles.accessItemHeader}>
                              {opt.type === 'OUR_STORE' && <ShoppingBag size={15} />}
                              {opt.type === 'EXTERNAL_PURCHASE' && <ExternalLink size={15} />}
                              {opt.type === 'PREVIEW' && <Eye size={15} />}
                              {opt.type === 'BORROW' && <BookOpen size={15} />}
                              {opt.type === 'PUBLIC_DOMAIN' && <Landmark size={15} />}
                              {opt.type === 'INFORMATION' && <Info size={15} />}
                              <span className={styles.accessProvider}>{opt.provider}</span>
                              <span
                                className={`
                                  ${styles.accessTypeBadge}
                                  ${
                                    opt.type === 'OUR_STORE'
                                      ? styles.badgeStore
                                      : opt.type === 'EXTERNAL_PURCHASE'
                                      ? styles.badgePurchase
                                      : opt.type === 'PREVIEW'
                                      ? styles.badgePreview
                                      : opt.type === 'BORROW'
                                      ? styles.badgeBorrow
                                      : opt.type === 'PUBLIC_DOMAIN'
                                      ? styles.badgePublicDomain
                                      : styles.badgeInfo
                                  }
                                `}
                              >
                                {opt.type === 'OUR_STORE'
                                  ? 'Akashic Bookstore'
                                  : opt.type === 'EXTERNAL_PURCHASE'
                                  ? 'Retail Edition'
                                  : opt.type === 'PREVIEW'
                                  ? 'Digital Preview'
                                  : opt.type === 'BORROW'
                                  ? 'Library Lending'
                                  : opt.type === 'PUBLIC_DOMAIN'
                                  ? 'Public Domain'
                                  : 'Scholarly Record'}
                              </span>
                            </div>
                            {opt.availability && (
                              <span className={styles.accessAvailabilityBadge}>
                                {opt.availability}
                              </span>
                            )}
                          </div>

                          <div className={styles.accessItemBody}>
                            <div className={styles.accessItemLabel}>{opt.label}</div>
                            {opt.description && (
                              <p className={styles.accessItemDesc}>{opt.description}</p>
                            )}
                            {opt.jurisdiction && (
                              <span className={styles.accessJurisdiction}>
                                Jurisdiction: {opt.jurisdiction}
                              </span>
                            )}
                          </div>

                          <div className={styles.accessItemActions}>
                            {opt.type === 'OUR_STORE' ? (
                              <div className={styles.storeInformationalNotice}>
                                <span>Part I Archive Record — Physical bookstore inventory is listed for reference. Store checkout and orders will be enabled in Part II.</span>
                              </div>
                            ) : opt.url && isSafe ? (
                              <a
                                href={opt.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.accessLinkBtn}
                              >
                                <span>Access on {opt.provider}</span>
                                <ExternalLink size={13} />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Open Scholarly Records Concordance */}
                <div className={styles.externalRepositories}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Open Scholarly Records:</span>
                  <div className={styles.repoLinks}>
                    <a
                      href={
                        isbn
                          ? `https://openlibrary.org/isbn/${isbn}`
                          : `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.repoLink}
                    >
                      Search in Open Library <ExternalLink size={12} />
                    </a>
                    <span>•</span>
                    <a
                      href={
                        isbn
                          ? `https://archive.org/search.php?query=isbn%3A${isbn}`
                          : `https://archive.org/search.php?query=${encodeURIComponent(book.title)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.repoLink}
                    >
                      Search Internet Archive <ExternalLink size={12} />
                    </a>
                    <span>•</span>
                    <a
                      href={
                        isbn
                          ? `https://www.worldcat.org/isbn/${isbn}`
                          : `https://www.worldcat.org/search?q=${encodeURIComponent(book.title)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.repoLink}
                    >
                      Search WorldCat <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Literary Dossier, Deep Synopsis & Story Matrix */}
          <div className={styles.rightColumn}>
            {/* Header & Attribution */}
            <div className={styles.headerAttribution}>
              <span className={styles.volEyebrow}>
                Sanctuary Folio • Vol. {book.publication?.published_date || 'Archive'}
              </span>

              <h1 className={styles.bookTitle}>{book.title}</h1>

              <div className={styles.authorRow}>
                <span>{authorDisplay}</span>
                <span className={styles.verifiedBadge} title="Verified Author in Archive">
                  <ShieldCheck size={18} />
                </span>
              </div>

              {/* Consensus & Badges */}
              <div className={styles.consensusRow}>
                {typeof book.rating === 'number' && book.rating > 0 ? (
                  <div className={styles.starRating} aria-label={`Rated ${book.rating.toFixed(1)} stars`}>
                    {[1, 2, 3, 4, 5].map((starIndex) => (
                      <Star
                        key={starIndex}
                        size={18}
                        fill={starIndex <= Math.round(book.rating!) ? 'currentColor' : 'none'}
                      />
                    ))}
                    <span className={styles.ratingValue}>{book.rating.toFixed(1)}</span>
                    <span className={styles.ratingMax}>/ 5.0</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Curator’s Heritage Record • Awaiting community ratings
                  </span>
                )}

                <span className={styles.curatorChoiceBadge}>
                  <BookOpen size={14} />
                  <span>Open Library Highlight</span>
                </span>
              </div>
            </div>

            {/* Editorial Overview Card */}
            <div className={styles.overviewCard}>
              {genuineQuote && (
                <>
                  <span className={styles.quoteMark} aria-hidden="true">
                    <Quote size={48} />
                  </span>
                  <blockquote className={styles.pullQuote}>{genuineQuote}</blockquote>
                </>
              )}

              <div className={styles.descriptionBody}>
                {book.description?.trim() ? (
                  book.description.split('\n\n').map((para, idx) => (
                    <p key={idx}>{para.trim()}</p>
                  ))
                ) : (
                  <p>No description is currently available for this catalogue record.</p>
                )}
              </div>

              {/* Literary Key Dimensions Tags */}
              {book.subjects && book.subjects.length > 0 && (
                <div className={styles.thematicChipsRow}>
                  {book.subjects.slice(0, 5).map((subject) => (
                    <span key={subject} className={styles.thematicChip}>
                      <Bookmark size={13} />
                      <span>{subject}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Folio Tabs (Tactile Segmented Switcher) */}
            <div className={styles.folioTabsSection}>
              <div className={styles.tabList} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'synopsis'}
                  className={`${styles.tabButton} ${activeTab === 'synopsis' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('synopsis')}
                >
                  Archival Synopsis
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'themes'}
                  className={`${styles.tabButton} ${activeTab === 'themes' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('themes')}
                >
                  Themes & Subjects
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'editions'}
                  className={`${styles.tabButton} ${activeTab === 'editions' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('editions')}
                >
                  Editions & Ledger
                </button>
              </div>

              {/* Tab Panel 1: Archival Synopsis */}
              {activeTab === 'synopsis' && (
                <div className={styles.tabContentPanel}>
                  <div className={styles.tabGrid}>
                    <div className={styles.tabCard}>
                      <h4 className={styles.tabCardTitle}>Provenance & Cataloguing</h4>
                      <p className={styles.tabCardDesc}>
                        Registered in MongoDB under ObjectId #{book.id}. Verified via Open Library
                        API integration.
                      </p>
                    </div>
                    <div className={styles.tabCard}>
                      <h4 className={styles.tabCardTitle}>Scholarly Classification</h4>
                      <p className={styles.tabCardDesc}>
                        {book.subjects?.[0]
                          ? `Classified under "${book.subjects[0]}" within the primary philosophical catalog.`
                          : 'General literary corpus without restricted classifications.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Panel 2: Themes & Subjects */}
              {activeTab === 'themes' && (
                <div className={styles.tabContentPanel}>
                  <div className={styles.tabGrid}>
                    {book.subjects && book.subjects.length > 0 ? (
                      book.subjects.slice(0, 4).map((s, idx) => (
                        <div key={idx} className={styles.tabCard}>
                          <h4 className={styles.tabCardTitle}>{s}</h4>
                          <p className={styles.tabCardDesc}>
                            Verified subject heading catalogued in the Open Library global bibliographic index.
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        No specific thematic indices catalogued for this edition.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Panel 3: Editions & Ledger */}
              {activeTab === 'editions' && (
                <div className={styles.tabContentPanel}>
                  <div className={styles.tabGrid}>
                    <div className={styles.tabCard}>
                      <h4 className={styles.tabCardTitle}>Store Availability</h4>
                      <p className={styles.tabCardDesc}>
                        {book.store?.available
                          ? 'Available in the Akashic Store physical collection (In Stock). Commercial checkout will be enabled in Part II.'
                          : 'Sanctuary Digital Preservation only — not stocked in commercial store.'}
                      </p>
                    </div>
                    <div className={styles.tabCard}>
                      <h4 className={styles.tabCardTitle}>Verified Access Channels</h4>
                      <p className={styles.tabCardDesc}>
                        {accessOptions.length > 0
                          ? `${accessOptions.length} verified legal access pathways registered in the preservation ledger.`
                          : 'Open catalogue concordance registered.'}
                      </p>
                    </div>
                    <div className={styles.tabCard}>
                      <h4 className={styles.tabCardTitle}>Catalogue Record ID</h4>
                      <p className={`${styles.tabCardDesc} ${styles.bibValueMono}`}>
                        {book.id}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 3: Voices from the Reading Room (Shared Marginalia Preview) ── */}
        <section id="reading-room" className={styles.readingSalonsSection} aria-label="Voices from the Reading Room">
          <div className={styles.salonsHeader}>
            <div>
              <div className={styles.salonsEyebrow}>
                <BookOpen size={16} />
                <span>Reading Room Marginalia</span>
              </div>
              <h2 className={styles.salonsTitle}>Voices from the Reading Room</h2>
              <p className={styles.salonsSubtitle}>
                Marginal notes transcribed by sanctuary patrons studying this folio.
              </p>
            </div>

            <div className={styles.salonsActions}>
              <button
                type="button"
                className={styles.viewAllReviewsBtn}
                onClick={() => onNavigateReadingRoom?.(false)}
                aria-label="View Full Reading Room"
              >
                <span>View Full Reading Room</span>
                <ExternalLink size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.writeReviewBtn}
                onClick={() => onNavigateReadingRoom?.(true)}
                aria-label="Inscribe a Note"
              >
                <Edit3 size={15} aria-hidden="true" />
                <span>Inscribe a Note</span>
              </button>
            </div>
          </div>

          {/* Horizontal Shared Annotations Preview (Up to 3) */}
          {loadingAnnotations ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading reading room marginalia...
            </div>
          ) : sharedAnnotations.length > 0 ? (
            <div className={styles.annotationsHorizontalGrid}>
              {sharedAnnotations.slice(0, 3).map((ann) => {
                const authorName = ann.author?.display_name || ann.author?.username || 'Patron';
                const authorInitial = authorName.slice(0, 2).toUpperCase();
                const formattedDate = new Date(ann.created_at).toLocaleDateString();
                const location = [ann.page_reference, ann.chapter_reference].filter(Boolean).join(' • ');

                return (
                  <article key={ann.id} className={styles.annotationPreviewCard} data-testid="shared-annotation-preview">
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.avatarInitial}>{authorInitial}</div>
                        <div>
                          <h4 className={styles.reviewerName}>{authorName}</h4>
                          <span className={styles.reviewDate}>{formattedDate}</span>
                        </div>
                      </div>
                      {location && <span className={styles.annotationLocationChip}>{location}</span>}
                    </div>

                    {ann.passage_excerpt && (
                      <blockquote className={styles.annotationExcerpt}>
                        “{ann.passage_excerpt}”
                      </blockquote>
                    )}

                    <p className={styles.annotationPreviewBody}>{ann.content}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyAnnotationsCard}>
              <p style={{ margin: '0 0 var(--space-3)', fontStyle: 'italic', fontSize: '15px' }}>
                No shared reflections have been added for this book yet. The Reading Room awaits your thoughts.
              </p>
              <button
                type="button"
                className={styles.writeReviewBtn}
                onClick={() => onNavigateReadingRoom?.(false)}
              >
                <BookOpen size={14} aria-hidden="true" />
                <span>Enter Reading Room</span>
              </button>
            </div>
          )}

          {/* Reader Reviews & Critical Folios Row */}
          {onNavigateReviews && (
            <div className={styles.viewAllFooterRow} style={{ marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className={styles.viewAllReviewsBtn}
                onClick={() => onNavigateReviews(false)}
                aria-label="View All Reader Reviews"
              >
                <span>View Reader Reviews &amp; Ratings ({book?.review_count || reviews.length})</span>
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>

        {/* ── Section 4: Kindred Explorations (Related Folios) ── */}
        <section className={styles.relatedSection}>
          <div className={styles.relatedHeader}>
            <div>
              <div className={styles.relatedEyebrow}>
                <BookOpen size={16} />
                <span>Resonant Folios</span>
              </div>
              <h2 className={styles.relatedTitle}>Kindred Explorations</h2>
              <p className={styles.relatedSubtitle}>
                Texts that inhabit the same speculative labyrinth of ideas, time, and memory.
              </p>
            </div>

            {relatedBooks.length > 3 && (
              <div className={styles.carouselNavButtons}>
                <button
                  type="button"
                  className={styles.carouselButton}
                  onClick={() => scrollShelf('left')}
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className={styles.carouselButton}
                  onClick={() => scrollShelf('right')}
                  aria-label="Scroll right"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {loadingRelated ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Gathering kindred folios from the catalog...
            </div>
          ) : relatedBooks.length > 0 ? (
            <div
              ref={shelfRef}
              className={styles.relatedShelf}
              tabIndex={0}
              role="region"
              aria-label="Kindred folios carousel track"
            >
              {relatedBooks.map((relBook) => (
                <div key={relBook.id} className={styles.carouselItemWrapper}>
                  <BookCard
                    book={relBook}
                    className={styles.carouselCard}
                    imageFit="contain"
                    onSelect={(item) => onBookSelect(item)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              No additional kindred folios currently catalogued for this classification.
            </div>
          )}
        </section>

        {/* ── Section 5: Archival Colophon / Closing Invitation ── */}
        <section className={styles.colophonBanner}>
          <div className={styles.colophonLeft}>
            <div className={styles.colophonIconBadge}>
              <BookOpen size={26} />
            </div>
            <div>
              <h3 className={styles.colophonTitle}>The Speculative Salon: Contemplative Reading</h3>
              <p className={styles.colophonText}>
                Patrons gather digitally to explore timeless literature, philosophy, and marginalia in the quiet web.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.shelfButton}
            onClick={() => onNavigateCatalog()}
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            Explore Sanctuary Catalog
          </button>
        </section>
      </div>

      {/* ── Accessible Share & Citation Modal ── */}
      {shareModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShareModalOpen(false)}
          role="presentation"
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className={styles.modalHeader}>
              <h3 id="share-dialog-title" className={styles.modalTitle}>
                Share Archival Folio
              </h3>
              <button
                type="button"
                className={styles.carouselButton}
                onClick={() => setShareModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                Direct Folio URL
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-surface-inset)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="button"
                  className={styles.shelfButton}
                  onClick={handleCopyLink}
                  style={{ padding: '8px 14px' }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                Bibliographic Citation (MLA Style)
              </label>
              <div className={styles.citationBox}>{buildCitation()}</div>
              <button
                type="button"
                className={styles.shelfButton}
                onClick={handleCopyCitation}
                style={{ marginTop: '8px', padding: '8px 14px' }}
              >
                {copiedCitation ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedCitation ? 'Citation Copied' : 'Copy Citation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

