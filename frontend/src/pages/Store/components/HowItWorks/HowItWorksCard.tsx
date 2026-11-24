import { forwardRef } from 'react';
import type { HowItWorksStepItem } from './types';
import styles from './HowItWorksSection.module.css';

export interface HowItWorksCardProps {
  item: HowItWorksStepItem;
  contentRef?: (el: HTMLDivElement | null) => void;
  style?: React.CSSProperties;
}

export const HowItWorksCard = forwardRef<HTMLDivElement, HowItWorksCardProps>(
  function HowItWorksCard({ item, contentRef, style }, ref) {
    return (
      <div
        ref={ref}
        className={`${styles.flowCard} ${styles[`variant_${item.variant}`] || ''}`}
        style={{ backgroundColor: item.backgroundColor, ...style }}
        data-call-out-child=""
        data-testid={`how-it-works-card-${item.id}`}
      >
        <div className={styles.flowCardInner}>
          {/* Card step header in handwritten script */}
          <div className={styles.flowCardHeader}>
            <span className={styles.flowCardHeaderTitle}>{item.step}</span>
          </div>

          {/* Card step illustration */}
          <div className={styles.flowCardImgWrap}>
            <img
              src={item.illustration}
              alt={item.alt}
              className={styles.flowCardImg}
              width={720}
              height={588}
              loading="lazy"
            />
          </div>

          {/* Card textual content (fanned by cursor interaction) */}
          <div ref={contentRef} className={styles.flowCardContent}>
            <h3 className={styles.flowCardContentTitle}>{item.title}</h3>
            <p className={styles.flowCardContentParagraph}>{item.description}</p>
          </div>
        </div>
      </div>
    );
  }
);
