import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreOrderSuccessPage } from './StoreOrderSuccessPage';
import * as storeService from '@/services/storeService';
import type { InvoiceData } from '../../types/store';

vi.mock('@/services/storeService', () => ({
  getOrderInvoice: vi.fn(),
}));

const mockInvoice: InvoiceData = {
  invoice_id: 'INV-2026-TEST1',
  order_number: 'AK-2026-ORDERTEST',
  invoice_date: new Date().toISOString(),
  payment_date: new Date().toISOString(),
  order_status: 'CONFIRMED',
  payment_status: 'PAID',
  payment_reference: 'DEMO-PAY-REFTEST',
  customer: {
    name: 'Eleanor Vance',
    email: 'eleanor@hillhouse.org',
    shipping_address: {
      recipient: 'Eleanor Vance',
      address_line1: 'Hill House Lane',
      city: 'Hillsdale',
      state: 'VT',
      postal_code: '05401',
      country: 'United States',
    },
  },
  financials: {
    subtotal: '45.00',
    tax: '0.00',
    shipping: '0.00',
    total: '45.00',
    currency: 'USD',
  },
  store_groups: [
    {
      store_name: 'The Antiquarian Archives',
      store_manager_id: 'mgr-1',
      curator_name: 'Alexandre Dumas',
      subtotal: 45.0,
      item_count: 2,
      items: [
        {
          id: 'inv-item-1',
          title: 'The Haunting of Hill House',
          author: 'Shirley Jackson',
          edition: 'Clothbound Edition',
          quantity: 1,
          unit_price: 25.0,
          original_price: null,
          line_total: 25.0,
        },
        {
          id: 'inv-item-2',
          title: 'We Have Always Lived in the Castle',
          author: 'Shirley Jackson',
          edition: 'First Edition',
          quantity: 1,
          unit_price: 20.0,
          original_price: null,
          line_total: 20.0,
        },
      ],
    },
  ],
  total_items: 2,
  legal_notice: 'Official Akashic Sanctuary Proof of Purchase.',
};

describe('StoreOrderSuccessPage', () => {
  const onNavigateStore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invoice details, store packages, and customer info', async () => {
    vi.mocked(storeService.getOrderInvoice).mockResolvedValueOnce(mockInvoice);

    render(
      <StoreOrderSuccessPage
        onNavigateStore={onNavigateStore}
        orderId="order-test-123"
      />
    );

    expect(await screen.findByText(/Your Reading Box is on Its Way!/i)).toBeInTheDocument();
    expect(screen.getByText('AK-2026-ORDERTEST')).toBeInTheDocument();
    expect(screen.getByText(/The Antiquarian Archives/i)).toBeInTheDocument();
    expect(screen.getByText('The Haunting of Hill House')).toBeInTheDocument();
    expect(screen.getByText('We Have Always Lived in the Castle')).toBeInTheDocument();
    expect(screen.getByText('Eleanor Vance')).toBeInTheDocument();
    expect(screen.getByText('PAID IN FULL (DEMO)')).toBeInTheDocument();
  });

  it('navigates to all books when Explore More Books is clicked', async () => {
    vi.mocked(storeService.getOrderInvoice).mockResolvedValueOnce(mockInvoice);

    render(
      <StoreOrderSuccessPage
        onNavigateStore={onNavigateStore}
        orderId="order-test-123"
      />
    );

    const exploreBtn = await screen.findByRole('button', { name: /Explore More Books/i });
    fireEvent.click(exploreBtn);

    expect(onNavigateStore).toHaveBeenCalledWith('store-allbooks');
  });

  it('triggers window.print when Print Invoice button is clicked', async () => {
    vi.mocked(storeService.getOrderInvoice).mockResolvedValueOnce(mockInvoice);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <StoreOrderSuccessPage
        onNavigateStore={onNavigateStore}
        orderId="order-test-123"
      />
    );

    const printBtn = await screen.findByRole('button', { name: /Print \/ Save Invoice/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
