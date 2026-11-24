import { useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import type { EditorialProofCard } from '@/pages/Store/types/store';
import { useReducedMotion } from '@/pages/Store/animation/useReducedMotion';
import styles from './BookDetailEditorialCards.module.css';

export interface BookDetailEditorialCardsProps {
  cards: EditorialProofCard[];
}

interface CardPalette {
  bg: string;
  color: string;
  rot: number;
  xOff: number;
}

const DEFAULT_CARD_PALETTES: CardPalette[] = [
  { bg: '#FEF08A', color: '#1c1917', rot: -6, xOff: -130 }, // Warm vibrant yellow
  { bg: '#FBCFE8', color: '#1c1917', rot: 1, xOff: 0 },     // Soft vibrant pink
  { bg: '#BAE6FD', color: '#1c1917', rot: 6, xOff: 130 },   // Vibrant sky blue
  { bg: '#DDD6FE', color: '#1c1917', rot: -2, xOff: 60 },   // Soft lavender
];

const getPalette = (idx: number): CardPalette => {
  return DEFAULT_CARD_PALETTES[idx % DEFAULT_CARD_PALETTES.length] ?? DEFAULT_CARD_PALETTES[0]!;
};

export function BookDetailEditorialCards({ cards }: BookDetailEditorialCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const contentElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const currentActiveIndexRef = useRef<number>(-1);
  const prefersReducedMotion = useReducedMotion();

  const displayCards = useMemo(() => (cards && cards.length > 0 ? cards.slice(0, 4) : []), [cards]);

  useEffect(() => {
    if (prefersReducedMotion || displayCards.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    // Is mobile? Don't apply absolute fanning on small screens
    const isMobile = window.innerWidth <= 767;
    if (isMobile) return;

    const cardElements = cardElementsRef.current.filter((el): el is HTMLDivElement => Boolean(el));
    const contentElements = contentElementsRef.current.filter((el): el is HTMLDivElement => Boolean(el));
    const count = cardElements.length;

    // Initial setup with organic staggered offsets and rotations
    cardElements.forEach((card, idx) => {
      const palette = getPalette(idx);
      gsap.set(card, {
        x: palette.xOff,
        y: 0,
        rotation: palette.rot,
        scale: 1,
        zIndex: idx + 1,
      });
    });

    const resetAll = () => {
      cardElements.forEach((card, idx) => {
        const palette = getPalette(idx);
        gsap.to(card, {
          x: palette.xOff,
          y: 0,
          rotation: palette.rot,
          scale: 1,
          zIndex: idx + 1,
          duration: 0.65,
          ease: 'elastic.out(1, 0.75)',
        });
      });
      contentElements.forEach((content) => {
        gsap.to(content, {
          xPercent: 0,
          duration: 0.65,
          ease: 'elastic.out(1, 0.75)',
        });
      });
    };

    const activatePortion = (idx: number) => {
      cardElements.forEach((card, i) => {
        const palette = getPalette(i);
        if (i === idx) {
          // Bring active card forward, zero out rotation and scale slightly
          gsap.to(card, {
            x: palette.xOff,
            y: -18,
            rotation: 0,
            scale: 1.06,
            zIndex: 30,
            duration: 0.75,
            ease: 'elastic.out(1, 0.75)',
          });
        } else if (i < idx) {
          // Push left siblings further left to make physical room
          const shiftLeft = 110 + (idx - i - 1) * 35;
          gsap.to(card, {
            x: palette.xOff - shiftLeft,
            y: 0,
            rotation: palette.rot - 4,
            scale: 0.98,
            zIndex: i + 1,
            duration: 0.75,
            ease: 'elastic.out(1, 0.75)',
          });
        } else {
          // Push right siblings further right to make physical room
          const shiftRight = 110 + (i - idx - 1) * 35;
          gsap.to(card, {
            x: palette.xOff + shiftRight,
            y: 0,
            rotation: palette.rot + 4,
            scale: 0.98,
            zIndex: i + 1,
            duration: 0.75,
            ease: 'elastic.out(1, 0.75)',
          });
        }
      });

      // Fan sibling card inner contents outward
      contentElements.forEach((content, i) => {
        if (i !== idx) {
          gsap.to(content, {
            xPercent: 30 / (i - idx),
            duration: 0.75,
            ease: 'elastic.out(1, 0.75)',
          });
        } else {
          gsap.to(content, {
            xPercent: 0,
            duration: 0.75,
            ease: 'elastic.out(1, 0.75)',
          });
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      const activeIdx = Math.min(count - 1, Math.floor(percentage * count));

      if (currentActiveIndexRef.current !== activeIdx) {
        currentActiveIndexRef.current = activeIdx;
        activatePortion(activeIdx);
      }
    };

    const handleMouseLeave = () => {
      currentActiveIndexRef.current = -1;
      resetAll();
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf(cardElements);
      gsap.killTweensOf(contentElements);
    };
  }, [displayCards, prefersReducedMotion]);

  if (displayCards.length === 0) return null;

  return (
    <div className={styles.editorialWrapper} data-testid="book-detail-editorial-cards">
      <h2 className={styles.heading}>Don&apos;t just take our word for it</h2>

      <div ref={containerRef} className={styles.cardsContainer} data-call-out="">
        {displayCards.map((card, idx) => {
          const palette = getPalette(idx);
          const bg = card.bg_color || palette.bg;
          const color = card.text_color || palette.color;

          return (
            <div
              key={`${card.attribution || 'card'}-${idx}`}
              ref={(el) => {
                cardElementsRef.current[idx] = el;
              }}
              className={styles.cardItem}
              style={{
                backgroundColor: bg,
                color: color,
              }}
              tabIndex={0}
              role="region"
              aria-label={card.attribution ? `Editorial note from ${card.attribution}` : `Editorial review ${idx + 1}`}
              data-call-out-item=""
            >
              <div
                ref={(el) => {
                  contentElementsRef.current[idx] = el;
                }}
                className={styles.cardInner}
                data-call-out-child=""
              >
                {card.heading && (
                  <h3
                    style={{
                      fontFamily: 'var(--store-font-display, "Degular", sans-serif)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      marginBottom: '1rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {card.heading}
                  </h3>
                )}
                <p className={styles.cardQuote}>
                  &ldquo;{card.quote.replace(/^["“]|["”]$/g, '')}&rdquo;
                </p>
                {(card.attribution || card.publication) && (
                  <div className={styles.cardAttribution}>
                    {card.attribution && <span>— {card.attribution}</span>}
                    {card.publication && (
                      <span style={{ fontStyle: 'italic', display: 'block', opacity: 0.75 }}>
                        {card.publication}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
