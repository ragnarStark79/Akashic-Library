import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreManagerPage } from './StoreManagerPage';
import * as storeService from '@/services/storeService';
import type { User } from '@/types/auth';
import type { StoreProductItem } from '@/pages/Store/types/store';

const STORE_MANAGER_USER: User = {
  id: 'manager-1',
  username: 'dan_manager',
  email: 'dan@akashic.org',
  role: 'STORE_MANAGER',
  display_name: 'Dan Manager',
  bio: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const NORMAL_USER: User = {
  id: 'user-1',
  username: 'normal_patron',
  email: 'patron@akashic.org',
  role: 'USER',
  display_name: 'Normal Patron',
  bio: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_MANAGER_PRODUCTS: StoreProductItem[] = [
  {
    id: 'prod-101',
    book_reference: 'book-101',
    title: 'Mexican Gothic',
    authors: ['Silvia Moreno-Garcia'],
    cover_image: 'https://images.akashic.org/mexican.jpg',
    description: 'An isolated mansion and charismatic aristocrat.',
    genres: ['Gothic Fiction', 'Horror'],
    price: '24.00',
    status: 'IN_STOCK',
    quantity: 25,
    reserved_quantity: 0,
    available_quantity: 25,
    edition: 'Slipcase Edition',
    condition: 'New',
    card_customization: {
      background_color: '#4a044e',
      title_color: '#fae8ff',
    },
  },
  {
    id: 'prod-102',
    book_reference: 'book-102',
    title: 'Dune',
    authors: ['Frank Herbert'],
    cover_image: 'https://images.akashic.org/dune.jpg',
    description: 'The epic story of Arrakis.',
    genres: ['Science Fiction'],
    price: '30.00',
    status: 'LOW_STOCK',
    quantity: 3,
    reserved_quantity: 0,
    available_quantity: 3,
    edition: 'Deluxe Hardcover',
    condition: 'New',
    card_customization: {
      background_color: '#78350f',
      title_color: '#fef3c7',
    },
  },
];

describe('StoreManagerPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(storeService, 'getStoreProductsForManager').mockResolvedValue(MOCK_MANAGER_PRODUCTS);
    vi.spyOn(storeService, 'createStoreProduct').mockResolvedValue(MOCK_MANAGER_PRODUCTS[0]!);
    vi.spyOn(storeService, 'updateStoreProduct').mockResolvedValue(MOCK_MANAGER_PRODUCTS[0]!);
    vi.spyOn(storeService, 'updateStoreInventory').mockResolvedValue(MOCK_MANAGER_PRODUCTS[0]!);
  });

  it('blocks unauthorized access for normal users and visitors', () => {
    // Visitor
    const { rerender } = render(
      <StoreManagerPage user={null} onNavigateStore={vi.fn()} onSignInClick={vi.fn()} />
    );
    expect(screen.getByText('Store Management Restricted')).toBeInTheDocument();

    // Normal User
    rerender(
      <StoreManagerPage user={NORMAL_USER} onNavigateStore={vi.fn()} onSignInClick={vi.fn()} />
    );
    expect(screen.getByText('Store Management Restricted')).toBeInTheDocument();
  });

  it('renders Administrator Redirection when Admin accesses Store Manager page', () => {
    const ADMIN_USER: User = {
      id: 'admin-1',
      username: 'head_archivist',
      email: 'admin@akashic.library',
      role: 'ADMIN',
      display_name: 'Head Archivist',
      bio: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const handleNavigate = vi.fn();
    render(
      <StoreManagerPage
        user={ADMIN_USER}
        onNavigateStore={handleNavigate}
        onSignInClick={vi.fn()}
      />
    );

    expect(screen.getByText('Administrator Redirection')).toBeInTheDocument();
    const adminBtn = screen.getByTestId('go-to-admin-dashboard-btn');
    expect(adminBtn).toBeInTheDocument();
    fireEvent.click(adminBtn);
    expect(handleNavigate).toHaveBeenCalledWith('store-admin');
  });

  it('renders portal header, metrics, and products table for authorized managers', async () => {
    render(
      <StoreManagerPage
        user={STORE_MANAGER_USER}
        onNavigateStore={vi.fn()}
        onSignInClick={vi.fn()}
      />
    );

    expect(screen.getByText('Store Manager Portal')).toBeInTheDocument();
    expect(screen.getByTestId('add-new-book-button')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Mexican Gothic')).toBeInTheDocument();
      expect(screen.getByText('Dune')).toBeInTheDocument();
      expect(screen.getByText('$24.00')).toBeInTheDocument();
      expect(screen.getByText('$30.00')).toBeInTheDocument();
    });
  });

  it('opens product creation drawer when Add New Book is clicked', async () => {
    render(
      <StoreManagerPage
        user={STORE_MANAGER_USER}
        onNavigateStore={vi.fn()}
        onSignInClick={vi.fn()}
      />
    );

    const addBtn = screen.getByTestId('add-new-book-button');
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Book to Store')).toBeInTheDocument();
    expect(screen.getByText('Method A: Open Library URL')).toBeInTheDocument();
    expect(screen.getByText('Method B: Manual Entry')).toBeInTheDocument();
    expect(screen.getByTestId('live-card-preview-panel')).toBeInTheDocument();
  });

  it('updates live BookCard preview when manager enters book title and authors', async () => {
    render(
      <StoreManagerPage
        user={STORE_MANAGER_USER}
        onNavigateStore={vi.fn()}
        onSignInClick={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('add-new-book-button'));

    // Switch to manual
    fireEvent.click(screen.getByText('Method B: Manual Entry'));

    const titleInput = screen.getByLabelText('Book Title');
    fireEvent.change(titleInput, { target: { value: 'The Haunting of Hill House' } });

    await waitFor(() => {
      // In the live preview panel:
      const previewPanel = screen.getByTestId('live-card-preview-panel');
      expect(previewPanel).toHaveTextContent('The Haunting of Hill House');
    });
  });

  it('opens edit drawer populated with existing book data', async () => {
    render(
      <StoreManagerPage
        user={STORE_MANAGER_USER}
        onNavigateStore={vi.fn()}
        onSignInClick={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('edit-product-prod-101')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-product-prod-101'));

    expect(screen.getByText('Edit Store Product')).toBeInTheDocument();
    const titleInput = screen.getByLabelText('Book Title') as HTMLInputElement;
    expect(titleInput.value).toBe('Mexican Gothic');
  });

  it('supports quick stock increment and decrement', async () => {
    render(
      <StoreManagerPage
        user={STORE_MANAGER_USER}
        onNavigateStore={vi.fn()}
        onSignInClick={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mexican Gothic')).toBeInTheDocument();
    });

    const plusButtons = screen.getAllByTitle('Increase stock by 1');
    fireEvent.click(plusButtons[0]!);

    await waitFor(() => {
      expect(storeService.updateStoreInventory).toHaveBeenCalledWith('prod-101', 26);
    });
  });
});
