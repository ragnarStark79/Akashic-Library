/**
 * Dedicated Reading Room Page (Phase 5B.2)
 *
 * Implements persistent, book-specific reading annotations and marginalia:
 * - Left column: The Reading Desk (Composer with Private/Shared visibility selector,
 *   page reference, quoted passage excerpt, reflection body, and edit/cancel workflow).
 * - Right column: Folio Marginalia (All Notes, My Private, Shared filters, sorting,
 *   cards with private/shared badges, excerpt callouts, author display, edit/share/delete actions).
 * - Accessible confirmation modals for deletion.
 * - Integration with verified Django REST API endpoints.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  Edit3,
  Feather,
  Globe,
  Lock,
  Share2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type {
  BookAnnotation,
  BookDetail,
  AnnotationVisibility,
} from '@/types/discovery';
import {
  fetchBookById,
  fetchSharedAnnotations,
  fetchMyAnnotations,
  createBookAnnotation,
  updateBookAnnotation,
  deleteBookAnnotation,
} from '@/services/discoveryService';
import { ReportContentButton } from '@/components/community/ReportContentButton/ReportContentButton';
import styles from './ReadingRoomPage.module.css';

export interface ReadingRoomPageProps {
  bookId: string;
  initialComposeMode?: boolean;
  onNavigateBookDetail: () => void;
  onNavigateReviews?: (openCompose?: boolean) => void;
  onNavigateHome?: () => void;
  onSignInRequest?: () => void;
}

type FilterTab = 'ALL' | 'PRIVATE' | 'SHARED';
type SortMode = 'recent' | 'page';

export const ReadingRoomPage: React.FC<ReadingRoomPageProps> = ({
  bookId,
  initialComposeMode = false,
  onNavigateBookDetail,
  onNavigateReviews,
  onSignInRequest,
}) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Book metadata
  const [book, setBook] = useState<BookDetail | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [bookError, setBookError] = useState<string | null>(null);

  // Annotations collections
  const [sharedAnnotations, setSharedAnnotations] = useState<BookAnnotation[]>([]);
  const [myAnnotations, setMyAnnotations] = useState<BookAnnotation[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(true);

  // Tab counts
  const [tabCounts, setTabCounts] = useState({
    shared_count: 0,
    my_private_count: 0,
    my_shared_count: 0,
    my_total_count: 0,
  });

  // UI state
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  // Composer state
  const [visibility, setVisibility] = useState<AnnotationVisibility>('PRIVATE');
  const [pageReference, setPageReference] = useState('');
  const [chapterReference, setChapterReference] = useState('');
  const [passageExcerpt, setPassageExcerpt] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete modal state
  const [deletingAnnotation, setDeletingAnnotation] = useState<BookAnnotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const composerRef = useRef<HTMLDivElement>(null);

  // ── Load Book Details ───────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadBook() {
      setBookLoading(true);
      setBookError(null);
      try {
        const data = await fetchBookById(bookId, { signal: controller.signal });
        if (isMounted) {
          setBook(data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isMounted) {
          setBookError('The archival folio could not be retrieved from the catalogue.');
        }
      } finally {
        if (isMounted) {
          setBookLoading(false);
        }
      }
    }

    if (bookId) {
      loadBook();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [bookId]);

  // ── Load Annotations ────────────────────────────────────────────────────────
  const loadAnnotations = useCallback(
    async (signal?: AbortSignal) => {
      if (!bookId || authLoading) return;
      setLoadingAnnotations(true);

      try {
        // Fetch public shared annotations
        const sharedPromise = fetchSharedAnnotations(bookId, {
          sort: sortMode,
          page_size: 50,
          signal,
        });

        // If authenticated, fetch user's personal notes
        const myPromise = isAuthenticated
          ? fetchMyAnnotations(bookId, { sort: sortMode, signal })
          : Promise.resolve(null);

        const [sharedRes, myRes] = await Promise.all([sharedPromise, myPromise]);

        setSharedAnnotations(sharedRes?.results || []);

        if (myRes) {
          setMyAnnotations(myRes?.results || []);
          if (myRes.counts) {
            setTabCounts(myRes.counts);
          } else {
            const results = myRes.results || [];
            const priv = results.filter((a) => a.visibility === 'PRIVATE').length;
            const shared = results.filter((a) => a.visibility === 'SHARED').length;
            setTabCounts({
              shared_count: sharedRes?.count || 0,
              my_private_count: priv,
              my_shared_count: shared,
              my_total_count: priv + shared,
            });
          }
        } else {
          setMyAnnotations([]);
          setTabCounts({
            shared_count: sharedRes?.count || 0,
            my_private_count: 0,
            my_shared_count: 0,
            my_total_count: 0,
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      } finally {
        setLoadingAnnotations(false);
      }
    },
    [bookId, isAuthenticated, authLoading, sortMode]
  );

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    loadAnnotations(controller.signal);
    return () => controller.abort();
  }, [loadAnnotations, authLoading]);

  // Handle initial compose focus
  useEffect(() => {
    if (initialComposeMode && composerRef.current) {
      composerRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [initialComposeMode]);

  // Default unauthenticated visitors to SHARED filter once auth check completes
  useEffect(() => {
    if (!authLoading && !isAuthenticated && activeFilter !== 'SHARED') {
      setActiveFilter('SHARED');
    }
  }, [authLoading, isAuthenticated, activeFilter]);

  // ── Composer Handlers ───────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setVisibility('PRIVATE');
    setPageReference('');
    setChapterReference('');
    setPassageExcerpt('');
    setReflectionText('');
    setEditingAnnotationId(null);
  }, []);

  const handleStartEdit = (annotation: BookAnnotation) => {
    setEditingAnnotationId(annotation.id);
    setVisibility(annotation.visibility);
    setPageReference(annotation.page_reference || '');
    setChapterReference(annotation.chapter_reference || '');
    setPassageExcerpt(annotation.passage_excerpt || '');
    setReflectionText(annotation.content);
    setFeedback(null);
    composerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelEdit = () => {
    resetForm();
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onSignInRequest?.();
      return;
    }

    const trimmed = reflectionText.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'Please write a contemplation before recording.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (editingAnnotationId) {
        // Edit existing annotation
        await updateBookAnnotation(bookId, editingAnnotationId, {
          content: trimmed,
          visibility,
          page_reference: pageReference.trim() || null,
          chapter_reference: chapterReference.trim() || null,
          passage_excerpt: passageExcerpt.trim() || null,
        });
        setFeedback({ type: 'success', message: 'Marginalia successfully amended in your ledger.' });
      } else {
        // Create new annotation
        await createBookAnnotation(bookId, {
          content: trimmed,
          visibility,
          page_reference: pageReference.trim() || null,
          chapter_reference: chapterReference.trim() || null,
          passage_excerpt: passageExcerpt.trim() || null,
        });
        setFeedback({
          type: 'success',
          message:
            visibility === 'SHARED'
              ? 'Shared marginalia inscribed and published to the Reading Room.'
              : 'Private reflection inscribed to your personal reading desk.',
        });
      }

      resetForm();
      await loadAnnotations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to record annotation.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Quick Visibility Toggle from Card ───────────────────────────────────────

  const handleToggleVisibility = async (annotation: BookAnnotation) => {
    const nextVis: AnnotationVisibility = annotation.visibility === 'PRIVATE' ? 'SHARED' : 'PRIVATE';
    try {
      await updateBookAnnotation(bookId, annotation.id, { visibility: nextVis });
      await loadAnnotations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update visibility.';
      alert(msg);
    }
  };

  // ── Deletion Workflow ───────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!deletingAnnotation) return;
    setIsDeleting(true);

    try {
      await deleteBookAnnotation(bookId, deletingAnnotation.id);
      if (editingAnnotationId === deletingAnnotation.id) {
        resetForm();
      }
      setDeletingAnnotation(null);
      await loadAnnotations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete annotation.';
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Derived Filtered List ───────────────────────────────────────────────────

  const displayedAnnotations: BookAnnotation[] = React.useMemo(() => {
    if (!isAuthenticated || activeFilter === 'SHARED') {
      return sharedAnnotations || [];
    }
    if (activeFilter === 'PRIVATE') {
      return (myAnnotations || []).filter((a) => a.visibility === 'PRIVATE');
    }
    // 'ALL' filter for authenticated user:
    // User's own notes (private + shared)
    return myAnnotations || [];
  }, [isAuthenticated, activeFilter, sharedAnnotations, myAnnotations]);

  // Loading & Error States
  if (bookLoading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }}>
          <p style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--color-action-primary)' }}>
            Retrieving Reading Room ledger from the sanctuary stacks...
          </p>
        </div>
      </div>
    );
  }

  if (bookError || !book) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyStateCard}>
          <BookOpen className={styles.emptyStateIcon} />
          <h2 className={styles.emptyStateTitle}>Reading Room Unavailable</h2>
          <p className={styles.emptyStateDesc}>
            {bookError || 'The requested book could not be found in the library archives.'}
          </p>
          <button type="button" className={styles.emptyStateActionBtn} onClick={onNavigateBookDetail}>
            Return to Book Details
          </button>
        </div>
      </div>
    );
  }

  const primaryCoverUrl =
    typeof book.covers?.[0] === 'string'
      ? book.covers[0]
      : (book.covers?.[0] as { url?: string } | undefined)?.url || '';

  const authorsDisplay = book.authors?.length ? book.authors.join(', ') : 'Unknown Author';
  const pubYear = book.publication?.published_date || '';

  return (
    <div className={styles.pageContainer}>
      {/* ── Top Context Navigation ── */}
      <section className={styles.topNavRow} aria-label="Reading Room Navigation">
        <button
          type="button"
          className={styles.breadcrumbBtn}
          onClick={onNavigateBookDetail}
          aria-label={`Return to Book Details for ${book.title}`}
        >
          <ArrowLeft size={16} />
          <span>Return to Folio Details</span>
          <span className={styles.bookContextTitle}>({book.title})</span>
        </button>

        {onNavigateReviews && (
          <button
            type="button"
            className={styles.siblingLink}
            onClick={() => onNavigateReviews(false)}
            aria-label="View Public Reader Reviews"
          >
            <span>View Public Reader Reviews</span>
            <ArrowRight size={14} />
          </button>
        )}
      </section>

      {/* ── Literary Folio Anchor Card ── */}
      <header className={styles.folioAnchorCard}>
        <div className={styles.anchorCardContent}>
          <div className={styles.bookMetadataGroup}>
            {/* 2:3 Jacket Thumbnail */}
            <div className={styles.bookCoverWrapper}>
              {primaryCoverUrl ? (
                <img
                  src={primaryCoverUrl}
                  alt={`Binding jacket for ${book.title}`}
                  className={styles.bookCoverImg}
                  loading="lazy"
                />
              ) : (
                <div className={styles.fallbackCover}>
                  <BookOpen size={20} style={{ color: 'var(--color-action-primary)', margin: 'auto' }} />
                  <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{book.title}</span>
                </div>
              )}
            </div>

            {/* Folio Metadata */}
            <div>
              <div className={styles.folioProvenanceMeta}>
                <span className={styles.provenanceBadge}>Sanctuary Folio</span>
                <span className={styles.provenanceDot}>•</span>
                <span>{book.subjects?.[0] || 'Literary Collection'}</span>
                {authorsDisplay && (
                  <>
                    <span className={styles.provenanceDot}>•</span>
                    <span>{authorsDisplay}</span>
                  </>
                )}
                {pubYear && (
                  <>
                    <span className={styles.provenanceDot}>•</span>
                    <span>{pubYear}</span>
                  </>
                )}
                <span className={styles.provenanceDot}>•</span>
                <span className={styles.accessionChip}>Folio #{book.id.slice(-8)}</span>
              </div>

              <h1 className={styles.readingRoomTitle}>
                Voices from the Reading Room:{' '}
                <span className={styles.readingRoomTitleAccent}>Marginalia &amp; Annotations</span>
              </h1>

              <p className={styles.readingRoomSubtitle}>
                A quiet digital desk for in-passage reflections, handwritten pencil notes, and contemplative
                marginalia. Marginalia captures spontaneous thoughts anchored directly to specific folios
                and passages.
              </p>
            </div>
          </div>

          {/* Reading Desk Status Indicator */}
          <div className={styles.statusIndicatorBox}>
            <div className={styles.statusIndicatorActive}>
              <span className={styles.statusDot} />
              <span>{isAuthenticated ? 'Reading Desk Engaged' : 'Guest Reader View'}</span>
            </div>
            <span className={styles.statusSubtext}>
              {isAuthenticated
                ? `Patron: ${user?.display_name || user?.username}`
                : 'Sign in to inscribe private or shared marginalia'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Dual-Column Layout: Left Composer & Right Ledger ── */}
      <main className={styles.dualColumnLayout}>
        {/* ── LEFT COLUMN: The Reading Desk (Composer) ── */}
        <aside
          ref={composerRef}
          className={`${styles.readingDeskCard} ${editingAnnotationId ? styles.editingActiveBorder : ''}`}
          aria-label="Reading Desk Composer"
        >
          <div className={styles.deskHeader}>
            <div>
              <div className={styles.deskEyebrow}>
                <Feather size={16} />
                <span>The Reading Desk</span>
              </div>
              <h2 className={styles.deskTitle}>
                {editingAnnotationId ? 'Edit Your Inscription' : 'Record a Reflection'}
              </h2>
            </div>
            <span className={styles.modeBadge}>
              {editingAnnotationId ? 'Amending' : 'Marginalia'}
            </span>
          </div>

          <p className={styles.deskSubtitle}>
            Anchor a thought to a passage or fleeting contemplation. Your words inhabit the parchment margins
            of this folio.
          </p>

          <form className={styles.composerForm} onSubmit={handleSubmit}>
            {/* Visibility Selector */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Inscription Visibility</label>
              <div className={styles.visibilityControl} role="radiogroup" aria-label="Inscription Visibility">
                {/* Private Option */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={visibility === 'PRIVATE'}
                  className={`${styles.visibilityOption} ${
                    visibility === 'PRIVATE' ? styles.visibilityOptionActive : ''
                  }`}
                  onClick={() => setVisibility('PRIVATE')}
                >
                  <div className={styles.visibilityOptionIcon}>
                    <Lock size={14} />
                  </div>
                  <div className={styles.visibilityOptionText}>
                    <span className={styles.visibilityOptionTitle}>Private Reflection</span>
                    <span className={styles.visibilityOptionSub}>Only on your desk</span>
                  </div>
                </button>

                {/* Shared Option */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={visibility === 'SHARED'}
                  className={`${styles.visibilityOption} ${
                    visibility === 'SHARED' ? styles.visibilityOptionActive : ''
                  }`}
                  onClick={() => setVisibility('SHARED')}
                >
                  <div className={styles.visibilityOptionIcon}>
                    <Globe size={14} />
                  </div>
                  <div className={styles.visibilityOptionText}>
                    <span className={styles.visibilityOptionTitle}>Shared Marginalia</span>
                    <span className={styles.visibilityOptionSub}>Open to reading room</span>
                  </div>
                </button>
              </div>

              <p className={styles.visibilityDynamicNote}>
                {visibility === 'PRIVATE'
                  ? '• Kept strictly in your personal reading desk; visible only to you.'
                  : '• Shared openly in the Reading Room for other patrons studying this folio.'}
              </p>
            </div>

            {/* Folio / Page Reference */}
            <div className={styles.formGroup}>
              <div className={styles.formLabelRow}>
                <label htmlFor="page-reference-input" className={styles.formLabel}>
                  Folio / Page Reference <span className={styles.formHint}>(Optional)</span>
                </label>
                <span className={styles.formHint}>e.g. Page 114, Sec. 3</span>
              </div>
              <input
                id="page-reference-input"
                type="text"
                className={styles.inputField}
                placeholder="Page 114 • The Garden of Forking Paths"
                value={pageReference}
                onChange={(e) => setPageReference(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Quoted Passage / Anchor Excerpt */}
            <div className={styles.formGroup}>
              <div className={styles.formLabelRow}>
                <label htmlFor="passage-excerpt-input" className={styles.formLabel}>
                  Quoted Passage or Anchor Phrase <span className={styles.formHint}>(Optional)</span>
                </label>
                <span className={styles.formHint}>Italicized on folio</span>
              </div>
              <textarea
                id="passage-excerpt-input"
                className={styles.excerptTextarea}
                placeholder="Transcribe an excerpt or phrase from the folio being contemplated..."
                rows={2}
                value={passageExcerpt}
                onChange={(e) => setPassageExcerpt(e.target.value)}
                maxLength={1000}
              />
            </div>

            {/* Reflection Text */}
            <div className={styles.formGroup}>
              <div className={styles.formLabelRow}>
                <label htmlFor="reflection-text-input" className={styles.formLabel}>
                  Contemplation / Marginal Observation *
                </label>
                <span className={styles.charCounter}>{reflectionText.length} / 5000</span>
              </div>
              <textarea
                id="reflection-text-input"
                className={styles.reflectionTextarea}
                placeholder="Transcribe your contemplation, question, or marginal observation here. Write with the patience of an unhurried reader..."
                rows={5}
                required
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                maxLength={5000}
              />
            </div>

            {/* Advisory guidance */}
            <div className={styles.guidanceNote}>
              <Bookmark size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-accent-terracotta)' }} />
              <span>
                Marginalia captures spontaneous insight during the act of reading. For overall critiques or thematic reviews,
                visit the{' '}
                {onNavigateReviews ? (
                  <button
                    type="button"
                    className={styles.guidanceLink}
                    onClick={() => onNavigateReviews(false)}
                  >
                    Reader Reviews
                  </button>
                ) : (
                  'Reader Reviews'
                )}{' '}
                alcove.
              </span>
            </div>

            {/* Feedback messages */}
            {feedback && (
              <div
                className={`${styles.feedbackAlert} ${
                  feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
                }`}
                role="alert"
              >
                {feedback.message}
              </div>
            )}

            {/* Form actions */}
            <div className={styles.formActions}>
              {isAuthenticated ? (
                <>
                  <button
                    type="submit"
                    className={styles.primarySubmitBtn}
                    disabled={isSubmitting || !reflectionText.trim()}
                  >
                    <Edit3 size={16} />
                    <span>
                      {isSubmitting
                        ? 'Recording...'
                        : editingAnnotationId
                        ? 'Save Changes'
                        : visibility === 'SHARED'
                        ? 'Publish Shared Marginalia'
                        : 'Inscribe to Reading Desk'}
                    </span>
                  </button>

                  {editingAnnotationId ? (
                    <button
                      type="button"
                      className={styles.cancelClearBtn}
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      Cancel Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.cancelClearBtn}
                      onClick={resetForm}
                      disabled={isSubmitting || (!reflectionText && !pageReference && !passageExcerpt)}
                    >
                      Clear Desk
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className={styles.primarySubmitBtn}
                  onClick={onSignInRequest}
                >
                  <Lock size={16} />
                  <span>Sign In to Inscribe Marginalia</span>
                </button>
              )}
            </div>
          </form>
        </aside>

        {/* ── RIGHT COLUMN: Folio Marginalia Ledger ── */}
        <section className={styles.ledgerContainer} aria-label="Folio Marginalia Ledger">
          {/* Header & Controls */}
          <div className={styles.ledgerHeaderCard}>
            <div className={styles.ledgerTitleGroup}>
              <BookOpen size={20} style={{ color: 'var(--color-action-primary)' }} />
              <h2 className={styles.ledgerTitle}>
                Folio Marginalia{' '}
                <span className={styles.ledgerCountSpan}>
                  ({displayedAnnotations.length} Inscribed)
                </span>
              </h2>
            </div>

            <div className={styles.controlsGroup}>
              {/* Filter Tabs */}
              {isAuthenticated && (
                <div className={styles.filterTabBar} role="tablist" aria-label="Annotation Filters">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'ALL'}
                    className={`${styles.filterTabBtn} ${
                      activeFilter === 'ALL' ? styles.filterTabBtnActive : ''
                    }`}
                    onClick={() => setActiveFilter('ALL')}
                  >
                    All ({tabCounts.my_total_count})
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'PRIVATE'}
                    className={`${styles.filterTabBtn} ${
                      activeFilter === 'PRIVATE' ? styles.filterTabBtnActive : ''
                    }`}
                    onClick={() => setActiveFilter('PRIVATE')}
                  >
                    My Private ({tabCounts.my_private_count})
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'SHARED'}
                    className={`${styles.filterTabBtn} ${
                      activeFilter === 'SHARED' ? styles.filterTabBtnActive : ''
                    }`}
                    onClick={() => setActiveFilter('SHARED')}
                  >
                    Shared ({tabCounts.shared_count})
                  </button>
                </div>
              )}

              {/* Sort selector */}
              <div className={styles.sortSelectWrapper}>
                <select
                  className={styles.sortSelect}
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  aria-label="Sort annotations"
                >
                  <option value="recent">Sort: Recently Inscribed</option>
                  <option value="page">Sort: By Folio Page</option>
                </select>
                <ChevronDown size={14} className={styles.sortSelectIcon} />
              </div>
            </div>
          </div>

          {/* Annotations List */}
          {loadingAnnotations ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
              Loading folio marginalia...
            </div>
          ) : displayedAnnotations.length === 0 ? (
            <div className={styles.emptyStateCard}>
              <Feather className={styles.emptyStateIcon} />
              <h3 className={styles.emptyStateTitle}>
                {activeFilter === 'PRIVATE'
                  ? 'No private reflections on your reading desk'
                  : activeFilter === 'SHARED'
                  ? 'No shared marginalia catalogued yet'
                  : 'No marginalia transcribed yet for this folio'}
              </h3>
              <p className={styles.emptyStateDesc}>
                {activeFilter === 'PRIVATE'
                  ? 'Reflections you inscribe as Private will be preserved exclusively on your reading desk.'
                  : activeFilter === 'SHARED'
                  ? 'Patrons have not yet published shared marginalia for this work. Inscribe your thoughts to begin the dialogue.'
                  : 'Use the Reading Desk on the left to record your reflections, anchor quotes, and contemplative notes.'}
              </p>
              {isAuthenticated && (
                <button
                  type="button"
                  className={styles.emptyStateActionBtn}
                  onClick={() => composerRef.current?.scrollIntoView?.({ behavior: 'smooth' })}
                >
                  Inscribe a Note
                </button>
              )}
            </div>
          ) : (
            <div className={styles.marginaliaFeed}>
              {displayedAnnotations.map((annotation) => {
                const isOwner = Boolean(isAuthenticated && user && annotation.user_id === user.id);
                const isPrivate = annotation.visibility === 'PRIVATE';

                const createdDate = new Date(annotation.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                const authorName = annotation.author?.display_name || annotation.author?.username || 'Reader';
                const authorInitial = authorName.slice(0, 2).toUpperCase();

                return (
                  <article
                    key={annotation.id}
                    className={styles.annotationCard}
                    data-testid="annotation-card"
                    aria-label={`Annotation on ${book.title}`}
                  >
                    {/* Card Top Row: Badge, Folio Ref, Timestamp */}
                    <div className={styles.cardTopRow}>
                      <div className={styles.badgeGroup}>
                        {isPrivate ? (
                          <span className={styles.privateBadge}>
                            <Lock size={12} />
                            <span>Private Note • My Reading Desk</span>
                          </span>
                        ) : (
                          <span className={styles.sharedBadge}>
                            <Globe size={12} />
                            <span>Shared with Reading Room</span>
                          </span>
                        )}

                        {(annotation.page_reference || annotation.chapter_reference) && (
                          <span className={styles.folioLocationChip}>
                            {[annotation.page_reference, annotation.chapter_reference]
                              .filter(Boolean)
                              .join(' • ')}
                          </span>
                        )}
                      </div>

                      <span className={styles.cardTimestamp}>Inscribed {createdDate}</span>
                    </div>

                    {/* Shared Author Info (for shared notes) */}
                    {!isPrivate && (
                      <div className={styles.patronHeaderRow}>
                        <div className={styles.authorAvatar}>{authorInitial}</div>
                        <span className={styles.authorName}>{authorName}</span>
                        {isOwner && <span className={styles.youBadge}>(You)</span>}
                      </div>
                    )}

                    {/* Quoted Passage Excerpt */}
                    {annotation.passage_excerpt && (
                      <blockquote
                        className={`${styles.passageBlockquote} ${
                          !isPrivate ? styles.passageQuoteShared : ''
                        }`}
                      >
                        <p className={styles.passageText}>“{annotation.passage_excerpt}”</p>
                      </blockquote>
                    )}

                    {/* Reflection Body */}
                    <p className={styles.reflectionBody}>{annotation.content}</p>

                    {/* Card Action Bar */}
                    <div className={styles.cardActionsRow}>
                      <div className={styles.cardActionButtons}>
                        {isOwner ? (
                          <>
                            <button
                              type="button"
                              className={styles.cardActionBtn}
                              onClick={() => handleStartEdit(annotation)}
                              aria-label="Edit Note"
                            >
                              <Edit3 size={14} />
                              <span>Edit Note</span>
                            </button>

                            <button
                              type="button"
                              className={styles.cardActionBtn}
                              onClick={() => handleToggleVisibility(annotation)}
                              aria-label={isPrivate ? 'Make Shared' : 'Make Private'}
                            >
                              <Share2 size={14} />
                              <span>{isPrivate ? 'Make Shared' : 'Make Private'}</span>
                            </button>

                            <button
                              type="button"
                              className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                              onClick={() => setDeletingAnnotation(annotation)}
                              aria-label="Delete Note"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.cardIndicator}>
                              <Bookmark size={13} />
                              <span>Folio Marginalia</span>
                            </div>
                            {!isPrivate && (
                              <ReportContentButton
                                targetType="ANNOTATION"
                                targetId={annotation.id}
                                authorId={annotation.user_id}
                                authorName={authorName}
                                onSignInRequest={onSignInRequest}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className={styles.cardIndicator}>
                        <Feather size={13} />
                        <span>Marginal Inscription</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      {deletingAnnotation && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className={styles.modalDialog}>
            <h3 id="delete-dialog-title" className={styles.modalTitle}>
              Delete Your Annotation?
            </h3>
            <p className={styles.modalBody}>
              Are you sure you wish to remove this marginalia from your reading desk?
              {deletingAnnotation.visibility === 'SHARED' &&
                ' This will also remove it from the public Reading Room.'}{' '}
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setDeletingAnnotation(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDeleteBtn}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Annotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
