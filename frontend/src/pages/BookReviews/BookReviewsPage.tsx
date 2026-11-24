import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Star,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Edit3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MessageSquare,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchBookById,
  fetchBookReviews,
  fetchBookRating,
  createBookReview,
  fetchMyReview,
  updateBookReview,
  deleteBookReview,
  fetchReviewReplies,
  createReviewReply,
  deleteReviewReply,
} from '@/services/discoveryService';
import { ReportContentButton } from '@/components/community/ReportContentButton/ReportContentButton';
import type { BookDetail, BookReview, BookAggregateRating, ReviewReply } from '@/types/discovery';
import styles from './BookReviewsPage.module.css';

export interface BookReviewsPageProps {
  bookId: string;
  initialWriteMode?: boolean;
  onNavigateBookDetail: () => void;
  onNavigateHome: () => void;
  onSignInRequest: () => void;
}

const RATING_DESCRIPTORS: Record<number, string> = {
  1: '1 — Poor Scholarly Rigor',
  2: '2 — Modest Value with Reservations',
  3: '3 — Competent Commentary',
  4: '4 — Exceptional Intellectual Density',
  5: '5 — Foundational Masterpiece',
};

export function BookReviewsPage({
  bookId,
  initialWriteMode = false,
  onNavigateBookDetail,
  onNavigateHome,
  onSignInRequest,
}: BookReviewsPageProps) {
  const { user, isAuthenticated } = useAuth();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [ratingData, setRatingData] = useState<BookAggregateRating | null>(null);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authenticated User's Review & Edit Mode
  const [myReview, setMyReview] = useState<BookReview | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasUserReviewed, setHasUserReviewed] = useState<boolean>(false);

  // Composer Form State
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewBody, setReviewBody] = useState<string>('');
  const [containsSpoiler, setContainsSpoiler] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Delete Modals
  const [confirmDeleteReviewOpen, setConfirmDeleteReviewOpen] = useState<boolean>(false);
  const [confirmDeleteReply, setConfirmDeleteReply] = useState<{ reviewId: string; replyId: string } | null>(null);

  // Review Replies State
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [repliesByReview, setRepliesByReview] = useState<Record<string, ReviewReply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [activeReplyComposerId, setActiveReplyComposerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({});

  // Hidden Spoilers Toggle State
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const composerRef = useRef<HTMLDivElement>(null);
  const thesisInputRef = useRef<HTMLInputElement>(null);

  // Load Book Details & Rating
  const loadBookAndRating = useCallback(async () => {
    try {
      const [bookResult, ratingResult] = await Promise.all([
        fetchBookById(bookId),
        fetchBookRating(bookId),
      ]);
      setBook(bookResult);
      setRatingData(ratingResult);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Folio record could not be retrieved from the Akashic ledger.');
      }
    }
  }, [bookId]);

  // Load authenticated user's own review
  const loadMyReview = useCallback(async () => {
    if (!isAuthenticated) {
      setMyReview(null);
      setHasUserReviewed(false);
      return;
    }
    try {
      const userRev = await fetchMyReview(bookId);
      if (userRev) {
        setMyReview(userRev);
        setHasUserReviewed(true);
      } else {
        setMyReview(null);
        setHasUserReviewed(false);
      }
    } catch {
      // Non-blocking
    }
  }, [bookId, isAuthenticated]);

  // Load Reviews for current page
  const loadReviews = useCallback(
    async (page: number) => {
      try {
        setIsLoading(true);
        const result = await fetchBookReviews(bookId, { page, page_size: pageSize });
        setReviews(result.results || []);
        setTotalCount(result.count || 0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Reader reviews are temporarily unavailable.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [bookId]
  );

  useEffect(() => {
    loadBookAndRating();
  }, [loadBookAndRating]);

  useEffect(() => {
    loadMyReview();
  }, [loadMyReview]);

  useEffect(() => {
    loadReviews(currentPage);
  }, [loadReviews, currentPage]);

  // Handle initialWriteMode smooth scrolling
  useEffect(() => {
    if (initialWriteMode && composerRef.current) {
      composerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      thesisInputRef.current?.focus();
    }
  }, [initialWriteMode, isLoading]);

  const handleScrollToComposer = () => {
    composerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    thesisInputRef.current?.focus();
  };

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
  };

  // Switch to Edit Mode
  const handleStartEdit = () => {
    if (!myReview) return;
    setIsEditing(true);
    setSelectedRating(myReview.rating);
    setReviewTitle(myReview.title || '');
    setReviewBody(myReview.body);
    setContainsSpoiler(myReview.contains_spoiler);
    setSubmitError(null);
    setSubmitSuccess(null);
    composerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    thesisInputRef.current?.focus();
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedRating(5);
    setReviewTitle('');
    setReviewBody('');
    setContainsSpoiler(false);
    setSubmitError(null);
  };

  // Submit Review (Create or Update)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      onSignInRequest();
      return;
    }

    if (!reviewBody.trim()) {
      setSubmitError('Please inscribe your contemplation text before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      if (isEditing && myReview) {
        const updated = await updateBookReview(bookId, myReview.id, {
          rating: selectedRating,
          title: reviewTitle.trim() || null,
          body: reviewBody.trim(),
          contains_spoiler: containsSpoiler,
        });

        setMyReview(updated);
        setIsEditing(false);
        setSubmitSuccess('Your contemplation has been updated in the Akashic archives.');
      } else {
        await createBookReview(bookId, {
          rating: selectedRating,
          title: reviewTitle.trim() || null,
          body: reviewBody.trim(),
          contains_spoiler: containsSpoiler,
        });

        setSubmitSuccess(
          'Your contemplation has been accessioned and sealed into the Akashic catalogue.'
        );
        setReviewBody('');
        setReviewTitle('');
        await loadMyReview();
      }

      // Refresh reviews & aggregate rating
      await Promise.all([loadReviews(1), loadBookAndRating()]);
      setCurrentPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review.';
      setSubmitError(msg);
      if (msg.includes('already submitted') || msg.includes('Conflict')) {
        await loadMyReview();
        setHasUserReviewed(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Review
  const handleConfirmDeleteReview = async () => {
    if (!myReview) return;
    try {
      setIsSubmitting(true);
      await deleteBookReview(bookId, myReview.id);
      setMyReview(null);
      setHasUserReviewed(false);
      setIsEditing(false);
      setConfirmDeleteReviewOpen(false);
      setSelectedRating(5);
      setReviewTitle('');
      setReviewBody('');
      setContainsSpoiler(false);
      setSubmitSuccess('Your contemplation has been withdrawn from the archives.');

      // Refresh public listing and aggregate rating
      await Promise.all([loadReviews(1), loadBookAndRating()]);
      setCurrentPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete review.';
      setSubmitError(msg);
      setConfirmDeleteReviewOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Reply Accordion
  const toggleReplies = async (reviewId: string) => {
    const isCurrentlyExpanded = Boolean(expandedReplies[reviewId]);
    setExpandedReplies((prev) => ({ ...prev, [reviewId]: !isCurrentlyExpanded }));

    // If opening and not yet loaded, fetch replies
    if (!isCurrentlyExpanded && !repliesByReview[reviewId]) {
      try {
        setLoadingReplies((prev) => ({ ...prev, [reviewId]: true }));
        const list = await fetchReviewReplies(bookId, reviewId);
        setRepliesByReview((prev) => ({ ...prev, [reviewId]: list }));
      } catch {
        // Non-blocking
      } finally {
        setLoadingReplies((prev) => ({ ...prev, [reviewId]: false }));
      }
    }
  };

  // Toggle Inline Reply Composer
  const toggleReplyComposer = (reviewId: string) => {
    if (!isAuthenticated) {
      onSignInRequest();
      return;
    }
    setActiveReplyComposerId((prev) => (prev === reviewId ? null : reviewId));
  };

  // Submit Reply
  const handleSubmitReply = async (reviewId: string) => {
    const text = (replyText[reviewId] || '').trim();
    if (!text) return;

    try {
      setIsSubmittingReply((prev) => ({ ...prev, [reviewId]: true }));
      const newReply = await createReviewReply(bookId, reviewId, text);

      setRepliesByReview((prev) => ({
        ...prev,
        [reviewId]: [...(prev[reviewId] || []), newReply],
      }));
      setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
      setActiveReplyComposerId(null);
      setExpandedReplies((prev) => ({ ...prev, [reviewId]: true }));

      // Update reply count locally
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply_count: (r.reply_count || 0) + 1 } : r))
      );
      if (myReview && myReview.id === reviewId) {
        setMyReview((prev) => (prev ? { ...prev, reply_count: (prev.reply_count || 0) + 1 } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setIsSubmittingReply((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // Confirm Delete Reply
  const handleConfirmDeleteReply = async () => {
    if (!confirmDeleteReply) return;
    const { reviewId, replyId } = confirmDeleteReply;

    try {
      await deleteReviewReply(bookId, reviewId, replyId);
      setRepliesByReview((prev) => ({
        ...prev,
        [reviewId]: (prev[reviewId] || []).filter((r) => r.id !== replyId),
      }));

      // Decrement reply count locally
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, reply_count: Math.max(0, (r.reply_count || 1) - 1) } : r
        )
      );
      if (myReview && myReview.id === reviewId) {
        setMyReview((prev) =>
          prev ? { ...prev, reply_count: Math.max(0, (prev.reply_count || 1) - 1) } : null
        );
      }
      setConfirmDeleteReply(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete reply.');
      setConfirmDeleteReply(null);
    }
  };

  const toggleSpoiler = (reviewId: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  // Compute breakdown percentages
  const totalRatings = ratingData?.rating_count || totalCount || 0;
  const distribution = ratingData?.distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  const getPercentage = (star: number) => {
    if (!totalRatings || totalRatings === 0) return 0;
    const count = distribution[String(star)] || 0;
    return Math.round((count / totalRatings) * 100);
  };

  const averageRating =
    ratingData?.average_rating !== null && ratingData?.average_rating !== undefined
      ? ratingData.average_rating.toFixed(1)
      : reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : null;

  const totalPages = Math.ceil(totalCount / pageSize);

  // Cover image fallback
  const firstCover = book?.covers && book.covers.length > 0 ? book.covers[0] : null;
  const coverUrl =
    firstCover !== null && firstCover !== undefined
      ? typeof firstCover === 'string'
        ? firstCover
        : firstCover.url
      : null;

  const title = book?.title || 'Folio Reviews';
  const author = book?.authors && book.authors.length > 0 ? book.authors.join(', ') : 'Unknown Author';
  const year = book?.publication?.published_date?.slice(0, 4) || '';
  const accessionId = book?.identifiers?.isbn10 || book?.identifiers?.isbn13 || bookId.slice(0, 8).toUpperCase();
  const primarySubject = book?.subjects && book.subjects.length > 0 ? book.subjects[0] : 'Classical Folios';

  const userDisplayName = user?.display_name || user?.username || 'Patron';
  const userInitials = userDisplayName.slice(0, 2).toUpperCase();

  return (
    <div className={styles.container}>
      {/* ── 1. Breadcrumbs & Compact Anchor Bar ── */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <button
          type="button"
          onClick={onNavigateBookDetail}
          className={styles.breadcrumbLink}
          aria-label="Return to Book Details"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Return to Book Details</span>
        </button>
        <span className={styles.breadcrumbDivider} aria-hidden="true">/</span>
        <span className={styles.breadcrumbLink} onClick={onNavigateHome}>
          {primarySubject}
        </span>
        <span className={styles.breadcrumbDivider} aria-hidden="true">/</span>
        <span className={styles.breadcrumbCurrent}>{title} (Folio #{accessionId})</span>
      </nav>

      {error && (
        <div className={`${styles.formAlert} ${styles.formAlertError}`} role="alert" style={{ marginBottom: 'var(--space-6)' }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Compact Book Details Anchor Bar */}
      <section className={styles.bookAnchorBar} aria-label="Folio summary bar">
        <div className={styles.anchorLeft}>
          <div className={styles.anchorCover}>
            {coverUrl ? (
              <img src={coverUrl} alt={`Jacket of ${title}`} />
            ) : (
              <BookOpen size={24} style={{ color: 'var(--color-action-primary)' }} />
            )}
          </div>
          <div className={styles.anchorMeta}>
            <div className={styles.anchorTitleRow}>
              <h2 className={styles.anchorTitle}>{title}</h2>
              <span className={styles.anchorAuthor}>
                — {author} {year ? `(${year})` : ''}
              </span>
            </div>
            <div className={styles.anchorSubMeta}>
              <span>Shelf Gamma • Main Wing</span>
              <span>•</span>
              <span>Archival Codex Edition</span>
              <span>•</span>
              <span>Acc. ID: #{accessionId}</span>
            </div>
          </div>
        </div>

        <div className={styles.anchorRight}>
          <span className={styles.anchorBadge}>
            <Edit3 size={15} aria-hidden="true" />
            Currently Viewing Reader Reviews
          </span>
          <button
            type="button"
            className={styles.anchorReturnBtn}
            onClick={onNavigateBookDetail}
            aria-label="Return to Codex Overview"
          >
            <span>Overview Codex</span>
            <ExternalLink size={14} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ── 2. Editorial Header & Rating Synthesis ── */}
      <header className={styles.synthesisHeader}>
        <div className={styles.synthesisTagline}>
          <BookOpen size={16} aria-hidden="true" />
          <span>Critical Marginalia • Reader Inscriptions</span>
        </div>
        <h1 className={styles.synthesisPageTitle}>Reader Contemplations &amp; Critical Folios</h1>
        <p className={styles.synthesisSubtitle}>
          Thoughtful marginalia, essays, and reader appraisals preserved in the Akashic catalog.
        </p>
      </header>

      {/* Rating Synthesis Card */}
      <section className={styles.synthesisCard} aria-label="Rating synthesis summary">
        {/* Big Score Column */}
        <div className={styles.bigScoreCol}>
          <div className={styles.bigScoreRow}>
            <span className={styles.bigScoreNum}>{averageRating || '—'}</span>
            <span className={styles.bigScoreMax}>/ 5</span>
          </div>

          <div
            className={styles.starRow}
            aria-label={averageRating ? `Rated ${averageRating} out of 5 stars` : 'Not yet rated'}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const numAvg = averageRating ? parseFloat(averageRating) : 0;
              const isFilled = star <= Math.round(numAvg);
              return (
                <Star
                  key={star}
                  size={20}
                  fill={isFilled ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  aria-hidden="true"
                />
              );
            })}
          </div>

          <p className={styles.bigScoreMeta}>
            {totalRatings > 0
              ? `Based on ${totalRatings} reader inscription${totalRatings === 1 ? '' : 's'}`
              : 'Awaiting the first reader inscription'}
          </p>

          <span className={styles.verifiedScholarlyBadge}>
            <ShieldCheck size={14} aria-hidden="true" />
            Authoritative Catalog Inscriptions
          </span>
        </div>

        {/* Breakdown Bars Column */}
        <div className={styles.barsCol} aria-label="Rating distribution breakdown">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = getPercentage(star);
            return (
              <div key={star} className={styles.barRow}>
                <span className={styles.barLabel}>{star} Star{star === 1 ? '' : 's'}</span>
                <div className={styles.barTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.barPercent}>{pct}%</span>
              </div>
            );
          })}
        </div>

        {/* Curatorial Synthesis Box */}
        <div className={styles.synthesisQuoteBox}>
          <div>
            <div className={styles.synthesisQuoteHeader}>
              <BookOpen size={14} aria-hidden="true" />
              <span>Curatorial Synthesis</span>
            </div>
            <p className={styles.synthesisQuoteText}>
              {book?.quote
                ? `“${book.quote}”`
                : totalRatings > 0
                  ? `“Readers praise ${title}'s intricate thematic architecture, intellectual depth, and lasting literary resonance.”`
                  : '“No reader reviews cataloged yet. The open folio awaits its initial critical contemplation.”'}
            </p>
          </div>

          <button
            type="button"
            className={styles.inscribeCtaBtn}
            onClick={myReview ? handleStartEdit : handleScrollToComposer}
          >
            <Edit3 size={16} aria-hidden="true" />
            <span>{myReview ? 'Edit Your Review' : 'Inscribe Your Review'}</span>
          </button>
        </div>
      </section>

      {/* ── 3. Authenticated User's Review ("Your Review" Section) ── */}
      {isAuthenticated && myReview && !isEditing && (
        <section className={styles.yourReviewSection} aria-label="Your Review">
          <div className={styles.yourReviewCard} data-testid="your-review-card">
            <div className={styles.yourReviewBadge}>
              <ShieldCheck size={13} aria-hidden="true" />
              Your Review
            </div>

            <header className={styles.reviewerRow}>
              <div className={styles.reviewerLeft}>
                <div className={styles.reviewerAvatar} aria-hidden="true">
                  {userInitials}
                </div>
                <div className={styles.reviewerMeta}>
                  <div className={styles.reviewerNameRow}>
                    <span className={styles.reviewerName}>{userDisplayName}</span>
                    <span className={styles.reviewerBadge}>Author</span>
                  </div>
                  <span className={styles.reviewerDate}>
                    Inscribed on{' '}
                    {myReview.created_at
                      ? new Date(myReview.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Recently'}
                  </span>
                </div>
              </div>

              <div className={styles.reviewStars} aria-label={`Rated ${myReview.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    fill={s <= myReview.rating ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    aria-hidden="true"
                  />
                ))}
                <span className={styles.reviewScoreNum}>{myReview.rating}.0</span>
              </div>
            </header>

            {myReview.contains_spoiler && (
              <div className={styles.spoilerAlert} style={{ marginTop: 'var(--space-3)' }}>
                <span>
                  <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} aria-hidden="true" />
                  Contains spoiler disclosure
                </span>
              </div>
            )}

            {myReview.title && <h3 className={styles.reviewHeadline}>{myReview.title}</h3>}
            <p className={styles.reviewBody}>{myReview.body}</p>

            <div className={styles.yourReviewActions}>
              <button
                type="button"
                className={styles.editReviewBtn}
                onClick={handleStartEdit}
                aria-label="Edit Your Review"
              >
                <Edit3 size={15} aria-hidden="true" />
                <span>Edit Your Review</span>
              </button>

              <button
                type="button"
                className={styles.deleteReviewBtn}
                onClick={() => setConfirmDeleteReviewOpen(true)}
                aria-label="Delete Your Review"
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>Delete Your Review</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. Write / Edit Review Experience (The Folio Composer) ── */}
      <section className={styles.composerCard} id="composer-panel" ref={composerRef} aria-label="Review Composer">
        <div className={styles.composerHeader}>
          <div>
            <span className={styles.composerCategory}>
              {isEditing ? 'Folio Ledger • Amend Inscription' : 'Folio Ledger • Reader Expression'}
            </span>
            <h2 className={styles.composerTitle}>
              {isEditing ? `Edit Your Contemplation on ${title}` : `Inscribe a Contemplation on ${title}`}
            </h2>
          </div>

          {isAuthenticated && (
            <div className={styles.patronBadge}>
              <div className={styles.patronAvatar} aria-hidden="true">
                {userInitials}
              </div>
              <div className={styles.patronDetails}>
                <span className={styles.patronName}>{userDisplayName}</span>
                <span className={styles.patronRole}>Resident Reader • Akashic Patron</span>
              </div>
            </div>
          )}
        </div>

        {submitError && (
          <div className={`${styles.formAlert} ${styles.formAlertError}`} role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className={`${styles.formAlert} ${styles.formAlertSuccess}`} role="status" style={{ marginBottom: 'var(--space-4)' }}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {!isAuthenticated ? (
          <div className={styles.gateCard} data-testid="unauthenticated-gate">
            <div className={styles.gateIcon}>
              <Lock size={22} aria-hidden="true" />
            </div>
            <h3 className={styles.gateTitle}>Patron Authentication Required</h3>
            <p className={styles.gateText}>
              Personal marginalia and public contemplations require an inscribed patron ledger. Authenticate your
              patron account or create a sanctuary profile to leave a review.
            </p>
            <button
              type="button"
              className={`${styles.submitBtn} ${styles.gateBtn}`}
              onClick={onSignInRequest}
            >
              <Lock size={15} aria-hidden="true" />
              <span>Authenticate &amp; Inscribe</span>
            </button>
          </div>
        ) : hasUserReviewed && !isEditing ? (
          <div className={styles.formAlert} style={{ backgroundColor: 'var(--color-surface-inset)', border: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--color-action-primary)' }} aria-hidden="true" />
              <div>
                <strong>Contemplation Already Inscribed:</strong> You have an active review in the Akashic ledger.
              </div>
            </div>
            <button
              type="button"
              className={styles.editReviewBtn}
              onClick={handleStartEdit}
            >
              <Edit3 size={14} aria-hidden="true" />
              <span>Edit Your Review</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit}>
            {/* Overall Rating Picker */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>
                  Overall Appraisal <span className={styles.requiredStar}>*</span>
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div
                  className={styles.starPicker}
                  role="radiogroup"
                  aria-label="Select star rating"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={selectedRating === star}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      className={`${styles.starBtn} ${star <= selectedRating ? styles.starBtnActive : ''}`}
                      onClick={() => handleRatingSelect(star)}
                    >
                      <Star
                        size={22}
                        fill={star <= selectedRating ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>

                <span className={styles.ratingDescriptor}>
                  {RATING_DESCRIPTORS[selectedRating]}
                </span>
              </div>
            </div>

            {/* Review Thesis / Headline */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="review-title-input">
                <span>Review Thesis • Core Epigram</span>
                <span className={styles.formHint}>Optional</span>
              </label>
              <input
                ref={thesisInputRef}
                id="review-title-input"
                type="text"
                className={styles.textInput}
                placeholder="Inscribe your review thesis (e.g., An infinite architecture of mirrors, paradoxes, and labyrinths...)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Review Body */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="review-body-input">
                <span>
                  Reader Contemplation (Review Body) <span className={styles.requiredStar}>*</span>
                </span>
                <span className={styles.formHint}>Scholarly reflections &amp; critical observations</span>
              </label>
              <textarea
                id="review-body-input"
                className={styles.textareaInput}
                placeholder="Share your critical reflections, textual observations, or thematic interpretations. Avoid spoilers without warning..."
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={5}
                required
              />
              <div className={styles.charCount}>
                <span>Length: {reviewBody.length} characters</span>
                {reviewBody.length >= 80 ? (
                  <span style={{ color: 'var(--color-action-primary)', fontWeight: 600 }}>Scholarly Depth: Exemplary</span>
                ) : (
                  <span>Recommended: 80+ characters</span>
                )}
              </div>
            </div>

            {/* Spoiler Checkbox */}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={containsSpoiler}
                onChange={(e) => setContainsSpoiler(e.target.checked)}
              />
              <span>Contains plot or thematic spoilers (will be flagged with a reader disclosure warning)</span>
            </label>

            {/* Archival Notice */}
            <div className={styles.archivalPolicyNotice}>
              <ShieldCheck size={18} style={{ color: 'var(--color-accent-terracotta, #c58b70)', flexShrink: 0 }} aria-hidden="true" />
              <div>
                <strong>Archival Notice:</strong> Contemplations are recorded directly into the community archives under your patron identity.
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {isEditing && (
                <button
                  type="button"
                  className={styles.cancelEditBtn}
                  onClick={handleCancelEdit}
                >
                  <X size={16} aria-hidden="true" />
                  <span>Cancel Edit</span>
                </button>
              )}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || !reviewBody.trim()}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  {isSubmitting
                    ? isEditing
                      ? 'Saving Changes...'
                      : 'Sealing Contemplation...'
                    : isEditing
                      ? 'Save Changes'
                      : 'Submit Contemplation for Archival Review'}
                </span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── 5. Cataloged Inscriptions (Approved Reviews Stack) ── */}
      <section aria-label="Cataloged reader reviews">
        <div className={styles.reviewsSectionHeader}>
          <h2 className={styles.reviewsSectionTitle}>
            <span>Cataloged Inscriptions</span>
            <span className={styles.countPill}>{totalCount} Total</span>
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Showing page {currentPage} of {Math.max(1, totalPages)}
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
            <p>Accessioning reader folios from the catalog...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.emptyCard} data-testid="reviews-empty-state">
            <div className={styles.emptyIconCircle}>
              <BookOpen size={28} aria-hidden="true" />
            </div>
            <span className={styles.emptyEyebrow}>Virgin Folio Page</span>
            <h3 className={styles.emptyTitle}>The First Inscription Awaits</h3>
            <p className={styles.emptyText}>
              No reader reviews have yet been accessioned for this folio. Be the first patron to share your critical
              contemplation and enrich the Akashic catalog.
            </p>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleScrollToComposer}
            >
              <Edit3 size={16} aria-hidden="true" />
              <span>Be the First to Inscribe</span>
            </button>
          </div>
        ) : (
          <div className={styles.reviewsStack}>
            {reviews.map((rev) => {
              const authorName = rev.author?.display_name || rev.author?.username || 'Patron Reader';
              const authorInitials = authorName.slice(0, 2).toUpperCase();
              const dateStr = rev.created_at
                ? new Date(rev.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Archival Record';

              const isSpoiler = rev.contains_spoiler;
              const isRevealed = revealedSpoilers[rev.id] || !isSpoiler;

              const isMyReviewCard = user && (user.id === rev.user_id || user.username === rev.author?.username);
              const replies = repliesByReview[rev.id] || [];
              const isExpanded = Boolean(expandedReplies[rev.id]);
              const replyCount = rev.reply_count !== undefined ? rev.reply_count : replies.length;
              const isComposerOpen = activeReplyComposerId === rev.id;

              return (
                <article key={rev.id} className={styles.reviewCard} data-testid={`review-card-${rev.id}`}>
                  <header className={styles.reviewerRow}>
                    <div className={styles.reviewerLeft}>
                      <div className={styles.reviewerAvatar} aria-hidden="true">
                        {authorInitials}
                      </div>
                      <div className={styles.reviewerMeta}>
                        <div className={styles.reviewerNameRow}>
                          <span className={styles.reviewerName}>{authorName}</span>
                          <span className={styles.reviewerBadge}>
                            {isMyReviewCard ? 'You' : 'Reader'}
                          </span>
                        </div>
                        <span className={styles.reviewerDate}>Inscribed on {dateStr}</span>
                      </div>
                    </div>

                    <div className={styles.reviewStars} aria-label={`Rated ${rev.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          fill={s <= rev.rating ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          aria-hidden="true"
                        />
                      ))}
                      <span className={styles.reviewScoreNum}>{rev.rating}.0</span>
                    </div>
                  </header>

                  {isSpoiler && (
                    <div className={styles.spoilerAlert}>
                      <span>
                        <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} aria-hidden="true" />
                        Spoiler Warning: This reflection touches on key folio developments.
                      </span>
                      <button
                        type="button"
                        className={styles.spoilerToggleBtn}
                        onClick={() => toggleSpoiler(rev.id)}
                      >
                        {isRevealed ? 'Hide Spoilers' : 'Reveal Contemplation'}
                      </button>
                    </div>
                  )}

                  {isRevealed && (
                    <>
                      {rev.title && <h3 className={styles.reviewHeadline}>{rev.title}</h3>}
                      <p className={styles.reviewBody}>{rev.body}</p>
                    </>
                  )}

                  <footer className={styles.reviewFooter}>
                    <div className={styles.reviewFooterActions}>
                      {/* Reply button */}
                      <button
                        type="button"
                        className={styles.replyToggleBtn}
                        onClick={() => toggleReplyComposer(rev.id)}
                        aria-label={`Reply to review by ${authorName}`}
                      >
                        <MessageSquare size={14} aria-hidden="true" />
                        <span>Reply</span>
                      </button>

                      {/* View replies toggle */}
                      {(replyCount > 0 || replies.length > 0) && (
                        <button
                          type="button"
                          className={styles.replyToggleBtn}
                          onClick={() => toggleReplies(rev.id)}
                          aria-label={
                            isExpanded
                              ? 'Hide replies'
                              : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                          }
                        >
                          <span>
                            {isExpanded
                              ? 'Hide Replies'
                              : `View ${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}`}
                          </span>
                        </button>
                      )}

                      {/* Owner actions if this card belongs to current user */}
                      {isMyReviewCard && (
                        <>
                          <button
                            type="button"
                            className={styles.replyToggleBtn}
                            onClick={handleStartEdit}
                            aria-label="Edit Your Review"
                          >
                            <Edit3 size={13} aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className={styles.replyToggleBtn}
                            style={{ color: '#8B2626' }}
                            onClick={() => setConfirmDeleteReviewOpen(true)}
                            aria-label="Delete Your Review"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}

                      {/* Non-owner action: Report review */}
                      {!isMyReviewCard && (
                        <ReportContentButton
                          targetType="REVIEW"
                          targetId={rev.id}
                          targetTitle={rev.title || `${rev.rating} Star Review`}
                          authorId={rev.user_id}
                          authorName={authorName}
                          onSignInRequest={onSignInRequest}
                        />
                      )}
                    </div>

                    <span>Approved Inscription</span>
                  </footer>

                  {/* Inline Reply Composer */}
                  {isComposerOpen && (
                    <div className={styles.replyComposer} data-testid={`reply-composer-${rev.id}`}>
                      <textarea
                        className={styles.replyTextarea}
                        placeholder={`Write your reply to ${authorName}...`}
                        value={replyText[rev.id] || ''}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [rev.id]: e.target.value }))
                        }
                        rows={3}
                        aria-label="Reply text"
                      />
                      <div className={styles.replyActions}>
                        <button
                          type="button"
                          className={styles.replyCancelBtn}
                          onClick={() => setActiveReplyComposerId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className={styles.replySubmitBtn}
                          disabled={
                            isSubmittingReply[rev.id] || !(replyText[rev.id] || '').trim()
                          }
                          onClick={() => handleSubmitReply(rev.id)}
                        >
                          {isSubmittingReply[rev.id] ? 'Posting...' : 'Post Reply'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Replies Thread */}
                  {isExpanded && (
                    <div className={styles.repliesContainer} data-testid={`replies-thread-${rev.id}`}>
                      {loadingReplies[rev.id] ? (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                          Loading reader replies...
                        </p>
                      ) : replies.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                          No replies yet.
                        </p>
                      ) : (
                        replies.map((reply) => {
                          const repAuthor =
                            reply.author?.display_name || reply.author?.username || 'Reader';
                          const isOwnReply =
                            user &&
                            (user.id === reply.user_id || user.username === reply.author?.username);
                          const repDate = reply.created_at
                            ? new Date(reply.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '';

                          return (
                            <div key={reply.id} className={styles.replyCard} data-testid={`reply-card-${reply.id}`}>
                              <div className={styles.replyHeader}>
                                <div className={styles.replyAuthorMeta}>
                                  <span className={styles.replyAuthorName}>{repAuthor}</span>
                                  {isOwnReply && (
                                    <span style={{ fontSize: '11px', color: 'var(--color-action-primary)', fontWeight: 600 }}>
                                      (You)
                                    </span>
                                  )}
                                  <span className={styles.replyDate}>{repDate}</span>
                                </div>

                                {isOwnReply ? (
                                  <button
                                    type="button"
                                    className={styles.replyDeleteBtn}
                                    onClick={() =>
                                      setConfirmDeleteReply({ reviewId: rev.id, replyId: reply.id })
                                    }
                                    aria-label="Delete Reply"
                                  >
                                    <Trash2 size={12} aria-hidden="true" />
                                    <span>Delete</span>
                                  </button>
                                ) : (
                                  <ReportContentButton
                                    targetType="REVIEW_REPLY"
                                    targetId={reply.id}
                                    authorId={reply.user_id}
                                    authorName={repAuthor}
                                    onSignInRequest={onSignInRequest}
                                  />
                                )}
                              </div>
                              <p className={styles.replyBody}>{reply.body}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Review pagination">
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous reviews page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span>Previous</span>
            </button>
            <span className={styles.pageIndicator}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next reviews page"
            >
              <span>Next</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>

      {/* ── Confirmation Modal: Delete Review ── */}
      {confirmDeleteReviewOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-review-dialog-title">
          <div className={styles.modalDialog}>
            <h3 id="delete-review-dialog-title" className={styles.modalTitle}>
              Delete Your Review?
            </h3>
            <p className={styles.modalBody}>
              Are you sure you wish to withdraw this contemplation from the Akashic archives? All associated replies will also be permanently expunged. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setConfirmDeleteReviewOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDeleteBtn}
                onClick={handleConfirmDeleteReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal: Delete Reply ── */}
      {confirmDeleteReply && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-reply-dialog-title">
          <div className={styles.modalDialog}>
            <h3 id="delete-reply-dialog-title" className={styles.modalTitle}>
              Delete Your Reply?
            </h3>
            <p className={styles.modalBody}>
              Are you sure you wish to remove your reply? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setConfirmDeleteReply(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDeleteBtn}
                onClick={handleConfirmDeleteReply}
              >
                Delete Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
