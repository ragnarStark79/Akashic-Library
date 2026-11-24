import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  Package,
  Store,
  ChevronRight,
  AlertCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import type { CartResponse, CartItem, OrderRecord, StoreViewMode, ShippingAddress } from '../../types/store';
import type { User } from '@/types/auth';
import { getCart, createCheckoutSession } from '@/services/storeService';
import styles from './StoreCheckoutPage.module.css';

interface StoreCheckoutPageProps {
  onNavigateStore: (view: StoreViewMode) => void;
  user: User | null;
  onOrderCreated?: (order: OrderRecord) => void;
}

export function StoreCheckoutPage({
  onNavigateStore,
  user,
  onOrderCreated,
}: StoreCheckoutPageProps) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    customer_name: string;
    customer_email: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>({
    customer_name: user?.display_name || user?.username || '',
    customer_email: user?.email || '',
    address_line1: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'OR',
    postal_code: '97477',
    country: 'United States',
  });

  useEffect(() => {
    async function loadCart() {
      try {
        setLoading(true);
        const data = await getCart();
        setCart(data);
        if (!data.items || data.items.length === 0) {
          onNavigateStore('store-merch');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to load cart for checkout.');
      } finally {
        setLoading(false);
      }
    }
    loadCart();
  }, [onNavigateStore]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.customer_email.trim()) {
      setErrorMessage('Please provide your name and email address.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const shipping_address: ShippingAddress = {
        recipient: formData.customer_name,
        address_line1: formData.address_line1,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
      };

      const order = await createCheckoutSession({
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        shipping_address,
      });

      if (onOrderCreated) {
        onOrderCreated(order);
      }

      // Store current pending order id in sessionStorage for recovery
      sessionStorage.setItem('akashic_active_order_id', order.id);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.set('view', 'store-payment');
        params.set('order_id', order.id);
        window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
      }

      onNavigateStore('store-payment');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize demo payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group items by store for package breakdown
  const storeGroups = (cart?.items || []).reduce<Record<string, { store_name: string; items: CartItem[] }>>(
    (acc, item) => {
      const key = item.store_id || item.store_name || 'sanctuary';
      if (!acc[key]) {
        acc[key] = {
          store_name: item.store_name || 'Akashic Official Sanctuary',
          items: [],
        };
      }
      acc[key].items.push(item);
      return acc;
    },
    {}
  );

  const totalAmount = Number(cart?.cart_subtotal || 0);

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Sparkles size={36} color="#FF007A" style={{ animation: 'spin 2s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#6B7280', fontWeight: 600 }}>
              Preparing your checkout overview...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Breadcrumb Navigation */}
        <div className={styles.breadcrumbNav}>
          <button
            type="button"
            className={styles.breadcrumbLink}
            onClick={() => onNavigateStore('store-merch')}
          >
            Shopping Bag
          </button>
          <ChevronRight size={14} />
          <span>Checkout & Shipping</span>
        </div>

        {/* Page Title */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Review & Checkout</h1>
          <p className={styles.pageSubtitle}>
            Confirm your delivery details and review the independent bookstore curators fulfilling your box.
          </p>
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

        <form onSubmit={handleSubmit} className={styles.checkoutGrid}>
          {/* Main Column */}
          <div className={styles.mainCol}>
            {/* 1. Customer & Shipping Destination */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <Truck size={22} className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Delivery Destination</h2>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="customer_name" className={styles.label}>
                    Recipient Full Name
                  </label>
                  <input
                    id="customer_name"
                    name="customer_name"
                    type="text"
                    required
                    className={styles.input}
                    value={formData.customer_name}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="customer_email" className={styles.label}>
                    Email Address
                  </label>
                  <input
                    id="customer_email"
                    name="customer_email"
                    type="email"
                    required
                    className={styles.input}
                    value={formData.customer_email}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="address_line1" className={styles.label}>
                    Street Address
                  </label>
                  <input
                    id="address_line1"
                    name="address_line1"
                    type="text"
                    required
                    className={styles.input}
                    value={formData.address_line1}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="city" className={styles.label}>
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    className={styles.input}
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="state" className={styles.label}>
                    State / Province
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    className={styles.input}
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="postal_code" className={styles.label}>
                    Postal / ZIP Code
                  </label>
                  <input
                    id="postal_code"
                    name="postal_code"
                    type="text"
                    required
                    className={styles.input}
                    value={formData.postal_code}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="country" className={styles.label}>
                    Country
                  </label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    required
                    className={styles.input}
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* 2. Multi-Store Curators Package Grouping */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <Package size={22} className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>
                  Curated Shipments ({Object.keys(storeGroups).length} Bookstore Packages)
                </h2>
              </div>

              <div className={styles.packagesWrap}>
                {Object.entries(storeGroups).map(([key, group], idx) => {
                  const groupSubtotal = group.items.reduce(
                    (sum, it) =>
                      sum +
                      (typeof it.current_price === 'string'
                        ? parseFloat(it.current_price)
                        : it.current_price) *
                        it.quantity,
                    0
                  );

                  return (
                    <div key={key} className={styles.packageCard}>
                      <div className={styles.packageHeader}>
                        <span className={styles.packageStoreTitle}>
                          <Store size={15} color="#FF007A" />
                          Package {idx + 1}: {group.store_name}
                        </span>
                        <span className={styles.packageSubtotal}>
                          ${groupSubtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.packageItems}>
                        {group.items.map((item) => {
                          const price =
                            typeof item.current_price === 'string'
                              ? parseFloat(item.current_price)
                              : item.current_price;

                          return (
                            <div key={item.id} className={styles.packageItemRow}>
                              <div className={styles.itemDesc}>
                                {item.cover_image && (
                                  <img
                                    src={item.cover_image}
                                    alt={item.title}
                                    className={styles.packageCover}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className={styles.itemText}>
                                  <span className={styles.itemTitle}>{item.title}</span>
                                  <span className={styles.itemQty}>
                                    Qty: {item.quantity} &times; ${price.toFixed(2)} &bull; {item.edition || 'Standard'}
                                  </span>
                                </div>
                              </div>
                              <span className={styles.itemTotal}>
                                ${(price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Summary & Payment Trigger */}
          <div className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>Order Summary</h2>

            <div className={styles.sidebarRow}>
              <span>Items Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <div className={styles.sidebarRow}>
              <span>Delivery Rate</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>FREE (Demo)</span>
            </div>

            <div className={styles.sidebarRow}>
              <span>Tax (Estimated)</span>
              <span>$0.00</span>
            </div>

            <div className={styles.sidebarTotalRow}>
              <span>Total Due</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <div className={styles.demoPaymentNotice}>
              <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Demonstration Mode:</strong> You will complete a simulated QR-based clearance.
                No credit card or real funds are required.
              </div>
            </div>

            <button
              type="submit"
              className={styles.payCtaBtn}
              disabled={submitting}
            >
              <QrCode size={20} />
              {submitting ? 'Generating Payment QR...' : 'Proceed to Demo QR Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
