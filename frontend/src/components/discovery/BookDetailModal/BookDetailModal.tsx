import React, { useEffect, useRef, useState } from 'react';
import { X, Star, BookOpen } from 'lucide-react';
import { IconButton } from '../../ui';
import { fetchBookById } from '../../../services/discoveryService';
import type { BookListItem, BookDetail } from '../../../types/discovery';
import styles from './BookDetailModal.module.css';

export interface BookDetailModalProps {
  book: BookListItem | null;
  onClose: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ book, onClose }) => {
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!book) return;

    let isMounted = true;
    setLoading(true);

    fetchBookById(book.id).then((res) => {
      if (isMounted) {
        setDetail(res);
        setLoading(false);
      }
    });

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setTimeout(() => closeBtnRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [book, onClose]);

  if (!book) return null;

  const authorsDisplay = book.authors?.join(', ') || 'Unknown Author';

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      data-testid="book-detail-backdrop"
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Folio detail: ${book.title}`}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <span className={styles.modalTitle}>Archival Folio Record</span>
          <IconButton
            ref={closeBtnRef}
            variant="ghost"
            size="md"
            icon={<X size={20} />}
            aria-label="Close folio detail modal"
            onClick={onClose}
          />
        </div>

        <div className={styles.body}>
          {/* Cover & Rating */}
          <div className={styles.coverSide}>
            <div className={styles.coverWrapper}>
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={`Cover for ${book.title}`}
                  className={styles.coverImg}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px', textAlign: 'center' }}>
                  <BookOpen size={24} style={{ color: 'var(--color-action-primary)' }} />
                  <p style={{ marginTop: '8px', fontSize: '12px' }}>{book.title}</p>
                </div>
              )}
            </div>

            {typeof book.rating === 'number' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', color: 'var(--color-action-highlight)' }}>
                <Star size={16} fill="currentColor" />
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{book.rating.toFixed(1)}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  ({book.review_count} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className={styles.infoSide}>
            <h2 className={styles.bookTitle}>{book.title}</h2>
            <p className={styles.authors}>{authorsDisplay}</p>

            {loading ? (
              <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                Retrieving archival records...
              </p>
            ) : (
              <p className={styles.description}>
                {detail?.description ||
                  `A recognized work preserved within the Akashic Library catalog. Explores philosophical and narrative frontiers with contemplative depth.`}
              </p>
            )}

            {detail?.subjects && detail.subjects.length > 0 && (
              <div className={styles.subjectsRow}>
                {detail.subjects.slice(0, 6).map((s) => (
                  <span key={s} className={styles.subjectTag}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Published</span>
                <span className={styles.metaVal}>{book.published_date || 'Unknown'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Language</span>
                <span className={styles.metaVal}>{(book.language || 'en').toUpperCase()}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Archival ID</span>
                <span className={styles.metaVal}>{book.id}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Store Available</span>
                <span className={styles.metaVal}>{book.in_store ? 'Yes (In Stacks)' : 'Archive Only'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

