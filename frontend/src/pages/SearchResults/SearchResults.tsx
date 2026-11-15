import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  BookX,
} from 'lucide-react';
import { Container, Button } from '../../components/ui';
import {
  BookCard,
  FilterSidebar,
  FilterDrawer,
  Pagination,
} from '../../components/discovery';
import { fetchBooks, getDiscoveryDataMode } from '../../services/discoveryService';
import type {
  BookListItem,
  SearchFilters,
  SearchScope,
  BookSearchResponse,
} from '../../types/discovery';
import styles from './SearchResults.module.css';

export interface SearchResultsProps {
  initialFilters: Partial<SearchFilters>;
  onNavigateHome: () => void;
  onBookSelect: (book: BookListItem) => void;
  onFiltersChange?: (filters: Partial<SearchFilters>) => void;
}

function getInitialScope(f: Partial<SearchFilters>): SearchScope {
  if (f.search_scope) return f.search_scope;
  if (f.author && !f.q) return 'author';
  if (f.title && !f.q) return 'title';
  if (f.isbn && !f.q) return 'isbn';
  if (f.subject && !f.q) return 'subject';
  return 'everything';
}

function getInitialQuery(f: Partial<SearchFilters>, scope: SearchScope): string {
  if (scope === 'author') return f.author || f.q || '';
  if (scope === 'title') return f.title || f.q || '';
  if (scope === 'isbn') return f.isbn || f.q || '';
  if (scope === 'subject') return f.subject || f.q || '';
  return f.q || '';
}

function serializeFilters(f: Partial<SearchFilters>): string {
  return [
    f.q ?? '',
    f.title ?? '',
    f.subject ?? '',
    f.author ?? '',
    f.isbn ?? '',
    f.language ?? '',
    f.year_from ?? '',
    f.year_to ?? '',
    f.sort ?? 'relevance',
    f.page ?? 1,
    f.page_size ?? 12,
    f.search_scope ?? 'everything',
  ].join('|');
}

