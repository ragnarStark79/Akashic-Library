import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../animation/useReducedMotion';
import logoCircle from '../../assets/icons/logo-circle.svg';
import { COMMON_QUESTIONS } from './data/commonQuestionsData';
import { CommonQuestionsAccordion } from './CommonQuestionsAccordion';
import type { CommonQuestionsSectionProps } from './types';
import styles from './CommonQuestionsSection.module.css';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    // Headless / test fallback
  }
}

const INITIAL_VISIBLE_COUNT = 5;

export function CommonQuestionsSection({
  className = '',
  onNavigateFaq,
}: CommonQuestionsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const bgPathRef = useRef<SVGPathElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Initially, the first question is open for authentic engagement
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([COMMON_QUESTIONS[0]?.id ?? '']));
  const [isAllShown, setIsAllShown] = useState<boolean>(false);

  const handleToggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleShowAll = () => {
    if (onNavigateFaq) {
      onNavigateFaq();
    }
    setIsAllShown((prev) => !prev);
  };

  // Subtle GSAP background wave stroke animation matching reference
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
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
            attr: { 'stroke-width': 50 },
            rotate: 1.5,
            duration: 3.5,
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
    }, section);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const visibleItems = isAllShown
    ? COMMON_QUESTIONS
    : COMMON_QUESTIONS.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <section
      ref={sectionRef}
      className={`${styles.faqSection} ${className}`.trim()}
      data-testid="common-questions-section"
      aria-label="Common questions"
    >
      {/* ── Organic Cyan Background Wave SVGs (Exact reference paths) ── */}
      <div className={styles.faqBg} aria-hidden="true" data-testid="common-questions-bg">
        {/* Desktop Wave SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 1919 1032"
          className={`${styles.faqBgSvg} ${styles.isDesktop}`}
          data-background-animation=""
        >
          <path
            ref={bgPathRef}
            d="M1020.68 122.72c46.69-18.686 94.68-27.594 145.02-17.194 69.47 14.366 110.29 57.983 128.03 125.006 15.96 60.318 6.45 120.498-1.31 180.811-8.29 64.443-17.13 128.943-21.73 193.698-3.4 47.933 9.35 93.629 35.22 135.083 24.6 39.428 58.71 63.775 105.27 70.699 51.26 7.619 100.97-1.423 150.87-11.35 44.59-8.86 89.22-18.234 134.27-23.788 38-4.687 76.51-2.36 112.24 14.387 64.95 30.446 87.52 98.719 76.62 164.066-9.87 59.152-42.57 105.152-84.56 145.852-44.84 43.48-98.21 75.46-148.83 111.16-48.44 34.17-94.66 70.58-125.93 122.3-15.92 26.34-27.41 54.25-24.99 85.99 3.49 45.74 31.13 79.67 76.96 94.75 163.65 53.87 400.02-1.71 550.17-63.19 1.62-.66 3.29-1.33 5-2.01v198.97c-247.62 111.02-459.19 118.91-579.5 77.54-116.22-39.96-259.45-123.39-341.49-219.49-36.79-43.08-54.96-91.64-30.67-146.46 11.57-26.1 27.65-51.6 46.88-72.59 36.26-39.57 77.13-74.86 114.37-113.57 18.76-19.49 36.56-40.97 49.89-64.35 26.16-45.95 9.64-92.6-37.48-116.625-29.31-14.953-60.63-23.004-92.65-29.342-47.63-9.409-95.64-17.461-142.48-29.89-26.8-7.121-53.13-19.242-76.97-33.601-37.72-22.742-50.723-59.623-48.21-102.648 2.466-42.062 19.26-79.709 35.43-117.637 9.87-23.115 19.1-46.499 28.22-69.906 2.34-5.996 3.58-12.518 4.6-18.913 6.58-40.968-12.55-65.234-54.22-62.184-35.216 2.579-69.943 11.611-104.909 17.609-43.082 7.393-85.969 16.846-129.373 21.383-72.784 7.609-140.417-13.554-203.623-47.289-57.689-30.79-113.048-65.891-169.935-98.199-40.136-22.803-82.672-40.544-128.109-49.342-43.977-8.505-87.366-6.741-127.136 17.54-26.209 16.007-41.953 39.593-48.511 69.378-12.397 56.359 4.801 106.985 30.146 156.167 28.003 54.347 66.438 101.409 103.328 149.563 37.221 48.583 74.232 97.305 98.582 154.025 15.151 35.286 25.632 71.858 24.526 110.811-1.931 68.14-36.553 114.49-96.26 144.22-45.749 22.78-95.324 30.65-144.973 39.2-58.87 10.13-118.15 19.35-175.93 34.11-80.643 20.58-107.526 53.68-164.322 112.54a639 639 0 0 0-16.882 18.19l-132.568-221.71c60.66-4.84 121.702-5.43 182.561-8.15 59.581-2.68 118.458-8.23 172.798-36.44 68.743-35.69 95.922-102.94 71.732-176.511C31.88 880.71-1.357 835.57-36.217 791.052c-40.324-51.507-81.777-102.294-119.093-155.941-47.119-67.745-66.267-144.502-59.071-226.985 5.782-66.292 34.988-122.322 81.436-168.708 86.136-86.027 189.43-120.687 309.991-96.781 61.551 12.208 114.972 42.819 165.548 78.704 47.348 33.599 93.84 68.447 141.911 100.971 70.388 47.621 143.971 47.529 215.775 4.92 48.319-28.674 94.064-61.87 139.753-94.725 57.435-41.309 114.36-83.273 180.647-109.787"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0"
          />
        </svg>

        {/* Mobile Wave SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 402 778"
          className={`${styles.faqBgSvg} ${styles.isMobile}`}
        >
          <path
            d="M162.797 94.263c-25.166-5.2-49.164-.746-72.508 8.597-33.143 13.257-61.606 34.239-90.324 54.893-22.844 16.428-45.717 33.026-69.876 47.363-21.555 12.791-43.431 17.918-65.089 14.821v81.369l.357.193c31.603 16.867 65.419 27.449 101.81 23.644 21.703-2.268 43.146-6.995 64.687-10.691 17.484-2.999 34.847-7.515 52.453-8.805 20.838-1.525 30.404 10.608 27.111 31.092-.511 3.197-1.128 6.458-2.297 9.456-4.56 11.704-9.179 23.397-14.11 34.954-8.09 18.964-16.484 37.788-17.717 58.818-1.256 21.513 5.244 39.954 24.107 51.324 11.915 7.18 25.081 13.24 38.482 16.8 23.422 6.215 47.428 10.241 71.24 14.946 16.01 3.168 31.671 7.194 46.326 14.67 23.561 12.013 31.818 35.338 18.738 58.311-6.662 11.691-15.565 22.433-24.941 32.178-18.621 19.355-39.056 36.998-57.185 56.783-9.617 10.498-17.655 23.244-23.439 36.296-12.146 27.41-3.062 51.693 15.33 73.23 15.353 17.983 34.327 31.845 54.128 44.357 101.513 64.124 188.191 91.083 312.42 99.638 30.927 2.13 75.519 26.342 60.311-56.074-5.559-30.117-20.599-53.564-48.667-67.362-17.244-8.476-35.907-11.948-54.867-11.956-26.204-.014-52.411 1.67-78.622 2.094-20.823.338-41.672.017-61.792-6.606-22.915-7.542-36.736-24.508-38.48-47.377-1.209-15.867 4.539-29.824 12.496-42.995 15.633-25.858 38.746-44.065 62.964-61.15 25.31-17.848 51.995-33.839 74.416-55.579 20.994-20.352 37.347-43.351 42.281-72.926 5.448-32.673-5.834-66.81-38.31-82.032-17.864-8.374-37.123-9.538-56.119-7.195-22.525 2.777-44.84 7.464-67.138 11.894-24.947 4.964-49.802 9.485-75.433 5.676-23.282-3.462-40.334-15.636-52.636-35.35-12.933-20.727-19.309-43.575-17.609-67.542 2.297-32.377 6.718-64.627 10.865-96.849 3.878-30.156 8.633-60.246.656-90.405-8.871-33.511-29.282-55.32-64.019-62.503"
            fill="currentColor"
            stroke="currentColor"
          />
        </svg>
      </div>

      <div className={styles.faqContainer}>
        <div className={styles.faqInner}>
          {/* ── Section Header ── */}
          <div className={styles.faqHeader}>
            <h2 className={styles.faqTitle}>Common questions</h2>
          </div>

          {/* ── Accordion List & Expansion ── */}
          <div className={styles.faqContent}>
            <CommonQuestionsAccordion
              items={visibleItems}
              openIds={openIds}
              onToggle={handleToggle}
            />

            {/* ── Dual Capsule "Show all FAQ" Button ── */}
            <div className={styles.faqCta}>
              <button
                type="button"
                className={styles.buttonAlt}
                onClick={handleToggleShowAll}
                aria-label={isAllShown ? 'Show fewer questions' : 'Show all common questions'}
                data-testid="show-all-faq-button"
              >
                <span className={styles.buttonAltTextWrap}>
                  <span className={styles.buttonAltBg} />
                  <span className={styles.buttonAltTextOuter}>
                    <span className={styles.buttonAltText}>
                      {isAllShown ? 'Show less' : 'Show all FAQ'}
                    </span>
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

          {/* ── Circular Brand Seal Logo (faq__logo-easter-egg) ── */}
          <div
            className={styles.faqLogoEasterEgg}
            data-testid="faq-logo-easter-egg"
            aria-hidden="true"
          >
            <img
              src={logoCircle}
              alt="Akashic Seal Emblem"
              className={styles.faqLogoImg}
              width={64}
              height={64}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommonQuestionsSection;
