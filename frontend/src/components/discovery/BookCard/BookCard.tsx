import React, { useState } from 'react';
import { Star, ArrowRight, BookOpen, Bookmark } from 'lucide-react';
import type { BookListItem } from '../../../types/discovery';
import styles from './BookCard.module.css';

export interface BookCardProps {
  book: BookListItem;
  layout?: 'grid' | 'horizontal';
  onSelect?: (book: BookListItem) => void;
  className?: string;
  imageFit?: 'cover' | 'contain';
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  layout = 'grid',
  onSelect,
  className = '',
  imageFit = 'contain',
}) => {
  const [imageError, setImageError] = useState(false);

  const authorDisplay = book.authors?.length
    ? book.authors.join(', ')
    : 'Unknown Author';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect?.(book);
  };

  const isHorizontal = layout === 'horizontal';

  return (
    <article
      className={`
        ${styles.card}
        ${isHorizontal ? styles.horizontalCard : ''}
        ${className}
      `.trim()}
      onClick={handleClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(book);
        }
      }}
      aria-label={`${book.title} by ${authorDisplay}`}
    >
      {/* ── Book Cover Container (2:3 aspect ratio) ── */}
      <div
        className={`
          ${styles.coverWrapper}
          ${isHorizontal ? styles.horizontalCover : ''}
        `.trim()}
      >
        {book.cover_url && !imageError ? (
          <>
            <img
              src={book.cover_url}
              alt={`Cover jacket for ${book.title}`}
              className={`${styles.coverImage} ${imageFit === 'contain' ? styles.coverImageContain : ''}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
            <div className={styles.spineShadow} aria-hidden="true" />
          </>
        ) : (
          /* Fallback Cover */
          <div className={styles.fallbackCover}>
            <div className={styles.fallbackHeader}>
              <BookOpen size={16} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Akashic
              </span>
            </div>
            <p className={styles.fallbackTitle}>{book.title}</p>
            <p className={styles.fallbackAuthor}>{authorDisplay}</p>
            <div className={styles.spineShadow} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* ── Metadata & Details ── */}
      <div className={isHorizontal ? styles.horizontalContent : undefined}>
        <div className={styles.metaTop}>
          <span className={styles.subjectBadge}>
            {book.language ? book.language.toUpperCase() : 'FOLIO'}
          </span>
          {typeof book.rating === 'number' && (
            <div className={styles.rating} aria-label={`Rating: ${book.rating} out of 5 stars`}>
              <Star size={14} fill="currentColor" />
              <span>{book.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <h3 className={styles.title} title={book.title}>
          {book.title}
        </h3>

        <p className={styles.author} title={authorDisplay}>
          {authorDisplay}
        </p>

        <div className={styles.footerRow}>
          <span className={styles.yearText}>
            {book.published_date || 'Folio Edition'}
          </span>

          <button
            type="button"
            className={styles.detailsBtn}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(book);
            }}
            aria-label={`View details for ${book.title}`}
          >
            {isHorizontal ? (
              <>
                <Bookmark size={14} />
                <span>Details</span>
              </>
            ) : (
              <>
                <span>Explore</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

