import type { StoreNavItem, StoreViewMode } from '../types/store';

export const STORE_NAV_ITEMS: StoreNavItem[] = [
  {
    id: 'store-allbooks',
    label: 'All Books',
    href: '?view=store-allbooks',
    description: 'Browse curated physical editions and boxed releases',
  },
  {
    id: 'store-gifting',
    label: 'Gifting',
    href: '?view=store-gifting',
    description: 'Gift monthly reading membership boxes',
  },
  {
    id: 'store-merch',
    label: 'Shopping Bag',
    href: '?view=store-merch',
    description: 'View books and exclusive editions in your reading box',
  },
  {
    id: 'store-faq',
    label: 'FAQ',
    href: '?view=store-faq',
    description: 'Frequently asked questions about shipments and memberships',
  },
];

export const STORE_VIEWS: readonly StoreViewMode[] = [
  'store',
  'store-allbooks',
  'store-manager',
  'store-admin',
  'store-book-detail',
  'store-gifting',
  'store-merch',
  'store-checkout',
  'store-payment',
  'store-order-success',
  'store-faq',
] as const;

export function isStoreView(view: string | null | undefined): view is StoreViewMode {
  if (!view) return false;
  return (STORE_VIEWS as readonly string[]).includes(view);
}