export const SearchResultsPage: React.FC<SearchResultsProps> = ({
  initialFilters,
  onNavigateHome,
  onBookSelect,
  onFiltersChange,
}) => {
  const isDemoMode = getDiscoveryDataMode() === 'demo';
  const initialScope = getInitialScope(initialFilters);

  const [searchScope, setSearchScope] = useState<SearchScope>(initialScope);
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    q: initialFilters.q || '',
    title: initialFilters.title || '',
    subject: initialFilters.subject || '',
    author: initialFilters.author || '',
    isbn: initialFilters.isbn || '',
    language: initialFilters.language || '',
    year_from: initialFilters.year_from,
    year_to: initialFilters.year_to,
    sort: initialFilters.sort || 'relevance',
    page: initialFilters.page || 1,
    page_size: initialFilters.page_size || 12,
    search_scope: initialScope,
  });

  const [inputVal, setInputVal] = useState(getInitialQuery(initialFilters, initialScope));
  const [data, setData] = useState<BookSearchResponse>({
    count: 0,
    upstream_count: null,
    next: null,
    previous: null,
    results: [],
  });
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Sync internal state ONLY when initialFilters values actually change (e.g. back/forward navigation)
  const initialKey = serializeFilters(initialFilters);
  const prevInitialKeyRef = useRef(initialKey);

  useEffect(() => {
    if (prevInitialKeyRef.current !== initialKey) {
      prevInitialKeyRef.current = initialKey;
      const scope = getInitialScope(initialFilters);
      setSearchScope(scope);
      setFilters({
        q: initialFilters.q || '',
        title: initialFilters.title || '',
        subject: initialFilters.subject || '',
        author: initialFilters.author || '',
        isbn: initialFilters.isbn || '',
        language: initialFilters.language || '',
        year_from: initialFilters.year_from,
        year_to: initialFilters.year_to,
        sort: initialFilters.sort || 'relevance',
        page: initialFilters.page || 1,
        page_size: initialFilters.page_size || 12,
        search_scope: scope,
      });
      setInputVal(getInitialQuery(initialFilters, scope));
    }
  }, [initialKey, initialFilters]);

  // Destructure primitive filter properties for strictly stable effect dependencies
  const {
    q,
    title,
    subject,
    author,
    isbn,
    language,
    year_from,
    year_to,
    sort,
    page,
    page_size,
  } = filters;

  // Execute request whenever filters change, with AbortController and NO onFiltersChange in effect!
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetchBooks(
      { q, title, subject, author, isbn, language, year_from, year_to, sort, page, page_size },
      { signal: controller.signal }
    )
      .then((res) => {
        setData(res);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Aborted by newer request
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [q, title, subject, author, isbn, language, year_from, year_to, sort, page, page_size]);

  // Deliberate filter change handler that updates state and notifies parent
  const updateFiltersAndNotify = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setFilters(newFilters);
      onFiltersChange?.(newFilters);
    },
    [onFiltersChange]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputVal.trim();
    const updated: Partial<SearchFilters> = {
      ...filters,
      search_scope: searchScope,
      page: 1,
    };
    updated.q = '';
    updated.title = '';
    updated.author = '';
    updated.isbn = '';
    updated.subject = '';

    if (searchScope === 'title') {
      updated.title = val;
    } else if (searchScope === 'author') {
      updated.author = val;
    } else if (searchScope === 'isbn') {
      updated.isbn = val;
    } else if (searchScope === 'subject') {
      updated.subject = val;
    } else {
      updated.q = val;
    }

    updateFiltersAndNotify(updated);
  };

  const handleClearInput = () => {
    setInputVal('');
    updateFiltersAndNotify({
      ...filters,
      q: '',
      title: '',
      author: '',
      isbn: '',
      subject: '',
      page: 1,
    });
  };

  const handleApplyFilters = (newFilters: Partial<SearchFilters>) => {
    updateFiltersAndNotify({
      ...filters,
      ...newFilters,
      page: 1,
    });
  };

  const handleRemoveFilter = (key: keyof SearchFilters) => {
    updateFiltersAndNotify({
      ...filters,
      [key]: undefined,
      page: 1,
    });
  };

  const handleClearAllFilters = () => {
    updateFiltersAndNotify({
      q: filters.q,
      sort: filters.sort,
      page: 1,
      page_size: filters.page_size,
    });
  };

  const handlePageChange = (page: number) => {
    updateFiltersAndNotify({
      ...filters,
      page,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFiltersAndNotify({
      ...filters,
      sort: e.target.value as 'relevance' | 'title' | 'date',
      page: 1,
    });
  };

  // Active filter count calculation
  const activeFilterCount = [
    filters.subject,
    filters.author,
    filters.title,
    filters.isbn,
    filters.language,
    filters.year_from || filters.year_to,
  ].filter(Boolean).length;

  const activeQueryTerm =
    filters.q ||
    filters.title ||
    filters.author ||
    filters.isbn ||
    (filters.subject && searchScope === 'subject' ? filters.subject : '');

  const totalPages = Math.ceil((data.count || 0) / (filters.page_size || 12));

  return (
    <div className={styles.page}>
      <Container maxWidth="xl">
        {/* ── Breadcrumb & Title ── */}
        <header className={styles.header}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <button
              type="button"
              onClick={onNavigateHome}
              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', textTransform: 'uppercase', font: 'inherit' }}
            >
              Sanctuary
            </button>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span>Codex Search</span>
          </nav>
          <h1 className={styles.title}>Catalogue Search</h1>

          {/* Inset Search Field */}
          <div className={styles.searchBarWrapper}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <div className={styles.scopeSelectorWrapper}>
                <select
                  className={styles.scopeSelect}
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                  aria-label="Search scope"
                >
                  <option value="everything">Everything</option>
                  <option value="title">Title</option>
                  <option value="author">Author</option>
                  <option value="isbn">ISBN</option>
                  <option value="subject">Subject</option>
                </select>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', margin: '0 var(--space-2)' }}>
                <Search size={20} />
              </div>
              <input
                type="text"
                className={styles.searchInput}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  searchScope === 'author'
                    ? 'Search by author name (e.g. Rebecca Yarros)...'
                    : searchScope === 'title'
                    ? 'Search by title (e.g. The Hobbit)...'
                    : searchScope === 'isbn'
                    ? 'Search by ISBN (e.g. 9780345339683)...'
                    : searchScope === 'subject'
                    ? 'Search by subject or discipline...'
                    : 'Search by title, author, subject, or ISBN...'
                }
                aria-label="Search codex query"
              />
              {inputVal && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClearInput}
                  aria-label="Clear search input"
                >
                  <X size={18} />
                </button>
              )}
              <Button variant="primary" size="sm" type="submit">
                Search
              </Button>
            </form>
          </div>
        </header>

        {/* ── Toolbar: Status & Sort ── */}
        <div className={styles.toolbar}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <p className={styles.statusLine}>
              {loading ? (
                'Querying archival stacks...'
              ) : data.count > 0 ? (
                <>
                  Showing <span className={styles.statusCount}>{data.count}</span>{' '}
                  {data.count === 1 ? 'local folio' : 'local folios'}
                  {activeQueryTerm ? (
                    <>
                      {' '}
                      in <span className={styles.statusScope}>{searchScope}</span> for{' '}
                      <span className={styles.statusQuery}>&ldquo;{activeQueryTerm}&rdquo;</span>
                    </>
                  ) : null}
                  {data.upstream_count != null && data.upstream_count > data.count && (
                    <span className={styles.upstreamCount}>
                      {' '}(from {data.upstream_count.toLocaleString()} catalogued across Open Library)
                    </span>
                  )}
                </>
              ) : (
                'No matching folios found'
              )}
            </p>
            {isDemoMode && (
              <span
                className={styles.demoModeBadge}
                title="Development preview fixtures active; zero requests made to Django backend"
              >
                Demo Preview Fixtures
              </span>
            )}
          </div>

          <div className={styles.actionsCluster}>
            {/* Mobile Filter Button */}
            <button
              ref={filterBtnRef}
              type="button"
              className={styles.filterBtnMobile}
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open filter bottom sheet"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className={styles.filterBadge}>{activeFilterCount}</span>
              )}
            </button>

            {/* Sort Selector */}
            <div className={styles.sortSelectWrapper}>
              <ArrowUpDown size={15} style={{ color: 'var(--color-text-secondary)' }} />
              <select
                className={styles.sortSelect}
                value={filters.sort || 'relevance'}
                onChange={handleSortChange}
                aria-label="Sort search results"
              >
                <option value="relevance">Relevance</option>
                <option value="title">Title (A–Z)</option>
                <option value="date">Publication Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Active Filter Chips ── */}
        {activeFilterCount > 0 && (
          <div className={styles.chipsRow} role="region" aria-label="Active filters">
            {filters.author && (
              <span className={styles.chip}>
                <span>Author: {filters.author}</span>
                <button
                  type="button"
                  className={styles.chipCloseBtn}
                  onClick={() => handleRemoveFilter('author')}
                  aria-label={`Remove author filter: ${filters.author}`}
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {filters.title && (
              <span className={styles.chip}>
                <span>Title: {filters.title}</span>
                <button
                  type="button"
                  className={styles.chipCloseBtn}
                  onClick={() => handleRemoveFilter('title')}
                  aria-label={`Remove title filter: ${filters.title}`}
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {filters.isbn && (
              <span className={styles.chip}>
                <span>ISBN: {filters.isbn}</span>
                <button
                  type="button"
                  className={styles.chipCloseBtn}
                  onClick={() => handleRemoveFilter('isbn')}
                  aria-label={`Remove ISBN filter: ${filters.isbn}`}
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {filters.subject && (
              <span className={styles.chip}>
                <span>Discipline: {filters.subject}</span>
                <button
                  type="button"
                  className={styles.chipCloseBtn}
                  onClick={() => handleRemoveFilter('subject')}
                  aria-label={`Remove discipline filter: ${filters.subject}`}
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {filters.language && (
              <span className={styles.chip}>
                <span>Language: {filters.language.toUpperCase()}</span>
                <button
                  type="button"
                  className={styles.chipCloseBtn}
                  onClick={() => handleRemoveFilter('language')}
                  aria-label={`Remove language filter: ${filters.language}`}
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {(filters.year_from || filters.year_to) && (
              <span className={styles.chip}>
                <span>
                  Era: {filters.year_from || '—'} to {filters.year_to || '—'}
                </span>
                <button
                  type="button"
                  className={styles.chipCloseBtn}
                  onClick={() => {
                    handleRemoveFilter('year_from');
                    handleRemoveFilter('year_to');
                  }}
                  aria-label="Remove year range filter"
                >
                  <X size={14} />
                </button>
              </span>
            )}

            <button
              type="button"
              className={styles.clearAllBtn}
              onClick={handleClearAllFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className={styles.resultsLayout}>
          {/* Desktop Filter Sidebar */}
          <div className={styles.sidebarContainer}>
            <FilterSidebar filters={filters} onApply={handleApplyFilters} />
          </div>

          {/* Results Display Area */}
          <main style={{ minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <p>Retrieving catalog records from Akashic archives...</p>
              </div>
            ) : data.results.length === 0 ? (
              /* Genuine Empty State */
              <div className={styles.emptyState}>
                <BookX size={44} style={{ color: 'var(--color-text-secondary)' }} />
                <h3 className={styles.emptyTitle}>No Folios Discovered</h3>
                <p className={styles.emptyDesc}>
                  We could not locate any volumes matching your exact query and active filters.
                  Try broadening your terms, clearing restrictive filters, or exploring our general disciplines.
                </p>
                <Button variant="subtle" size="md" onClick={handleClearAllFilters}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Grid Layout */}
                <div className={styles.resultsGridDesktop}>
                  {data.results.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      layout="grid"
                      onSelect={onBookSelect}
                    />
                  ))}
                </div>

                {/* Mobile Horizontal Cards List */}
                <div className={styles.resultsListMobile}>
                  {data.results.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      layout="horizontal"
                      onSelect={onBookSelect}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </main>
        </div>

        {/* ── Mobile Filter Bottom Sheet ── */}
        <FilterDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          filters={filters}
          onApply={handleApplyFilters}
          triggerRef={filterBtnRef}
        />
      </Container>
    </div>
  );
};

