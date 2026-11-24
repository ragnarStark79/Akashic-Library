import { useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { gsap } from 'gsap';
import { useReducedMotion } from '../../animation/useReducedMotion';
import { StoreHeroCanvas } from './StoreHeroCanvas';
import { StoreHeroBooks } from './StoreHeroBooks';
import logoCircleSvg from '../../assets/icons/logo-circle.svg';
import styles from './StoreHero.module.css';

export interface StoreHeroProps {
  onExploreClick?: () => void;
  onEditionsClick?: () => void;
  className?: string;
  isInitialLoading?: boolean;
}

export function StoreHero({
  onExploreClick,
  onEditionsClick,
  className = '',
  isInitialLoading = false,
}: StoreHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Authentic 3-line structured headline
  const headline = 'Stories worth keeping. Worlds worth unboxing.';
  const headlineLines = [
    ['Stories', 'worth'],
    ['keeping.', 'Worlds'],
    ['worth', 'unboxing.'],
  ];

  // Script accent text characters and words
  const scriptText = 'Curated archival folios delivered to your door';
  const scriptWords = scriptText.split(' ');

  useEffect(() => {
    if (prefersReducedMotion || isInitialLoading) return;

    const heroEl = heroRef.current;
    if (!heroEl) return;

    const words = heroEl.querySelectorAll<HTMLSpanElement>(`.${styles.splitWord}`);
    const paragraph = paragraphRef.current;
    const actions = actionsRef.current;
    const chars = heroEl.querySelectorAll<HTMLSpanElement>(`.${styles.splitChar}`);
    const stampEl = stampRef.current;

    // Reset initial positions
    gsap.set(words, {
      yPercent: -12,
      xPercent: 35,
      scaleY: 0.1,
      scaleX: 0.85,
      rotate: 8,
      opacity: 0,
      transformOrigin: 'top left',
    });

    if (paragraph) {
      gsap.set(paragraph, { opacity: 0, y: -16 });
    }
    if (actions) {
      gsap.set(actions, { opacity: 0, y: -16 });
    }
    if (stampEl) {
      gsap.set(stampEl, { opacity: 0, scale: 0.4, rotate: -45 });
    }
    if (chars.length) {
      gsap.set(chars, {
        opacity: 0,
        rotate: 22,
        x: -4,
        y: 8,
        display: 'inline-block',
      });
    }

    const tl = gsap.timeline({ delay: 0.15 });

    // 1. Headline words staggered pop
    if (words.length) {
      tl.to(words, {
        yPercent: 0,
        xPercent: 0,
        scaleY: 1,
        scaleX: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.075,
        ease: 'elastic.out(1, 0.72)',
      });
    }

    // 2. Supporting copy & CTAs
    if (paragraph) {
      tl.to(
        paragraph,
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
        },
        '-=0.5'
      );
    }

    if (actions) {
      tl.to(
        actions,
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
        },
        '-=0.35'
      );
    }

    // 3. Handwritten script characters wave
    if (chars.length) {
      tl.to(
        chars,
        {
          opacity: 1,
          rotate: 0,
          x: 0,
          y: 0,
          duration: 0.7,
          stagger: 0.015,
          ease: 'elastic.out(1, 0.75)',
        },
        '-=0.4'
      );
    }

    // 4. Rotating stamp seal spring pop
    if (stampEl) {
      tl.to(
        stampEl,
        {
          opacity: 1,
          scale: 1,
          rotate: 0,
          duration: 0.7,
          ease: 'elastic.out(1, 0.72)',
        },
        '-=0.4'
      );
    }

    return () => {
      tl.kill();
    };
  }, [prefersReducedMotion, isInitialLoading]);

  return (
    <section
      ref={heroRef}
      className={`${styles.hero} ${className}`}
      data-testid="store-hero-section"
      aria-label="Akashic Store Hero"
    >
      {/* ── Layer 1: Organic Animated Canvas / SVG Background ── */}
      <StoreHeroCanvas />

      {/* ── Layer 2: Interactive 3D Floating Book Objects ── */}
      <StoreHeroBooks />

      {/* ── Layer 3: Main Editorial Container & Content ── */}
      <div className={styles.heroContainer}>
        <div className={styles.heroInner}>
          {/* Left Column: Editorial Headline & Actions */}
          <div className={styles.heroContent}>
            <div className={styles.heroHeader}>
              <h1 className={styles.heroTitle} aria-label={headline}>
                {headlineLines.map((lineWords, lineIdx) => (
                  <span key={`line-${lineIdx}`} className={styles.titleLine}>
                    {lineWords.map((word, wordIdx) => (
                      <span
                        key={`${word}-${wordIdx}`}
                        className={styles.splitWord}
                      >
                        {word}
                      </span>
                    ))}
                  </span>
                ))}
              </h1>

              <p ref={paragraphRef} className={styles.heroParagraph}>
                Discover thoughtfully selected books, special editions, and
                tactile literary treasures in the Akashic Store. Crafted for the
                contemplative reader.
              </p>
            </div>

            {/* CTAs */}
            <div ref={actionsRef} className={styles.heroActions}>
              <button
                type="button"
                className={styles.primaryCta}
                onClick={onExploreClick}
                aria-label="Explore the Collection"
              >
                <span className={styles.buttonAltTextWrap}>
                  <span className={styles.buttonAltBg} />
                  <span className={styles.buttonAltText}>Explore the Collection</span>
                </span>
                <span className={styles.buttonAltIconWrap}>
                  <span className={styles.buttonAltBg} />
                  <span className={styles.buttonAltIconOuter}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 14 13"
                      fill="none"
                      aria-hidden="true"
                      className={styles.buttonAltIcon}
                    >
                      <path
                        d="M13.58 5.66v.845l-5.994 5.66-1.71-2.063a61.427 61.427 0 0 1 4.265-2.988l-.02-.078c-1.828.196-4.107.294-6.387.294H0V4.835h3.734c2.28 0 4.56.098 6.387.294l.02-.059a67.638 67.638 0 0 1-4.265-3.006L7.586 0l5.994 5.66Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                </span>
              </button>

              <button
                type="button"
                className={styles.secondaryCta}
                onClick={onEditionsClick}
                aria-label="Discover Akashic Editions"
              >
                <BookOpen size={16} aria-hidden="true" />
                <span>Akashic Editions</span>
              </button>
            </div>

            {/* Handwritten Script Accent Text */}
            <div
              className={styles.scriptAccent}
              aria-label={scriptText}
            >
              {scriptWords.map((word, wIdx) => (
                <span key={`sword-${wIdx}`} className={styles.scriptWord}>
                  {word.split('').map((char, cIdx) => (
                    <span
                      key={`${char}-${cIdx}`}
                      className={styles.splitChar}
                    >
                      {char}
                    </span>
                  ))}
                  {wIdx < scriptWords.length - 1 && '\u00A0'}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: 3D Books Showcase Spacing Anchor */}
          <div className={styles.heroVisualCol} />
        </div>

        {/* Rotating Stamp Seal Badge (Anchored in authentic bottom-right corner) */}
        <div
          ref={stampRef}
          className={styles.rotatingStampBadge}
          title="Curated Editions — Akashic Store"
          aria-hidden="true"
        >
          <img
            src={logoCircleSvg}
            alt=""
            className={styles.rotatingStampImg}
          />
        </div>
      </div>
    </section>
  );
}
