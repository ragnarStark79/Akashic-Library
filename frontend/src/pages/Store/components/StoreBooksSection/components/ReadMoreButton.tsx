import styles from './ReadMoreButton.module.css';

export interface ReadMoreButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  label?: string;
}

export function ReadMoreButton({
  href,
  onClick,
  className = '',
  label = 'Read more',
}: ReadMoreButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div className={`${styles.ctaWrapper} ${className}`.trim()}>
      <a
        href={href || '#'}
        className={styles.buttonAlt}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(e as any);
          }
        }}
        aria-label={label}
      >
        <span className={styles.textWrap}>
          <span className={styles.capsuleBg} />
          <span className={styles.textOuter}>
            <span>{label}</span>
          </span>
        </span>
        <span className={styles.iconWrap}>
          <span className={styles.capsuleBg} />
          <span className={styles.iconOuter}>
            <svg
              className={styles.iconSvg}
              viewBox="0 0 14 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M13.58 5.66v.845l-5.994 5.66-1.71-2.063a61.427 61.427 0 0 1 4.265-2.988l-.02-.078c-1.828.196-4.107.294-6.387.294H0V4.835h3.734c2.28 0 4.56.098 6.387.294l.02-.059a67.638 67.638 0 0 1-4.265-3.006L7.586 0l5.994 5.66Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </span>
      </a>
    </div>
  );
}
