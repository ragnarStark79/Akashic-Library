import { useRef, useState } from 'react';
import type { StoreProductItem } from '@/pages/Store/types/store';
import {
  BookCarousel,
  type BookCarouselRef,
} from '@/pages/Store/components/StoreBooksSection/components/BookCarousel';
import { CarouselControls } from '@/pages/Store/components/StoreBooksSection/components/CarouselControls';
import styles from './BookDetailSimilarTitles.module.css';

export interface BookDetailSimilarTitlesProps {
  currentProductId: string;
  similarProducts: StoreProductItem[];
  onSelectBook?: (product: StoreProductItem) => void;
}

export function BookDetailSimilarTitles({
  currentProductId,
  similarProducts,
  onSelectBook,
}: BookDetailSimilarTitlesProps) {
  const carouselRef = useRef<BookCarouselRef | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // Filter out the current book
  const filteredProducts = similarProducts.filter((p) => p.id !== currentProductId);

  if (filteredProducts.length === 0) {
    return null;
  }

  return (
    <section className={styles.relatedSection} data-testid="book-detail-similar-titles">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Similar titles</h2>

          <CarouselControls
            canScrollPrev={canPrev}
            canScrollNext={canNext}
            onPrev={() => carouselRef.current?.scrollPrev()}
            onNext={() => carouselRef.current?.scrollNext()}
          />
        </div>

        <BookCarousel
          ref={carouselRef}
          items={filteredProducts}
          onSelectBook={onSelectBook}
          onScrollStateChange={(prev, next) => {
            setCanPrev(prev);
            setCanNext(next);
          }}
        />
      </div>
    </section>
  );
}
