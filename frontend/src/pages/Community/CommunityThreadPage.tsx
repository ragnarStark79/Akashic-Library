import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Reply as ReplyIcon,
  Edit2,
  Trash2,
  Quote,
  ShieldCheck,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getDiscussion,
  listReplies,
  createReply,
  updateReply,
  deleteReply,
} from '@/services/communityService';
import type { Discussion, DiscussionReply } from '@/types/community';
import { TOPIC_CATEGORIES } from '@/types/community';
import { ReportContentButton } from '@/components/community/ReportContentButton/ReportContentButton';
import styles from './CommunityThreadPage.module.css';

export interface CommunityThreadPageProps {
  discussionId: string;
  onNavigateCommunity: () => void;
  onNavigateBook: (bookId: string) => void;
  onNavigateReviews: (bookId: string) => void;
  onNavigateReadingRoom: (bookId: string) => void;
  onSignInRequest?: () => void;
}

export function CommunityThreadPage({
  discussionId,
  onNavigateCommunity,
  onNavigateBook,
  onNavigateReviews,
  onNavigateReadingRoom,
  onSignInRequest,
}: CommunityThreadPageProps) {
  const { user, isAuthenticated } = useAuth();

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [replyBody, setReplyBody] = useState<string>('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);

  // Citation fields
  const [showCitations, setShowCitations] = useState<boolean>(false);
  const [citationPage, setCitationPage] = useState<string>('');
  const [citationChapter, setCitationChapter] = useState<string>('');
  const [citationExcerpt, setCitationExcerpt] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Deletion modal
  const [deletingReply, setDeletingReply] = useState<DiscussionReply | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const composerAnchorRef = useRef<HTMLElement>(null);

  // Data fetching
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [discData, replyData] = await Promise.all([
        getDiscussion(discussionId),
        listReplies(discussionId),
      ]);
      setDiscussion(discData);
      setReplies(replyData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dialogue thread.');
    } finally {
      setLoading(false);
    }
  }, [discussionId]);

  useEffect(() => {
    if (!discussionId) {
      setLoading(false);
      setError('No discussion identifier specified.');
      return;
    }
    loadData();
  }, [discussionId, loadData]);

  // Compute 2-level conversation hierarchy (Level 1: Direct replies, Level 2: Nested under direct replies)
  const { directReplies, childRepliesByParent } = useMemo(() => {
    // Sort oldest first for stable chronological discussion flow
    const sorted = [...replies].sort((a, b) => a.created_at - b.created_at);
    const directs: DiscussionReply[] = [];
    const childrenMap = new Map<string, DiscussionReply[]>();

    for (const reply of sorted) {
      if (!reply.parent_id) {
        directs.push(reply);
      } else {
        const list = childrenMap.get(reply.parent_id) || [];
        list.push(reply);
        childrenMap.set(reply.parent_id, list);
      }
    }

    return { directReplies: directs, childRepliesByParent: childrenMap };
  }, [replies]);

  // Handle focus composer
  const scrollToComposer = () => {
    if (composerAnchorRef.current && typeof composerAnchorRef.current.scrollIntoView === 'function') {
      composerAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      composerTextareaRef.current?.focus();
    }, 200);
  };

  // Start replying to an individual direct reply
  const handleStartReplyingTo = (parentReply: DiscussionReply) => {
    const parentAuthorName =
      parentReply.author?.display_name || parentReply.author?.username || 'Akashic Reader';
    setReplyParentId(parentReply.id);
    setReplyingToAuthor(parentAuthorName);
    setEditingReplyId(null);
    scrollToComposer();
  };

  // Cancel replying to specific reader
  const handleCancelReplying = () => {
    setReplyParentId(null);
    setReplyingToAuthor(null);
  };

  // Start editing a reply
  const handleStartEditing = (reply: DiscussionReply) => {
    setEditingReplyId(reply.id);
    setReplyBody(reply.body);
    setCitationPage(reply.page_reference || '');
    setCitationChapter(reply.chapter_reference || '');
    setCitationExcerpt(reply.passage_excerpt || '');
    if (reply.page_reference || reply.chapter_reference || reply.passage_excerpt) {
      setShowCitations(true);
    }
    scrollToComposer();
  };

  // Cancel edit mode
  const handleCancelEditing = () => {
    setEditingReplyId(null);
    setReplyBody('');
    setCitationPage('');
    setCitationChapter('');
    setCitationExcerpt('');
    setShowCitations(false);
    setSubmitError(null);
  };

  // Submit composer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) {
      setSubmitError('Reflection body cannot be empty.');
      return;
    }

    if (!isAuthenticated) {
      if (onSignInRequest) {
        onSignInRequest();
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (editingReplyId) {
        // Edit own reply
        await updateReply(discussionId, editingReplyId, {
          body: replyBody.trim(),
          page_reference: citationPage.trim() || null,
          chapter_reference: citationChapter.trim() || null,
          passage_excerpt: citationExcerpt.trim() || null,
        });
        handleCancelEditing();
      } else {
        // Inscribe new reply (direct or nested)
        await createReply(discussionId, {
          body: replyBody.trim(),
          parent_id: replyParentId,
          book_id: discussion?.book_id || null,
          page_reference: citationPage.trim() || null,
          chapter_reference: citationChapter.trim() || null,
          passage_excerpt: citationExcerpt.trim() || null,
        });
        setReplyBody('');
        setCitationPage('');
        setCitationChapter('');
        setCitationExcerpt('');
        setShowCitations(false);
        setReplyParentId(null);
        setReplyingToAuthor(null);
      }

      // Re-fetch replies & discussion to update counters
      const [updatedDisc, updatedReplies] = await Promise.all([
        getDiscussion(discussionId),
        listReplies(discussionId),
      ]);
      setDiscussion(updatedDisc);
      setReplies(updatedReplies);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to record reflection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete reply execution
  const handleConfirmDelete = async () => {
    if (!deletingReply) return;

    setIsDeleting(true);
    try {
      await deleteReply(discussionId, deletingReply.id);
      setDeletingReply(null);
      // Re-fetch replies & discussion
      const [updatedDisc, updatedReplies] = await Promise.all([
        getDiscussion(discussionId),
        listReplies(discussionId),
      ]);
      setDiscussion(updatedDisc);
      setReplies(updatedReplies);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to remove reflection.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper date formatting
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper topic label
  const getTopicLabel = (topicId?: string) => {
    const found = TOPIC_CATEGORIES.find((c) => c.id === topicId);
    return found ? found.label : 'General Dialogue';
  };

  const formatAuthors = (authors: unknown): string => {
    if (!authors) return '';
    if (Array.isArray(authors)) {
      return authors
        .map((a) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object' && 'name' in a) return String((a as { name: unknown }).name);
          return String(a);
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof authors === 'string') return authors;
    return '';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Retrieving dialogue inscription from the Agora...
        </div>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className={styles.container}>
        <button type="button" onClick={onNavigateCommunity} className={styles.backBtn} aria-label="Return to Community Hub">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Return to Community Agora</span>
        </button>
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', backgroundColor: '#FCFAF5', borderRadius: '20px', marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--color-text-primary)' }}>
            Dialogue Inscription Unavailable
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>{error || 'Dialogue not found.'}</p>
        </div>
      </div>
    );
  }

  const masterAuthorName = discussion.author?.display_name || discussion.author?.username || 'Akashic Reader';
  const masterInitials = masterAuthorName.slice(0, 2).toUpperCase() || 'AR';
  const topicLabel = getTopicLabel(discussion.topic_type);
  const anchoredBook = discussion.book;

  return (
    <div className={styles.container}>
      {/* ── Top Bar: Breadcrumb & Anchored Folio Capsule ── */}
      <div className={styles.topNavRow}>
        <div className={styles.breadcrumbGroup}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb navigation">
            <button type="button" onClick={onNavigateCommunity} className={styles.breadcrumbLink}>
              Akashic Agora
            </button>
            <span>/</span>
            <button type="button" onClick={onNavigateCommunity} className={styles.breadcrumbLink}>
              {topicLabel}
            </button>
            <span>/</span>
            <span className={styles.breadcrumbCurrent}>Folio Dialogue #{discussion.id ? discussion.id.slice(0, 6) : ''}</span>
          </nav>

          <button
            type="button"
            onClick={onNavigateCommunity}
            className={styles.backBtn}
            aria-label="Return to Community Hub"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Return to Community Agora</span>
          </button>
        </div>

        {discussion.book_id && anchoredBook && (
          <button
            type="button"
            className={styles.folioCapsule}
            onClick={() => onNavigateBook(discussion.book_id!)}
            aria-label={`Open Book Details for ${anchoredBook.title}`}
          >
            <div
              className={styles.folioCapsuleThumb}
              style={{
                backgroundImage: anchoredBook.cover_url ? `url(${anchoredBook.cover_url})` : undefined,
              }}
              aria-hidden="true"
            />
            <div className={styles.folioCapsuleText}>
              <span className={styles.folioCapsuleBadge}>Anchored Folio</span>
              <span className={styles.folioCapsuleTitle}>{anchoredBook.title}</span>
            </div>
            <ExternalLink size={14} style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Two-Column Main Content Grid ── */}
      <div className={styles.contentGrid}>
        {/* Left Column: Master Thesis, Replies, Composer */}
        <div className={styles.mainColumn}>
          {/* Master Thesis Card */}
          <article className={styles.masterCard} data-testid="master-discussion-card">
            <div className={styles.ribbonIndicator} aria-hidden="true" />

            <div className={styles.masterMetaHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={styles.topicBadge}>{topicLabel}</span>
                {anchoredBook && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'var(--color-surface-inset)',
                    }}
                  >
                    Anchored to {anchoredBook.title}
                  </span>
                )}
              </div>
              <div className={styles.metaInfoGroup}>
                <span>Inscribed {formatDate(discussion.created_at)}</span>
                <ReportContentButton
                  targetType="DISCUSSION"
                  targetId={discussion.id}
                  targetTitle={discussion.title}
                  authorId={discussion.author?.id}
                  authorName={masterAuthorName}
                  onSignInRequest={onSignInRequest}
                />
              </div>
            </div>

            <h1 className={styles.masterTitle}>{discussion.title}</h1>

            {/* Author Dossier */}
            <div className={styles.authorDossier}>
              <div className={styles.authorLeft}>
                <div className={styles.avatarInitials} aria-hidden="true">
                  {masterInitials}
                </div>
                <div className={styles.authorDetails}>
                  <span className={styles.authorName}>{masterAuthorName}</span>
                  <span className={styles.authorRole}>Akashic Patron • Inscription Lead</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                <ShieldCheck size={14} style={{ color: 'var(--color-action-primary)' }} aria-hidden="true" />
                <span>Agora Inscription #{discussion.id ? discussion.id.slice(0, 8) : ''}</span>
              </div>
            </div>

            {/* Optional Book Passage Citation Well */}
            {anchoredBook && (
              <div className={styles.citationWell} data-testid="master-book-citation">
                <div className={styles.citationContent}>
                  <Quote size={20} className={styles.citationIcon} aria-hidden="true" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <p className={styles.citationQuote}>
                      Dialogue anchored to archival catalogue record for &ldquo;{anchoredBook.title}&rdquo;
                      {formatAuthors(anchoredBook.authors) ? ` by ${formatAuthors(anchoredBook.authors)}` : ''}.
                    </p>
                    <div className={styles.citationRefRow}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Archival Folio Record
                      </span>
                      <button
                        type="button"
                        className={styles.citationMarginaliaLink}
                        onClick={() => onNavigateReadingRoom(discussion.book_id!)}
                      >
                        Examine Folio Marginalia →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thesis Body */}
            <div className={styles.masterBody}>{discussion.body}</div>

            {/* Footer with actions */}
            <footer className={styles.masterFooter}>
              <div className={styles.replyCountMeta}>
                <MessageSquare size={16} style={{ color: 'var(--color-action-primary)' }} aria-hidden="true" />
                <span>
                  <strong>{replies.length}</strong> Contemplative {replies.length === 1 ? 'Response' : 'Responses'}
                </span>
              </div>

              <button
                type="button"
                className={styles.jumpComposerBtn}
                onClick={scrollToComposer}
                aria-label="Jump to reply composer"
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>Contemplate &amp; Inscribe</span>
              </button>
            </footer>
          </article>

          {/* ── Conversation Stream: Replies & Resonances ── */}
          <section className={styles.repliesSection} aria-label="Contemplations and responses">
            <div className={styles.repliesHeaderBar}>
              <div className={styles.repliesTitleGroup}>
                <h2 className={styles.repliesHeading}>Contemplations &amp; Resonances</h2>
                <span className={styles.repliesCountBadge} data-testid="replies-count-badge">
                  {replies.length} Inscribed {replies.length === 1 ? 'Response' : 'Responses'}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                Chronological Folio Order
              </span>
            </div>

            {replies.length === 0 ? (
              /* Empty Conversation State */
              <div className={styles.emptyStateWell} data-testid="empty-conversation-state">
                <div className={styles.emptyStateIcon}>
                  <MessageSquare size={28} aria-hidden="true" />
                </div>
                <h3 className={styles.emptyStateTitle}>A Pristine Literary Inscription</h3>
                <p className={styles.emptyStateText}>
                  No patron has yet inscribed a counter-thesis or resonance to this inquiry. The archival
                  parchment awaits your contemplation.
                </p>
                <button
                  type="button"
                  className={styles.jumpComposerBtn}
                  onClick={scrollToComposer}
                >
                  Inscribe the First Contemplation →
                </button>
              </div>
            ) : (
              /* Populated Stream with 2-Level Nested Hierarchy */
              <div className={styles.repliesStream} data-testid="replies-stream">
                {directReplies.map((directReply) => {
                  const directAuthorName =
                    directReply.author?.display_name || directReply.author?.username || 'Akashic Reader';
                  const directInitials = directAuthorName.slice(0, 2).toUpperCase() || 'AR';
                  const isOwner = Boolean(user && String(user.id) === String(directReply.author_user_id));
                  const childResponses = childRepliesByParent.get(directReply.id) || [];

                  return (
                    <div key={directReply.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Level 1 Direct Reply Card */}
                      <article className={styles.replyCard} data-testid={`reply-card-${directReply.id}`}>
                        <header className={styles.replyHeader}>
                          <div className={styles.replyAuthorRow}>
                            <div className={styles.replyAvatar} aria-hidden="true">
                              {directInitials}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className={styles.replyAuthorName}>{directAuthorName}</span>
                              <span className={styles.replyTimestamp}>
                                Inscribed {formatDate(directReply.created_at)}
                                {directReply.updated_at && directReply.updated_at > directReply.created_at && (
                                  <span> • Edited</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {directReply.page_reference && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                              Ref: {directReply.page_reference}
                            </span>
                          )}
                        </header>

                        {/* Optional Citation Callout */}
                        {(directReply.page_reference || directReply.chapter_reference || directReply.passage_excerpt) && (
                          <div className={styles.replyCitationCallout}>
                            <div className={styles.replyCitationHeader}>
                              {directReply.chapter_reference ? `${directReply.chapter_reference}` : 'Passage Citation'}
                              {directReply.page_reference ? ` • ${directReply.page_reference}` : ''}
                            </div>
                            {directReply.passage_excerpt && (
                              <p className={styles.replyCitationText}>
                                &ldquo;{directReply.passage_excerpt}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        <div className={styles.replyBody}>{directReply.body}</div>

                        <footer className={styles.replyFooter}>
                          <div className={styles.replyActionsLeft}>
                            <button
                              type="button"
                              className={styles.replyActionBtn}
                              onClick={() => handleStartReplyingTo(directReply)}
                              aria-label={`Respond to ${directAuthorName}`}
                            >
                              <ReplyIcon size={14} aria-hidden="true" />
                              <span>Respond to {directAuthorName}</span>
                            </button>

                            {!isOwner && (
                              <ReportContentButton
                                targetType="REPLY"
                                targetId={directReply.id}
                                authorId={directReply.author_user_id}
                                authorName={directAuthorName}
                                onSignInRequest={onSignInRequest}
                              />
                            )}
                          </div>

                          {isOwner && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                className={styles.ownerActionBtn}
                                onClick={() => handleStartEditing(directReply)}
                                aria-label="Edit your reflection"
                              >
                                <Edit2 size={13} aria-hidden="true" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className={`${styles.ownerActionBtn} ${styles.ownerDeleteBtn}`}
                                onClick={() => setDeletingReply(directReply)}
                                aria-label="Delete your reflection"
                              >
                                <Trash2 size={13} aria-hidden="true" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </footer>
                      </article>

                      {/* Level 2 Nested Responses under this Direct Reply */}
                      {childResponses.length > 0 && (
                        <div className={styles.nestedContainer} data-testid={`nested-container-${directReply.id}`}>
                          {childResponses.map((childReply) => {
                            const childAuthorName =
                              childReply.author?.display_name || childReply.author?.username || 'Akashic Reader';
                            const childInitials = childAuthorName.slice(0, 2).toUpperCase() || 'AR';
                            const isChildOwner = Boolean(user && String(user.id) === String(childReply.author_user_id));

                            return (
                              <article key={childReply.id} className={styles.nestedCard} data-testid={`nested-reply-${childReply.id}`}>
                                <header className={styles.replyHeader}>
                                  <div className={styles.replyAuthorRow}>
                                    <div
                                      className={styles.replyAvatar}
                                      style={{ width: '32px', height: '32px', fontSize: '12px' }}
                                      aria-hidden="true"
                                    >
                                      {childInitials}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className={styles.replyAuthorName}>{childAuthorName}</span>
                                        <span className={styles.nestedTag}>
                                          ↳ In response to {directAuthorName}
                                        </span>
                                      </div>
                                      <span className={styles.replyTimestamp}>
                                        Inscribed {formatDate(childReply.created_at)}
                                        {childReply.updated_at && childReply.updated_at > childReply.created_at && (
                                          <span> • Edited</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </header>

                                {/* Optional Citation Callout */}
                                {(childReply.page_reference || childReply.chapter_reference || childReply.passage_excerpt) && (
                                  <div className={styles.replyCitationCallout}>
                                    <div className={styles.replyCitationHeader}>
                                      {childReply.chapter_reference ? `${childReply.chapter_reference}` : 'Passage Citation'}
                                      {childReply.page_reference ? ` • ${childReply.page_reference}` : ''}
                                    </div>
                                    {childReply.passage_excerpt && (
                                      <p className={styles.replyCitationText}>
                                        &ldquo;{childReply.passage_excerpt}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className={styles.replyBody}>{childReply.body}</div>

                                <footer className={styles.replyFooter} style={{ justifyContent: 'flex-end' }}>
                                  {isChildOwner ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button
                                        type="button"
                                        className={styles.ownerActionBtn}
                                        onClick={() => handleStartEditing(childReply)}
                                        aria-label="Edit your nested response"
                                      >
                                        <Edit2 size={13} aria-hidden="true" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        className={`${styles.ownerActionBtn} ${styles.ownerDeleteBtn}`}
                                        onClick={() => setDeletingReply(childReply)}
                                        aria-label="Delete your nested response"
                                      >
                                        <Trash2 size={13} aria-hidden="true" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <ReportContentButton
                                      targetType="REPLY"
                                      targetId={childReply.id}
                                      authorId={childReply.author_user_id}
                                      authorName={childAuthorName}
                                      onSignInRequest={onSignInRequest}
                                    />
                                  )}
                                </footer>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Contemplation Composer Section ── */}
          <section
            ref={composerAnchorRef}
            className={styles.composerCard}
            aria-label="Inscribe contemplation composer"
            data-testid="discussion-reply-composer"
          >
            {/* Header */}
            <div className={styles.composerHeader}>
              <div className={styles.composerAuthorMeta}>
                <div className={styles.avatarInitials} style={{ width: '38px', height: '38px', fontSize: '14px' }} aria-hidden="true">
                  {user ? (user.display_name || user.username || 'P').slice(0, 2).toUpperCase() : 'G'}
                </div>
                <div>
                  <h3 className={styles.composerTitle}>
                    {editingReplyId
                      ? 'Edit Your Inscription'
                      : replyingToAuthor
                      ? `Inscribing in Response to ${replyingToAuthor}`
                      : 'Inscribe a Contemplation to this Dialogue'}
                  </h3>
                  <span className={styles.composerSubtitle}>
                    {user ? `Inscribing as ${user.display_name || user.username}` : 'Guest Reader'}
                  </span>
                </div>
              </div>

              {replyingToAuthor && !editingReplyId && (
                <button
                  type="button"
                  className={styles.cancelComposerBtn}
                  onClick={handleCancelReplying}
                  aria-label="Cancel responding to reader"
                >
                  Cancel Replying to {replyingToAuthor}
                </button>
              )}
            </div>

            {/* Covenant Callout */}
            <div className={styles.covenantCallout}>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                The Agora invites reflective, substantive inquiries. Anchor your thoughts to specific folio
                ideas, historical context, or textual observations.
              </span>
            </div>

            {submitError && (
              <div className={styles.errorBanner} role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <textarea
                ref={composerTextareaRef}
                className={styles.replyTextarea}
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={
                  replyingToAuthor
                    ? `Inscribe your response to ${replyingToAuthor}...`
                    : 'Inscribe your contemplation, counter-thesis, or resonance for fellow patrons...'
                }
                aria-label="Contemplation body"
                required
              />

              {/* Optional Citation Toggle & Fields */}
              <div className={styles.citationToggleRow}>
                <button
                  type="button"
                  className={styles.citationToggleBtn}
                  onClick={() => setShowCitations(!showCitations)}
                  aria-expanded={showCitations}
                >
                  <Quote size={13} aria-hidden="true" />
                  <span>{showCitations ? 'Hide Passage Citation' : 'Add Passage Citation (Optional)'}</span>
                  {showCitations ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                </button>

                {showCitations && (
                  <div className={styles.citationFieldsContainer}>
                    <div className={styles.citationInputRow}>
                      <div>
                        <label htmlFor="citation-page" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          Page / Folio Reference
                        </label>
                        <input
                          id="citation-page"
                          type="text"
                          className={styles.citationInput}
                          placeholder="e.g. p. 114 or §IV"
                          value={citationPage}
                          onChange={(e) => setCitationPage(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="citation-chapter" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          Chapter / Section Title
                        </label>
                        <input
                          id="citation-chapter"
                          type="text"
                          className={styles.citationInput}
                          placeholder="e.g. Chapter 4: The Garden"
                          value={citationChapter}
                          onChange={(e) => setCitationChapter(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="citation-excerpt" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        Reader-Supplied Passage Excerpt
                      </label>
                      <textarea
                        id="citation-excerpt"
                        className={styles.citationInput}
                        rows={2}
                        placeholder="Inscribe a short excerpt or textual quotation from the folio..."
                        value={citationExcerpt}
                        onChange={(e) => setCitationExcerpt(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className={styles.composerActionsBar}>
                <span className={styles.charCounter}>
                  {replyBody.length} characters
                </span>

                <div className={styles.composerBtnsGroup}>
                  {editingReplyId && (
                    <button
                      type="button"
                      className={styles.cancelComposerBtn}
                      onClick={handleCancelEditing}
                      disabled={submitting}
                    >
                      Cancel Edit
                    </button>
                  )}

                  <button
                    type="submit"
                    className={styles.submitComposerBtn}
                    disabled={submitting || !replyBody.trim()}
                  >
                    <span>{submitting ? 'Recording Inscription...' : editingReplyId ? 'Save Changes' : 'Inscribe Response'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Unauthenticated Intercept Overlay */}
            {!isAuthenticated && (
              <div className={styles.guestInterceptCard} data-testid="guest-auth-intercept">
                <div className={styles.guestIcon}>
                  <Lock size={24} aria-hidden="true" />
                </div>
                <h4 className={styles.emptyStateTitle}>Authenticated Patron Required</h4>
                <p className={styles.emptyStateText}>
                  The Agora welcomes all readers. However, transcribing reflections into the permanent ledger
                  requires an authenticated patron account.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className={styles.submitComposerBtn}
                    onClick={onSignInRequest}
                  >
                    Sign In to Inscribe
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Sidebar (Book Dossier, Archival Covenant, Parallel Inquiries) */}
        <aside className={styles.sidebar} aria-label="Discussion context and archival covenant">
          {/* 1. Anchored Folio Showcase */}
          {anchoredBook && (
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarHeader}>
                <div className={styles.sidebarHeaderTitle}>
                  <BookOpen size={15} style={{ color: '#C58B70' }} aria-hidden="true" />
                  <span>Anchored Volume</span>
                </div>
              </div>

              <div className={styles.bookShowcaseRow}>
                <div
                  className={styles.bookJacket}
                  style={{
                    backgroundImage: anchoredBook.cover_url ? `url(${anchoredBook.cover_url})` : undefined,
                  }}
                  aria-hidden="true"
                />
                <div className={styles.bookDetailsCol}>
                  <h3 className={styles.bookShowcaseTitle}>{anchoredBook.title}</h3>
                  <span className={styles.bookShowcaseAuthors}>
                    {formatAuthors(anchoredBook.authors)}
                  </span>
                </div>
              </div>

              <div className={styles.sidebarNavGroup}>
                <button
                  type="button"
                  className={styles.sidebarNavLink}
                  onClick={() => onNavigateBook(discussion.book_id!)}
                >
                  <span>View Book Details</span>
                  <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.sidebarNavLink}
                  onClick={() => onNavigateReviews(discussion.book_id!)}
                >
                  <span>Read Public Reviews</span>
                  <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.sidebarNavLink}
                  onClick={() => onNavigateReadingRoom(discussion.book_id!)}
                >
                  <span>Enter Reading Room (Marginalia)</span>
                  <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* 2. Archival Discourse Covenant */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarHeaderTitle}>
                <ShieldCheck size={15} style={{ color: 'var(--color-action-primary)' }} aria-hidden="true" />
                <span>The Archival Discourse Covenant</span>
              </div>
            </div>

            <div className={styles.covenantList}>
              <div className={styles.covenantItem}>
                <div className={styles.covenantNum}>1</div>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Substantive Inquiry:</strong> Contributions
                  should articulate an argument, interpretive thesis, or textual question.
                </div>
              </div>
              <div className={styles.covenantItem}>
                <div className={styles.covenantNum}>2</div>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Folio Anchoring:</strong> Reference
                  specific passages, page numbers, or philosophical themes when applicable.
                </div>
              </div>
              <div className={styles.covenantItem}>
                <div className={styles.covenantNum}>3</div>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Enduring Record:</strong> Inscribed
                  responses become part of the collective reader memory for fellow patrons.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Accessible Soft Deletion Confirmation Dialog ── */}
      {deletingReply && (() => {
        const isNested = Boolean(deletingReply.parent_id);
        const dialogTitle = isNested
          ? 'Retire Response from Conversation?'
          : 'Retire Contemplation from Conversation?';
        const dialogDescription = isNested
          ? 'Are you certain you wish to retire your response? This will remove your response from the visible conversation. The preceding contemplation and original dialogue will remain intact.'
          : 'Are you certain you wish to retire your contemplation? Removing this direct reply will also remove its nested reader responses from the visible conversation. The original dialogue and volume record will remain intact.';
        const cancelLabel = isNested ? 'Keep Response' : 'Keep Contemplation';
        const confirmLabel = isDeleting ? 'Retiring...' : 'Confirm Retirement';

        return (
          <div
            className={styles.modalBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={() => !isDeleting && setDeletingReply(null)}
          >
            <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalIcon} aria-hidden="true">
                <Trash2 size={24} />
              </div>

              <h3 id="delete-dialog-title" className={styles.modalTitle}>
                {dialogTitle}
              </h3>

              <p className={styles.modalText}>
                {dialogDescription}
              </p>

              <div className={styles.modalBtnsRow}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setDeletingReply(null)}
                  disabled={isDeleting}
                >
                  {cancelLabel}
                </button>

                <button
                  type="button"
                  className={styles.modalConfirmBtn}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
