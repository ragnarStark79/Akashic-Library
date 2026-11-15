import React from 'react';
import styles from './RouteLoadingFallback.module.css';

export interface RouteLoadingFallbackProps {
  label?: string;
  subtext?: string;
}

export const RouteLoadingFallback: React.FC<RouteLoadingFallbackProps> = ({
  label = 'Opening library folio...',
  subtext = 'Retrieving archival manuscripts and catalog records',
}) => {
  return (
    <div
      className={styles.fallbackContainer}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="route-loading-fallback"
    >
      <div className={styles.sealRing} aria-hidden="true">
        <div className={styles.spinner} />
        <div className={styles.innerAura} />
      </div>
      <p className={styles.label}>{label}</p>
      <p className={styles.subtext}>{subtext}</p>
    </div>
  );
};
