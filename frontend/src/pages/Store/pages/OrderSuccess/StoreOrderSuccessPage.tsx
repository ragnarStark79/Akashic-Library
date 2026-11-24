import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Printer,
  ShoppingBag,
  Store,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import type { InvoiceData, StoreViewMode } from '../../types/store';
import { getOrderInvoice } from '@/services/storeService';
import styles from './StoreOrderSuccessPage.module.css';

interface StoreOrderSuccessPageProps {
  onNavigateStore: (view: StoreViewMode) => void;
  orderId?: string | null;
}

export function StoreOrderSuccessPage({
  onNavigateStore,
  orderId: initialOrderId,
}: StoreOrderSuccessPageProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        let id = initialOrderId;
        if (!id && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          id = params.get('order_id') || sessionStorage.getItem('akashic_completed_order_id');
        }

        if (!id) {
          setError('No order reference provided.');
          return;
        }

        const data = await getOrderInvoice(id);
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || 'Unable to retrieve purchase invoice.');
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [initialOrderId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Sparkles size={36} color="#FF007A" style={{ animation: 'spin 2s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#6B7280', fontWeight: 600 }}>
              Generating your official purchase invoice...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div className={styles.successBanner}>
            <div className={styles.successIconWrap}>
              <CheckCircle size={32} />
            </div>
            <h1 className={styles.successTitle}>Order Completed Successfully!</h1>
            <p className={styles.successSubtitle}>
              Your demonstration payment has been confirmed and inventory has been reserved.
            </p>
            <div className={styles.bannerActions}>
              <button
                type="button"
                className={styles.continueBtn}
                onClick={() => onNavigateStore('store-allbooks')}
              >
                <ShoppingBag size={18} />
                Continue Exploring Books
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(invoice.payment_date || invoice.invoice_date).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Top Success Banner */}
        <div className={styles.successBanner}>
          <div className={styles.successIconWrap}>
            <CheckCircle size={32} />
          </div>
          <h1 className={styles.successTitle}>Your Reading Box is on Its Way!</h1>
          <p className={styles.successSubtitle}>
            Payment cleared successfully. Contributing store curators have received your dispatch request.
          </p>

          <div className={styles.metadataGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Order Number</span>
              <span className={styles.metaValue}>{invoice.order_number}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Payment Ref</span>
              <span className={styles.metaValue}>{invoice.payment_reference}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Items Count</span>
              <span className={styles.metaValue}>{invoice.total_items} Books</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Total Paid</span>
              <span className={styles.metaValue}>${Number(invoice.financials.total).toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.bannerActions}>
            <button type="button" className={styles.printBtn} onClick={handlePrint}>
              <Printer size={18} />
              Print / Save Invoice
            </button>
            <button
              type="button"
              className={styles.continueBtn}
              onClick={() => onNavigateStore('store-allbooks')}
            >
              <ShoppingBag size={18} />
              Explore More Books
            </button>
          </div>
        </div>

        {/* ── Official Printable Invoice Card ── */}
        <div className={styles.invoiceCard} id="printable-invoice">
          {/* Invoice Header */}
          <div className={styles.invoiceHeader}>
            <div className={styles.invoiceBrand}>
              <span className={styles.brandName}>Akashic Sanctuary Store</span>
              <span className={styles.brandTagline}>
                Independent Multi-Curator Literary Network
              </span>
            </div>
            <div className={styles.invoiceMeta}>
              <span className={styles.invoiceTitle}>PURCHASE RECEIPT & INVOICE</span>
              <span className={styles.paidBadge}>
                <ShieldCheck size={14} /> PAID IN FULL (DEMO)
              </span>
              <span style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.25rem' }}>
                Invoice No: {invoice.invoice_id}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                Date: {formattedDate}
              </span>
            </div>
          </div>

          {/* Parties Grid: Billed To / Shipping Address */}
          <div className={styles.partiesGrid}>
            <div className={styles.partyCol}>
              <span className={styles.partyHeading}>Billed & Shipped To</span>
              <span className={styles.partyName}>{invoice.customer.name}</span>
              <span>{invoice.customer.email}</span>
              <span>{invoice.customer.shipping_address.address_line1}</span>
              <span>
                {invoice.customer.shipping_address.city},{' '}
                {invoice.customer.shipping_address.state}{' '}
                {invoice.customer.shipping_address.postal_code}
              </span>
              <span>{invoice.customer.shipping_address.country}</span>
            </div>

            <div className={styles.partyCol}>
              <span className={styles.partyHeading}>Payment Details</span>
              <span>
                <strong>Method:</strong> Simulated Demo QR Clearance
              </span>
              <span>
                <strong>Reference:</strong> {invoice.payment_reference}
              </span>
              <span>
                <strong>Status:</strong> {invoice.payment_status}
              </span>
              <span>
                <strong>Currency:</strong> {invoice.financials.currency}
              </span>
            </div>
          </div>

          {/* Store Group Package Breakdown */}
          <div className={styles.packagesContainer}>
            {invoice.store_groups.map((group, gIdx) => (
              <div key={gIdx} className={styles.storeGroupBill}>
                <div className={styles.storeGroupBillHeader}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Store size={15} color="#FF007A" />
                    Curator: {group.store_name} ({group.item_count} items)
                  </span>
                  <span>Package Subtotal: ${Number(group.subtotal).toFixed(2)}</span>
                </div>

                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Title & Edition</th>
                      <th>Author</th>
                      <th className={styles.numCol}>Qty</th>
                      <th className={styles.numCol}>Unit Price</th>
                      <th className={styles.numCol}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {item.edition}
                          </div>
                        </td>
                        <td>{item.author}</td>
                        <td className={styles.numCol}>{item.quantity}</td>
                        <td className={styles.numCol}>
                          ${Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className={styles.numCol}>
                          <strong>${Number(item.line_total).toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Totals Section */}
          <div className={styles.totalsSection}>
            <div className={styles.totalsBox}>
              <div className={styles.totalLine}>
                <span>Subtotal</span>
                <span>${Number(invoice.financials.subtotal).toFixed(2)}</span>
              </div>
              <div className={styles.totalLine}>
                <span>Shipping & Handling</span>
                <span>${Number(invoice.financials.shipping).toFixed(2)} (Free Promo)</span>
              </div>
              <div className={styles.totalLine}>
                <span>Tax</span>
                <span>${Number(invoice.financials.tax).toFixed(2)}</span>
              </div>
              <div className={styles.totalLineGrand}>
                <span>Total Amount Paid</span>
                <span>${Number(invoice.financials.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Legal Notice */}
          <div className={styles.legalNotice}>
            {invoice.legal_notice}
          </div>
        </div>
      </div>
    </div>
  );
}
