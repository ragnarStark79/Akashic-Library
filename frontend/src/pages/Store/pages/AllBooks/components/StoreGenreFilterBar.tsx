import { useRef, useState, useEffect } from 'react';
import styles from './StoreGenreFilterBar.module.css';

export interface FilterTagItem {
  id: string;
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  genreQuery: string;
}

export const CANONICAL_FILTER_TAGS: FilterTagItem[] = [
  { id: 'all', label: 'All Books', icon: '📚', bgColor: '#111827', textColor: '#ffffff', genreQuery: 'all' },
  { id: 'horror', label: 'Horror', icon: '🔦', bgColor: '#000000', textColor: '#ffffff', genreQuery: 'Horror' },
  { id: 'sci-fi', label: 'Sci-Fi', icon: '🪐', bgColor: '#00e500', textColor: '#000000', genreQuery: 'Science Fiction' },
  { id: 'fantasy', label: 'Fantasy', icon: '🧜', bgColor: '#9e81e4', textColor: '#ffffff', genreQuery: 'Fantasy' },
  { id: 'lgbtqia', label: 'LGBTQIA+', icon: '🌈', bgColor: '#e6ff2b', textColor: '#000000', genreQuery: 'LGBTQIA+' },
  { id: 'historical', label: 'Historical', icon: '🕯', bgColor: '#ff9d00', textColor: '#000000', genreQuery: 'Historical Fiction' },
  { id: 'thriller', label: 'Thriller', icon: '🎢', bgColor: '#3d3195', textColor: '#ffffff', genreQuery: 'Thriller' },
  { id: 'romance', label: 'Romance', icon: '🫀', bgColor: '#ff008f', textColor: '#ffffff', genreQuery: 'Romance' },
  { id: 'literary-fiction', label: 'Literary', icon: '🎭', bgColor: '#71002e', textColor: '#ffffff', genreQuery: 'Literary Fiction' },
  { id: 'contemporary', label: 'Contemporary', icon: '💡', bgColor: '#ffa5e1', textColor: '#000000', genreQuery: 'Contemporary Fiction' },
  { id: 'gothic', label: 'Gothic', icon: '👻', bgColor: '#3b1c54', textColor: '#ffffff', genreQuery: 'Gothic Fiction' },
  { id: 'magical-realism', label: 'Magical Realism', icon: '🪄', bgColor: '#40e0d0', textColor: '#000000', genreQuery: 'Magical Realism' },
  { id: 'mystery', label: 'Mystery', icon: '🧩', bgColor: '#1e3a5f', textColor: '#ffffff', genreQuery: 'Mystery' },
];

export interface StoreGenreFilterBarProps {
  selectedGenre: string;
  onSelectGenre: (genreQuery: string) => void;
  className?: string;
}

export function StoreGenreFilterBar({
  selectedGenre,
  onSelectGenre,
  className = '',
}: StoreGenreFilterBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = 300;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <nav
      className={`${styles.filterSection} ${className}`.trim()}
      aria-label="Genre Filter Navigation"
    >
      <div className={styles.filterOuter}>
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className={`${styles.navArrow} ${styles.navArrowPrev} ${
            !canScrollLeft ? styles.navArrowDisabled : ''
          }`}
          aria-label="Scroll filter tags left"
          disabled={!canScrollLeft}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className={styles.filterInner}
          role="region"
          aria-label="Filter tags list"
        >
          <ul className={styles.filterList} role="menubar">
            {CANONICAL_FILTER_TAGS.map((tag) => {
              const isActive =
                (selectedGenre.toLowerCase() === 'all' && tag.genreQuery === 'all') ||
                selectedGenre.toLowerCase() === tag.genreQuery.toLowerCase() ||
                selectedGenre.toLowerCase() === tag.id.toLowerCase();

              return (
                <li key={tag.id} className={styles.filterItem} role="none">
                  <button
                    type="button"
                    onClick={() => onSelectGenre(tag.genreQuery)}
                    className={`${styles.tagButton} ${isActive ? styles.isActive : ''}`}
                    style={{
                      backgroundColor: tag.bgColor,
                      color: tag.textColor,
                    }}
                    role="menuitem"
                    aria-pressed={isActive}
                    data-testid={`genre-filter-${tag.id}`}
                  >
                    <span className={styles.tagIcon} aria-hidden="true">
                      {tag.icon}
                    </span>
                    <span className={styles.tagText}>{tag.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className={`${styles.navArrow} ${styles.navArrowNext} ${
            !canScrollRight ? styles.navArrowDisabled : ''
          }`}
          aria-label="Scroll filter tags right"
          disabled={!canScrollRight}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
