import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import type { OrderRecord, StoreViewMode } from '../../types/store';
import { confirmDemoPayment } from '@/services/storeService';
import styles from './StorePaymentPage.module.css';

interface StorePaymentPageProps {
  onNavigateStore: (view: StoreViewMode) => void;
  order?: OrderRecord | null;
  onPaymentSuccess?: (order: OrderRecord) => void;
}

export function StorePaymentPage({
  onNavigateStore,
  order: initialOrder,
  onPaymentSuccess,
}: StorePaymentPageProps) {
  const [order, setOrder] = useState<OrderRecord | null>(initialOrder || null);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Retrieve order_id from URL query if initialOrder is not passed directly
  useEffect(() => {
    if (!order && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get('order_id') || sessionStorage.getItem('akashic_active_order_id');
      if (urlOrderId) {
        // Fetch or create placeholder session
        setOrder({
          id: urlOrderId,
          order_number: `AK-2026-${urlOrderId.slice(0, 8).toUpperCase()}`,
          status: 'PENDING',
          payment_status: 'PENDING',
          subtotal: '70.00',
          total: '70.00',
          payment_reference: `DEMO-PAY-${urlOrderId.slice(0, 8).toUpperCase()}`,
          customer_name: 'Patron Reader',
          customer_email: 'reader@akashic.library',
          shipping_address: {
            recipient: 'Patron Reader',
            address_line1: '742 Evergreen Terrace',
            city: 'Springfield',
            state: 'OR',
            postal_code: '97477',
            country: 'United States',
          },
          qr_payload: `akashic-demo-pay:${urlOrderId}:70.00`,
          store_groups: [],
          created_at: new Date().toISOString(),
        });
      }
    }
  }, [order]);

  const handleConfirmPayment = async () => {
    if (!order?.id) {
      setErrorMessage('No active order session found to clear.');
      return;
    }

    try {
      setConfirming(true);
      setErrorMessage(null);
      const confirmedOrder = await confirmDemoPayment(order.id);

      if (onPaymentSuccess) {
        onPaymentSuccess(confirmedOrder);
      }

      sessionStorage.setItem('akashic_completed_order_id', confirmedOrder.id);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.set('view', 'store-order-success');
        params.set('order_id', confirmedOrder.id);
        window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
      }

      onNavigateStore('store-order-success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment confirmation failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const orderNum = order?.order_number || 'AK-2026-DEMO';
  const totalAmount = Number(order?.total || 0).toFixed(2);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.paymentCard}>
        {/* Demo Indicator */}
        <div className={styles.demoPill}>
          <ShieldAlert size={14} />
          Demo Payment Clearance Simulator
        </div>

        <h1 className={styles.title}>Scan to Clear Demo Payment</h1>
        <p className={styles.orderSubtitle}>
          Order Reference: <span className={styles.orderNumber}>{orderNum}</span>
        </p>

        {/* Amount Due Box */}
        <div className={styles.amountBox}>
          <span className={styles.amountLabel}>Total Due for Clearance</span>
          <span className={styles.amountValue}>${totalAmount}</span>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            {errorMessage}
          </div>
        )}

        {/* ── High-Fidelity Animated QR Frame ── */}
        <div className={styles.qrWrapper}>
          <div className={styles.scanLine} />
          {/* Authentic Stylized QR Code SVG Pattern */}
          <svg
            className={styles.qrSvg}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Demo QR Payment Code"
          >
            {/* Corner Marker Top-Left */}
            <rect x="5" y="5" width="26" height="26" rx="4" stroke="#111827" strokeWidth="4" />
            <rect x="11" y="11" width="14" height="14" rx="2" fill="#FF007A" />

            {/* Corner Marker Top-Right */}
            <rect x="69" y="5" width="26" height="26" rx="4" stroke="#111827" strokeWidth="4" />
            <rect x="75" y="11" width="14" height="14" rx="2" fill="#FF007A" />

            {/* Corner Marker Bottom-Left */}
            <rect x="5" y="69" width="26" height="26" rx="4" stroke="#111827" strokeWidth="4" />
            <rect x="11" y="75" width="14" height="14" rx="2" fill="#FF007A" />

            {/* Data matrix nodes */}
            <rect x="36" y="8" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="46" y="8" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="56" y="8" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="36" y="18" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="46" y="24" width="8" height="8" rx="2" fill="#111827" />
            <rect x="58" y="18" width="6" height="6" rx="1.5" fill="#111827" />

            {/* Center Area Matrix */}
            <rect x="8" y="38" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="18" y="44" width="8" height="8" rx="2" fill="#111827" />
            <rect x="8" y="54" width="6" height="6" rx="1.5" fill="#111827" />

            <rect x="36" y="36" width="28" height="28" rx="4" fill="#FFE5EC" />
            <circle cx="50" cy="50" r="8" fill="#FF007A" />

            <rect x="68" y="38" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="78" y="44" width="8" height="8" rx="2" fill="#111827" />
            <rect x="88" y="38" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="68" y="54" width="8" height="8" rx="2" fill="#111827" />

            {/* Bottom Data Matrix */}
            <rect x="36" y="70" width="8" height="8" rx="2" fill="#111827" />
            <rect x="48" y="70" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="58" y="76" width="8" height="8" rx="2" fill="#111827" />
            <rect x="70" y="70" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="80" y="76" width="8" height="8" rx="2" fill="#111827" />
            <rect x="42" y="84" width="6" height="6" rx="1.5" fill="#111827" />
            <rect x="54" y="84" width="10" height="10" rx="2" fill="#111827" />
            <rect x="72" y="84" width="8" height="8" rx="2" fill="#111827" />
          </svg>
        </div>

        <p className={styles.qrCaption}>
          Point any test QR reader or click below to simulate instant customer payment clearance.
          Real order records and inventory decrement will be executed immediately.
        </p>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirmPayment}
            disabled={confirming}
          >
            {confirming ? (
              <>
                <Sparkles size={18} />
                Clearing Payment...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Simulate Successful Payment ($ {totalAmount})
              </>
            )}
          </button>

          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => onNavigateStore('store-merch')}
            disabled={confirming}
          >
            Cancel and Return to Shopping Bag
          </button>
        </div>
      </div>
    </div>
  );
}
