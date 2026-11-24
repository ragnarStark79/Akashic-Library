import { BookOpen, Sparkles } from 'lucide-react';
import type { StoreTransitionOverlayProps } from '../../types/store';
import styles from './StoreTransition.module.css';

export function StoreTransitionOverlay({
  stage,
  targetExperience,
}: StoreTransitionOverlayProps) {
  const isActive = stage !== 'idle';
  const isEntering = stage === 'entering';
  const isExiting = stage === 'exiting';

  return (
    <div
      className={`${styles.transitionWrap} ${isActive ? styles.active : ''} ${
        isEntering ? styles.entering : ''
      } ${isExiting ? styles.exiting : ''}`}
      role="status"
      aria-live="polite"
      aria-label={
        targetExperience === 'store'
          ? 'Entering Akashic Store'
          : 'Returning to Akashic Library'
      }
      data-testid="store-transition-overlay"
    >
      {/* Dynamic Curtain Layer with Organic Gradient */}
      <div className={`${styles.curtain} ${isExiting ? styles.curtainExiting : ''}`} />

      {/* Organic Sweeping SVG Brush Path */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1080 1080"
        fill="none"
        preserveAspectRatio="none"
        className={styles.transitionSvg}
        aria-hidden="true"
      >
        <path
          d="M66.858-19C57.597 196.452 127.164 482.585 206.5 464.5c125.428-28.592 52.293-293.51 200.001-339 568.234-175-241.425 712.6 15.5 803.02C645 1007 629.398 499 810.5 499c113.398 0 106.54 189.465 164.235 429.52 48.005 199.72 89.415 213.09 105.265 173.78"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            isEntering
              ? styles.drawPathEnter
              : isExiting
              ? styles.drawPathExit
              : undefined
          }
        />
      </svg>

      {/* Floating Center Brand Badge with Elastic Pop */}
      {isActive && (
        <div
          className={`${styles.logoBadge} ${
            isEntering
              ? styles.badgeEnter
              : isExiting
              ? styles.badgeExit
              : ''
          }`}
        >
          <div className={styles.logoIcon}>
            {targetExperience === 'store' ? (
              <Sparkles size={38} />
            ) : (
              <BookOpen size={38} />
            )}
          </div>
          <span className={styles.logoTitle}>
            {targetExperience === 'store' ? 'Akashic Store' : 'Akashic Library'}
          </span>
          <span className={styles.logoSubtitle}>
            {targetExperience === 'store'
              ? 'Sanctuary Marketplace'
              : 'Digital Sanctuary'}
          </span>
        </div>
      )}
    </div>
  );
}
