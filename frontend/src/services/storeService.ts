/**
 * Store Service — Communicates with the Django Akashic Store commerce and catalogue APIs.
 * Supports public catalogue fetching, genre filtering, search,
 * Open Library preview/imports, manual book creation, product management,
 * Book Detail Page (BDP) editorial content, and Add-to-Box integration.
 */

import type {
  StoreProductItem,
  StoreProductCreatePayload,
  StoreProductUpdatePayload,
  StoreProductDetailContent,
  OpenLibraryImportPreview,
  CartResponse,
  CheckoutPayload,
  OrderRecord,
  InvoiceData,
  InvoiceStoreGroup,
} from '@/pages/Store/types/store';
import { getAuthHeaders } from './authService';

const BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export interface StoreProductListResponse {
  results: StoreProductItem[];
  count: number;
}

export interface StoreQueryParams {
  genre?: string;
  search?: string;
  status?: string;
}

/**
 * Fetch public store products with optional genre, search, and status filters.
 */
export async function getStoreProducts(params: StoreQueryParams = {}): Promise<StoreProductItem[]> {
  const query = new URLSearchParams();
  if (params.genre && params.genre.toLowerCase() !== 'all') {
    query.set('genre', params.genre);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.status) {
    query.set('status', params.status);
  }

  const queryString = query.toString();
  const url = `${BASE_URL}/store/products/${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch store products: ${res.statusText}`);
  }

  const data: StoreProductListResponse = await res.json();
  return data.results || [];
}

/**
 * Fetch details for a single store product.
 */
