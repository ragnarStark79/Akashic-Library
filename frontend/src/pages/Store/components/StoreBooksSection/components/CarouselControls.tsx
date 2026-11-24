import styles from './CarouselControls.module.css';

export interface CarouselControlsProps {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export function CarouselControls({
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
  className = '',
}: CarouselControlsProps) {
  return (
    <div
      className={`${styles.controls} ${className}`.trim()}
      aria-label="Book Carousel Navigation"
    >
      {/* Previous Slide Button */}
      <button
        type="button"
        className={`${styles.controlsButton} ${styles.isPrevious} ${
          !canScrollPrev ? styles.isDisabled : ''
        }`.trim()}
        onClick={onPrev}
        disabled={!canScrollPrev}
        aria-label="Previous Slide"
      >
        <span className={styles.buttonBg} />
        <span className={styles.iconWrap}>
          <svg
            className={styles.icon}
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
      </button>

      {/* Next Slide Button */}
      <button
        type="button"
        className={`${styles.controlsButton} ${styles.isNext} ${
          !canScrollNext ? styles.isDisabled : ''
        }`.trim()}
        onClick={onNext}
        disabled={!canScrollNext}
        aria-label="Next Slide"
      >
        <span className={styles.buttonBg} />
        <span className={styles.iconWrap}>
          <svg
            className={styles.icon}
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
      </button>
    </div>
  );
}
