import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, ShoppingBag, Minus, Plus } from 'lucide-react';
import { getBoxItemQuantity, updateBoxQuantity, addToBox } from '@/services/storeService';
import type { StoreProductStatus } from '@/pages/Store/types/store';
import styles from './BookDetailFloatingCta.module.css';

export interface BookDetailFloatingCtaProps {
  productId: string;
  price: string;
  originalPrice?: string | null;
  isDiscounted?: boolean;
  discountPercentage?: number | null;
  status: StoreProductStatus;
  availableQuantity: number;
}

export function BookDetailFloatingCta({
  productId,
  price,
  originalPrice,
  isDiscounted,
  discountPercentage,
  status,
  availableQuantity,
}: BookDetailFloatingCtaProps) {
  const [itemQuantity, setItemQuantity] = useState(0);
  const [isMutating, setIsMutating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  const isOutOfStock = status === 'OUT_OF_STOCK' || availableQuantity <= 0;
  const isLowStock = status === 'LOW_STOCK' || (availableQuantity > 0 && availableQuantity <= 5);

  // Read initial quantity on mount or product change
  useEffect(() => {
    let isMounted = true;
    getBoxItemQuantity(productId)
      .then((qty) => {
        if (isMounted) setItemQuantity(qty);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Hide CTA when scrolled near bottom (e.g. over footer)
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollPos = window.innerHeight + window.scrollY;
      if (scrollHeight - scrollPos < 350) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleIncrement = async () => {
    if (isOutOfStock || isMutating || itemQuantity >= availableQuantity) return;

    setIsMutating(true);
    try {
      const res = await addToBox(productId, 1);
      setItemQuantity(res.item_quantity);
      setToastMessage(res.message || 'Added to your box!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);
    } catch (err: any) {
      setToastMessage(err.message || 'Could not update quantity.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDecrement = async () => {
    if (isMutating || itemQuantity <= 0) return;

    setIsMutating(true);
    try {
      const res = await updateBoxQuantity(productId, 'decrement', 1);
      setItemQuantity(res.item_quantity);
      setToastMessage(res.message || (res.item_quantity === 0 ? 'Removed from your box.' : 'Updated box quantity.'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);
    } catch (err: any) {
      setToastMessage(err.message || 'Could not update quantity.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div
      className={`${styles.scrollingCta} ${isHidden ? styles.scrollingCtaHidden : ''}`}
      data-scrolling-cta=""
      data-testid="book-detail-floating-cta"
    >
      <div className={styles.ctaWrap} data-scrolling-cta-item="">
        {/* Toast confirmation */}
        {showToast && (
          <div className={styles.toast} role="status">
            <CheckCircle2 size={18} color="#10B981" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Pricing Block */}
        <div className={styles.priceBlock}>
          <div className={styles.priceRow}>
            <span className={styles.currentPrice}>
              ${parseFloat(price || '0').toFixed(2)}
            </span>
            {isDiscounted && originalPrice && (
              <span className={styles.originalPrice}>
                ${parseFloat(originalPrice).toFixed(2)}
              </span>
            )}
            {isDiscounted && discountPercentage && (
              <span className={styles.discountBadge}>
                -{discountPercentage}%
              </span>
            )}
          </div>
          <span
            className={`${styles.stockNotice} ${isOutOfStock ? styles.stockNoticeOut : ''}`}
          >
            {isOutOfStock
              ? 'Out of Stock'
              : isLowStock
              ? `Only ${availableQuantity} left in stock`
              : 'In Stock • Ready to ship'}
          </span>
        </div>

        {/* Add to Box Button or Quantity Stepper with Bunny Ears */}
        {itemQuantity === 0 ? (
          <button
            type="button"
            className={styles.addToBoxButton}
            onClick={handleIncrement}
            disabled={isOutOfStock || isMutating}
            data-testid="add-to-box-btn"
            aria-label={isOutOfStock ? 'Product out of stock' : 'Add to box'}
          >
            {/* Bunny Ears SVG emerging from top */}
            <div className={styles.earsWrap} aria-hidden="true">
              <svg className={styles.earLeft} viewBox="0 0 29 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.388.879c.667-.771 1.647-1.018 2.559-.807.912.212 1.547.882 1.838 1.777 5.093 15.655 4.885 36.879 2.502 54.075-.769 5.548-2.617 12.023-7.514 17.521-3.69 4.144-8.814 6.555-15.011 6.555h-2.149c-.87 0-1.613-.586-1.802-1.424-.188-.838.212-1.705.975-2.112C7.037 72.825 11.3 64.912 14.155 52.483 17.067 39.805 18.252 23.364 19.388.879Z" />
              </svg>
              <svg className={styles.earRight} viewBox="0 0 29 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.612.879c-.667-.771-1.647-1.018-2.559-.807-.912.212-1.547.882-1.838 1.777-5.093 15.655-4.885 36.879-2.502 54.075.769 5.548 2.617 12.023 7.514 17.521 3.69 4.144 8.814 6.555 15.011 6.555h2.149c.87 0 1.613-.586 1.802-1.424-.188-.838-.212-1.705-.975-2.112C21.963 72.825 17.7 64.912 14.845 52.483 11.933 39.805 10.748 23.364 9.612.879Z" />
              </svg>
            </div>

            <span>{isMutating ? 'Adding...' : isOutOfStock ? 'Out of stock' : 'Add to box!'}</span>

            <span className={styles.buttonIconWrap} aria-hidden="true">
              {isOutOfStock ? <ShoppingBag size={14} /> : <ArrowRight size={14} />}
            </span>
          </button>
        ) : (
          <div
            className={styles.quantityStepper}
            data-testid="add-to-box-stepper"
            aria-label="Adjust quantity in box"
          >
            {/* Bunny Ears SVG emerging from top */}
            <div className={styles.earsWrap} aria-hidden="true">
              <svg className={styles.earLeft} viewBox="0 0 29 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.388.879c.667-.771 1.647-1.018 2.559-.807.912.212 1.547.882 1.838 1.777 5.093 15.655 4.885 36.879 2.502 54.075-.769 5.548-2.617 12.023-7.514 17.521-3.69 4.144-8.814 6.555-15.011 6.555h-2.149c-.87 0-1.613-.586-1.802-1.424-.188-.838.212-1.705.975-2.112C7.037 72.825 11.3 64.912 14.155 52.483 17.067 39.805 18.252 23.364 19.388.879Z" />
              </svg>
              <svg className={styles.earRight} viewBox="0 0 29 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.612.879c-.667-.771-1.647-1.018-2.559-.807-.912.212-1.547.882-1.838 1.777-5.093 15.655-4.885 36.879-2.502 54.075.769 5.548 2.617 12.023 7.514 17.521 3.69 4.144 8.814 6.555 15.011 6.555h2.149c.87 0 1.613-.586 1.802-1.424-.188-.838-.212-1.705-.975-2.112C21.963 72.825 17.7 64.912 14.845 52.483 11.933 39.805 10.748 23.364 9.612.879Z" />
              </svg>
            </div>

            <button
              type="button"
              className={styles.stepperBtn}
              onClick={handleDecrement}
              disabled={isMutating}
              aria-label="Decrease quantity"
              data-testid="stepper-decrement-btn"
            >
              <Minus size={16} />
            </button>

            <span className={styles.stepperValue} data-testid="stepper-quantity-val">
              {itemQuantity}
            </span>

            <button
              type="button"
              className={styles.stepperBtn}
              onClick={handleIncrement}
              disabled={isMutating || itemQuantity >= availableQuantity}
              aria-label="Increase quantity"
              data-testid="stepper-increment-btn"
              title={itemQuantity >= availableQuantity ? 'Maximum available stock reached' : 'Add one more'}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