export async function getStoreProduct(id: string): Promise<StoreProductItem> {
  const res = await fetch(`${BASE_URL}/store/products/${id}/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch store product ${id}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch products for the Store Manager dashboard (includes out of stock and discontinued items).
 */
export async function getStoreProductsForManager(params: StoreQueryParams = {}): Promise<StoreProductItem[]> {
  const query = new URLSearchParams();
  if (params.genre && params.genre.toLowerCase() !== 'all') {
    query.set('genre', params.genre);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.status) {
    query.set('status', params.status);
  }

  const queryString = query.toString();
  const url = `${BASE_URL}/store/products/manage/${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch manager products: ${res.statusText}`);
  }

  const data: StoreProductListResponse = await res.json();
  return data.results || [];
}

/**
 * Preview book metadata from Open Library URL before importing.
 */
export async function previewOpenLibraryImport(url: string): Promise<OpenLibraryImportPreview> {
  const res = await fetch(`${BASE_URL}/store/products/import-preview/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.url || errorData.detail || 'Failed to preview Open Library book.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  return res.json();
}

/**
 * Create a new store product (manual entry or Open Library import).
 */
export async function createStoreProduct(payload: StoreProductCreatePayload): Promise<StoreProductItem> {
  const res = await fetch(`${BASE_URL}/store/products/manage/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || errorData.url || 'Failed to create product.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  return res.json();
}

/**
 * Update an existing store product's attributes, customizations, or status.
 */
export async function updateStoreProduct(
  id: string,
  payload: StoreProductUpdatePayload
): Promise<StoreProductItem> {
  const res = await fetch(`${BASE_URL}/store/products/${id}/manage/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || 'Failed to update product.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  return res.json();
}

/**
 * Update a store product's inventory levels.
 */
export async function updateStoreInventory(
  id: string,
  quantity: number,
  reserved_quantity?: number
): Promise<StoreProductItem> {
  const payload: { quantity: number; reserved_quantity?: number } = { quantity };
  if (typeof reserved_quantity === 'number') {
    payload.reserved_quantity = reserved_quantity;
  }

  const res = await fetch(`${BASE_URL}/store/products/${id}/inventory/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || 'Failed to update inventory.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  return res.json();
}

/**
 * Update a store product's rich Book Detail Page (BDP) editorial content.
 */
export async function updateStoreProductDetail(
  id: string,
  detailPayload: StoreProductDetailContent
): Promise<StoreProductItem> {
  const res = await fetch(`${BASE_URL}/store/products/${id}/detail/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(detailPayload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || 'Failed to update detail content.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  return res.json();
}

/**
 * Fetch overview metrics scoped for the authenticated store manager.
 */
export async function getStoreManagerOverview(): Promise<{
  total_products: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  available_units: number;
  completed_orders_count: number;
  gross_revenue: string;
}> {
  const res = await fetch(`${BASE_URL}/store/manager/overview/`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch manager overview.');
  }

  return res.json();
}

/**
 * Fetch revenue analytics scoped for the authenticated store manager.
 */
export async function getStoreManagerRevenue(): Promise<{
  total_completed_orders: number;
  gross_revenue: string;
  total_inventory_value: string;
  books: Array<{
    id: string;
    title: string;
    edition: string;
    price: string;
    quantity: number;
    inventory_value: string;
    units_sold: number;
    gross_revenue: string;
  }>;
}> {
  const res = await fetch(`${BASE_URL}/store/manager/revenue/`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch manager revenue.');
  }

  return res.json();
}

const CART_COUNT_KEY = 'akashic_store_cart_count';
const CART_EVENT_NAME = 'akashic_store_cart_updated';

/**
 * Get current shopping bag item count.
 */
export async function getCartCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/cart/`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      const count = (data.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
      localStorage.setItem(CART_COUNT_KEY, String(count));
      return count;
    }
  } catch {
    // Fall back to local storage
  }

  const stored = localStorage.getItem(CART_COUNT_KEY);
  return stored ? Math.max(0, parseInt(stored, 10) || 0) : 0;
}

const BOX_QUANTITIES_KEY = 'akashic_box_item_quantities';

function getLocalBoxQuantities(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BOX_QUANTITIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalBoxQuantity(productId: string, qty: number): number {
  const map = getLocalBoxQuantities();
  if (qty <= 0) {
    delete map[productId];
  } else {
    map[productId] = qty;
  }
  localStorage.setItem(BOX_QUANTITIES_KEY, JSON.stringify(map));
  return qty;
}

/**
 * Retrieve current item quantity for a specific product in the box.
 */
export async function getBoxItemQuantity(productId: string): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/store/products/${productId}/add-to-box/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ action: 'get' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.item_quantity === 'number') {
        setLocalBoxQuantity(productId, data.item_quantity);
        return data.item_quantity;
      }
    }
  } catch {
    // fallback to local storage
  }

  const map = getLocalBoxQuantities();
  return map[productId] || 0;
}

/**
 * Update quantity for a product in the box (increment, decrement, set).
 */
export async function updateBoxQuantity(
  productId: string,
  action: 'increment' | 'decrement' | 'set' = 'increment',
  quantity?: number
): Promise<{ success: boolean; cart_count: number; item_quantity: number; message: string }> {
  const localMap = getLocalBoxQuantities();
  const currentLocal = localMap[productId] || 0;

  let payloadQty = quantity ?? 1;
  if (action === 'decrement') {
    payloadQty = currentLocal;
  }

  const res = await fetch(`${BASE_URL}/store/products/${productId}/add-to-box/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ action, quantity: payloadQty }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || 'Failed to update shopping bag.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  const data = await res.json();
  const newItemQty = typeof data.item_quantity === 'number' ? data.item_quantity : 0;
  setLocalBoxQuantity(productId, newItemQty);

  const newTotalCount =
    typeof data.cart_count === 'number'
      ? data.cart_count
      : Object.values(getLocalBoxQuantities()).reduce((a, b) => a + b, 0);

  localStorage.setItem(CART_COUNT_KEY, String(newTotalCount));
  window.dispatchEvent(new CustomEvent(CART_EVENT_NAME, { detail: { count: newTotalCount } }));

  return {
    success: true,
    cart_count: newTotalCount,
    item_quantity: newItemQty,
    message: data.message || 'Updated shopping bag!',
  };
}

/**
 * Add a product to the box / shopping bag.
 */
export async function addToBox(
  productId: string,
  quantity: number = 1
): Promise<{ success: boolean; cart_count: number; item_quantity: number; message: string }> {
  return updateBoxQuantity(productId, 'increment', quantity);
}

/**
 * Subscribe to cart item count changes.
 */
export function subscribeCartCount(callback: (count: number) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ count: number }>;
    if (custom.detail && typeof custom.detail.count === 'number') {
      callback(custom.detail.count);
    }
  };
  window.addEventListener(CART_EVENT_NAME, handler);

  // Initial read
  getCartCount().then(callback).catch(() => {});

  return () => {
    window.removeEventListener(CART_EVENT_NAME, handler);
  };
}

// ── Stage 5 Multi-Store Shopping Bag, Checkout & Order Services ──────────────

/**
 * Retrieve the active user's cart enriched with seller attribution and alternate store offers.
 */
export async function getCart(): Promise<CartResponse> {
  const res = await fetch(`${BASE_URL}/cart/`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch shopping cart: ${res.statusText}`);
  }

  const data: CartResponse = await res.json();
  const totalCount = data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  localStorage.setItem(CART_COUNT_KEY, String(totalCount));
  window.dispatchEvent(new CustomEvent(CART_EVENT_NAME, { detail: { count: totalCount } }));

  return data;
}

/**
 * Update quantity for a specific cart line item.
 */
export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/cart/items/${itemId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.quantity || `Failed to update quantity: ${res.statusText}`);
  }
}

/**
 * Remove an item from the cart.
 */
export async function removeCartItem(itemId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/cart/items/${itemId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to remove item: ${res.statusText}`);
  }
}

