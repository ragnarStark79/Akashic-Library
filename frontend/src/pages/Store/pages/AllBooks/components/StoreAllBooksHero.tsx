import React, { useRef } from 'react';
import styles from './StoreAllBooksHero.module.css';

export interface StoreAllBooksHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onClearSearch: () => void;
  isSearching?: boolean;
}

export function StoreAllBooksHero({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  isSearching = false,
}: StoreAllBooksHeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchQuery);
  };

  const handleClear = () => {
    onClearSearch();
    inputRef.current?.focus();
  };

  return (
    <section className={styles.heroWrapper} aria-label="Explore our selections">
      <div className={styles.heroContainer}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Explore our selections
            </h1>
            <p className={styles.heroParagraph}>
              We’ve got a full-time team dedicated to sourcing the hottest new releases and timeless literary folios.
            </p>
          </div>

          {/* Search Form matching reference .search and .search__form */}
          <div className={styles.searchSection}>
            <form
              className={styles.searchForm}
              onSubmit={handleSubmit}
              role="search"
              aria-label="Search catalogue"
            >
              <div className={styles.inputWrap}>
                <input
                  ref={inputRef}
                  id="allbooks-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by title, author, or keyword..."
                  autoComplete="off"
                  spellCheck="false"
                  className={styles.searchInput}
                  aria-label="Search catalogue by title, author, or keyword"
                  data-testid="allbooks-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className={styles.clearButton}
                    aria-label="Clear search input"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                className={styles.searchButton}
                aria-label="Start search"
                data-testid="allbooks-search-button"
                disabled={isSearching}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 32 32"
                  fill="none"
                  className={styles.searchIcon}
                  aria-hidden="true"
                >
                  <path
                    d="M12.6667 21.3333C10.2444 21.3333 8.19467 20.4942 6.51733 18.816C4.84 17.1378 4.00089 15.088 4 12.6667C3.99911 10.2453 4.83822 8.19556 6.51733 6.51733C8.19645 4.83911 10.2462 4 12.6667 4C15.0871 4 17.1373 4.83911 18.8173 6.51733C20.4973 8.19556 21.336 10.2453 21.3333 12.6667C21.3333 13.6444 21.1778 14.5667 20.8667 15.4333C20.5556 16.3 20.1333 17.0667 19.6 17.7333L27.0667 25.2C27.3111 25.4444 27.4333 25.7556 27.4333 26.1333C27.4333 26.5111 27.3111 26.8222 27.0667 27.0667C26.8222 27.3111 26.5111 27.4333 26.1333 27.4333C25.7556 27.4333 25.4444 27.3111 25.2 27.0667L17.7333 19.6C17.0667 20.1333 16.3 20.5556 15.4333 20.8667C14.5667 21.1778 13.6444 21.3333 12.6667 21.3333ZM12.6667 18.6667C14.3333 18.6667 15.7502 18.0836 16.9173 16.9173C18.0844 15.7511 18.6676 14.3342 18.6667 12.6667C18.6658 10.9991 18.0827 9.58267 16.9173 8.41733C15.752 7.252 14.3351 6.66844 12.6667 6.66667C10.9982 6.66489 9.58178 7.24844 8.41733 8.41733C7.25289 9.58622 6.66933 11.0027 6.66667 12.6667C6.664 14.3307 7.24756 15.7476 8.41733 16.9173C9.58711 18.0871 11.0036 18.6702 12.6667 18.6667Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </form>
          </div>

          {/* Easter egg rabbit popup icon */}
          <div className={styles.easterEgg} aria-hidden="true">
            <div className={styles.easterEggInner} title="Curated with love">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 80 80"
                className={styles.easterEggSvg}
              >
                <path
                  fill="currentColor"
                  d="m53.332 55.909-9.81-22.05c1.253-3.071 4.434-12.573 1.132-24.425a.845.845 0 0 0-.602-.6.82.82 0 0 0-.82.24c-.096.12-2.651 2.711-4.507 6.19-2.58 4.799-2.531 8.854.12 11.78 2.917 3.192 3.062 5.423 2.893 6.431l-.555.048c-.988-2.111-4.29-8.062-12.51-13.82a.734.734 0 0 0-.698-.072c-.242.096-.386.336-.41.576-.314 3.839.723 11.3 6.893 12.212 3.881.576 5.183 1.68 5.593 2.136-.121.816-.41 1.871-.989 3.239l-7.28 16.651h-.023a1.456 1.456 0 0 1-.12.288l-.097.192c-1.157 2.471-5.327 6.766-6.99 8.446-.41.431-.7.72-.796.84-.096.12-.385.575.169 1.175.771.84 3.182 1.895 4.315 1.104.337-.24.53-.48.747-.768.627-.816 4.001-4.559 9.424-9.261 0 0 1.76-2.184 4.435-2.52h1.616c1.205 0 2.169.288 2.723 1.512l.892 2.04c.844 1.943.844 2.998-2 3.454v1.296h11.642v-1.296c-2.314-.528-2.193-1.608-2.603-2.616-.41-1.008-.94-2.208-1.542-3.6z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
