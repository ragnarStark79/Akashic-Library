import { useState } from 'react';
import type { BdpHeroTheme } from '@/pages/Store/types/store';
import styles from './BookDetailHero.module.css';

export interface BookDetailHeroProps {
  title: string;
  authors: string[];
  genres: string[];
  heroTheme?: BdpHeroTheme;
  onSignUpClick?: () => void;
}

const GENRE_EMOJIS: Record<string, string> = {
  'Debut Novel': '👋',
  Fantasy: '🔮',
  Historical: '🕯️',
  'Historical Fiction': '📜',
  Horror: '🩸',
  'Sci-Fi': '🚀',
  'Science Fiction': '🪐',
  Romance: '💘',
  Thriller: '⚡',
  'Literary Fiction': '🖋️',
  Gothic: '🏰',
  'Gothic Fiction': '🦇',
  Mystery: '🔍',
  'Includes a Cat': '🐱',
  'Includes a Dog': '🐶',
  Satire: '🎭',
  'Award Worthy': '🏆',
};

const GENRE_COLORS: Record<string, { bg: string; color: string }> = {
  'Debut Novel': { bg: '#00e500', color: '#000000' },
  Fantasy: { bg: '#9e81e4', color: '#ffffff' },
  Historical: { bg: '#ff9d00', color: '#000000' },
  'Historical Fiction': { bg: '#ff9d00', color: '#000000' },
  Horror: { bg: '#000000', color: '#ffffff' },
  'Sci-Fi': { bg: '#00e500', color: '#000000' },
  'Science Fiction': { bg: '#00e500', color: '#000000' },
  Romance: { bg: '#ff008f', color: '#ffffff' },
  Thriller: { bg: '#3d3195', color: '#ffffff' },
  'Literary Fiction': { bg: '#71002e', color: '#ffffff' },
  Gothic: { bg: '#3b1c54', color: '#ffffff' },
  'Gothic Fiction': { bg: '#3b1c54', color: '#ffffff' },
  Mystery: { bg: '#1e3a5f', color: '#ffffff' },
  'Includes a Cat': { bg: '#fef08a', color: '#854d0e' },
  'Includes a Dog': { bg: '#fed7aa', color: '#9a3412' },
  Satire: { bg: '#e6ff2b', color: '#000000' },
  'Award Worthy': { bg: '#ff008f', color: '#ffffff' },
};

function getContrastColor(hexColor: string): string {
  const clean = hexColor.replace('#', '');
  const hex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#111827';
  const chan = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  return lum > 0.4 ? '#111827' : '#FFFFFF';
}

