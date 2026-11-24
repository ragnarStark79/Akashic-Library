import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../animation/useReducedMotion';
import cover1 from '../../assets/images/book-cover-1.webp';
import cover2 from '../../assets/images/book-cover-2.webp';
import cover3 from '../../assets/images/book-cover-3.webp';
import cover4 from '../../assets/images/book-cover-4.webp';
import benefitsSvg from '../../assets/icons/benefits-text-eng.svg';
import styles from './StoreHeroLoader.module.css';

export interface StoreHeroLoaderProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export function StoreHeroLoader({
  onComplete,
  minDurationMs = 600,
}: StoreHeroLoaderProps) {
  const [isDone, setIsDone] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let isCancelled = false;
    const startTime = Date.now();

    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Non-blocking on network failure
        }
      });
    };

    // Preload critical assets: fonts and initial hero textures
    const criticalPreloads = [
      preloadImage(cover1),
      preloadImage(cover2),
      preloadImage(cover3),
      preloadImage(cover4),
      typeof document !== 'undefined' && 'fonts' in document
        ? document.fonts.ready
        : Promise.resolve(),
    ];

    // Guarantee fallback timeout of 1400ms so loader never hangs
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1400));

    Promise.race([
      Promise.all(criticalPreloads),
      timeoutPromise,
    ]).then(() => {
      if (isCancelled) return;

      const elapsed = Date.now() - startTime;
      const remainingMinTime = Math.max(0, (prefersReducedMotion ? 100 : minDurationMs) - elapsed);

      setTimeout(() => {
        if (!isCancelled) {
          setIsDone(true);
          // Wait for CSS fade out transition before notifying parent
          setTimeout(onComplete, prefersReducedMotion ? 50 : 500);
        }
      }, remainingMinTime);
    });

    return () => {
      isCancelled = true;
    };
  }, [minDurationMs, onComplete, prefersReducedMotion]);

  return (
    <div
      className={`${styles.loaderOverlay} ${isDone ? styles.loaded : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Preparing Akashic Store Curated Folios"
      data-testid="store-hero-loader"
    >
      <div className={styles.loaderInner}>
        <div className={styles.sealWrap}>
          <img
            src={benefitsSvg}
            alt=""
            className={styles.sealRing}
            aria-hidden="true"
          />
          <div className={styles.sealLogo}>
            <Sparkles size={28} />
          </div>
        </div>
        <div className={styles.loaderTitle}>Akashic Store</div>
        <div className={styles.loaderSubtitle}>Curating Editions & Folios</div>
        <div className={styles.progressBar}>
          <div className={styles.progressIndicator} />
        </div>
      </div>
    </div>
  );
}
