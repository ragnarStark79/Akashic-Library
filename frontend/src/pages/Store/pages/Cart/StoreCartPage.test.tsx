import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreCartPage } from './StoreCartPage';
import * as storeService from '@/services/storeService';
import type { CartResponse } from '../../types/store';

vi.mock('@/services/storeService', () => ({
  getCart: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  removeCartItem: vi.fn(),
  switchCartItemStore: vi.fn(),
  selectGlobalStore: vi.fn(),
}));

const mockCart: CartResponse = {
  id: 'cart-1',
  status: 'ACTIVE',
  cart_subtotal: 45.0,
  items: [
    {
      id: 'item-1',
      product_id: 'prod-1',
      book_reference: 'ref-1',
      edition: 'Special Clothbound',
      condition: 'New',
      current_price: 20.0,
      quantity: 1,
      available_quantity: 10,
      line_subtotal: 20.0,
      title: 'Frankenstein',
      author: 'Mary Shelley',
      cover_image: '/covers/frankenstein.webp',
      genres: ['Horror'],
      store_id: 'store-a',
      store_name: 'Alexandria Rare Manuscripts',
      available_stores: [
        {
          product_id: 'prod-1',
          store_id: 'store-a',
          store_name: 'Alexandria Rare Manuscripts',
          price: '20.00',
          edition: 'Special Clothbound',
          condition: 'New',
          available_quantity: 10,
          status: 'IN_STOCK',
          is_current: true,
        },
        {
          product_id: 'prod-1b',
          store_id: 'store-b',
          store_name: 'Byzantine Folio Guild',
          price: '25.00',
          edition: 'Gold Leaf Deluxe',
          condition: 'New',
          available_quantity: 5,
          status: 'IN_STOCK',
          is_current: false,
        },
      ],
    },
    {
      id: 'item-2',
      product_id: 'prod-2',
      book_reference: 'ref-2',
      edition: 'First Edition',
      condition: 'New',
      current_price: 25.0,
      quantity: 1,
      available_quantity: 8,
      line_subtotal: 25.0,
      title: 'Dune',
      author: 'Frank Herbert',
      cover_image: '/covers/dune.webp',
      genres: ['Science Fiction'],
      store_id: 'store-b',
      store_name: 'Byzantine Folio Guild',
      available_stores: [],
    },
  ],
  eligible_global_stores: [
    {
      store_id: 'store-b',
      store_name: 'Byzantine Folio Guild',
      manager_username: 'curator_b',
    },
  ],
};

describe('StoreCartPage', () => {
  const onNavigateStore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cart items and store attribution correctly', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce(mockCart);

    render(<StoreCartPage onNavigateStore={onNavigateStore} />);

    expect(await screen.findByText(/Your Reading Box/i)).toBeInTheDocument();
    expect(screen.getByText('Frankenstein')).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText(/Curated by: Alexandria Rare Manuscripts/i)).toBeInTheDocument();
    expect(screen.getByText(/Curated by: Byzantine Folio Guild/i)).toBeInTheDocument();
  });

  it('renders global store selection banner when eligible stores exist', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce(mockCart);

    render(<StoreCartPage onNavigateStore={onNavigateStore} />);

    expect(await screen.findByText(/Single-Store Fulfillment Option/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fulfill from this Store/i })).toBeInTheDocument();
  });

  it('allows switching store for an item', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce(mockCart);
    const firstItem = mockCart.items[0]!;
    const secondItem = mockCart.items[1]!;
    vi.mocked(storeService.switchCartItemStore).mockResolvedValueOnce({
      ...mockCart,
      items: [
        {
          ...firstItem,
          product_id: 'prod-1b',
          store_name: 'Byzantine Folio Guild',
          current_price: 25.0,
        },
        secondItem,
      ],
      cart_subtotal: 50.0,
    });

    render(<StoreCartPage onNavigateStore={onNavigateStore} />);

    expect(await screen.findByText('Frankenstein')).toBeInTheDocument();
    const storeSelect = screen.getByLabelText(/Switch Supplier:/i);
    fireEvent.change(storeSelect, { target: { value: 'prod-1b' } });

    await waitFor(() => {
      expect(storeService.switchCartItemStore).toHaveBeenCalledWith('item-1', 'prod-1b');
    });
  });

  it('navigates to checkout when Proceed to Checkout button is clicked', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce(mockCart);

    render(<StoreCartPage onNavigateStore={onNavigateStore} />);

    const checkoutBtn = await screen.findByRole('button', { name: /Proceed to Checkout/i });
    fireEvent.click(checkoutBtn);

    expect(onNavigateStore).toHaveBeenCalledWith('store-checkout');
  });

  it('renders empty state when cart has no items', async () => {
    vi.mocked(storeService.getCart).mockResolvedValueOnce({
      id: 'cart-empty',
      status: 'ACTIVE',
      cart_subtotal: 0,
      items: [],
      eligible_global_stores: [],
    });

    render(<StoreCartPage onNavigateStore={onNavigateStore} />);

    expect(await screen.findByText(/Your Reading Box is Empty/i)).toBeInTheDocument();
    const exploreBtn = screen.getByRole('button', { name: /Explore All Books/i });
    fireEvent.click(exploreBtn);
    expect(onNavigateStore).toHaveBeenCalledWith('store-allbooks');
  });
});
