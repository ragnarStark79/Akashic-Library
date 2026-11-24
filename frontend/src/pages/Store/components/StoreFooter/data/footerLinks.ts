import type { StoreViewMode } from '../../../types/store';

export interface StoreFooterLink {
  id: string;
  label: string;
  view?: StoreViewMode;
  isSanctuaryPortal?: boolean;
}

export const STORE_NAV_LINKS: StoreFooterLink[] = [
  { id: 'all-books', label: 'All Books', view: 'store-allbooks' },
  { id: 'gifting', label: 'Gifting', view: 'store-gifting' },
  { id: 'merch', label: 'Merch', view: 'store-merch' },
  { id: 'common-questions', label: 'Common Questions', view: 'store-faq' },
];

export const SANCTUARY_NAV_LINKS: StoreFooterLink[] = [
  { id: 'sanctuary-home', label: 'Discovery Home', isSanctuaryPortal: true },
  { id: 'sanctuary-reading', label: 'Reading Room', isSanctuaryPortal: true },
  { id: 'sanctuary-community', label: 'Community Hub', isSanctuaryPortal: true },
];

export const LEGAL_LINKS = [
  { id: 'terms', label: 'Terms of Service', href: '/terms-of-service' },
  { id: 'privacy', label: 'Privacy Policy', href: '/privacy-policy' },
];
