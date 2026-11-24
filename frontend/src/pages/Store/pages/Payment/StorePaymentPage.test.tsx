import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorePaymentPage } from './StorePaymentPage';
import * as storeService from '@/services/storeService';
import type { OrderRecord } from '../../types/store';

vi.mock('@/services/storeService', () => ({
  confirmDemoPayment: vi.fn(),
}));

const mockOrder: OrderRecord = {
  id: 'order-pay-1',
  order_number: 'AK-2026-PAY123',
  status: 'PENDING',
  payment_status: 'PENDING',
  subtotal: '70.00',
  total: '70.00',
  payment_reference: 'DEMO-PAY-PAY123',
  customer_name: 'Test Patron',
  customer_email: 'patron@test.com',
  shipping_address: {
    recipient: 'Test Patron',
    address_line1: '123 Main St',
    city: 'City',
    state: 'ST',
    postal_code: '12345',
    country: 'Country',
  },
  qr_payload: 'akashic-demo-pay:order-pay-1:70.00',
  store_groups: [],
  created_at: new Date().toISOString(),
};

describe('StorePaymentPage', () => {
  const onNavigateStore = vi.fn();
  const onPaymentSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders simulated QR scanner and amount due', () => {
    render(
      <StorePaymentPage
        onNavigateStore={onNavigateStore}
        order={mockOrder}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    expect(screen.getByText(/Scan to Clear Demo Payment/i)).toBeInTheDocument();
    expect(screen.getByText('AK-2026-PAY123')).toBeInTheDocument();
    expect(screen.getByText('$70.00')).toBeInTheDocument();
    expect(screen.getByLabelText(/Demo QR Payment Code/i)).toBeInTheDocument();
  });

  it('confirms demo payment and navigates to order success view', async () => {
    vi.mocked(storeService.confirmDemoPayment).mockResolvedValueOnce({
      ...mockOrder,
      status: 'CONFIRMED',
      payment_status: 'PAID',
    });

    render(
      <StorePaymentPage
        onNavigateStore={onNavigateStore}
        order={mockOrder}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Simulate Successful Payment/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(storeService.confirmDemoPayment).toHaveBeenCalledWith('order-pay-1');
      expect(onNavigateStore).toHaveBeenCalledWith('store-order-success');
    });
  });

  it('allows cancelling payment and returning to shopping bag', () => {
    render(
      <StorePaymentPage
        onNavigateStore={onNavigateStore}
        order={mockOrder}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel and Return to Shopping Bag/i });
    fireEvent.click(cancelBtn);

    expect(onNavigateStore).toHaveBeenCalledWith('store-merch');
  });
});
