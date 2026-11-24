import type { User } from '@/types/auth';

export type StoreViewMode =
  | 'store'
  | 'store-allbooks'
  | 'store-manager'
  | 'store-admin'
  | 'store-book-detail'
  | 'store-gifting'
  | 'store-merch'
  | 'store-checkout'
  | 'store-payment'
  | 'store-order-success'
  | 'store-faq';

export interface CardCustomization {
  background_color?: string;
  title_color?: string;
  description_color?: string;
  genre_badge_colors?: Record<string, string>;
}

export type StoreProductStatus =
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'DISCONTINUED'
  | 'PREORDER';

export interface AtAGlanceTag {
  icon: string;
  label: string;
  bg_color?: string;
  text_color?: string;
}

export interface EditorialProofCard {
  heading?: string;
  quote: string;
  attribution?: string;
  publication?: string;
  bg_color?: string;
  text_color?: string;
  attribution_color?: string;
}

export interface BdpHeroTheme {
  background_color?: string;
  wave_color?: string;
  accent_color?: string;
  title_color?: string;
  author_color?: string;
}

export interface StoreProductDetailContent {
  original_price?: string | number | null;
  is_discounted?: boolean;
  discount_percentage?: number | null;
  hero_theme?: BdpHeroTheme;
  hero_title_color?: string;
  at_a_glance?: AtAGlanceTag[];
  synopsis?: string;
  full_description?: string;
  editorial_cards?: EditorialProofCard[];
  excerpt?: string;
  sample_excerpt?: string;
  why_we_chose?: string;
  content_warnings?: string[];
}

export interface StoreProductItem {
  id: string;
  book_reference: string;
  edition?: string;
  condition?: string;
  price: string;
  original_price?: string | null;
  is_discounted?: boolean;
  discount_percentage?: number | null;
  status: StoreProductStatus;
  title: string;
  authors: string[];
  cover_image: string;
  description: string;
  genres: string[];
  isbn?: string | null;
  custom_cover_url?: string;
  custom_description?: string;
  custom_genres?: string[];
  card_customization?: CardCustomization;
  detail?: StoreProductDetailContent;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  store_id?: string | null;
  store_name?: string;
  manager_username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OpenLibraryImportPreview {
  source_type: string;
  source_id: string;
  title: string;
  authors: string[];
  description: string;
  cover_urls: string[];
  genres: string[];
  publisher?: string;
  published_date?: string;
  isbn13?: string | null;
  isbn10?: string | null;
}

export interface StoreProductCreatePayload {
  book_reference?: string;
  manual_book?: {
    title: string;
    authors: string[];
    description?: string;
    genres?: string[];
    cover_url?: string;
    isbn13?: string;
    publisher?: string;
    published_date?: string;
  };
  open_library_data?: OpenLibraryImportPreview;
  price: number | string;
  edition?: string;
  condition?: string;
  status?: StoreProductStatus;
  quantity?: number;
  reserved_quantity?: number;
  custom_cover_url?: string;
  custom_description?: string;
  custom_genres?: string[];
  card_customization?: CardCustomization;
}

export interface StoreProductUpdatePayload {
  price?: number | string;
  edition?: string;
  condition?: string;
  status?: StoreProductStatus;
  custom_cover_url?: string;
  custom_description?: string;
  custom_genres?: string[];
  card_customization?: CardCustomization;
}

export interface StoreNavItem {
  id: StoreViewMode;
  label: string;
  href: string;
  badge?: string;
  description?: string;
}

export type PortalTransitionStage = 'idle' | 'entering' | 'exiting';

export interface StoreHeaderProps {
  activeView: StoreViewMode;
  onNavigate: (view: StoreViewMode) => void;
  onExitPortalToLibrary: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  user: User | null;
  className?: string;
}

export interface StoreMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: StoreViewMode;
  onNavigate: (view: StoreViewMode) => void;
  onExitPortalToLibrary: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  user: User | null;
}

export interface StoreFooterProps {
  onNavigate: (view: StoreViewMode) => void;
  onExitPortalToLibrary: () => void;
  className?: string;
}

export interface StoreTransitionOverlayProps {
  stage: PortalTransitionStage;
  targetExperience: 'store' | 'library';
  onAnimationComplete?: () => void;
}

export interface StoreLayoutProps {
  activeView: StoreViewMode;
  onNavigate: (view: StoreViewMode) => void;
  onExitPortalToLibrary: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  user: User | null;
  children: React.ReactNode;
}

// ── Stage 5 Multi-Store Shopping Bag, Checkout & Order Types ─────────────────

export interface CartItemOffer {
  product_id: string;
  store_id: string | null;
  store_name: string;
  price: string | number;
  edition: string;
  condition: string;
  available_quantity: number;
  status: string;
  is_current: boolean;
}

export interface CartItem {
  id: string;
  product_id: string;
  book_reference: string;
  edition?: string;
  condition?: string;
  current_price: number | string;
  quantity: number;
  available_quantity: number;
  line_subtotal: number;
  title: string;
  author: string;
  cover_image: string;
  genres: string[];
  store_id: string | null;
  store_name: string;
  is_discounted?: boolean;
  original_price?: string | null;
  discount_percentage?: number | null;
  available_stores?: CartItemOffer[];
  created_at?: string;
  updated_at?: string;
}

export interface EligibleGlobalStore {
  store_id: string;
  store_name: string;
  manager_username: string;
}

export interface CartResponse {
  id: string;
  status: string;
  cart_subtotal: number;
  items: CartItem[];
  eligible_global_stores: EligibleGlobalStore[];
  created_at?: string;
  updated_at?: string;
}

export interface ShippingAddress {
  recipient: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface CheckoutPayload {
  customer_name: string;
  customer_email: string;
  shipping_address: ShippingAddress;
  payment_method?: string;
}

export interface OrderStoreGroupItem {
  id: string;
  product_id?: string;
  title: string;
  author: string;
  cover_image: string;
  edition: string;
  quantity: number;
  price: string | number;
  original_price?: string | number | null;
  discount_percentage?: number | null;
  line_total: string | number;
}

export interface OrderStoreGroup {
  store_name: string;
  store_manager_id: string | null;
  items: OrderStoreGroupItem[];
  subtotal: number;
  item_count: number;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  subtotal: string | number;
  total: string | number;
  payment_reference: string;
  customer_name: string;
  customer_email: string;
  shipping_address: ShippingAddress;
  qr_payload: string;
  store_groups: OrderStoreGroup[];
  items?: any[];
  created_at: string;
  paid_at?: string | null;
}

export interface InvoiceStoreGroup {
  store_name: string;
  store_manager_id: string | null;
  curator_name?: string;
  subtotal: number;
  item_count: number;
  items: Array<{
    id: string;
    title: string;
    author: string;
    edition: string;
    quantity: number;
    unit_price: string | number;
    original_price?: string | number | null;
    line_total: string | number;
  }>;
}

export interface InvoiceData {
  invoice_id: string;
  order_number: string;
  invoice_date: string;
  payment_date: string | null;
  order_status: string;
  payment_status: string;
  payment_reference: string;
  customer: {
    name: string;
    email: string;
    shipping_address: ShippingAddress;
  };
  financials: {
    subtotal: string | number;
    tax: string | number;
    shipping: string | number;
    total: string | number;
    currency: string;
  };
  store_groups: InvoiceStoreGroup[];
  total_items: number;
  legal_notice: string;
}
