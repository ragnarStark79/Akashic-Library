import { useState, forwardRef } from 'react';
import type { TopBookItem, TopBookGenre } from '../types';
import type { StoreProductItem, CardCustomization } from '@/pages/Store/types/store';
import { RabbitEars } from './RabbitEars';
import { ReadMoreButton } from './ReadMoreButton';
import styles from './BookCard.module.css';

export const CANONICAL_GENRE_COLORS: Record<string, { bg: string; text: string }> = {
  Horror: { bg: '#000000', text: '#ffffff' },
  'Science Fiction': { bg: '#00e500', text: '#000000' },
  'Sci-Fi': { bg: '#00e500', text: '#000000' },
  Fantasy: { bg: '#9e81e4', text: '#ffffff' },
  'LGBTQIA+': { bg: '#e6ff2b', text: '#000000' },
  Historical: { bg: '#ff9d00', text: '#000000' },
  'Historical Fiction': { bg: '#ff9d00', text: '#000000' },
  Thriller: { bg: '#3d3195', text: '#ffffff' },
  Romance: { bg: '#ff008f', text: '#ffffff' },
  'Literary Fiction': { bg: '#71002e', text: '#ffffff' },
  Literary: { bg: '#71002e', text: '#ffffff' },
  'Contemporary Fiction': { bg: '#ffa5e1', text: '#000000' },
  Contemporary: { bg: '#ffa5e1', text: '#000000' },
  'Debut Novel': { bg: '#00e500', text: '#000000' },
  'Award Worthy': { bg: '#ff008f', text: '#ffffff' },
  Satire: { bg: '#e6ff2b', text: '#000000' },
  Gothic: { bg: '#3b1c54', text: '#ffffff' },
  'Gothic Fiction': { bg: '#3b1c54', text: '#ffffff' },
  Mystery: { bg: '#1e3a5f', text: '#ffffff' },
  'Magical Realism': { bg: '#00e500', text: '#000000' },
  Classics: { bg: '#b45309', text: '#ffffff' },
};

export type UniversalBookItem = TopBookItem | StoreProductItem | Record<string, any>;

export interface BookCardProps {
  item: UniversalBookItem;
  index?: number;
  onSelect?: (item: any) => void;
  style?: React.CSSProperties;
  className?: string;
  customizationOverride?: CardCustomization;
}

