import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreAllBooksPage } from './StoreAllBooksPage';
import * as storeService from '@/services/storeService';
import type { StoreProductItem } from '@/pages/Store/types/store';

const MOCK_PRODUCTS: StoreProductItem[] = [
  {
    id: 'prod-1',
    book_reference: 'book-1',
    title: 'Frankenstein',
    authors: ['Mary Shelley'],
    cover_image: 'https://images.akashic.org/frankenstein.jpg',
    description: 'A gothic horror masterpiece of life and science.',
    genres: ['Horror', 'Gothic Fiction'],
    price: '19.99',
    status: 'IN_STOCK',
    quantity: 15,
    reserved_quantity: 0,
    available_quantity: 15,
    card_customization: {
      background_color: '#1e293b',
      title_color: '#ffffff',
    },
  },
  {
    id: 'prod-2',
    book_reference: 'book-2',
    title: 'Monsters of Ohio',
    authors: ['John Scalzi'],
    cover_image: 'https://images.akashic.org/monsters.jpg',
    description: 'A tentacular solution to modern problems.',
    genres: ['Science Fiction', 'Satire'],
    price: '26.00',
    status: 'IN_STOCK',
    quantity: 20,
    reserved_quantity: 0,
    available_quantity: 20,
    card_customization: {
      background_color: '#3b6e8c',
      title_color: '#ffffff',
    },
  },
  {
    id: 'prod-3',
    book_reference: 'book-3',
    title: 'Bones of Jade, Flesh like Ice',
    authors: ['Gracie Marsden'],
    cover_image: 'https://images.akashic.org/bones.jpg',
    description: 'A bargain with a shapeshifting demon.',
    genres: ['Fantasy', 'Historical Fiction'],
    price: '27.00',
    status: 'IN_STOCK',
    quantity: 12,
    reserved_quantity: 0,
    available_quantity: 12,
    card_customization: {
      background_color: '#b91c1c',
      title_color: '#ffffff',
    },
  },
];

describe('StoreAllBooksPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
    vi.spyOn(storeService, 'getStoreProducts').mockResolvedValue(MOCK_PRODUCTS);
  });

  it('renders catalogue hero title and description', async () => {
    render(<StoreAllBooksPage />);

    expect(screen.getByText('Explore our selections')).toBeInTheDocument();
    expect(
      screen.getByText(/We’ve got a full-time team dedicated to sourcing the hottest new releases/i)
    ).toBeInTheDocument();
  });

  it('renders search input and magenta search button', async () => {
    render(<StoreAllBooksPage />);

    const searchInput = screen.getByTestId('allbooks-search-input');
    const searchButton = screen.getByTestId('allbooks-search-button');

    expect(searchInput).toBeInTheDocument();
    expect(searchButton).toBeInTheDocument();
  });

  it('renders horizontal genre filter bar with canonical tags', async () => {
    render(<StoreAllBooksPage />);

    expect(screen.getByTestId('genre-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('genre-filter-horror')).toBeInTheDocument();
    expect(screen.getByTestId('genre-filter-sci-fi')).toBeInTheDocument();
    expect(screen.getByTestId('genre-filter-fantasy')).toBeInTheDocument();
  });

  it('renders genre carousels with loaded products', async () => {
    render(<StoreAllBooksPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Frankenstein')[0]).toBeInTheDocument();
      expect(screen.getByText('Monsters of Ohio')).toBeInTheDocument();
      expect(screen.getAllByText('Bones of Jade, Flesh like Ice')[0]).toBeInTheDocument();
    });
  });

  it('filters by genre when a genre chip is clicked, showing only that genre', async () => {
    render(<StoreAllBooksPage initialGenre="all" />);

    await waitFor(() => {
      expect(screen.getAllByText('Frankenstein')[0]).toBeInTheDocument();
      expect(screen.getByText('Monsters of Ohio')).toBeInTheDocument();
    });

    // Click Horror chip
    const horrorTag = screen.getByTestId('genre-filter-horror');
    fireEvent.click(horrorTag);

    await waitFor(() => {
      // Horror book is present (exactly 1 instance now since Gothic Fiction is hidden)
      expect(screen.getByText('Frankenstein')).toBeInTheDocument();
      // Sci-fi book is hidden
      expect(screen.queryByText('Monsters of Ohio')).not.toBeInTheDocument();
      expect(screen.queryByText('Bones of Jade, Flesh like Ice')).not.toBeInTheDocument();
    });
  });

  it('resets filter when All Books tag is clicked', async () => {
    render(<StoreAllBooksPage initialGenre="Horror" />);

    await waitFor(() => {
      expect(screen.getByText('Frankenstein')).toBeInTheDocument();
      expect(screen.queryByText('Monsters of Ohio')).not.toBeInTheDocument();
    });

    const allBooksTag = screen.getByTestId('genre-filter-all');
    fireEvent.click(allBooksTag);

    await waitFor(() => {
      expect(screen.getAllByText('Frankenstein')[0]).toBeInTheDocument();
      expect(screen.getByText('Monsters of Ohio')).toBeInTheDocument();
    });
  });

  it('filters books by search query', async () => {
    render(<StoreAllBooksPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Frankenstein')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('allbooks-search-input');
    fireEvent.change(searchInput, { target: { value: 'Scalzi' } });

    const searchButton = screen.getByTestId('allbooks-search-button');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Monsters of Ohio')).toBeInTheDocument();
      expect(screen.queryByText('Frankenstein')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when search produces no results', async () => {
    render(<StoreAllBooksPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Frankenstein')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('allbooks-search-input');
    fireEvent.change(searchInput, { target: { value: 'NonexistentBookXYZ' } });

    const searchButton = screen.getByTestId('allbooks-search-button');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByTestId('catalogue-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/No books found/i)).toBeInTheDocument();
    });
  });
});
