import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '../../animation/useReducedMotion';
import styles from './StoreNavButton.module.css';

export interface StoreNavButtonProps {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  icon?: React.ReactNode;
  badge?: number | string;
  variant?: 'pill' | 'accent' | 'ghost';
  ariaLabel?: string;
  id?: string;
  'data-testid'?: string;
}

export function StoreNavButton({
  label,
  onClick,
  isActive = false,
  className = '',
  icon,
  badge,
  variant = 'pill',
  ariaLabel,
  id,
  'data-testid': testId,
}: StoreNavButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const characters = label.split('');

  useEffect(() => {
    if (prefersReducedMotion) return;

    const targets = charsRef.current.filter((el): el is HTMLSpanElement => Boolean(el));
    if (!targets.length) return;

    // Initialize character properties
    gsap.set(targets, {
      display: 'inline-block',
      transformOrigin: 'center center',
      willChange: 'transform',
      yPercent: 0,
      scaleY: 1,
      rotate: 0,
    });

    const tl = gsap.timeline({ paused: true });

    tl.to(targets, {
      keyframes: {
        '0%': {
          yPercent: 0,
          scaleY: 1,
          rotate: 0,
        },
        '20%': {
          yPercent: 55,
          scaleY: 0.3,
          rotate: 17,
          ease: 'power2.in',
        },
        '100%': {
          yPercent: 0,
          scaleY: 1,
          rotate: 0,
          ease: 'elastic.out(1, 0.4)',
        },
      },
      duration: 0.65,
      stagger: {
        amount: 0.18,
      },
    });

    timelineRef.current = tl;

    return () => {
      tl.kill();
      timelineRef.current = null;
    };
  }, [label, prefersReducedMotion]);

  const handleMouseEnter = () => {
    if (prefersReducedMotion || !timelineRef.current) return;
    timelineRef.current.restart();
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion || !timelineRef.current) return;
    timelineRef.current.pause();

    const targets = charsRef.current.filter((el): el is HTMLSpanElement => Boolean(el));
    if (targets.length) {
      gsap.to(targets, {
        yPercent: 0,
        scaleY: 1,
        rotate: 0,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || !timelineRef.current) return;
    if (e.target.matches(':focus-visible')) {
      timelineRef.current.restart();
    }
  };

  const handleBlur = () => {
    handleMouseLeave();
  };

  const variantClass =
    variant === 'accent'
      ? styles.variantAccent
      : variant === 'ghost'
        ? styles.variantGhost
        : styles.variantPill;

  return (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      className={`${styles.navButton} ${variantClass} ${isActive ? styles.active : ''} ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={ariaLabel || label}
      aria-current={isActive ? 'page' : undefined}
      data-testid={testId || `store-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className={styles.buttonBg} aria-hidden="true" />
      <span className={styles.buttonInner}>
        {icon && <span className={styles.buttonIcon} aria-hidden="true">{icon}</span>}
        <span className={styles.buttonText} aria-hidden="true">
          {characters.map((char, idx) => (
            <span
              key={`${char}-${idx}`}
              ref={(el) => {
                charsRef.current[idx] = el;
              }}
              className={styles.splitChar}
              data-char={char}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </span>
        {badge !== undefined && Number(badge) > 0 && (
          <span className={styles.badgePill} data-testid="cart-badge-pill">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

export default StoreNavButton;
