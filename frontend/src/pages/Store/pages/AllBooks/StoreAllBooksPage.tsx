import { useState, useEffect, useCallback } from 'react';
import type { StoreProductItem } from '@/pages/Store/types/store';
import { getStoreProducts } from '@/services/storeService';
import { StoreAllBooksHero } from './components/StoreAllBooksHero';
import { StoreGenreFilterBar } from './components/StoreGenreFilterBar';
import { StoreGenreCarousels } from './components/StoreGenreCarousels';

export interface StoreAllBooksPageProps {
  initialGenre?: string;
  onSelectBook?: (book: StoreProductItem) => void;
  onNavigateHome?: () => void;
}

export function StoreAllBooksPage({
  initialGenre = 'all',
  onSelectBook,
}: StoreAllBooksPageProps) {
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedSearch, setSubmittedSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read URL query parameters on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlGenre = params.get('genre');
    const urlSearch = params.get('search') || params.get('q');
    if (urlGenre) {
      setSelectedGenre(urlGenre);
    }
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setSubmittedSearch(urlSearch);
    }
  }, []);

  // Update browser URL query without reload
  const updateUrlParams = useCallback((genre: string, search: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('view', 'store-allbooks');
    if (genre && genre.toLowerCase() !== 'all') {
      params.set('genre', genre);
    } else {
      params.delete('genre');
    }
    if (search.trim()) {
      params.set('search', search.trim());
    } else {
      params.delete('search');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all available products so client can handle instantaneous smooth genre tabs
      const data = await getStoreProducts({});
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load store products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handlers
  const handleSelectGenre = (genre: string) => {
    setSelectedGenre(genre);
    updateUrlParams(genre, submittedSearch);
  };

  const handleSearchSubmit = (query: string) => {
    setSubmittedSearch(query);
    updateUrlParams(selectedGenre, query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSubmittedSearch('');
    updateUrlParams(selectedGenre, '');
  };

  const handleResetFilter = () => {
    setSelectedGenre('all');
    setSearchQuery('');
    setSubmittedSearch('');
    updateUrlParams('all', '');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', width: '100%' }}>
      {/* ── 1. Hero Section: Explore our selections ── */}
      <StoreAllBooksHero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        isSearching={isLoading}
      />

      {/* ── 2. Genre Chips Navigation ── */}
      <StoreGenreFilterBar
        selectedGenre={selectedGenre}
        onSelectGenre={handleSelectGenre}
      />

      {/* ── 3. Genre Book Carousels ── */}
      <StoreGenreCarousels
        products={products}
        selectedGenre={selectedGenre}
        searchQuery={submittedSearch}
        isLoading={isLoading}
        error={error}
        onRetry={fetchProducts}
        onResetFilter={handleResetFilter}
        onSelectBook={(book) => onSelectBook?.(book)}
      />
    </div>
  );
}
export default StoreAllBooksPage;