/**
 * Switch the supplying store for a specific cart item to an alternate offer.
 */
export async function switchCartItemStore(itemId: string, newProductId: string): Promise<CartResponse> {
  const res = await fetch(`${BASE_URL}/cart/items/${itemId}/switch-store/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ product_id: newProductId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.detail || err.product_id || err.quantity || 'Failed to switch supplier store.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  const data: CartResponse = await res.json();
  return data;
}

/**
 * Apply a single selected store to all eligible books in the cart.
 */
export async function selectGlobalStore(storeId: string): Promise<CartResponse> {
  const res = await fetch(`${BASE_URL}/cart/select-global-store/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ store_id: storeId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.detail || err.store_id || 'Failed to apply global store selection.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  const data: CartResponse = await res.json();
  return data;
}

/**
 * Create a pending Order and Demo QR Payment session.
 */
export async function createCheckoutSession(payload: CheckoutPayload): Promise<OrderRecord> {
  const res = await fetch(`${BASE_URL}/checkout/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      payment_method: 'qr_demo',
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      shipping_address: payload.shipping_address,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.detail || err.error || 'Failed to initialize checkout session.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  const order: OrderRecord = await res.json();
  return order;
}

/**
 * Confirm a demo QR payment, atomically decrementing inventory and completing order.
 */
export async function confirmDemoPayment(orderId: string, idempotencyKey?: string): Promise<OrderRecord> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/confirm-payment/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ idempotency_key: idempotencyKey || '' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.detail || err.error || 'Payment confirmation failed.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }

  const order: OrderRecord = await res.json();

  // Reset cart count
  localStorage.setItem(CART_COUNT_KEY, '0');
  window.dispatchEvent(new CustomEvent(CART_EVENT_NAME, { detail: { count: 0 } }));

  return order;
}

/**
 * Fetch immutable purchase bill / invoice.
 */
export async function getOrderInvoice(orderId: string): Promise<InvoiceData> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/invoice/`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch purchase invoice: ${res.statusText}`);
  }

  const raw: any = await res.json();
  if (raw.order) {
    const order = raw.order;
    const store_groups: InvoiceStoreGroup[] = (order.store_groups || []).map((sg: any) => ({
      store_name: sg.store_name,
      store_manager_id: sg.store_manager_id,
      curator_name: sg.store_name,
      subtotal: Number(sg.subtotal || 0),
      item_count: sg.item_count || (sg.items || []).length,
      items: (sg.items || []).map((it: any) => ({
        id: it.id,
        title: it.title,
        author: it.author,
        edition: it.edition,
        quantity: it.quantity,
        unit_price: it.price,
        original_price: it.original_price,
        line_total: it.line_total,
      })),
    }));

    return {
      invoice_id: raw.invoice_number || `INV-${order.order_number}`,
      order_number: order.order_number,
      invoice_date: order.created_at,
      payment_date: order.paid_at || order.created_at,
      order_status: order.status,
      payment_status: order.payment_status,
      payment_reference: order.payment_reference,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        shipping_address: order.shipping_address,
      },
      financials: {
        subtotal: order.subtotal,
        tax: 0,
        shipping: 0,
        total: order.total,
        currency: 'USD',
      },
      store_groups,
      total_items: (order.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
      legal_notice: raw.disclaimer || 'Certified demonstration purchase receipt for the Akashic Library project.',
    };
  }

  return raw as InvoiceData;
}

/**
 * Fetch all alternative offers across approved managers for a product.
 */
export async function getProductOffers(productId: string): Promise<StoreProductItem[]> {
  const res = await fetch(`${BASE_URL}/store/products/${productId}/offers/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.offers || [];
}
