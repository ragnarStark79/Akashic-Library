import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Orbit,
  Scroll,
  PenTool,
  Atom,
  Compass,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { Container, Button } from '../../components/ui';
import { fetchGenres } from '../../services/discoveryService';
import styles from './Genres.module.css';

export interface GenresIndexProps {
  onGenreSelect: (genreId: string) => void;
}

export const GenresIndexPage: React.FC<GenresIndexProps> = ({ onGenreSelect }) => {
  const genres = fetchGenres();
  const featured = genres[1] || genres[0]; // Philosophy as featured discipline

  const getGenreIcon = (iconName?: string) => {
    switch (iconName) {
      case 'orbit':
        return <Orbit size={24} />;
      case 'scroll':
        return <Scroll size={24} />;
      case 'pen-tool':
        return <PenTool size={24} />;
      case 'atom':
        return <Atom size={24} />;
      case 'compass':
        return <Compass size={24} />;
      case 'bookmark':
        return <Bookmark size={24} />;
      default:
        return <BookOpen size={24} />;
    }
  };

  return (
    <div className={styles.page}>
      <Container maxWidth="xl">
        {/* ── Page Header ── */}
        <header className={styles.header}>
          <span className={styles.overline}>Classifications &amp; Taxonomies</span>
          <h1 className={styles.title}>Wander Through the Archives</h1>
          <p className={styles.intro}>
            Browse across disciplines, centuries, and speculative horizons curated
            for contemplative reading and intellectual exploration.
          </p>
        </header>

        {/* ── Featured Genre Spotlight Banner ── */}
        {featured && (
          <div className={styles.featuredBanner}>
            <div className={styles.featuredContent}>
              <div className={styles.featuredBadge}>
                <Sparkles size={14} />
                <span>Featured Discipline Spotlight</span>
              </div>
              <h2 className={styles.featuredTitle}>{featured.name}</h2>
              <p className={styles.featuredDesc}>{featured.description}</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', margin: 'var(--space-2) 0' }}>
                {featured.subgenres?.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '12px',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'rgba(24, 92, 88, 0.1)',
                      color: 'var(--color-action-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onGenreSelect(featured.id)}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Explore {featured.name}
                </Button>
              </div>
            </div>

            <div className={styles.featuredGraphic}>
              <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-3)', color: 'var(--color-action-primary)', boxShadow: 'var(--shadow-soft)' }}>
                  {getGenreIcon(featured.iconName)}
                </div>
                <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-family-heading)', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
                  &ldquo;Where ontological inquiry converges with narrative labyrinth, dismantling linear perception.&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── All Disciplines Grid ── */}
        <section aria-label="All Categories">
          <div className={styles.grid}>
            {genres.map((genre) => (
              <div
                key={genre.id}
                className={styles.card}
                onClick={() => onGenreSelect(genre.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onGenreSelect(genre.id);
                  }
                }}
              >
                <div>
                  <div className={styles.cardTop}>
                    <div className={styles.iconCircle}>
                      {getGenreIcon(genre.iconName)}
                    </div>
                    <ArrowRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>

                  <h3 className={styles.cardTitle}>{genre.name}</h3>
                  <p className={styles.cardDesc}>{genre.description}</p>
                </div>

                {genre.subgenres && genre.subgenres.length > 0 && (
                  <div className={styles.subgenrePills}>
                    {genre.subgenres.slice(0, 3).map((sub) => (
                      <span key={sub} className={styles.subgenrePill}>
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
};

