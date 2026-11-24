import { useState, useRef, useMemo, useCallback } from 'react';
import type { StoreProductItem } from '@/pages/Store/types/store';
import { BookCarousel, type BookCarouselRef } from '@/pages/Store/components/StoreBooksSection/components/BookCarousel';
import { CarouselControls } from '@/pages/Store/components/StoreBooksSection/components/CarouselControls';
import styles from './StoreGenreCarousels.module.css';

export interface StoreGenreCarouselsProps {
  products: StoreProductItem[];
  selectedGenre: string;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onResetFilter: () => void;
  onSelectBook: (book: StoreProductItem) => void;
}

export const CANONICAL_GENRE_SECTIONS = [
  { name: 'Horror', slug: 'horror' },
  { name: 'Science Fiction', slug: 'science-fiction' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Thriller', slug: 'thriller' },
  { name: 'Literary Fiction', slug: 'literary-fiction' },
  { name: 'Gothic Fiction', slug: 'gothic-fiction' },
  { name: 'Historical Fiction', slug: 'historical-fiction' },
  { name: 'LGBTQIA+', slug: 'lgbtqia' },
  { name: 'Contemporary Fiction', slug: 'contemporary-fiction' },
  { name: 'Magical Realism', slug: 'magical-realism' },
];

export function StoreGenreCarousels({
  products,
  selectedGenre,
  searchQuery,
  isLoading,
  error,
  onRetry,
  onResetFilter,
  onSelectBook,
}: StoreGenreCarouselsProps) {
  // Store refs for each genre carousel
  const carouselRefs = useRef<Record<string, BookCarouselRef | null>>({});

  // Store canScroll state for each genre
  const [scrollStates, setScrollStates] = useState<Record<string, { canPrev: boolean; canNext: boolean }>>({});

  const handleScrollStateChange = useCallback((genre: string, canPrev: boolean, canNext: boolean) => {
    setScrollStates((prev) => {
      const current = prev[genre];
      if (current && current.canPrev === canPrev && current.canNext === canNext) {
        return prev;
      }
      return {
        ...prev,
        [genre]: { canPrev, canNext },
      };
    });
  }, []);

  // 1. Filter products by search query first if present
  const searchFilteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthors = p.authors.some((a) => a.toLowerCase().includes(q));
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchGenres = (p.genres || []).some((g) => g.toLowerCase().includes(q));
      return matchTitle || matchAuthors || matchDesc || matchGenres;
    });
  }, [products, searchQuery]);

  // 2. Group books by genre
  const genreSectionsData = useMemo(() => {
    return CANONICAL_GENRE_SECTIONS.map((section) => {
      const matched = searchFilteredProducts.filter((p) => {
        const productGenres = (p.genres || []).map((g) => g.toLowerCase());
        const target = section.name.toLowerCase();
        return (
          productGenres.includes(target) ||
          productGenres.some((g) => g.includes(target) || target.includes(g))
        );
      });
      return {
        ...section,
        books: matched,
      };
    });
  }, [searchFilteredProducts]);

  // 3. Filter sections by selectedGenre
  const visibleSections = useMemo(() => {
    const isAll = !selectedGenre || selectedGenre.toLowerCase() === 'all' || selectedGenre.toLowerCase() === 'all books';
    if (isAll) {
      return genreSectionsData.filter((s) => s.books.length > 0);
    }
    const cleanTarget = selectedGenre.toLowerCase();
    return genreSectionsData.filter(
      (s) =>
        s.name.toLowerCase() === cleanTarget ||
        s.slug.toLowerCase() === cleanTarget ||
        s.name.toLowerCase().includes(cleanTarget)
    );
  }, [genreSectionsData, selectedGenre]);

  // ── Loading Skeleton ──
  if (isLoading) {
    return (
      <div className={styles.catalogueWrapper} aria-busy="true" aria-label="Loading books catalogue">
        <div className={styles.skeletonRail}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className={styles.stateContainer} role="alert">
        <span className={styles.stateIcon}>⚠️</span>
        <h2 className={styles.stateTitle}>Unable to load catalogue</h2>
        <p className={styles.stateParagraph}>{error}</p>
        <button type="button" onClick={onRetry} className={styles.resetButton}>
          Retry
        </button>
      </div>
    );
  }

  // ── Empty Search / Filter State ──
  if (visibleSections.length === 0 || visibleSections.every((s) => s.books.length === 0)) {
    return (
      <div className={styles.stateContainer} data-testid="catalogue-empty-state">
        <span className={styles.stateIcon}>🔍</span>
        <h2 className={styles.stateTitle}>No books found</h2>
        <p className={styles.stateParagraph}>
          {searchQuery
            ? `We couldn't find any titles matching "${searchQuery}" in this category.`
            : `No books currently available in ${selectedGenre}.`}
        </p>
        <button type="button" onClick={onResetFilter} className={styles.resetButton}>
          View All Books
        </button>
      </div>
    );
  }

  return (
    <div className={styles.catalogueWrapper} data-testid="genre-carousels-container">
      {visibleSections.map((section) => {
        const state = scrollStates[section.name] || { canPrev: false, canNext: section.books.length > 1 };

        return (
          <section
            key={section.slug}
            className={styles.genreSection}
            aria-labelledby={`genre-heading-${section.slug}`}
            data-testid={`genre-section-${section.slug}`}
          >
            {/* Section Header */}
            <div className={styles.sectionHeader}>
              <div className={styles.headerTitleGroup}>
                <h2 id={`genre-heading-${section.slug}`} className={styles.genreTitle}>
                  {section.name}
                </h2>
                <span className={styles.genreCount}>
                  {section.books.length} {section.books.length === 1 ? 'book' : 'books'}
                </span>
              </div>

              {/* Slider Controls */}
              <CarouselControls
                canScrollPrev={state.canPrev}
                canScrollNext={state.canNext}
                onPrev={() => carouselRefs.current[section.name]?.scrollPrev()}
                onNext={() => carouselRefs.current[section.name]?.scrollNext()}
              />
            </div>

            {/* Slider Content */}
            <div className={styles.carouselWrap}>
              <BookCarousel
                ref={(el) => {
                  carouselRefs.current[section.name] = el;
                }}
                items={section.books}
                onSelectBook={onSelectBook}
                onScrollStateChange={(canPrev, canNext) =>
                  handleScrollStateChange(section.name, canPrev, canNext)
                }
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
