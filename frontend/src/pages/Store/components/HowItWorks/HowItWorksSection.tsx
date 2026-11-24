import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../animation/useReducedMotion';
import logoCircle from '../../assets/icons/logo-circle.svg';
import { HOW_IT_WORKS_STEPS } from './data/howItWorksData';
import { HowItWorksCard } from './HowItWorksCard';
import type { HowItWorksSectionProps } from './types';
import styles from './HowItWorksSection.module.css';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    // Safe fallback in test or headless environments
  }
}

// Handwritten annotation text broken into characters for authentic staggered reveal
const ANNOTATION_TEXT = 'Consider us your professional book curator';

export function HowItWorksSection({
  className = '',
  onBecomeMemberClick,
}: HowItWorksSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLUListElement>(null);
  const listItemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const bgPathRef = useRef<SVGPathElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const prefersReducedMotion = useReducedMotion();

  // Natural progressive fanning coordinates matching authentic Aardvark reference:
  // Step 1: tilted counter-clockwise (-3.5deg)
  // Step 2: tilted counter-clockwise (-2.2deg)
  // Step 3: tilted slightly counter-clockwise (-0.8deg)
  // Step 4: upright anchor card (0deg)
  const initialJitterRef = useRef([
    { xPercent: 0, yPercent: 0, rotation: -3.5 },
    { xPercent: 0, yPercent: 0, rotation: -2.2 },
    { xPercent: 0, yPercent: 0, rotation: -0.8 },
    { xPercent: 0, yPercent: 0, rotation: 0 },
  ]);

  const activePortionRef = useRef<number>(0);

  // ── GSAP Timeline & ScrollTrigger Lifecycle ──
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) return;

      const validListItems = listItemsRef.current.filter((el): el is HTMLLIElement => Boolean(el));
      if (!validListItems.length) return;

      // Only apply full desktop parallax and cursor fanning on large screens
      const mm = gsap.matchMedia();

      mm.add('(min-width: 992px)', () => {
        // Set initial natural irregular jitter on list items
        validListItems.forEach((item, idx) => {
          const j = initialJitterRef.current[idx];
          if (j) {
            gsap.set(item, {
              xPercent: j.xPercent,
              yPercent: j.yPercent,
              rotation: j.rotation,
              scale: 1,
              zIndex: idx + 1,
            });
          }
        });

        // Entrance animation on scroll
        gsap.from(validListItems, {
          yPercent: '+=120',
          rotation: (i) => (i % 2 === 0 ? -12 : 12),
          duration: 1.05,
          ease: 'elastic.out(1, 0.75)',
          stagger: 0.088,
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            once: true,
          },
        });

        // Background decorative wave animation
        if (bgPathRef.current) {
          gsap.set(bgPathRef.current, {
            attr: { 'stroke-width': 0 },
            rotate: 0,
            transformOrigin: 'center center',
            transformBox: 'fill-box',
          });

          const waveTl = gsap
            .timeline({ repeat: -1, yoyo: true })
            .to(bgPathRef.current, {
              attr: { 'stroke-width': 60 },
              rotate: 2,
              duration: 3,
              ease: 'sine.inOut',
            });

          ScrollTrigger.create({
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            onEnter: () => waveTl.play(),
            onEnterBack: () => waveTl.play(),
            onLeave: () => waveTl.pause(),
            onLeaveBack: () => waveTl.pause(),
          });
        }

        // Handwritten annotation character reveal
        const validChars = charsRef.current.filter((el): el is HTMLSpanElement => Boolean(el));
        if (validChars.length) {
          gsap.set(validChars, {
            opacity: 0,
            rotate: 22,
            y: '0.25em',
          });

          gsap.to(validChars, {
            opacity: 1,
            rotate: 0,
            y: '0em',
            ease: 'elastic.out(1, 0.75)',
            duration: 0.75,
            stagger: 0.016,
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              once: true,
            },
          });
        }
      });
    }, section);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // Activate a portion (1-indexed: 1..4)
  const setPortion = (activePortion: number) => {
    if (prefersReducedMotion) return;
    if (typeof window !== 'undefined' && window.innerWidth < 992) return;
    if (activePortion === activePortionRef.current) return;
    if (activePortion < 1 || activePortion > HOW_IT_WORKS_STEPS.length) return;

    activePortionRef.current = activePortion;
    const activeIdx = activePortion - 1;

    // Pop active list item forward and assign deterministic foreground zIndex BEFORE tween
    listItemsRef.current.forEach((itemEl, i) => {
      if (!itemEl) return;
      gsap.killTweensOf(itemEl);

      if (i === activeIdx) {
        // Immediate foreground stacking: Card active is elevated to zIndex 30
        gsap.set(itemEl, { zIndex: 30 });
        gsap.to(itemEl, {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          scale: 1.075,
          duration: 0.85,
          ease: 'elastic.out(1, 0.75)',
          overwrite: 'auto',
        });
      } else {
        const j = initialJitterRef.current[i];
        // Immediate resting stacking: Card resting uses deterministic index (1..4)
        gsap.set(itemEl, { zIndex: i + 1 });
        gsap.to(itemEl, {
          xPercent: j?.xPercent ?? 0,
          yPercent: j?.yPercent ?? 0,
          rotation: j?.rotation ?? 0,
          scale: 1,
          duration: 0.85,
          ease: 'elastic.out(1, 0.75)',
          overwrite: 'auto',
        });
      }
    });

    // Whole-card fanning choreography: moving the entire illustrated card physically
    cardsRef.current.forEach((cardEl, i) => {
      if (!cardEl) return;
      gsap.killTweensOf(cardEl);
      if (i !== activeIdx) {
        gsap.to(cardEl, {
          xPercent: 45 / (i - activeIdx),
          duration: 0.85,
          ease: 'elastic.out(1, 0.75)',
          overwrite: 'auto',
        });
      } else {
        gsap.to(cardEl, {
          xPercent: 0,
          duration: 0.85,
          ease: 'elastic.out(1, 0.75)',
          overwrite: 'auto',
        });
      }
    });
  };

  // ── Desktop Horizontal Cursor Tracking (Authentic Aardvark initCallout) ──
  const handleMouseMove = (e: React.MouseEvent<HTMLUListElement>) => {
    if (prefersReducedMotion) return;
    if (typeof window !== 'undefined' && window.innerWidth < 992) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const containerW = rect.width;
    if (containerW <= 0) return;

    // Only activate if the cursor is within the horizontal bounds of the cards list
    if (mouseX < 0 || mouseX > containerW) return;

    const percentage = Math.max(0, Math.min(1, mouseX / containerW));
    const activePortion = Math.min(
      HOW_IT_WORKS_STEPS.length,
      Math.max(1, Math.ceil(percentage * HOW_IT_WORKS_STEPS.length))
    );

    setPortion(activePortion);
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return;
    if (typeof window !== 'undefined' && window.innerWidth < 992) return;

    activePortionRef.current = 0;

    listItemsRef.current.forEach((itemEl, i) => {
      if (!itemEl) return;
      gsap.killTweensOf(itemEl);
      const j = initialJitterRef.current[i];
      gsap.set(itemEl, { zIndex: i + 1 });
      gsap.to(itemEl, {
        xPercent: j?.xPercent ?? 0,
        yPercent: j?.yPercent ?? 0,
        rotation: j?.rotation ?? 0,
        scale: 1,
        duration: 0.85,
        ease: 'elastic.out(1, 0.75)',
        overwrite: 'auto',
      });
    });

    cardsRef.current.forEach((cardEl) => {
      if (!cardEl) return;
      gsap.killTweensOf(cardEl);
      gsap.to(cardEl, {
        xPercent: 0,
        duration: 0.85,
        ease: 'elastic.out(1, 0.75)',
        overwrite: 'auto',
      });
    });
  };

  return (
    <section
      ref={sectionRef}
      className={`${styles.flowSection} ${className}`}
      data-testid="how-it-works-section"
      aria-label="How it works"
    >
      {/* ── Background Organic Shapes ── */}
      <div className={styles.flowBg} aria-hidden="true">
        {/* Desktop Wave SVG */}
        <svg
          className={`${styles.flowBgSvg} ${styles.isDesktop}`}
          viewBox="0 0 1920 1078"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={bgPathRef}
            d="M1036.04 224.719c46.68-18.686 94.68-27.593 145.01-17.193 69.48 14.366 110.3 57.983 128.04 125.006 15.96 60.318 6.45 120.498-1.31 180.811-8.29 64.443-17.14 128.943-21.73 193.698-3.4 47.933 9.35 93.628 35.22 135.082 24.6 39.428 58.71 63.776 105.27 70.7 51.26 7.619 100.97-1.424 150.87-11.351 44.59-8.86 89.22-18.234 134.27-23.788 37.99-4.686 76.51-2.359 112.24 14.388 64.95 30.445 87.52 98.718 76.62 164.068-9.87 59.15-42.57 105.15-84.56 145.85-44.84 43.48-98.21 75.46-148.83 111.16-30.84 21.75-60.77 44.41-86.53 71.35H1247.7c35.22-37.78 74.41-71.86 110.25-109.11 18.75-19.49 36.56-40.97 49.88-64.35 26.16-45.95 9.65-92.6-37.47-116.63-29.31-14.95-60.63-23-92.65-29.34-47.63-9.41-95.64-17.46-142.48-29.89-26.81-7.12-53.14-19.24-76.97-33.6-37.72-22.74-50.73-59.621-48.21-102.647 2.46-42.061 19.25-79.708 35.43-117.636 9.87-23.115 19.1-46.499 28.22-69.907 2.34-5.995 3.57-12.517 4.6-18.912 6.58-40.968-12.55-65.234-54.23-62.184-35.208 2.579-69.935 11.611-104.902 17.609-43.082 7.393-85.968 16.846-129.373 21.383-72.784 7.609-140.416-13.554-203.621-47.289-57.69-30.79-113.048-65.891-169.936-98.199-40.136-22.803-82.672-40.545-128.108-49.343-43.977-8.506-87.368-6.74-127.138 17.541-26.209 16.007-41.953 39.592-48.511 69.378-12.397 56.359 4.802 106.985 30.146 156.167 28.004 54.347 66.44 101.409 103.329 149.563 37.221 48.583 74.231 97.305 98.581 154.026 15.151 35.28 25.634 71.86 24.527 110.8-1.931 68.15-36.554 114.5-96.26 144.23-45.75 22.78-95.324 30.65-144.973 39.2-58.87 10.13-118.149 19.35-175.929 34.11-76.784 19.6-104.832 50.54-156.366 104.26l-188.143-192.09c6.548-.9 13.143-1.65 19.782-2.23 64.263-5.7 128.992-6.19 193.515-9.07 59.582-2.68 118.457-8.23 172.797-36.44 68.743-35.69 95.923-102.94 71.734-176.51C47.238 982.71 14 937.57-20.86 893.052c-40.325-51.507-81.776-102.294-119.092-155.941-47.12-67.745-66.267-144.502-59.071-226.985 5.782-66.292 34.986-122.322 81.434-168.708 86.136-86.027 189.43-120.689 309.992-96.782 61.552 12.208 114.972 42.82 165.548 78.705 47.349 33.599 93.841 68.447 141.911 100.971 70.388 47.621 143.971 47.529 215.775 4.92 48.318-28.674 94.065-61.87 139.754-94.725 57.434-41.309 114.359-83.274 180.648-109.788Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0"
          />
        </svg>

        {/* Mobile Wave SVG */}
        <svg
          className={`${styles.flowBgSvg} ${styles.isMobile}`}
          viewBox="0 0 402 743"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M108.059 38.845c19.902-7.966 40.364-11.762 61.82-7.33 29.616 6.125 47.017 24.718 54.58 53.289 6.801 25.713 2.748 51.366-.559 77.077-3.535 27.472-7.305 54.967-9.263 82.571-1.45 20.434 3.987 39.913 15.013 57.584 10.489 16.808 25.026 27.187 44.875 30.139 21.853 3.248 43.043-.607 64.313-4.839 19.011-3.777 38.037-7.773 57.241-10.14 16.195-1.998 32.615-1.006 47.845 6.133 27.688 12.979 37.307 42.082 32.662 69.939-4.206 25.215-18.148 44.824-36.047 62.176-19.116 18.535-41.867 32.168-63.445 47.384-20.648 14.567-40.354 30.09-53.682 52.135-6.785 11.23-11.685 23.13-10.653 36.657 1.487 19.497 13.269 33.963 32.806 40.393 17.154 5.646 34.929 5.92 52.682 5.631 22.347-.361 44.69-1.796 67.031-1.784 16.165.007 32.077 2.966 46.779 10.192 23.93 11.764 36.752 31.755 41.492 57.432 5.378 29.146-1.634 56.051-14.856 81.879-7.824 15.297-17.852 28.9-29.395 41.385l-202.407-18.505c2.186-1.021 4.338-2.103 6.412-3.316 9.029-5.283 18.325-10.576 26.072-17.481 15.77-14.051 17.306-32.639 2.855-47.998-10.769-11.443-23.415-21.547-36.557-30.238-22.785-15.075-46.799-28.272-69.905-42.868-16.882-10.667-33.059-22.486-46.149-37.817-15.68-18.363-23.425-39.066-13.07-62.435 4.931-11.127 11.785-21.994 19.984-30.945 15.457-16.868 32.879-31.91 48.754-48.411 7.994-8.308 15.585-17.468 21.265-27.435 11.151-19.586 4.112-39.472-15.976-49.714-12.494-6.374-25.847-9.806-39.497-12.508-20.301-4.011-40.768-7.443-60.736-12.742-11.425-3.035-22.65-8.202-32.809-14.323-16.082-9.695-21.625-25.417-20.553-43.758 1.05-17.93 8.208-33.979 15.105-50.147 4.204-9.854 8.142-19.822 12.029-29.8.998-2.556 1.523-5.337 1.959-8.063 2.807-17.464-5.348-27.808-23.114-26.508-15.01 1.099-29.815 4.949-44.72 7.506-18.366 3.152-36.647 7.182-55.15 9.116-28.873 3.018-55.844-4.586-81.163-17.245l.835-71.799c16.242.819 32.584-3.716 48.715-13.288 20.598-12.224 40.1-26.374 59.576-40.38 24.483-17.61 48.75-35.498 77.006-46.801Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className={styles.flowContainer}>
        {/* ── Section Header ── */}
        <div className={styles.flowHeader}>
          <h2 className={styles.flowTitle}>How it works</h2>

          {/* Desktop Handwritten Annotation */}
          <div className={styles.flowTextWrap}>
            <div className={styles.flowTextOuter}>
              <p
                className={styles.flowText}
                aria-label={ANNOTATION_TEXT}
                data-handwritten-text-inview=""
              >
                {ANNOTATION_TEXT.split(' ').map((word, wordIdx) => (
                  <span key={wordIdx}>
                    <span className={styles.splitWord}>
                      {word.split('').map((char, charIdx) => {
                        const globalCharIdx =
                          ANNOTATION_TEXT.split(' ')
                            .slice(0, wordIdx)
                            .join(' ').length +
                          (wordIdx > 0 ? 1 : 0) +
                          charIdx;
                        return (
                          <span
                            key={charIdx}
                            ref={(el) => {
                              charsRef.current[globalCharIdx] = el;
                            }}
                            className={styles.splitChar}
                            aria-hidden="true"
                          >
                            {char}
                          </span>
                        );
                      })}
                    </span>
                    {wordIdx < ANNOTATION_TEXT.split(' ').length - 1 && ' '}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* Brand Seal & Membership CTA */}
          <div className={styles.flowCta}>
            <img
              src={logoCircle}
              alt="Akashic Seal Icon"
              className={styles.flowCtaLogo}
              width={60}
              height={60}
              loading="lazy"
            />
            <button
              type="button"
              className={styles.buttonAlt}
              onClick={onBecomeMemberClick}
              aria-label="Become a member"
              data-testid="become-a-member-button"
            >
              <span className={styles.buttonAltTextWrap}>
                <span className={styles.buttonAltBg} />
                <span className={styles.buttonAltTextOuter}>
                  <span className={styles.buttonAltText}>Become a member</span>
                </span>
              </span>
              <span className={styles.buttonAltIconWrap}>
                <span className={styles.buttonAltBg} />
                <span className={styles.buttonAltIconOuter}>
                  <svg
                    className={styles.buttonAltIcon}
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
            </button>
          </div>
        </div>

        {/* ── Four Overlapping Illustrated Cards ── */}
        <div className={styles.flowContent}>
          <ul
            ref={containerRef}
            className={styles.flowList}
            role="list"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            data-call-out=""
          >
            {HOW_IT_WORKS_STEPS.map((stepItem, idx) => (
              <li
                key={stepItem.id}
                ref={(el) => {
                  listItemsRef.current[idx] = el;
                }}
                className={styles.flowListItem}
                data-call-out-item=""
                onPointerEnter={() => setPortion(idx + 1)}
              >
                <HowItWorksCard
                  ref={(el) => {
                    cardsRef.current[idx] = el;
                  }}
                  item={stepItem}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Bottom Handwritten Annotation (visible <= 991px) */}
        <div className={styles.flowContentTextWrap}>
          <p className={styles.flowText}>
            {ANNOTATION_TEXT}
          </p>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