export function BookDetailHero({
  title,
  authors,
  genres,
  heroTheme,
  onSignUpClick,
}: BookDetailHeroProps) {
  const [showEgg, setShowEgg] = useState(false);

  const bgColor = heroTheme?.background_color || '#FED7AA';
  const waveColor = heroTheme?.wave_color || '#FDBA74';
  const titleColor = heroTheme?.title_color?.trim() || getContrastColor(bgColor);
  const authorColor = heroTheme?.author_color?.trim() || (titleColor === '#FFFFFF' ? '#F3F4F6' : '#1F2937');
  const authorDisplay = authors.length > 0 ? authors.join(', ') : 'Akashic Curated Selection';

  const titleWords = title.split(' ');

  return (
    <section
      className={styles.heroXs}
      style={{
        '--hero-bg': bgColor,
        '--hero-title-color': titleColor,
        '--hero-author-color': authorColor,
      } as React.CSSProperties}
      data-testid="book-detail-hero"
    >
      <div className={styles.heroContainer}>
        <div className={styles.heroInner}>
          {/* Top-Right Rabbit Pop-up Easter Egg */}
          <div className={styles.easterEgg}>
            <button
              type="button"
              className={styles.popButton}
              onClick={() => {
                setShowEgg(!showEgg);
                onSignUpClick?.();
              }}
              aria-label="Akashic Society Emblem"
              title="Akashic Society"
            >
              <svg className={styles.popButtonSvg} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="m53.332 55.909-9.81-22.05c1.253-3.071 4.434-12.573 1.132-24.425a.845.845 0 0 0-.602-.6.82.82 0 0 0-.82.24c-.096.12-2.651 2.711-4.507 6.19-2.58 4.799-2.531 8.854.12 11.78 2.917 3.192 3.062 5.423 2.893 6.431l-.555.048c-.988-2.111-4.29-8.062-12.51-13.82a.734.734 0 0 0-.698-.072c-.242.096-.386.336-.41.576-.314 3.839.723 11.3 6.893 12.212 3.881.576 5.183 1.68 5.593 2.136-.121.816-.41 1.871-.989 3.239l-7.28 16.651h-.023a1.456 1.456 0 0 1-.12.288l-.097.192c-1.157 2.471-5.327 6.766-6.99 8.446-.41.431-.7.72-.796.84-.096.12-.385.575.169 1.175.771.84 3.182 1.895 4.315 1.104.337-.24.53-.48.747-.768.627-.816 4.001-4.559 9.424-9.261 0 0 1.76-2.184 4.435-2.52h1.616c1.205 0 2.169.288 2.723 1.512l.892 2.04c.844 1.943.844 2.998-2 3.454v1.296h11.642v-1.248c-2.363-.432-2.869-1.727-4.387-5.086Zm-13.233-7.27a2.284 2.284 0 0 1-2.29-2.28 2.284 2.284 0 0 1 2.29-2.279 2.284 2.284 0 0 1 2.29 2.28c0 1.247-1.037 2.279-2.29 2.279Z"
                  fill="currentColor"
                />
                <path
                  clipRule="evenodd"
                  d="M40.922 0C63.522 0 80 18.401 80 41.1 80 63.8 63.522 80 40.922 80S0 63.8 0 41.1C0 18.402 18.321 0 40.922 0Zm22.857 15.697c-13.817-13.474-36.234-13.754-49.77 0C.473 29.45 2.035 50.379 15.852 63.853 29.67 77.327 52.823 79.81 66.36 66.055c13.537-13.754 11.237-36.884-2.58-50.358Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Central Author & Oversized Title */}
          <div className={styles.content}>
            <p className={styles.authorParagraph} style={{ color: authorColor }}>
              {authorDisplay}
            </p>
            <h1 className={styles.title} style={{ color: titleColor }}>
              {titleWords.map((word, idx) => (
                <span key={`${word}-${idx}`} className={styles.titleWord}>
                  {word}
                </span>
              ))}
            </h1>

            {/* Genre Capsules with Emojis */}
            {genres.length > 0 && (
              <div className={styles.genreWrap}>
                {genres.map((genre) => {
                  const icon = GENRE_EMOJIS[genre] || '✨';
                  const colors = GENRE_COLORS[genre] || { bg: '#e0f2fe', color: '#0369a1' };
                  return (
                    <div
                      key={genre}
                      className={styles.tag}
                      style={{
                        '--tag-bg': colors.bg,
                        '--tag-color': colors.color,
                      } as React.CSSProperties}
                    >
                      <span className={styles.tagIcon}>{icon}</span>
                      <span className={styles.tagText}>{genre}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organic Wave Background SVG */}
      <div className={styles.heroBg} aria-hidden="true">
        <svg
          className={styles.heroBgSvgDesktop}
          viewBox="0 0 1920 741"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1049.63-17.97c36.93-23.347 66.53-10.406 80.64 30.618 2.19 6.392 4.26 13.013 5.07 19.688 3.14 26.09 6.14 52.202 8.43 78.361 3.77 42.942 6.84 85.927 25.3 125.923 18.88 40.91 49.05 68.502 95.04 70.881 29.05 1.497 59.3-.302 87.52-6.943 49.32-11.622 97.55-27.869 146.1-42.647 32.63-9.929 65.49-17.944 99.89-18.599 55.29-1.073 93.5 33.788 92.01 89.047-.77 28.123-6.6 56.708-14.28 83.918-15.28 54.047-35.57 106.72-49.49 161.064-7.39 28.838-9.66 60.251-7.46 90.019 4.6 62.533 45.3 98.353 100.43 119.932 46.04 18.031 94.69 24.895 143.53 28.453 66.87 4.869 134.06 5.653 200.75 11.915 38.47 3.624 77.5 10.844 114.03 23.145 5.27 1.777 10.19 3.851 14.75 6.195h-683.12c-16.66-27.763-23.84-59.396-23.43-92.685.64-51.494 6.11-102.944 10.51-154.333 3.49-40.763 6.1-81.199-3.97-121.586-14.54-58.354-70.4-108.208-138.8-97.446-35.03 5.512-66.32 20.468-98.15 35.08-30.29 13.905-61.38 27.92-93.63 35.331-47.61 10.932-88.26-4.47-118.08-45.226-23.75-32.468-33.9-69.747-41.16-108.32-5.857-31.117-9.36-62.913-24.702-91.462-13.245-24.651-32.561-31.968-59.106-23.846-19.65 6.02-34.623 17.968-45.849 34.42-12.75 18.701-24.527 38.072-36.321 57.403-36.201 59.286-88.611 85.591-157.374 74.881-30.769-4.789-60.894-13.839-91.224-21.317-45.747-11.284-91.192-24.69-139.2-19.738-31.065 3.208-61.766 9.443-85.444 31.169-41.003 37.622-38.965 94.104 11.312 118.065 26.827 12.782 54.983 23.668 83.585 31.636 63.7 17.751 128.605 31.291 192.032 49.922 93.339 27.427 171.429 77.189 222.018 163.593 26.548 45.358 44.07 92.748 44.656 144.459H711.717c1.765-27.787-4.208-56.32-18.854-85.698-18.172-36.456-45.857-65.011-77.214-90.08-50.413-40.293-108.544-66.98-166.79-93.439-57.74-26.221-116.373-50.687-168.967-86.985-47.597-32.845-88.406-71.062-104.747-129.135-8.643-30.688-5.748-60.193 10.542-87.872 24.71-41.971 63.847-64.979 108.586-78.806 46.229-14.277 94.19-18.879 142.432-17.631 68.371 1.758 136.721 6.839 205.071 6.806 74.895-.052 147.682-13.865 211.046-56.732 37.79-25.558 72.668-55.42 108.761-83.47 29.284-22.76 56.857-48.199 88.047-67.927"
            fill={waveColor}
            opacity="0.9"
          />
        </svg>

        <svg
          className={styles.heroBgSvgMobile}
          viewBox="0 0 402 448"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M307.046 125.469c22.723-2.21 39.43 7.302 51.275 26.209 10.657 17.017 13.474 36.421 16.842 55.698 3.597 20.597 7.031 41.265 11.795 61.606 3.527 15.057 11.805 27.884 23.708 38.158 4.825 4.164 9.919 7.321 15.334 9.395v62.619c-2.484.173-4.97.402-7.459.665-15.534 1.65-31.059 3.755-46.642 4.402-8.916.368-18.165-.846-26.859-2.986-13.764-3.391-21.278-13.487-24.609-26.951-3.254-13.163-1.685-26.335-.329-39.535.826-8.045 1.435-16.113 2.005-24.177.148-2.066-.096-4.188-.391-6.251-1.884-13.22-10.078-18.853-22.596-13.941-10.576 4.151-20.388 10.239-30.563 15.418-12.537 6.381-24.816 13.377-37.724 18.911-21.644 9.28-44.45 9.226-67.094 4.885-20.667-3.961-41.03-9.469-61.595-13.973-14.511-3.181-29.276-4.576-44.08-2.946-14.328 1.58-27.495 6.26-37.403 17.516-6.529 7.42-9.118 16.17-8.293 25.95 1.565 18.505 11.679 32.425 24.16 45.123 13.79 14.033 30.092 24.832 46.023 36.114 16.073 11.381 32.095 22.827 44.989 37.937 4.972 5.827 9.44 11.976 12.922 18.685H32.2c-8.792-8.776-18.882-16.07-29.18-23.2-5.992-4.149-12.015-8.26-18.02-12.397V235.434c6.832-2.029 14.071-3.458 21.723-4.265 20.082-2.119 39.421 2.196 58.388 8.401 17.757 5.811 35.37 12.087 53.246 17.498 26.176 7.923 48.783.877 66.789-19.067 12.115-13.422 23.01-27.988 33.918-42.444 13.713-18.173 27.206-36.5 45.05-50.971 12.568-10.196 26.47-17.512 42.932-19.117"
            fill={waveColor}
            opacity="0.9"
          />
        </svg>
      </div>
    </section>
  );
}
