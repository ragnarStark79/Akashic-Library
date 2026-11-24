import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { StoreProductItem } from '@/pages/Store/types/store';
import { getStoreProduct, getStoreProducts } from '@/services/storeService';
import { BookDetailHero } from './components/BookDetailHero';
import { BookDetailCover } from './components/BookDetailCover';
import { BookDetailGlance } from './components/BookDetailGlance';
import { BookDetailDescription } from './components/BookDetailDescription';
import { BookDetailEditorialCards } from './components/BookDetailEditorialCards';
import { BookDetailExcerpt } from './components/BookDetailExcerpt';
import { BookDetailNotes } from './components/BookDetailNotes';
import { BookDetailSimilarTitles } from './components/BookDetailSimilarTitles';
import { BookDetailFloatingCta } from './components/BookDetailFloatingCta';
import styles from './BookDetailPage.module.css';

export interface BookDetailPageProps {
  productId?: string;
  initialProductId?: string;
  onNavigateBack?: () => void;
  onNavigateStore?: (view: any, productId?: string) => void;
  onSelectBook?: (book: any) => void;
  onSignInClick?: () => void;
}

export function BookDetailPage({
  productId,
  initialProductId,
  onNavigateBack,
  onNavigateStore,
  onSelectBook,
  onSignInClick,
}: BookDetailPageProps) {
  const resolveTargetId = useCallback((propId?: string): string => {
    if (propId) return propId;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('id') || params.get('book') || '';
    }
    return '';
  }, []);

  const [activeId, setActiveId] = useState<string>(() =>
    resolveTargetId(productId || initialProductId)
  );

  const [product, setProduct] = useState<StoreProductItem | null>(null);
  const [similarProducts, setSimilarProducts] = useState<StoreProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync activeId whenever productId prop changes
  useEffect(() => {
    const nextId = resolveTargetId(productId || initialProductId);
    if (nextId !== activeId) {
      setActiveId(nextId);
    }
  }, [productId, initialProductId, resolveTargetId, activeId]);

  // Sync activeId on browser Back and Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const nextId = resolveTargetId();
      setActiveId(nextId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolveTargetId]);

  // Fetch product data & similar catalogue candidates with race-condition protection
  useEffect(() => {
    let isSubscribed = true;

    if (!activeId) {
      setProduct(null);
      setIsLoading(false);
      setError('No product selected. Please choose an edition from the Akashic Store catalogue.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProduct(null);

    Promise.all([
      getStoreProduct(activeId).catch(async () => {
        // Search all products by reference, title slug, or normalized title
        const all = await getStoreProducts();
        const normalizedActive = activeId.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const match = all.find(
          (p) =>
            p.id === activeId ||
            p.book_reference === activeId ||
            p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === activeId ||
            p.title.toLowerCase().replace(/[^a-z0-9]+/g, '') === normalizedActive
        );
        if (match) return match;
        throw new Error('Edition not found.');
      }),
      getStoreProducts().catch(() => []),
    ])
      .then(([fetchedProduct, allProducts]) => {
        if (!isSubscribed) return;
        setProduct(fetchedProduct);

        const productGenres = new Set(
          (fetchedProduct.custom_genres?.length ? fetchedProduct.custom_genres : fetchedProduct.genres) || []
        );
        const similar = allProducts.filter((p) => {
          if (p.id === fetchedProduct.id) return false;
          const pGenres = (p.custom_genres?.length ? p.custom_genres : p.genres) || [];
          return pGenres.some((g) => productGenres.has(g));
        });
        setSimilarProducts(similar.length > 0 ? similar : allProducts.filter((p) => p.id !== fetchedProduct.id));
      })
      .catch((err: any) => {
        if (!isSubscribed) return;
        setProduct(null);
        setError(err.message || 'Edition not found.');
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeId]);

  // Handle switching to a similar title
  const handleSelectSimilarBook = (item: StoreProductItem) => {
    setActiveId(item.id);
    if (onSelectBook) {
      onSelectBook(item);
    }
    if (onNavigateStore) {
      onNavigateStore('store-book-detail', item.id);
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', 'store-book-detail');
      params.set('id', item.id);
      window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className={styles.skeletonWrapper} data-testid="book-detail-skeleton">
        <div className={styles.skeletonHero}>
          <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
          <div className={styles.skeletonLine} style={{ width: '40%' }} />
          <div className={styles.skeletonLine} style={{ width: '60%' }} />
        </div>
        <div className={styles.skeletonCover} />
      </div>
    );
  }

  // Error State or Missing Product Selection
  if (error || !product) {
    const isMissing = !activeId || error?.includes('No product selected');
    return (
      <div className={styles.errorWrapper} data-testid="book-detail-error">
        <h2 className={styles.errorTitle}>{isMissing ? 'No Book Selected' : 'Book Not Found'}</h2>
        <p className={styles.errorSubtitle}>
          {error || 'The requested curated edition could not be found or may have been retired.'}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            className={styles.errorAction}
            onClick={() => onNavigateBack?.() || onNavigateStore?.('store-allbooks')}
            data-testid="back-to-all-books-btn"
          >
            <ArrowLeft size={18} />
            <span>Back to All Books</span>
          </button>
          {!isMissing && (
            <button
              type="button"
              className={styles.errorAction}
              style={{ backgroundColor: '#4B5563' }}
              onClick={() => setActiveId(resolveTargetId())}
            >
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const detail = product.detail;
  const genres = product.custom_genres?.length ? product.custom_genres : product.genres || [];
  const coverUrl = product.custom_cover_url || product.cover_image || '';
  const synopsis = detail?.synopsis || product.custom_description || product.description || '';
  const fullDescription = detail?.full_description || product.description || '';
  const atAGlance = detail?.at_a_glance || [];
  const editorialCards = detail?.editorial_cards || [];
  const excerpt = detail?.sample_excerpt || detail?.excerpt || '';
  const whyWeChose = detail?.why_we_chose || '';
  const contentWarnings = Array.isArray(detail?.content_warnings) ? detail.content_warnings : [];
  const heroTheme = detail?.hero_theme;

  return (
    <article className={styles.pageWrapper} data-testid="book-detail-page">
      {/* ── 1. Hero Section ── */}
      <BookDetailHero
        title={product.title}
        authors={product.authors || []}
        genres={genres}
        heroTheme={heroTheme}
        onSignUpClick={onSignInClick}
      />

      {/* ── 2. Central 3D Book Cover Crossing Boundary ── */}
      <BookDetailCover
        coverUrl={coverUrl}
        title={product.title}
        authors={product.authors || []}
      />

      {/* ── 3. Content Section (At a Glance, Synopsis, Description, Editorial Cards) ── */}
      <section className={styles.contentSection}>
        <div className={styles.contentContainer}>
          {/* At a Glance diamond/kite grid */}
          <BookDetailGlance tags={atAGlance} />

          {/* Reading Synopsis & Multi-paragraph Full Description */}
          <BookDetailDescription
            synopsis={synopsis}
            fullDescription={fullDescription}
          />

          {/* Don't Just Take Our Word For It Editorial Cards */}
          <BookDetailEditorialCards cards={editorialCards} />
        </div>
      </section>

      {/* ── 4. Get a Taste Excerpt Section ── */}
      <BookDetailExcerpt
        excerpt={excerpt}
        themeColor={heroTheme?.background_color || '#FEE6D0'}
      />

      {/* ── 5. Book Notes (Why We Chose & Content Warnings) ── */}
      <BookDetailNotes
        whyWeChose={whyWeChose}
        contentWarnings={contentWarnings}
      />

      {/* ── 6. Similar Titles Horizontal Carousel ── */}
      <BookDetailSimilarTitles
        currentProductId={product.id}
        similarProducts={similarProducts}
        onSelectBook={handleSelectSimilarBook}
      />

      {/* ── 7. Floating Add-to-Box CTA with Bunny Ears ── */}
      <BookDetailFloatingCta
        productId={product.id}
        price={product.price}
        originalPrice={product.original_price}
        isDiscounted={product.is_discounted}
        discountPercentage={product.discount_percentage}
        status={product.status}
        availableQuantity={product.available_quantity}
      />
    </article>
  );
}

export default BookDetailPage;
