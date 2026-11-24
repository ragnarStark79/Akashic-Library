import { useRef, useState } from 'react';
import type { StoreTopBooksSectionProps } from './types';
import { TOP_BOOKS_DATA } from './data/topBooksData';
import { BookCarousel, type BookCarouselRef } from './components/BookCarousel';
import { CarouselControls } from './components/CarouselControls';
import styles from './StoreTopBooksSection.module.css';

export function StoreTopBooksSection({
  className = '',
  onSelectBook,
}: StoreTopBooksSectionProps) {
  const carouselRef = useRef<BookCarouselRef>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const handleScrollStateChange = (prev: boolean, next: boolean) => {
    setCanScrollPrev(prev);
    setCanScrollNext(next);
  };

  return (
    <section
      className={`${styles.booksSection} ${className}`.trim()}
      aria-labelledby="store-top-books-heading"
      data-testid="store-top-books-section"
    >
      <div className={styles.booksContainer}>
        {/* Section Header */}
        <div className={styles.booksHeader}>
          {/* Handwritten accent annotation */}
          <div className={styles.handwrittenWrap}>
            <p className={styles.handwrittenText}>
              Discover hidden gems and buzzy new releases
            </p>
          </div>

          {/* Heading and updated description */}
          <div className={styles.booksContent}>
            <h2 id="store-top-books-heading" className={styles.booksTitle}>
              Our Top Books
            </h2>
            <p className={styles.booksParagraph}>
              Explore noteworthy releases, remarkable stories and carefully selected editions from the Akashic Store.
            </p>
          </div>
        </div>

        {/* Carousel Navigation Controls */}
        <div className={styles.controlsWrap}>
          <CarouselControls
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
            onPrev={() => carouselRef.current?.scrollPrev()}
            onNext={() => carouselRef.current?.scrollNext()}
          />
        </div>

        {/* Horizontal Book Cards Carousel */}
        <BookCarousel
          ref={carouselRef}
          items={TOP_BOOKS_DATA}
          onSelectBook={onSelectBook}
          onScrollStateChange={handleScrollStateChange}
        />
      </div>
    </section>
  );
}

export default StoreTopBooksSection;
