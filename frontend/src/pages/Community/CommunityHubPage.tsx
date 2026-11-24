import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Feather,
  Sparkles,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listDiscussions, createDiscussion } from '@/services/communityService';
import {
  TOPIC_CATEGORIES,
  type Discussion,
  type TopicType,
  type CreateDiscussionPayload,
} from '@/types/community';
import { ReportContentButton } from '@/components/community/ReportContentButton/ReportContentButton';
import styles from './CommunityHubPage.module.css';

export interface CommunityHubPageProps {
  onSelectDiscussion: (discussionId: string) => void;
  onNavigateBook: (bookId: string) => void;
  onNavigateReviews: (bookId: string) => void;
  onNavigateReadingRoom: (bookId: string) => void;
  onSignInRequest: () => void;
}

export function CommunityHubPage({
  onSelectDiscussion,
  onNavigateBook,
  onNavigateReviews,
  onNavigateReadingRoom,
  onSignInRequest,
}: CommunityHubPageProps) {
  const { user, isAuthenticated } = useAuth();

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<TopicType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [composerTitle, setComposerTitle] = useState<string>('');
  const [composerBody, setComposerBody] = useState<string>('');
  const [composerTopic, setComposerTopic] = useState<TopicType>('GENERAL');
  const [composerBookId, setComposerBookId] = useState<string>('');
  const [composerSubmitting, setComposerSubmitting] = useState<boolean>(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Debounce in-page discussion filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load discussions
  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDiscussions({
        topic_type: selectedCategory === 'ALL' ? undefined : selectedCategory,
        q: debouncedQuery.trim() || undefined,
        limit: 50,
      });
      setDiscussions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the Agora.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedQuery]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  // Derive unique anchor folios from current discussions for the sidebar
  const activeAnchorFolios = useMemo(() => {
    const bookMap = new Map<string, { id: string; title: string; authors: string[]; count: number }>();
    for (const d of discussions) {
      if (d.book_id) {
        const title = d.book?.title || 'Catalog Folio';
        let authorsList: string[] = ['Unknown Author'];
        if (d.book?.authors && Array.isArray(d.book.authors)) {
          authorsList = d.book.authors.map((a: unknown) => {
            if (typeof a === 'string') return a;
            if (a && typeof a === 'object' && 'name' in a) return String((a as { name: unknown }).name);
            return String(a);
          });
        }
        const existing = bookMap.get(d.book_id);
        if (existing) {
          existing.count += 1;
        } else {
          bookMap.set(d.book_id, { id: d.book_id, title, authors: authorsList, count: 1 });
        }
      }
    }
    return Array.from(bookMap.values());
  }, [discussions]);

  // Handle composer submission
  const handleComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerTitle.trim() || !composerBody.trim()) {
      setComposerError('Title and reflection body are required.');
      return;
    }

    setComposerSubmitting(true);
    setComposerError(null);

    try {
      const payload: CreateDiscussionPayload = {
        title: composerTitle.trim(),
        body: composerBody.trim(),
        topic_type: composerTopic === 'ALL' ? 'GENERAL' : composerTopic,
        book_id: composerBookId.trim() || null,
      };

      const created = await createDiscussion(payload);
      setIsComposerOpen(false);
      setComposerTitle('');
      setComposerBody('');
      setComposerBookId('');
      setComposerTopic('GENERAL');
      await fetchDiscussions();
      onSelectDiscussion(created.id);
    } catch (err: unknown) {
      setComposerError(err instanceof Error ? err.message : 'Failed to record dialogue.');
    } finally {
      setComposerSubmitting(false);
    }
  };

  const getTopicLabel = (topic: TopicType) => {
    const found = TOPIC_CATEGORIES.find((c) => c.id === topic);
    return found ? found.label : 'General Dialogue';
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.pageContainer}>
      {/* ── Editorial Header & Invitation ── */}
      <section className={styles.heroSection}>
        <span className={styles.categoryTag}>
          <Sparkles size={13} aria-hidden="true" />
          Akashic Community • Dialogues & Literary Inquiry
        </span>
        <h1 className={styles.pageTitle}>The Agora of Contemplation: Community Dialogues</h1>
        <p className={styles.pageSubtitle}>
          A serene clearing for literary discourse, philosophical inquiries, and shared
          contemplations across the custodial catalogue. Engage with fellow patrons on textual
          riddles, translation subtleties, and interpretive horizons.
        </p>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => setIsComposerOpen(true)}
            aria-label="Begin a new dialogue"
          >
            <Feather size={16} aria-hidden="true" />
            <span>Begin a Dialogue</span>
          </button>

          {isAuthenticated && user && (
            <span className={styles.patronBadge}>
              <ShieldCheck size={15} style={{ color: 'var(--color-action-primary)' }} aria-hidden="true" />
              <span>Inscribing as <strong>{user.display_name || user.username}</strong></span>
            </span>
          )}
        </div>
      </section>

      {/* ── Category Filters & In-Page Search Bar ── */}
      <nav className={styles.filterBar} aria-label="Community discussion filters">
        <div className={styles.categoryPills} role="tablist">
          {TOPIC_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                className={`${styles.categoryPill} ${isSelected ? styles.categoryPillActive : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className={styles.filterControls}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              role="searchbox"
              placeholder="Filter dialogues by topic, thesis, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter community dialogues by keyword"
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.clearSearchBtn}
                aria-label="Clear filter query"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Two-Column Main Content Grid ── */}
      <div className={styles.contentGrid}>
        {/* Left: Feed of Discussions */}
        <main className={styles.feedSection} aria-label="Community dialogues feed">
          {loading ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading contemplative dialogues...
            </div>
          ) : error ? (
            <div className={styles.emptyStateContainer}>
              <h3 className={styles.emptyStateTitle}>Unable to Reach the Agora</h3>
              <p className={styles.emptyStateText}>{error}</p>
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={fetchDiscussions}
              >
                Re-open Dialogue Ledger
              </button>
            </div>
          ) : discussions.length === 0 ? (
            <div className={styles.emptyStateContainer} data-testid="empty-community-state">
              <div className={styles.emptyStateIcon}>
                <MessageSquare size={28} aria-hidden="true" />
              </div>
              {searchQuery ? (
                <>
                  <h3 className={styles.emptyStateTitle}>No Dialogues Matched Your Query</h3>
                  <p className={styles.emptyStateText}>
                    No community discussions matched &ldquo;{searchQuery}&rdquo;. Try adjusting your search
                    terms or selecting another category realm.
                  </p>
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search Filter
                  </button>
                </>
              ) : selectedCategory !== 'ALL' ? (
                <>
                  <h3 className={styles.emptyStateTitle}>No Inscriptions in this Realm</h3>
                  <p className={styles.emptyStateText}>
                    There are currently no dialogues recorded under {getTopicLabel(selectedCategory)}.
                    Be the first patron to anchor a reflection in this category.
                  </p>
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    onClick={() => setIsComposerOpen(true)}
                  >
                    Begin the First Dialogue
                  </button>
                </>
              ) : (
                <>
                  <h3 className={styles.emptyStateTitle}>The Chamber of Discourse Awaits</h3>
                  <p className={styles.emptyStateText}>
                    The Agora is pristine. No community dialogues have been inscribed yet. Anchor a
                    contemplation, pose a textual query, or open a thesis for fellow patrons.
                  </p>
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    onClick={() => setIsComposerOpen(true)}
                  >
                    Begin the First Dialogue
                  </button>
                </>
              )}
            </div>
          ) : (
            discussions.map((d) => {
              const authorName = d.author?.display_name || d.author?.username || 'Akashic Reader';
              const initials = authorName.slice(0, 2).toUpperCase() || 'AR';

              return (
                <article key={d.id} className={styles.discussionCard} data-testid={`discussion-card-${d.id}`}>
                  <div className={styles.cardTopMeta}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={styles.cardTopicBadge}>{getTopicLabel(d.topic_type)}</span>
                      {d.book_id && d.book && (
                        <button
                          type="button"
                          className={styles.bookAnchorBadge}
                          onClick={() => onNavigateBook(d.book_id!)}
                          aria-label={`Open Book Details for ${d.book.title}`}
                        >
                          <BookOpen size={12} aria-hidden="true" />
                          <span>Anchored to: {d.book.title}</span>
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.cardDate}>Inscribed {formatDate(d.created_at)}</span>
                      <ReportContentButton
                        targetType="DISCUSSION"
                        targetId={d.id}
                        targetTitle={d.title}
                        authorId={d.author?.id}
                        authorName={authorName}
                        onSignInRequest={onSignInRequest}
                      />
                    </div>
                  </div>

                  <h2
                    className={styles.cardTitle}
                    onClick={() => onSelectDiscussion(d.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectDiscussion(d.id);
                    }}
                  >
                    {d.title}
                  </h2>

                  <p className={styles.cardExcerpt}>{d.body}</p>

                  <div className={styles.cardFooter}>
                    <div className={styles.authorChip}>
                      <div className={styles.avatarInitials} aria-hidden="true">
                        {initials}
                      </div>
                      <span className={styles.authorName}>{authorName}</span>
                    </div>

                    <div className={styles.cardActionGroup}>
                      <span className={styles.responseCount}>
                        <MessageSquare size={14} aria-hidden="true" />
                        <span>{d.reply_count || 0} Contemplative Responses</span>
                      </span>

                      <button
                        type="button"
                        className={styles.enterDialogueBtn}
                        onClick={() => onSelectDiscussion(d.id)}
                        aria-label={`Enter dialogue: ${d.title}`}
                      >
                        <span>Enter Dialogue</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </main>

        {/* Right: Architectural Sidebar */}
        <aside className={styles.sidebar} aria-label="Community guidelines and folio anchors">
          {/* Archival Ethos */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <ShieldCheck size={18} aria-hidden="true" />
              <h3 className={styles.sidebarTitle}>The Archival Ethos</h3>
            </div>
            <p className={styles.sidebarText}>
              The Agora is a sanctuary of deliberate thought. Dialogues should embody reflective inquiry,
              textual precision, and intellectual generosity. Inscriptions become enduring records of
              literary contemplation.
            </p>
          </div>

          {/* Active Anchor Folios */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <BookOpen size={18} aria-hidden="true" />
              <h3 className={styles.sidebarTitle}>Active Anchor Folios</h3>
            </div>
            <p className={styles.sidebarText}>
              Catalogue records currently anchoring active community discussions.
            </p>

            {activeAnchorFolios.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                No book anchors currently linked.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {activeAnchorFolios.slice(0, 5).map((folio) => (
                  <div key={folio.id} className={styles.anchorBookItem}>
                    <button
                      type="button"
                      className={styles.anchorBookTitle}
                      onClick={() => onNavigateBook(folio.id)}
                    >
                      {folio.title}
                    </button>
                    <span className={styles.anchorBookAuthors}>{folio.authors.join(', ')}</span>
                    <div className={styles.anchorBookActions}>
                      <button
                        type="button"
                        className={styles.anchorSubLink}
                        onClick={() => onNavigateBook(folio.id)}
                      >
                        Book Details
                      </button>
                      <button
                        type="button"
                        className={styles.anchorSubLink}
                        onClick={() => onNavigateReviews(folio.id)}
                      >
                        Reviews
                      </button>
                      <button
                        type="button"
                        className={styles.anchorSubLink}
                        onClick={() => onNavigateReadingRoom(folio.id)}
                      >
                        Reading Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* The Reading Rooms Callout */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <Feather size={18} aria-hidden="true" />
              <h3 className={styles.sidebarTitle}>The Reading Rooms</h3>
            </div>
            <p className={styles.sidebarText}>
              For in-passage reflections and personal pencil marginalia tied to specific pages, explore
              each volume&apos;s dedicated Reading Room from its Book Details record.
            </p>
          </div>
        </aside>
      </div>

      {/* ── Begin a Dialogue Composer Modal / Panel ── */}
      {isComposerOpen && (
        <div
          className={styles.composerOverlay}
          onClick={() => setIsComposerOpen(false)}
          data-testid="composer-overlay"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-heading"
            className={styles.composerModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.composerHeader}>
              <h2 id="composer-heading" className={styles.composerTitle}>
                {isAuthenticated ? 'Begin an Archival Dialogue' : 'Please Present Your Akashic Seal'}
              </h2>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className={styles.clearSearchBtn}
                aria-label="Close composer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {!isAuthenticated ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(24, 92, 88, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-action-primary)' }}>
                  <Lock size={22} aria-hidden="true" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-family-heading)', margin: 0, color: 'var(--color-text-primary)' }}>
                  Authentication Required
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', maxWidth: '420px', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
                  Only registered patrons may inscribe dialogues in the Agora. Please sign in to present
                  your questions, theses, and literary inquiries.
                </p>
                <button
                  type="button"
                  className={styles.primaryActionBtn}
                  onClick={() => {
                    setIsComposerOpen(false);
                    onSignInRequest();
                  }}
                >
                  Sign In to Inscribe
                </button>
              </div>
            ) : (
              <form onSubmit={handleComposerSubmit} className={styles.composerForm}>
                {composerError && (
                  <div className={styles.errorBanner} role="alert">
                    {composerError}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="composer-title" className={styles.formLabel}>
                    Dialogue Title *
                  </label>
                  <input
                    id="composer-title"
                    type="text"
                    required
                    maxLength={255}
                    value={composerTitle}
                    onChange={(e) => setComposerTitle(e.target.value)}
                    placeholder="e.g. Does the labyrinth in Borges represent spatial geometry or temporal branching?"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="composer-topic" className={styles.formLabel}>
                    Discourse Realm / Category
                  </label>
                  <select
                    id="composer-topic"
                    value={composerTopic}
                    onChange={(e) => setComposerTopic(e.target.value as TopicType)}
                    className={styles.formSelect}
                  >
                    {TOPIC_CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                    <option value="GENERAL">General Dialogue</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="composer-book-id" className={styles.formLabel}>
                    Optional Anchored Book ID (Catalogue ObjectId)
                  </label>
                  <input
                    id="composer-book-id"
                    type="text"
                    value={composerBookId}
                    onChange={(e) => setComposerBookId(e.target.value)}
                    placeholder="e.g. 6af72791ebebc613760355ec"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="composer-body" className={styles.formLabel}>
                    Contemplation / Thesis Body *
                  </label>
                  <textarea
                    id="composer-body"
                    required
                    maxLength={10000}
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    placeholder="Inscribe your reflection, textual question, or interpretive inquiry here..."
                    className={styles.formTextarea}
                  />
                  <span className={styles.charCount}>
                    {composerBody.length} / 10,000 characters
                  </span>
                </div>

                <div className={styles.composerFooter}>
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className={styles.cancelBtn}
                    disabled={composerSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={composerSubmitting || !composerTitle.trim() || !composerBody.trim()}
                  >
                    {composerSubmitting ? 'Inscribing...' : 'Inscribe Dialogue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
