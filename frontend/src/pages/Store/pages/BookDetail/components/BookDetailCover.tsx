import { useState } from 'react';
import styles from './BookDetailCover.module.css';

export interface BookDetailCoverProps {
  coverUrl: string;
  title: string;
  authors: string[];
}

export function BookDetailCover({ coverUrl, title, authors }: BookDetailCoverProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <section className={styles.detail} aria-label="Book Cover Preview" data-testid="book-detail-cover">
      <div className={styles.detailContainer}>
        <div className={styles.detailInner}>
          <div className={styles.detailHeader}>
            <div className={styles.detailVisual}>
              {coverUrl && !imageError ? (
                <img
                  className={styles.detailVisualImg}
                  src={coverUrl}
                  alt={`Cover artwork of ${title}`}
                  loading="eager"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={styles.fallbackCover}>
                  <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</span>
                  <div className={styles.fallbackTitle}>{title}</div>
                  <div className={styles.fallbackAuthor}>{authors.join(', ')}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
