import { Sparkles, ArrowLeft } from 'lucide-react';
import type { StoreViewMode } from '../../types/store';
import styles from './StorePlaceholder.module.css';

interface StorePlaceholderProps {
  view: StoreViewMode;
  onNavigateHome: () => void;
  onExitPortalToLibrary: () => void;
}

const PLACEHOLDER_INFO: Record<
  StoreViewMode,
  { title: string; subtitle: string; stage: string }
> = {
  store: {
    title: 'Akashic Store Homepage',
    subtitle: 'The primary marketplace home experience.',
    stage: 'Stage 1B - 1E',
  },
  'store-allbooks': {
    title: 'All Editions Catalogue',
    subtitle: 'Browse the complete library of physical books, boxed editions, and releases with client-side indexing.',
    stage: 'Stage 2',
  },
  'store-book-detail': {
    title: 'Edition Details',
    subtitle: 'In-depth presentation of physical specifications, curator tasting notes, and book jacket photography.',
    stage: 'Stage 3',
  },
  'store-gifting': {
    title: 'Gift Memberships',
    subtitle: 'Curated 1, 3, 6, and 12-month boxed gift subscriptions for literary lovers.',
    stage: 'Stage 4',
  },
  'store-merch': {
    title: 'Exclusive Merchandise',
    subtitle: 'Artisanal canvas totes, embroidered reading caps, enamel pins, and bookish accessories.',
    stage: 'Stage 5',
  },
  'store-faq': {
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know about our physical editions, shipping schedules, and packaging.',
    stage: 'Stage 6',
  },
  'store-manager': {
    title: 'Store Product Manager',
    subtitle: 'Back-office administrative suite for product onboarding and card styling.',
    stage: 'Stage 2',
  },
  'store-admin': {
    title: 'Store Administrator Console',
    subtitle: 'Central operations, user governance, manager approval, and catalogue monitoring.',
    stage: 'Stage 4.6',
  },
  'store-checkout': {
    title: 'Multi-Store Checkout',
    subtitle: 'Consolidated checkout and package dispatch review.',
    stage: 'Stage 5',
  },
  'store-payment': {
    title: 'Simulated QR Payment',
    subtitle: 'Secure simulated QR payment terminal.',
    stage: 'Stage 5',
  },
  'store-order-success': {
    title: 'Order Confirmation & Invoice',
    subtitle: 'Proof of purchase, order receipts, and printable invoices.',
    stage: 'Stage 5',
  },
};

export function StorePlaceholder({
  view,
  onNavigateHome,
  onExitPortalToLibrary,
}: StorePlaceholderProps) {
  const info = PLACEHOLDER_INFO[view] || {
    title: 'Store Destination',
    subtitle: 'Under development for Akashic Store.',
    stage: 'Upcoming Stage',
  };

  return (
    <div className={styles.placeholderWrapper}>
      <div className={styles.badge}>
        <Sparkles size={14} />
        <span>Roadmap: {info.stage}</span>
      </div>

      <h1 className={styles.title}>{info.title}</h1>
      <p className={styles.description}>{info.subtitle}</p>

      <div className={styles.actions}>
        {view !== 'store' && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onNavigateHome}
          >
            Return to Store Home
          </button>
        )}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onExitPortalToLibrary}
        >
          <ArrowLeft size={16} style={{ display: 'inline', marginRight: 6 }} />
          Return to Library Sanctuary
        </button>
      </div>
    </div>
  );
}
