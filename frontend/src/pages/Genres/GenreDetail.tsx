import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  BookOpen,
  Info,
} from 'lucide-react';
import { Container, Button } from '../../components/ui';
import { BookCard } from '../../components/discovery';
import {
  APPROVED_GENRES,
  fetchBooks,
} from '../../services/discoveryService';
import type { BookListItem, GenreInfo } from '../../types/discovery';
import styles from './GenreDetail.module.css';

export interface GenreDetailProps {
  genreId: string;
  onNavigateGenres: () => void;
  onSearchWithinGenre: (genre: string, query: string) => void;
  onBookSelect: (book: BookListItem) => void;
}

export const GenreDetailPage: React.FC<GenreDetailProps> = ({
  genreId,
  onNavigateGenres,
  onSearchWithinGenre,
  onBookSelect,
}) => {
  const genre: GenreInfo =
    APPROVED_GENRES.find(
      (g) =>
        g.id.toLowerCase() === genreId.toLowerCase() ||
        g.name.toLowerCase() === genreId.toLowerCase()
    ) ?? APPROVED_GENRES[0]!;

  const [queryInput, setQueryInput] = useState('');
  const [activeTheme, setActiveTheme] = useState<string>('');
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Query books filtered by this subject/genre
    fetchBooks({ subject: genre.name, page_size: 8 }).then((res) => {
      if (isMounted) {
        setBooks(res.results);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [genre.name]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      onSearchWithinGenre(genre.name, queryInput.trim());
    }
  };

  return (
    <div className={styles.page}>
      <Container maxWidth="xl">
        {/* ── Breadcrumb & Genre Dossier ── */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <button
            type="button"
            onClick={onNavigateGenres}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', textTransform: 'uppercase', font: 'inherit' }}
          >
            Classifications
          </button>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>{genre.name}</span>
        </nav>

        <header className={styles.introDossier}>
          <div className={styles.dossierBadge}>
            <Sparkles size={14} />
            <span>Cartography of Folios &bull; Section III</span>
          </div>

          <h1 className={styles.title}>
            Cartography of Ideas: {genre.name}
          </h1>

          <p className={styles.description}>
            {genre.description} Within the Akashic Sanctuary, folios transcend
            commercial classifications. We map works along contemplative
            trajectories, speculative horizons, and ontological inquiry.
          </p>
        </header>

        {/* ── Scoped Genre Search & Filter Bar ── */}
        <div className={styles.searchFilterBar}>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className={styles.genreSearchInput}
                placeholder={`Search within ${genre.name}...`}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                aria-label={`Search within ${genre.name}`}
              />
            </form>
          </div>

          {/* Theme Filters */}
          <div className={styles.themePillsRow}>
            <button
              type="button"
              className={`${styles.themePill} ${activeTheme === '' ? styles.active : ''}`}
              onClick={() => setActiveTheme('')}
            >
              All Subdisciplines
            </button>
            {genre.subgenres?.map((sub) => {
              const isActive = activeTheme === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  className={`${styles.themePill} ${isActive ? styles.active : ''}`}
                  onClick={() => setActiveTheme(isActive ? '' : sub)}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Featured Genre Spotlight Dossier ── */}
        <section className={styles.spotlightCard} aria-label="Discipline Spotlight">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-action-highlight)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Primary Discipline Focus</span>
            </div>

            <h2 style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.75rem', color: 'var(--color-action-primary)', margin: 'var(--space-2) 0' }}>
              {genre.name} Architecture
            </h2>

            <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
              &ldquo;Where inquiry converges with narrative, exploring human wonder through contemplative folios.&rdquo;
            </p>

            {/* Themes Matrix */}
            <div className={styles.spotlightThemesMatrix}>
              {genre.sampleThemes?.map((theme, i) => (
                <div key={i} className={styles.themeBox}>
                  <p className={styles.themeBoxTitle}>{theme}</p>
                  <p className={styles.themeBoxDesc}>
                    Curated trajectories and thematic investigations within the library archives.
                  </p>
                </div>
              ))}
            </div>

            <div className={styles.curatorNote}>
              <Info size={18} style={{ color: 'var(--color-action-primary)', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>
                  Archive Custodian Inscription
                </strong>
                <span>
                  Folios are organized by intellectual currents. Recommended starting sequence begins with foundational works before specialized monographs.
                </span>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)' }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => onSearchWithinGenre(genre.name, '')}
                rightIcon={<ArrowRight size={16} />}
              >
                Explore All {genre.name} Works
              </Button>
            </div>
          </div>

          {/* Staggered Folios Showcase */}
          <div className={styles.spotlightShowcase}>
            <div className={styles.showcaseBook} style={{ transform: 'rotate(-4deg)' }}>
              <img
                src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300"
                alt=""
              />
            </div>
            <div className={styles.showcaseBook} style={{ transform: 'scale(1.1) translateY(-6px)', zIndex: 2 }}>
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=300"
                alt=""
              />
            </div>
            <div className={styles.showcaseBook} style={{ transform: 'rotate(4deg)' }}>
              <img
                src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300"
                alt=""
              />
            </div>
          </div>
        </section>

        {/* ── Section: Disciplines and Literary Currents ── */}
        <section className={styles.currentsSection} aria-label="Literary Currents">
          <div className={styles.sectionHeadingRow}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-action-highlight)', fontWeight: 600 }}>
                Classified Taxonomies
              </span>
              <h2 className={styles.sectionTitle}>Disciplines &amp; Literary Currents</h2>
            </div>
          </div>

          <div className={styles.currentsScrollRow}>
            {APPROVED_GENRES.map((g) => (
              <div key={g.id} className={styles.currentCard}>
                <div>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-inset)', color: 'var(--color-action-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                    <BookOpen size={20} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.125rem', color: 'var(--color-text-primary)', margin: '0 0 var(--space-2)' }}>
                    {g.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {g.description}
                  </p>
                </div>
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: 'var(--border-thin) solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Archival Domain</span>
                  <ArrowRight size={14} style={{ color: 'var(--color-action-primary)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: Essential Readings (Actual Books) ── */}
        <section aria-label={`Essential ${genre.name} Readings`}>
          <div className={styles.sectionHeadingRow}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-action-primary)', fontWeight: 600 }}>
                Catalog Archive
              </span>
              <h2 className={styles.sectionTitle}>Essential {genre.name} Readings</h2>
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>Retrieving works from the vault...</p>
          ) : books.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>
              No folios currently catalogued under this exact discipline.
            </p>
          ) : (
            <div className={styles.readingsGrid}>
              {books.map((b) => (
                <BookCard
                  key={b.id}
                  book={b}
                  layout="grid"
                  onSelect={onBookSelect}
                />
              ))}
            </div>
          )}
        </section>
      </Container>
    </div>
  );
};
