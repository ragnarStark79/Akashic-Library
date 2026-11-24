import { Sparkles } from 'lucide-react';
import benefitsSvg from '../../assets/icons/benefits-text-eng.svg';
import styles from './StoreHeroLoader.module.css';

export function StoreLoadingFallback() {
  return (
    <div
      className={styles.loaderOverlay}
      role="status"
      aria-live="polite"
      aria-label="Entering Akashic Store"
      data-testid="store-loading-fallback"
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
        <div className={styles.loaderSubtitle}>Entering the Artisanal Sanctuary</div>
        <div className={styles.progressBar}>
          <div className={styles.progressIndicator} />
        </div>
      </div>
    </div>
  );
}

export default StoreLoadingFallback;
