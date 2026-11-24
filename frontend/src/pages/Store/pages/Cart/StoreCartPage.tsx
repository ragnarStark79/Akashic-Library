import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Store,
  Layers,
  Info,
  BookOpen,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { CartResponse, CartItem, StoreViewMode } from '../../types/store';
import {
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  switchCartItemStore,
  selectGlobalStore,
} from '@/services/storeService';
import styles from './StoreCartPage.module.css';

interface StoreCartPageProps {
  onNavigateStore: (view: StoreViewMode) => void;
  onSignInClick?: () => void;
}

export function StoreCartPage({ onNavigateStore }: StoreCartPageProps) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedGlobalStoreId, setSelectedGlobalStoreId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCartData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getCart();
      setCart(data);
      const firstStore = data.eligible_global_stores?.[0];
      if (firstStore?.store_id) {
        setSelectedGlobalStoreId(firstStore.store_id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load shopping bag.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  const handleQuantityChange = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(item.id);
      return;
    }

    try {
      setActionInProgress(`qty-${item.id}`);
      setErrorMessage(null);
      await updateCartItemQuantity(item.id, newQty);
      await fetchCartData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update quantity.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setActionInProgress(`remove-${itemId}`);
      setErrorMessage(null);
      await removeCartItem(itemId);
      await fetchCartData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove item.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSwitchStore = async (itemId: string, newProductId: string) => {
    try {
      setActionInProgress(`switch-${itemId}`);
      setErrorMessage(null);
      const updated = await switchCartItemStore(itemId, newProductId);
      setCart(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch store offer.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApplyGlobalStore = async () => {
    if (!selectedGlobalStoreId) return;
    try {
      setActionInProgress('global-store');
      setErrorMessage(null);
      const updated = await selectGlobalStore(selectedGlobalStoreId);
      setCart(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to consolidate items into selected store.');
    } finally {
      setActionInProgress(null);
    }
  };

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  // Group unique curators represented in the cart
  const uniqueCurators = Array.from(new Set(items.map((it) => it.store_name || 'Akashic Curator')));

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Sparkles size={36} color="#FF007A" style={{ animation: 'spin 2s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#6B7280', fontWeight: 600 }}>
              Retrieving your curated reading box...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <ShoppingBag size={38} />
            </div>
            <h2 className={styles.emptyTitle}>Your Reading Box is Empty</h2>
            <p className={styles.emptyDesc}>
              Discover rare physical editions, clothbound classics, and indie publisher releases
              curated by our independent store managers.
            </p>
            <button
              type="button"
              className={styles.browseBtn}
              onClick={() => onNavigateStore('store-allbooks')}
            >
              <BookOpen size={18} />
              Explore All Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Header Navigation Row */}
        <div className={styles.headerRow}>
          <h1 className={styles.pageTitle}>
            Your Reading Box
            <span className={styles.itemCountBadge}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </h1>
          <button
            type="button"
            className={styles.continueLink}
            onClick={() => onNavigateStore('store-allbooks')}
          >
            <ArrowLeft size={16} />
            Continue Browsing
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}
            >
              &times;
            </button>
          </div>
        )}

        {/* ── Global Store Selector Banner (If eligible stores exist) ── */}
        {cart?.eligible_global_stores && cart.eligible_global_stores.length > 0 && (
          <div className={styles.globalStoreBanner}>
            <div className={styles.globalStoreInfo}>
              <Layers size={24} className={styles.globalStoreIcon} />
              <div>
                <p className={styles.globalStoreTitle}>Single-Store Fulfillment Option</p>
                <p className={styles.globalStoreDesc}>
                  The following verified curator offers all items currently in your box in stock:
                </p>
              </div>
            </div>
            <div className={styles.globalStoreControls}>
              <select
                className={styles.globalStoreSelect}
                value={selectedGlobalStoreId}
                onChange={(e) => setSelectedGlobalStoreId(e.target.value)}
                disabled={actionInProgress === 'global-store'}
              >
                {cart.eligible_global_stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>
                    {s.store_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.globalStoreBtn}
                onClick={handleApplyGlobalStore}
                disabled={actionInProgress === 'global-store'}
              >
                {actionInProgress === 'global-store' ? 'Applying...' : 'Fulfill from this Store'}
              </button>
            </div>
          </div>
        )}

        {/* ── Main Layout: Item Cards + Summary Sidebar ── */}
        <div className={styles.cartGrid}>
          {/* Items List */}
          <div className={styles.itemsList}>
            {items.map((item) => {
              const unitPrice =
                typeof item.current_price === 'string'
                  ? parseFloat(item.current_price)
                  : item.current_price;
              const hasAlternateStores =
                item.available_stores && item.available_stores.length > 1;

              return (
                <div key={item.id} className={styles.itemCard} data-testid={`cart-item-${item.id}`}>
                  {/* Book Cover */}
                  <div className={styles.coverWrap}>
                    {item.cover_image ? (
                      <img
                        src={item.cover_image}
                        alt={item.title}
                        className={styles.coverImg}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className={styles.coverPlaceholder}>
                        <BookOpen size={24} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <p className={styles.itemAuthor}>{item.author}</p>
                    {item.edition && (
                      <span className={styles.editionBadge}>
                        {item.edition} &bull; {item.condition || 'New'}
                      </span>
                    )}

                    {/* Supplying Store & Switcher */}
                    <div className={styles.storeSection}>
                      <span className={styles.currentStoreBadge}>
                        <Store size={13} />
                        Curated by: {item.store_name}
                      </span>

                      {hasAlternateStores && (
                        <div className={styles.storeSwitchWrap}>
                          <label
                            htmlFor={`store-select-${item.id}`}
                            className={styles.storeSwitchLabel}
                          >
                            Switch Supplier:
                          </label>
                          <select
                            id={`store-select-${item.id}`}
                            className={styles.storeSelect}
                            value={item.product_id}
                            disabled={actionInProgress === `switch-${item.id}`}
                            onChange={(e) => handleSwitchStore(item.id, e.target.value)}
                          >
                            {item.available_stores!.map((offer) => {
                              const diff = Number(offer.price) - unitPrice;
                              const diffText =
                                diff === 0
                                  ? ''
                                  : diff > 0
                                  ? ` (+$${diff.toFixed(2)})`
                                  : ` (-$${Math.abs(diff).toFixed(2)})`;
                              return (
                                <option key={offer.product_id} value={offer.product_id}>
                                  {offer.store_name} &bull; ${Number(offer.price).toFixed(2)}
                                  {diffText} ({offer.available_quantity} in stock)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing, Stepper & Removal */}
                  <div className={styles.itemActions}>
                    <div className={styles.priceCol}>
                      <div>
                        {item.is_discounted && item.original_price && (
                          <span className={styles.originalPrice}>
                            ${Number(item.original_price).toFixed(2)}
                          </span>
                        )}
                        <span className={styles.currentPrice}>
                          ${unitPrice.toFixed(2)}
                        </span>
                        {item.is_discounted && item.discount_percentage && (
                          <span className={styles.discountTag}>
                            -{item.discount_percentage}%
                          </span>
                        )}
                      </div>
                      <div className={styles.lineSubtotal}>
                        Subtotal: ${(item.line_subtotal || unitPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div className={styles.stepperRow}>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          className={styles.stepperBtn}
                          onClick={() => handleQuantityChange(item, -1)}
                          disabled={actionInProgress === `qty-${item.id}`}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className={styles.stepperQty}>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.stepperBtn}
                          onClick={() => handleQuantityChange(item, 1)}
                          disabled={
                            actionInProgress === `qty-${item.id}` ||
                            item.quantity >= item.available_quantity
                          }
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={actionInProgress === `remove-${item.id}`}
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Summary Card Sidebar ── */}
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Box Summary</h2>

            <div className={styles.summaryRow}>
              <span>Subtotal ({itemCount} books)</span>
              <span>${Number(cart?.cart_subtotal || 0).toFixed(2)}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Estimated Shipping</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>FREE (Demo)</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Estimated Tax</span>
              <span>$0.00</span>
            </div>

            {/* Multi-curator fulfillment alert */}
            <div className={styles.curatorBreakdownBadge}>
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Multi-Curator Dispatch:</strong> Your box contains selections from{' '}
                <strong>{uniqueCurators.length}</strong> independent bookstore{' '}
                {uniqueCurators.length === 1 ? 'curator' : 'curators'}:{' '}
                <em>{uniqueCurators.join(', ')}</em>.
              </div>
            </div>

            <div className={styles.summaryRowTotal}>
              <span>Estimated Total</span>
              <span>${Number(cart?.cart_subtotal || 0).toFixed(2)}</span>
            </div>

            <button
              type="button"
              className={styles.checkoutBtn}
              onClick={() => onNavigateStore('store-checkout')}
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </button>

            <p className={styles.demoNotice}>
              Safe demonstration e-commerce environment. No real payment card or bank charges required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
