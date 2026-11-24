import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreCheckoutPage } from './StoreCheckoutPage';
import * as storeService from '@/services/storeService';
import type { CartResponse, OrderRecord } from '../../types/store';

vi.mock('@/services/storeService', () => ({
  getCart: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

const mockCart: CartResponse = {
  id: 'cart-1',
  status: 'ACTIVE',
  cart_subtotal: 55.0,
  items: [
    {
      id: 'it-1',
      product_id: 'prod-1',
      book_reference: 'ref-1',
      current_price: 25.0,
      quantity: 1,
      available_quantity: 10,
      line_subtotal: 25.0,
      title: 'Dracula',
      author: 'Bram Stoker',
      cover_image: '',
      genres: ['Horror'],
      store_id: 'mgr-1',
      store_name: 'The Antiquarian Archives',
    },
    {
      id: 'it-2',
      product_id: 'prod-2',
      book_reference: 'ref-2',
      current_price: 30.0,
      quantity: 1,
      available_quantity: 5,
      line_subtotal: 30.0,
      title: 'Neuromancer',
      author: 'William Gibson',
      cover_image: '',
      genres: ['Sci-Fi'],
      store_id: 'mgr-2',
      store_name: 'Celestial Folios & Curios',
    },
  ],
  eligible_global_stores: [],
};

const mockCreatedOrder: OrderRecord = {
  id: 'order-123',
  order_number: 'AK-2026-ORDER123',
  status: 'PENDING',
  payment_status: 'PENDING',
  subtotal: '55.00',
  total: '55.00',
  payment_reference: 'DEMO-PAY-REF123',
  customer_name: 'Test Patron',
  customer_email: 'patron@akashic.library',
  shipping_address: {
    recipient: 'Test Patron',
    address_line1: '123 Bookworm Lane',
    city: 'Oxford',
    state: 'OX',
    postal_code: 'OX1 2JD',
    country: 'United Kingdom',
  },
  qr_payload: 'akashic-demo-pay:order-123:55.00',
  store_groups: [],
  created_at: new Date().toISOString(),
};

const mockUser = {
  id: 'u-1',
  username: 'patron',
  email: 'patron@test.com',
  display_name: 'Test Patron',
  role: 'USER',
} as any;

describe('StoreCheckoutPage', () => {
  const onNavigateStore = vi.fn();
  const onOrderCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders multi-store package grouping and order summary', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce(mockCart);

    render(
      <StoreCheckoutPage
        onNavigateStore={onNavigateStore}
        user={mockUser}
        onOrderCreated={onOrderCreated}
      />
    );

    expect(await screen.findByText(/Review & Checkout/i)).toBeInTheDocument();
    expect(screen.getByText(/The Antiquarian Archives/i)).toBeInTheDocument();
    expect(screen.getByText(/Celestial Folios & Curios/i)).toBeInTheDocument();
    expect(screen.getByText('Dracula')).toBeInTheDocument();
    expect(screen.getByText('Neuromancer')).toBeInTheDocument();
    expect(screen.getAllByText('$55.00').length).toBeGreaterThanOrEqual(1);
  });

  it('submits checkout form and navigates to payment view', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce(mockCart);
    vi.mocked(storeService.createCheckoutSession).mockResolvedValueOnce(mockCreatedOrder);

    render(
      <StoreCheckoutPage
        onNavigateStore={onNavigateStore}
        user={mockUser}
        onOrderCreated={onOrderCreated}
      />
    );

    const submitBtn = await screen.findByRole('button', { name: /Proceed to Demo QR Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(storeService.createCheckoutSession).toHaveBeenCalled();
      expect(onNavigateStore).toHaveBeenCalledWith('store-payment');
    });
  });
});
