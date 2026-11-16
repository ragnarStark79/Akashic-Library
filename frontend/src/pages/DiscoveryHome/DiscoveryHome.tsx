import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowRight,
  BookOpen,
  Orbit,
  Scroll,
  PenTool,
  Atom,
  Compass,
  Bookmark,
  CheckCircle,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Container, Button } from '../../components/ui';
import { BookCard } from '../../components/discovery';
import {
  fetchFeaturedBooks,
  fetchGenres,
} from '../../services/discoveryService';
import {
  fetchPersonalizedRecommendations,
  normalizeRecommendationBook,
} from '../../services/recommendationService';
import { useAuth } from '../../context/AuthContext';
import type { BookListItem, SearchScope } from '../../types/discovery';
import styles from './DiscoveryHome.module.css';

export interface DiscoveryHomeProps {
  onSearchSubmit: (query: string, scope?: SearchScope) => void;
  onGenreSelect: (genreId: string) => void;
  onBookSelect: (book: BookListItem) => void;
  onNavigateAuth?: () => void;
}

const POPULAR_QUERIES = [
  'Borges',
  'Quantum Physics',
  'Virginia Woolf',
  'Magical Realism',
  'Stoicism',
];

export const DiscoveryHomePage: React.FC<DiscoveryHomeProps> = ({
  onSearchSubmit,
  onGenreSelect,
  onBookSelect,
  onNavigateAuth,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('everything');
  const [featuredBooks, setFeaturedBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<
    Array<BookListItem & { recommendation_reason?: string }>
  >([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Recommendations shelf scroll ref and handler
  const recommendationsShelfRef = useRef<HTMLDivElement>(null);

  const scrollRecommendations = (direction: 'left' | 'right') => {
    if (!recommendationsShelfRef.current) return;
    const container = recommendationsShelfRef.current;
    const scrollAmount = Math.max(container.clientWidth * 0.75, 200);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  useEffect(() => {
    let isMounted = true;
    fetchFeaturedBooks().then((books) => {
      if (isMounted) {
        setFeaturedBooks(books);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch recommendations when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setRecommendations([]);
      return;
    }

    let isMounted = true;
    setLoadingRecommendations(true);
    setRecommendationsError(null);

    fetchPersonalizedRecommendations({ pageSize: 10 })
      .then((res) => {
        if (isMounted) {
          const normalized = (res.results || []).map((item) =>
            normalizeRecommendationBook(item)
          );
          setRecommendations(normalized);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Unable to retrieve personalized recommendations.';
          setRecommendationsError(msg);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingRecommendations(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearchSubmit(searchVal.trim(), searchScope);
    }
  };

  const handleChipClick = (q: string) => {
    setSearchVal(q);
    setSearchScope('everything');
    onSearchSubmit(q, 'everything');
  };

  const genres = fetchGenres();

  const getGenreIcon = (iconName?: string) => {
    switch (iconName) {
      case 'orbit':
        return <Orbit size={22} />;
      case 'scroll':
        return <Scroll size={22} />;
      case 'pen-tool':
        return <PenTool size={22} />;
      case 'atom':
        return <Atom size={22} />;
      case 'compass':
        return <Compass size={22} />;
      case 'bookmark':
        return <Bookmark size={22} />;
      default:
        return <BookOpen size={22} />;
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Section A: Editorial Hero ── */}
      <section className={styles.heroSection} aria-label="Library Introduction">
        <div className={styles.ambientGlow} aria-hidden="true" />
        <Container maxWidth="xl">
          <div className={styles.heroContent}>
            <div className={styles.overlineBadge}>
              <span className={styles.badgeDot} />
              <span>The Sanctuary Folio</span>
            </div>

            <h1 className={styles.headline}>Every book opens a new universe.</h1>

            <p className={styles.leadText}>
              Discover stories, explore ideas, and find your next unforgettable read in
              a digital sanctuary crafted for contemplative readers.
            </p>

            {/* Recessed Search Bar */}
            <div className={styles.searchBoxWrapper}>
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
                <div className={styles.searchIcon}>
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  className={styles.searchInput}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder={
                    searchScope === 'author'
                      ? 'Search by author (e.g. Rebecca Yarros)...'
                      : searchScope === 'title'
                      ? 'Search by title (e.g. Dune)...'
                      : searchScope === 'isbn'
                      ? 'Search by ISBN (e.g. 9780345339683)...'
                      : searchScope === 'subject'
                      ? 'Search by subject or genre...'
                      : 'Search books, authors, ISBNs, or themes...'
                  }
                  aria-label="Search the catalog"
                />
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  rightIcon={<ArrowRight size={16} />}
                >
                  Search
                </Button>
              </form>
            </div>

            {/* Curated Query Chips */}
            <div className={styles.queryChipsRow}>
              <span className={styles.queryChipLabel}>Curated Queries:</span>
              {POPULAR_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={styles.chipBtn}
                  onClick={() => handleChipClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Literary Hero Composition (Book Trio) */}
            <div className={styles.bookTrio} aria-hidden="true">
              {/* Celestial Linework SVG */}
              <svg className={styles.trioSvg} viewBox="0 0 700 300" fill="none">
                <circle
                  cx="350"
                  cy="150"
                  r="130"
                  stroke="var(--color-action-secondary)"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <circle
                  cx="350"
                  cy="150"
                  r="150"
                  stroke="var(--color-action-secondary)"
                  opacity="0.5"
                  strokeWidth="0.8"
                />
                <line
                  x1="80"
                  y1="150"
                  x2="620"
                  y2="150"
                  stroke="var(--color-action-secondary)"
                  strokeDasharray="2 6"
                  strokeWidth="1"
                />
                <circle cx="220" cy="150" fill="var(--color-action-primary)" r="4" />
                <circle cx="480" cy="150" fill="var(--color-action-primary)" r="4" />
              </svg>

              <div className={`${styles.bookItem} ${styles.bookLeft}`}>
                <img
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400"
                  alt=""
                  decoding="async"
                />
              </div>

              <div className={`${styles.bookItem} ${styles.bookCenter}`}>
                <img
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400"
                  alt=""
                  decoding="async"
                />
              </div>

              <div className={`${styles.bookItem} ${styles.bookRight}`}>
                <img
                  src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400"
                  alt=""
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Section B: From the Archives (Open Library Highlights) ── */}
      <section className={styles.sectionWrapper} id="featured" aria-labelledby="spotlight-title">
        <Container maxWidth="xl">
          <div className={styles.sectionHeader}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-action-primary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <CheckCircle size={15} />
                <span>Open Library Highlights</span>
              </div>
              <h2 id="spotlight-title" className={styles.sectionTitle}>
                From the Archives
              </h2>
            </div>
          </div>

          <div className={styles.spotlightGrid}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.spotlightSkeleton}
                  style={{
                    height: '380px',
                    borderRadius: 'var(--radius-xl)',
                    backgroundColor: 'var(--color-surface-inset)',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              ))
            ) : featuredBooks.length > 0 ? (
              featuredBooks.map((book) => (
                <div key={book.id} className={styles.spotlightCardItem}>
                  <BookCard
                    book={book}
                    onSelect={onBookSelect}
                  />
                </div>
              ))
            ) : (
              <div className={styles.spotlightEmpty}>
                <p>No featured folios currently available in the sanctuary.</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ── Section B.1: Curated Recommendations (#recommendations anchor) ── */}
      <section
        className={styles.recommendationsSection}
        id="recommendations"
        aria-labelledby="recommendations-title"
      >
        <Container maxWidth="xl">
          <div className={styles.recommendationsHeader}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-action-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Sparkles size={15} />
                <span>Curated Recommendations</span>
              </div>
              <h2 id="recommendations-title" className={styles.sectionTitle}>
                {isAuthenticated
                  ? `Curated for ${user?.display_name || user?.username || 'Your Desk'}`
                  : 'Tailored for Contemplative Readers'}
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-text-secondary)',
                  margin: 'var(--space-2) 0 0 0',
                }}
              >
                {isAuthenticated
                  ? 'Folios surfaced from your personal reading shelves, positive ratings, and literary explorations.'
                  : 'Sovereign recommendations cultivated from reading shelf activity, annotations, and favorites.'}
              </p>
            </div>

            {isAuthenticated && recommendations.length > 3 && (
              <div className={styles.carouselNavButtons}>
                <button
                  type="button"
                  className={styles.carouselButton}
                  onClick={() => scrollRecommendations('left')}
                  aria-label="Scroll recommendations left"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className={styles.carouselButton}
                  onClick={() => scrollRecommendations('right')}
                  aria-label="Scroll recommendations right"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            /* Authenticated patron recommendations state */
            loadingRecommendations ? (
              <div
                className={styles.recommendationsShelf}
                role="region"
                aria-label="Curated recommendations loading"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.carouselItemWrapper}>
                    <div
                      className={styles.spotlightSkeleton}
                      style={{
                        width: '100%',
                        height: '380px',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--color-surface-inset)',
                        animation: 'pulse 1.5s infinite ease-in-out',
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : recommendationsError ? (
              <div className={styles.recommendationsEmpty}>
                <p style={{ color: 'var(--color-text-secondary)' }}>{recommendationsError}</p>
                <button
                  type="button"
                  className={styles.guestCtaBtn}
                  onClick={() => {
                    setLoadingRecommendations(true);
                    setRecommendationsError(null);
                    fetchPersonalizedRecommendations({ pageSize: 10 })
                      .then((res) => {
                        const normalized = (res.results || []).map((item) =>
                          normalizeRecommendationBook(item)
                        );
                        setRecommendations(normalized);
                      })
                      .catch((err) => {
                        setRecommendationsError(
                          err instanceof Error ? err.message : 'Unable to retrieve recommendations.'
                        );
                      })
                      .finally(() => setLoadingRecommendations(false));
                  }}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  <span>Retry Retrieval</span>
                </button>
              </div>
            ) : recommendations.length > 0 ? (
              <div
                ref={recommendationsShelfRef}
                className={styles.recommendationsShelf}
                tabIndex={0}
                role="region"
                aria-label="Curated recommendations carousel track"
              >
                {recommendations.map((book) => (
                  <div key={book.id} className={styles.carouselItemWrapper}>
                    <div className={styles.reasonBadgeSlot}>
                      {book.recommendation_reason ? (
                        <div className={styles.reasonBadge} title={book.recommendation_reason}>
                          <Sparkles size={11} aria-hidden="true" />
                          <span>{book.recommendation_reason}</span>
                        </div>
                      ) : (
                        <div className={styles.reasonBadgePlaceholder} aria-hidden="true" />
                      )}
                    </div>
                    <BookCard
                      book={book}
                      className={styles.carouselCard}
                      imageFit="contain"
                      onSelect={onBookSelect}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.recommendationsEmpty}>
                <BookOpen size={36} style={{ color: 'var(--color-action-primary)', margin: '0 auto var(--space-2)' }} />
                <h3 style={{ fontFamily: 'var(--font-family-heading)', margin: '0 0 var(--space-2)' }}>
                  Your Reading Horizon Is Just Beginning
                </h3>
                <p className={styles.emptyText}>
                  Add folios to your Want to Read, Reading, or Completed shelves to generate bespoke recommendations.
                </p>
              </div>
            )
          ) : (
            /* Guest patron invitation card */
            <div className={styles.guestInvitationCard}>
              <div className={styles.guestIconWrapper}>
                <Lock size={26} />
              </div>
              <h3 className={styles.guestTitle}>
                Unlock Curated Recommendations for Your Reading Desk
              </h3>
              <p className={styles.guestDesc}>
                Akashic Library constructs personalized recommendation matrices from your sovereign reading shelves,
                completed folios, and favorites. Sign in to your sanctuary account to reveal your bespoke reading list.
              </p>
              {onNavigateAuth && (
                <button
                  type="button"
                  className={styles.guestCtaBtn}
                  onClick={onNavigateAuth}
                >
                  <Sparkles size={16} />
                  <span>Authenticate at Custodial Desk</span>
                </button>
              )}
            </div>
          )}
        </Container>
      </section>

      {/* ── Section C: Wander Through the Archives (Genres Grid) ── */}
      <section className={styles.genresSection} id="genres" aria-labelledby="genres-title">
        <Container maxWidth="xl">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto var(--space-10)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-action-highlight)' }}>
              Classifications
            </span>
            <h2 id="genres-title" className={styles.sectionTitle} style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
              Wander Through the Archives
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Browse across disciplines, centuries, and speculative frontiers curated for discerning bibliophiles.
            </p>
          </div>

          <div className={styles.genresGrid}>
            {genres.map((g) => (
              <div
                key={g.id}
                className={styles.genreCard}
                onClick={() => onGenreSelect(g.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onGenreSelect(g.id);
                  }
                }}
              >
                <div>
                  <div className={styles.genreCardTop}>
                    <div className={styles.genreIconBadge}>
                      {getGenreIcon(g.iconName)}
                    </div>
                    <ArrowRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                  <h3 className={styles.genreCardName}>{g.name}</h3>
                  <p className={styles.genreCardDesc}>{g.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
};
