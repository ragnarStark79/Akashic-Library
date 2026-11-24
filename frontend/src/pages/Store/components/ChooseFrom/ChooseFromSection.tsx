import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '../../animation/useReducedMotion';
import {
  CATEGORIES,
  HOLDERS_COUNT,
  getCategoryJitter,
  getCategoryCoverImage,
} from './data/categoryData';
import { useCategoryImagesPreloader } from './hooks/useCategoryImagesPreloader';
import type { ChooseFromSectionProps } from './types';
import styles from './ChooseFromSection.module.css';

const ANNOTATION_TEXT = "We've got a book for every kind of reader";

export function ChooseFromSection({
  className = '',
  onSelectCategory,
  onSignUpClick,
}: ChooseFromSectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(220);
  const [isEasterEggOpen, setIsEasterEggOpen] = useState<boolean>(false);
  const [parallax, setParallax] = useState<{ px: number; py: number }>({ px: 0, py: 0 });

  const listRef = useRef<HTMLUListElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const boxesRef = useRef<(HTMLDivElement | null)[]>([]);
  const exitTweenRef = useRef<gsap.core.Tween | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Preload all 44 category cover images on mount
  useCategoryImagesPreloader();

  // Ensure resting state for boxes on mount
  useEffect(() => {
    const validBoxes = boxesRef.current.filter((el): el is HTMLDivElement => Boolean(el));
    if (validBoxes.length) {
      gsap.set(validBoxes, { scale: 0, opacity: 0 });
    }
  }, []);

  // Pointer move handler on the list for subtle parallax
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || activeIndex === null) return;
    const list = listRef.current;
    if (!list) return;

    const rect = list.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ px, py });
  };

  const handleItemEnter = (index: number) => {
    // If an exit tween was in flight, immediately kill it and switch smoothly
    if (exitTweenRef.current) {
      exitTweenRef.current.kill();
      exitTweenRef.current = null;
    }

    const itemEl = itemsRef.current[index];
    if (itemEl) {
      const rect = itemEl.getBoundingClientRect();
      if (activeIndex === null && displayIndex === null) {
        setStartIndex(index);
        setStartWidth(rect.width);
      }
    }

    setActiveIndex(index);
    setDisplayIndex(index);

    const validBoxes = boxesRef.current.filter((el): el is HTMLDivElement => Boolean(el));
    if (validBoxes.length) {
      if (prefersReducedMotion) {
        gsap.set(validBoxes, { scale: 1, opacity: 1 });
      } else {
        gsap.to(validBoxes, {
          scale: 1,
          opacity: 1,
          duration: 0.35,
          stagger: 0.03,
          ease: 'back.out(1.5)',
          overwrite: 'auto',
        });
      }
    }
  };

  const handleListLeave = () => {
    setActiveIndex(null);
    setParallax({ px: 0, py: 0 });

    if (prefersReducedMotion) {
      const validBoxes = boxesRef.current.filter((el): el is HTMLDivElement => Boolean(el));
      if (validBoxes.length) {
        gsap.set(validBoxes, { scale: 0, opacity: 0 });
      }
      setDisplayIndex(null);
      return;
    }

    const validBoxes = boxesRef.current.filter((el): el is HTMLDivElement => Boolean(el));
    if (validBoxes.length && displayIndex !== null) {
      if (exitTweenRef.current) {
        exitTweenRef.current.kill();
      }
      const isTestEnv =
        typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

      // Graceful reverse exit animation: animate covers out to scale: 0, opacity: 0 (duration ~0.25s, power2.in)
      exitTweenRef.current = gsap.to(validBoxes, {
        scale: 0,
        opacity: 0,
        duration: isTestEnv ? 0 : 0.25,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: () => {
          setDisplayIndex(null);
          exitTweenRef.current = null;
        },
      });
      if (isTestEnv) {
        setDisplayIndex(null);
      }
    } else {
      setDisplayIndex(null);
    }
  };

  // Close easter egg on outside click
  useEffect(() => {
    if (!isEasterEggOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest(`.${styles.popUpWrap}`)) {
        setIsEasterEggOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isEasterEggOpen]);

  const effectiveIndex = activeIndex ?? displayIndex;
  const activeOffset = effectiveIndex !== null ? effectiveIndex - startIndex : 0;

  return (
    <section
      className={`${styles.genreSection} ${className}`}
      data-testid="choose-from-section"
      aria-label="Choose from book categories"
    >
      <div className={styles.genreContainer}>
        <div className={styles.genreInner}>
          {/* ── Section Header ── */}
          <div className={styles.genreHeader}>
            <h2 className={styles.genreTitle}>Choose from</h2>

            <div className={styles.genreTextWrap}>
              <div className={styles.genreTextOuter}>
                <p className={styles.genreText} aria-label={ANNOTATION_TEXT}>
                  {ANNOTATION_TEXT}
                </p>
              </div>
            </div>
          </div>

          {/* ── Category Links & Floating Artwork ── */}
          <div
            className={styles.genreListWrap}
            data-active={activeIndex !== null ? 'true' : 'false'}
            onPointerMove={handlePointerMove}
            onPointerLeave={handleListLeave}
            style={
              {
                '--start-index': startIndex,
                '--start-width': startWidth,
                '--active-index': activeOffset,
                '--px': parallax.px,
                '--py': parallax.py,
              } as React.CSSProperties
            }
          >
            {/* The 11 Genre Buttons */}
            <ul ref={listRef} className={styles.genreList} role="list">
              {CATEGORIES.map((cat, idx) => (
                <li key={cat.id}>
                  <button
                    ref={(el) => {
                      itemsRef.current[idx] = el;
                    }}
                    type="button"
                    className={`${styles.genreListItem} ${cat.hasWordBreak ? styles.hasWordBreak : ''}`}
                    onPointerEnter={() => handleItemEnter(idx)}
                    onFocus={() => handleItemEnter(idx)}
                    onClick={() => onSelectCategory?.(cat)}
                    aria-label={`Browse ${cat.label} books`}
                    data-testid={`category-item-${cat.id}`}
                  >
                    <div className={styles.genreLink}>
                      <span className={styles.genreLinkDefault}>{cat.label}</span>
                      <span className={styles.genreLinkHover} aria-hidden="true">
                        {cat.label}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {/* ── 4 Floating Book Holders (Single Active Category Architecture) ── */}
            <div className={styles.genreHolding} aria-hidden="true">
              <div className={styles.genreScope}>
                {Array.from({ length: HOLDERS_COUNT }).map((_, hIdx) => {
                  const jit = getCategoryJitter(displayIndex, hIdx);
                  const activeSrc = getCategoryCoverImage(hIdx, displayIndex);

                  return (
                    <div key={hIdx} className={styles.genreHolder}>
                      <div
                        className={styles.genreBox}
                        style={
                          {
                            '--x': jit.x,
                            '--y': jit.y,
                            '--r': jit.r,
                          } as React.CSSProperties
                        }
                      >
                        <div
                          ref={(el) => {
                            boxesRef.current[hIdx] = el;
                          }}
                          className={styles.genreCard}
                        >
                          {activeSrc ? (
                            <img
                              key={`${displayIndex}_${hIdx}`}
                              src={activeSrc}
                              alt=""
                              className={styles.genreImg}
                              loading="eager"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

            {/* ── Easter Egg Popup Button ── */}
            <div className={styles.genreEasterEgg}>
              <div className={styles.popUpWrap}>
                {/* Animated Pop-Up Overlay */}
                {isEasterEggOpen && (
                  <div
                    className={styles.popUpOverlay}
                    data-testid="choose-from-easter-egg-popup"
                  >
                    <div className={styles.popUpEars} aria-hidden="true">
                      <svg
                        className={styles.popUpLeftEar}
                        viewBox="0 0 44 45"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1.335.198c.671-.316 1.5-.254 2.186.187C27.678 16.847 39.839 36.953 44 45h-6.048c-2.382-1.604-6.964-3.674-15.652-4.814C2.999 37.666-.665 14.174.09 2.04.152 1.28.589.515 1.335.198Z"
                          fill="currentColor"
                        />
                      </svg>
                      <svg
                        className={styles.popUpRightEar}
                        viewBox="0 0 29 80"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19.388.879c.667-.771 1.647-1.018 2.559-.807.912.21 1.682.956 1.926 1.861C34.595 38.09 25.79 69.237 21.823 80h-4.188c-.17-4.22-2.739-13.318-10.975-22.064-8.493-9.099-8.88-21.913-1.063-37.23C11.221 9.603 19.091 1.266 19.388.879Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <div className={styles.popUpCard}>
                      <h3 className={styles.popUpCardTitle}>Want to join the Club?</h3>
                      <div className={styles.popUpAction}>
                        <button
                          type="button"
                          className={styles.buttonAlt}
                          onClick={onSignUpClick}
                          data-testid="easter-egg-signup-button"
                        >
                          <span className={styles.buttonAltTextWrap}>
                            <span className={styles.buttonAltBg} />
                            <span className={styles.buttonAltTextOuter}>
                              <span className={styles.buttonAltText}>Sign-up now!</span>
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
                  </div>
                )}

                {/* Pop-up Trigger Button (Circular Seal) */}
                <button
                  type="button"
                  className={styles.popUpButton}
                  onClick={() => setIsEasterEggOpen((prev) => !prev)}
                  aria-label="Toggle Sign up pop-up"
                  aria-expanded={isEasterEggOpen}
                  data-testid="choose-from-easter-egg-trigger"
                >
                  <svg
                    className={styles.popUpButtonSvg}
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="m53.332 55.909-9.81-22.05c1.253-3.071 4.434-12.573 1.132-24.425a.845.845 0 0 0-.602-.6.82.82 0 0 0-.82.24c-.096.12-2.651 2.711-4.507 6.19-2.58 4.799-2.531 8.854.12 11.78 2.917 3.192 3.062 5.423 2.893 6.431l-.555.048c-.988-2.111-4.29-8.062-12.51-13.82a.734.734 0 0 0-.698-.072c-.242.096-.386.336-.41.576-.314 3.839.723 11.3 6.893 12.212 3.881.576 5.183 1.68 5.593 2.136-.121.816-.41 1.871-.989 3.239l-7.28 16.651h-.023a1.456 1.456 0 0 1-.12.288l-.097.192c-1.157 2.471-5.327 6.766-6.99 8.446-.41.431-.7.72-.796.84-.096.12-.385.575.169 1.175.771.84 3.182 1.895 4.315 1.104.337-.24.53-.48.747-.768.627-.816 4.001-4.559 9.424-9.261 0 0 1.76-2.184 4.435-2.52h1.616c1.205 0 2.169.288 2.723 1.512l.892 2.04c.844 1.943.844 2.998-2 3.454v1.296h11.642v-1.248c-2.363-.432-2.869-1.727-4.387-5.086Zm-13.233-7.27a2.284 2.284 0 0 1-2.29-2.28 2.284 2.284 0 0 1 2.29-2.279 2.284 2.284 0 0 1 2.29 2.28c0 1.247-1.037 2.279-2.29 2.279Z"
                      fill="currentColor"
                    />
                    <path
                      clipRule="evenodd"
                      d="M40.922 0C63.522 0 80 18.401 80 41.1 80 63.8 63.522 80 40.922 80S0 63.8 0 41.1C0 18.402 18.321 0 40.922 0Zm22.857 15.697c-13.817-13.474-36.234-13.754-49.77 0C.473 29.45 2.035 50.379 15.852 63.853 29.67 77.327 52.823 79.81 66.36 66.055c13.537-13.754 11.237-36.884-2.58-50.358Z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  export default ChooseFromSection;