export const BookCard = forwardRef<HTMLElement, BookCardProps>(
  function BookCard(
    { item, onSelect, style, className = '', customizationOverride },
    ref
  ) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    // 1. Resolve visual customization
    const rawCustomization: CardCustomization =
      customizationOverride ||
      ('card_customization' in item ? (item.card_customization as CardCustomization) : {}) ||
      {};

    const bgColor =
      rawCustomization.background_color ||
      ('backgroundColor' in item ? item.backgroundColor : '') ||
      '#1c1917';

    const titleColor =
      rawCustomization.title_color ||
      ('textColor' in item ? item.textColor : '') ||
      '#ffffff';

    const descColor =
      rawCustomization.description_color ||
      (titleColor === '#ffffff' ? '#e2e8f0' : '#334155');

    // 2. Resolve bibliographic fields
    const title = item.title || 'Untitled Book';
    const authors =
      'author' in item && typeof item.author === 'string'
        ? item.author
        : 'authors' in item && Array.isArray(item.authors)
        ? item.authors.join(', ')
        : '';

    const coverUrl =
      ('custom_cover_url' in item && item.custom_cover_url) ||
      ('cover_image' in item ? item.cover_image : '') ||
      ('coverImage' in item ? item.coverImage : '') ||
      '';

    const description =
      ('custom_description' in item && item.custom_description) ||
      item.description ||
      '';

    const slug =
      'slug' in item && item.slug
        ? item.slug
        : item.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const rotation =
      'initialRotation' in item && typeof item.initialRotation === 'number'
        ? item.initialRotation
        : 0;

    // 3. Resolve genres
    const rawGenres: (string | TopBookGenre)[] = Array.isArray(item.genres)
      ? item.genres
      : [];

    const normalizedGenres: TopBookGenre[] = rawGenres.map((g) => {
      if (typeof g === 'object' && g !== null && 'name' in g) {
        // If customization overrides badge color for this genre
        const customBadgeBg = rawCustomization.genre_badge_colors?.[g.name];
        return {
          name: g.name,
          backgroundColor: customBadgeBg || g.backgroundColor || '#000000',
          color: customBadgeBg ? '#ffffff' : g.color || '#ffffff',
        };
      }
      const name = String(g);
      const customBadgeBg = rawCustomization.genre_badge_colors?.[name];
      const fallback = CANONICAL_GENRE_COLORS[name] || { bg: '#000000', text: '#ffffff' };
      return {
        name,
        backgroundColor: customBadgeBg || fallback.bg,
        color: customBadgeBg ? '#ffffff' : fallback.text,
      };
    });

    const bookId = item.id || slug;
    const detailHref = `?view=store-book-detail&id=${bookId}`;

    const handleClick = (e: React.MouseEvent) => {
      // Allow native new tab / window (Ctrl/Cmd click, middle click, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      if (onSelect) {
        onSelect(item);
      } else {
        window.history.pushState({}, '', detailHref);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };

    // Strip unsafe HTML but allow basic tags inline
    const hasHtml = /<[a-z][\s\S]*>/i.test(description);

    return (
      <li
        className={`${styles.cardListItem} ${className}`.trim()}
        data-testid={`top-book-card-${slug}`}
      >
        <article
          ref={ref}
          className={`${styles.cardArticle} ${isHovered ? 'isCardHovered' : ''}`}
          style={
            {
              '--book-slider-item-rotate': `${rotation}deg`,
              ...style,
            } as React.CSSProperties
          }
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={styles.cardInner}>
            {/* Card background surface */}
            <div
              className={styles.cardBg}
              style={{ backgroundColor: bgColor }}
            >
              {/* Animated Rabbit Ears emerging from top */}
              <RabbitEars color={bgColor} />

              {/* Bottom extension expanding down on hover */}
              <div
                className={styles.cardBgBottom}
                style={{ backgroundColor: bgColor }}
              />

              {/* Read More dual-capsule CTA */}
              <ReadMoreButton
                href={detailHref}
                onClick={handleClick}
                label="Read more"
              />
            </div>

            {/* Book Card Content */}
            <div
              className={styles.cardContainer}
              style={{ color: titleColor }}
            >
              {/* Cover Artwork */}
              <div className={styles.coverWrap}>
                {coverUrl && !imageError ? (
                  <img
                    src={coverUrl}
                    alt={`${title}${authors ? ` by ${authors}` : ''}`}
                    className={styles.coverImg}
                    loading="lazy"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.3))',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      textAlign: 'center',
                      color: titleColor,
                    }}
                  >
                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</span>
                    <strong style={{ fontSize: '0.9rem', lineHeight: 1.2 }}>{title}</strong>
                    {authors && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                        {authors}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Text & Genre Tags */}
              <div className={styles.cardContent}>
                <div className={styles.cardText}>
                  <h3 className={styles.cardTitle} style={{ color: titleColor }}>
                    {title}
                  </h3>
                  {hasHtml ? (
                    <div
                      className={styles.cardParagraph}
                      style={{ color: descColor }}
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  ) : (
                    <p className={styles.cardParagraph} style={{ color: descColor }}>
                      {description}
                    </p>
                  )}
                </div>

                {/* Genre pills */}
                {normalizedGenres.length > 0 && (
                  <ul className={styles.genreList} aria-label="Book genres">
                    {normalizedGenres.map((genre) => (
                      <li key={genre.name}>
                        <span
                          className={styles.genreTag}
                          style={{
                            backgroundColor: genre.backgroundColor,
                            color: genre.color,
                          }}
                        >
                          {genre.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Accessible clickable overlay */}
            <a
              href={detailHref}
              className={styles.cardLink}
              onClick={handleClick}
              aria-label={`View details for ${title}`}
            />
          </div>
        </article>
      </li>
    );
  }
);
