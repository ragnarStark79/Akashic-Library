import type { AtAGlanceTag } from '@/pages/Store/types/store';
import styles from './BookDetailGlance.module.css';

export interface BookDetailGlanceProps {
  tags: AtAGlanceTag[];
}

interface TagPalette {
  bg: string;
  color: string;
}

const DEFAULT_TAG_PALETTE: TagPalette[] = [
  { bg: '#ff008f', color: '#ffffff' }, // Magenta
  { bg: '#a855f7', color: '#ffffff' }, // Violet
  { bg: '#00e500', color: '#000000' }, // Neon Green
  { bg: '#3b82f6', color: '#ffffff' }, // Blue
];

const getFallback = (idx: number): TagPalette => {
  return DEFAULT_TAG_PALETTE[idx % DEFAULT_TAG_PALETTE.length] ?? DEFAULT_TAG_PALETTE[0]!;
};

export function BookDetailGlance({ tags }: BookDetailGlanceProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={styles.glanceWrapper} data-testid="book-detail-glance">
      <p className={styles.handwrittenTitle}>At a glance</p>

      <div className={styles.glanceList}>
        {tags.map((tag, idx) => {
          const fallback = getFallback(idx);
          const bg = tag.bg_color || fallback.bg;
          const color = tag.text_color || fallback.color;

          return (
            <div
              key={`${tag.label}-${idx}`}
              className={styles.tagItem}
              style={
                {
                  '--tag-bg': bg,
                  '--tag-color': color,
                } as React.CSSProperties
              }
            >
              {tag.icon && <span className={styles.tagIcon}>{tag.icon}</span>}
              <span className={styles.tagHeading}>{tag.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
