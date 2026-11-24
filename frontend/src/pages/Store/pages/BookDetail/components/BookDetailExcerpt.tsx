import styles from './BookDetailExcerpt.module.css';

export interface BookDetailExcerptProps {
  excerpt: string;
  themeColor?: string;
}

export function BookDetailExcerpt({ excerpt, themeColor = '#FED7AA' }: BookDetailExcerptProps) {
  if (!excerpt || !excerpt.trim()) return null;

  return (
    <section
      className={styles.flowSection}
      style={{ '--hero-bg': themeColor } as React.CSSProperties}
      data-testid="book-detail-excerpt"
    >
      <div className={styles.bgDecor} aria-hidden="true">
        <svg
          className={styles.bgSvg}
          viewBox="0 0 1440 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-80 120 C 240 40, 480 240, 840 160 C 1200 80, 1360 260, 1520 180 L 1520 600 L -80 600 Z"
            fill="#FDBA74"
            opacity="0.55"
          />
          <path
            d="M-80 340 C 320 220, 680 440, 1080 300 C 1320 220, 1420 360, 1520 320 L 1520 600 L -80 600 Z"
            fill="#FB923C"
            opacity="0.35"
          />
        </svg>
      </div>

      <div className={styles.container}>
        <h2 className={styles.heading}>Get a taste</h2>

        <div className={styles.readingPage}>
          <div className={styles.readingContent}>
            {excerpt
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((paragraph, idx) => (
                <p key={idx}>
                  {paragraph.split('\n').map((line, lIdx, arr) => (
                    <span key={lIdx}>
                      {line}
                      {lIdx < arr.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
