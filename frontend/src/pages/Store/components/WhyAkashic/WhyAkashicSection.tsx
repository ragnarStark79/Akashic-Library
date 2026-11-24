import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../animation/useReducedMotion';
import { WHY_AKASHIC_CAPSULES } from './data/whyAkashicData';
import { WhyAkashicSealLogo } from './WhyAkashicSealLogo';
import type { WhyAkashicSectionProps } from './types';
import styles from './WhyAkashicSection.module.css';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    // Headless / SSR fallback
  }
}

export function WhyAkashicSection({
  className = '',
  onExploreClick,
}: WhyAkashicSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const capsulesRef = useRef<(HTMLDivElement | null)[]>([]);
  const bgPathsRef = useRef<(SVGPathElement | null)[]>([]);
  const prefersReducedMotion = useReducedMotion();

  // ── GSAP Lifecycle & Motion Orchestration ──
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) return;

      const validCapsules = capsulesRef.current.filter((el): el is HTMLDivElement => Boolean(el));

      // Entrance animation for feature capsules matching authentic elastic pop
      if (validCapsules.length) {
        gsap.fromTo(
          validCapsules,
          {
            scale: 0,
            rotate: () => gsap.utils.random(-25, 25),
          },
          {
            scale: 1,
            rotate: 0,
            duration: 0.85,
            ease: 'elastic.out(1, 0.75)',
            stagger: 0.072,
            scrollTrigger: {
              trigger: section,
              start: 'top 75%',
              once: true,
            },
          }
        );
      }

      // Decorative wave stroke animation matching authentic Aardvark background
      const validPaths = bgPathsRef.current.filter((el): el is SVGPathElement => Boolean(el));
      if (validPaths.length) {
        gsap.set(validPaths, {
          attr: { 'stroke-width': 0 },
          rotate: 0,
          transformOrigin: 'center center',
          transformBox: 'fill-box',
        });

        const waveTl = gsap
          .timeline({ repeat: -1, yoyo: true })
          .to(validPaths, {
            attr: { 'stroke-width': 45 },
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

  // ── Controlled Pointer-Responsive Momentum Motion on Feature Capsules ──
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const section = sectionRef.current;
    if (!section) return;

    const currentCapsules = capsulesRef.current;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    const maxDisplacement = 12; // <= 12px
    const maxTilt = 1.5; // +- 1.5 deg
    const influenceRadius = 480;

    const settleCapsules = () => {
      const validCapsules = currentCapsules.filter((el): el is HTMLDivElement => Boolean(el));
      validCapsules.forEach((capsuleEl) => {
        gsap.to(capsuleEl, {
          x: 0,
          y: 0,
          rotation: 0,
          duration: 0.75,
          ease: 'elastic.out(1, 0.5)',
          overwrite: 'auto',
        });
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      const validCapsules = currentCapsules.filter((el): el is HTMLDivElement => Boolean(el));
      if (!validCapsules.length) return;

      validCapsules.forEach((capsuleEl) => {
        const rect = capsuleEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < influenceRadius) {
          const w = 1 - dist / influenceRadius;
          const targetX = gsap.utils.clamp(-maxDisplacement, maxDisplacement, (dx / influenceRadius) * maxDisplacement * w * 2);
          const targetY = gsap.utils.clamp(-maxDisplacement, maxDisplacement, (dy / influenceRadius) * maxDisplacement * w * 2);
          const targetRot = gsap.utils.clamp(-maxTilt, maxTilt, (dx / influenceRadius) * maxTilt * w * 2);

          gsap.to(capsuleEl, {
            x: targetX,
            y: targetY,
            rotation: targetRot,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        } else {
          gsap.to(capsuleEl, {
            x: 0,
            y: 0,
            rotation: 0,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        }
      });

      // Clear pending stop timer and reset debounce
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = setTimeout(settleCapsules, 150);
    };

    const handlePointerLeave = () => {
      if (stopTimer) clearTimeout(stopTimer);
      settleCapsules();
    };

    section.addEventListener('pointermove', handlePointerMove);
    section.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      section.removeEventListener('pointermove', handlePointerMove);
      section.removeEventListener('pointerleave', handlePointerLeave);
      if (stopTimer) clearTimeout(stopTimer);
      const validCapsules = currentCapsules.filter((el): el is HTMLDivElement => Boolean(el));
      validCapsules.forEach((capsuleEl) => gsap.killTweensOf(capsuleEl));
    };
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.benefitsSection} ${className}`.trim()}
      data-testid="why-akashic-section"
      data-benefits=""
      aria-label="Why Akashic - Store Features and Member Values"
    >
      <div className={styles.benefitsContainer}>
        <div className={styles.benefitsInner}>
          {/* ── Central Brand Composition: Curved Arched Title & Seal ── */}
          <div className={styles.benefitsContent}>
            {/* Arched SVG Title "Why Akashic?" */}
            <svg
              viewBox="0 0 650 235"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.benefitsLogoText}
              aria-label="Why Akashic?"
              role="img"
            >
              <defs>
                <path
                  id="whyAkashicArchCurve"
                  d="M 45,215 C 130,40 520,40 605,215"
                  fill="none"
                />
              </defs>
              <text
                fill="#670A2E"
                fontFamily="var(--store-font-champ, 'Champ-ExtraBold-w', 'Degular', sans-serif)"
                fontSize="82"
                fontWeight="800"
                letterSpacing="-1.5"
              >
                <textPath
                  href="#whyAkashicArchCurve"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  Why Akashic?
                </textPath>
              </text>
            </svg>

            {/* Central Circular Akashic Seal Emblem */}
            <WhyAkashicSealLogo className={styles.benefitsLogo} />
          </div>

          {/* ── Five Floating Editorial Feature Capsules ── */}
          <div
            className={styles.benefitsLabelWrap}
            data-momentum-hover=""
          >
            {WHY_AKASHIC_CAPSULES.map((capsule, idx) => {
              const variantClass =
                capsule.variant === 'first'
                  ? styles.isFirst
                  : capsule.variant === 'second'
                  ? styles.isSecond
                  : capsule.variant === 'third'
                  ? styles.isThird
                  : capsule.variant === 'fourth'
                  ? styles.isFourth
                  : styles.isFifth;

              return (
                <div
                  key={capsule.id}
                  className={`${styles.benefitsLabel} ${variantClass}`}
                  data-momentum-hover-element=""
                  onClick={onExploreClick}
                >
                  <div
                    ref={(el) => {
                      capsulesRef.current[idx] = el;
                    }}
                    className={styles.benefitsLabelInner}
                    data-benefits-item=""
                    data-momentum-hover-target=""
                    style={{
                      backgroundColor: capsule.backgroundColor,
                      color: capsule.textColor,
                    }}
                    data-testid={`why-akashic-capsule-${capsule.id}`}
                  >
                    <span>{capsule.text}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Layered Golden Wave Background SVGs ── */}
          <div className={styles.benefitsBg} data-testid="why-akashic-bg" aria-hidden="true">
            {/* Desktop Golden Wave Shapes */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 1920 1080"
              className={`${styles.benefitsBgSvg} ${styles.isDesktop}`}
              data-background-animation=""
            >
              <path
                ref={(el) => {
                  bgPathsRef.current[0] = el;
                }}
                d="M622.956 92.984c69.68-13.332 124.091 11.33 166.146 66.451 37.834 49.612 52.094 108.845 68.023 167.531 17.015 62.708 33.544 125.678 54.097 187.256 15.213 45.582 44.491 82.912 84.258 111.302 37.83 27.001 78.65 36.435 124.32 25.002 50.27-12.591 92.73-39.978 135.02-68.255 37.81-25.261 75.44-51.01 114.93-73.391 33.31-18.877 69.78-31.477 109.2-29.686 71.66 3.254 118.64 57.683 133.6 122.222 13.54 58.421.94 113.436-22.27 167.116-24.77 57.338-61.83 107.317-94.92 159.675-31.66 50.112-60.42 101.453-69.5 161.203-4.62 30.42-4.55 60.61 9.84 89 14.94 29.48 39.11 48.49 69.45 55.47-81.24 30.12-208.99 79.29-324.5 122.86-38.79-25.16-64.29-60.23-63.06-111.3.7-28.55 5.79-58.25 15.52-85.01 18.34-50.44 42.58-98.69 62.16-148.71 9.86-25.18 18.08-51.846 21.44-78.548 6.57-52.461-26.55-89.231-79.28-93.381-32.8-2.591-64.81 1.965-96.82 8.372-47.599 9.543-95.035 20.489-143.067 26.944-27.486 3.684-56.451 2.571-83.964-1.568-43.559-6.563-69.693-35.655-83.846-76.364-13.828-39.799-12.733-81.006-12.31-122.239.259-25.129-.162-50.268-.701-75.384-.135-6.434-1.493-12.93-2.997-19.229-9.605-40.368-36.568-55.459-73.901-36.683-31.54 15.866-60.163 37.506-90.168 56.437-36.968 23.326-72.964 48.481-111.324 69.293-64.323 34.899-134.904 41.246-206.21 34.284-65.083-6.353-129.663-17.582-194.586-25.645-45.808-5.696-91.896-5.797-137.238 3.474-43.882 8.982-83.289 27.227-110.731 64.886-18.082 24.823-23.594 52.639-18.247 82.666 10.129 56.81 45.402 96.993 87.647 132.721C-94.353 1001.24-40.827 1030 11.69 1060.35c52.987 30.63 105.833 61.47 150.046 104.54 27.508 26.8 51.194 56.57 65.086 92.97 24.309 63.69 10.075 119.77-33.697 170.09a258 258 0 0 1-4.983 5.57l-241.336-31.48c5.88-39.47-6.454-79.83-36.872-115.17-37.549-43.63-85.539-72.6-134.789-100.38-56.973-32.14-114.712-63.18-169.726-98.45-69.469-44.54-116.549-108.116-141.485-187.068-20.043-63.453-14.519-126.396 10.628-187.033 46.63-112.453 128.778-184.025 249.305-208.106 61.535-12.29 122.605-4.466 183.068 9.317 56.605 12.908 112.898 27.297 169.758 38.935 83.258 17.039 151.197-11.223 201.213-78.079 33.656-44.99 63.206-93.172 92.831-141.018 37.24-60.153 73.756-120.717 124.837-170.592 35.975-35.14 76.904-61.747 127.382-71.412"
                fill="currentColor"
                stroke="currentColor"
                opacity="0.5"
              />
              <path
                ref={(el) => {
                  bgPathsRef.current[1] = el;
                }}
                d="M639.856 543.657c37.333-18.775 64.31-3.688 73.902 36.683 1.487 6.29 2.845 12.787 2.992 19.218.543 25.128.965 50.267.701 75.383-.422 41.233-1.517 82.44 12.312 122.24 14.153 40.709 40.298 69.797 83.857 76.359 27.513 4.14 56.478 5.253 83.964 1.568 48.032-6.454 95.464-17.413 143.066-26.944 31.99-6.403 64.02-10.962 96.82-8.372 52.75 4.146 85.86 40.904 79.28 93.369-3.36 26.701-11.58 53.368-21.44 78.549-19.59 50.03-43.84 98.27-62.17 148.71-9.73 26.76-14.82 56.45-15.51 84.99-1.24 51.09 24.26 86.16 63.06 111.32-68.89 25.98-133.43 49.98-181.16 66.77-16.458-30.02-21.454-63.6-17.627-98.22 5.421-48.96 15.437-97.43 24.427-145.94 7.14-38.48 13.4-76.73 7.59-116.12-8.39-56.91-56.908-109.587-123.034-105.734-33.859 1.974-65.045 13.287-96.708 24.223-30.14 10.406-61.045 20.841-92.433 24.881-46.346 5.96-83.604-12.5-108.187-54.086-19.571-33.127-25.751-69.564-29.062-106.964-2.666-30.169-3.029-60.765-14.966-89.377-10.306-24.705-28.009-33.475-54.038-28.224-19.269 3.895-34.639 13.869-46.863 28.482-13.885 16.611-26.908 33.95-39.942 51.251-40.002 53.055-92.354 73.198-156.813 56.577-28.843-7.434-56.675-18.865-84.849-28.818-42.496-15.017-84.505-32.025-130.67-31.798-29.872.151-59.682 3.217-84.253 21.687-42.549 31.983-45.887 85.942-.264 113.45 24.344 14.675 50.13 27.67 76.613 37.928 58.981 22.852 119.504 41.802 178.143 65.472 86.292 34.83 155.98 89.5 196.065 176.48 25.095 54.48 37.693 110.51 24.633 170.54-5.719 26.28-14.355 50.27-25.59 72.18l-213.539-27.85c1.68-1.82 3.34-3.68 4.978-5.56 43.771-50.32 58.007-106.4 33.698-170.09-13.892-36.4-37.579-66.17-65.087-92.97-44.226-43.07-97.072-73.91-150.047-104.54-52.516-30.36-106.047-59.12-152.723-98.594-42.241-35.716-77.518-75.911-87.646-132.722-5.36-30.023.152-57.839 18.247-82.666 27.445-37.646 66.853-55.892 110.735-64.874 45.343-9.271 91.43-9.169 137.238-3.473 64.923 8.063 129.516 19.288 194.586 25.645 71.301 6.949 141.883.601 206.21-34.285 38.363-20.799 74.357-45.967 111.337-69.296 30.005-18.931 58.627-40.572 90.167-56.438"
                fill="currentColor"
                stroke="currentColor"
              />
            </svg>

            {/* Mobile Golden Wave Shapes */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 402 465"
              className={`${styles.benefitsBgSvg} ${styles.isMobile}`}
            >
              <path
                d="M6.084 110.368c25.96-4.967 46.231 4.22 61.898 24.756 14.096 18.482 19.408 40.551 25.342 62.415 6.34 23.361 12.497 46.82 20.154 69.761 5.667 16.982 16.576 30.889 31.391 41.466 14.092 10.06 29.303 13.574 46.316 9.315 18.729-4.691 34.547-14.895 50.302-25.429 14.084-9.411 28.107-19.004 42.819-27.342 12.406-7.033 25.995-11.727 40.679-11.06 26.697 1.213 44.203 21.491 49.775 45.535 5.042 21.764.348 42.261-8.296 62.259-9.23 21.362-23.036 39.982-35.364 59.488-11.795 18.669-22.51 37.796-25.893 60.054a97 97 0 0 0-.661 5.269l-103.095 7.627c5.807-13.994 12.327-27.726 17.851-41.836 3.673-9.382 6.736-19.317 7.986-29.265 2.449-19.544-9.889-33.244-29.534-34.79-12.22-.965-24.149.733-36.073 3.119-17.732 3.556-35.405 7.635-53.299 10.039-10.24 1.373-21.031.958-31.281-.584-16.228-2.445-25.964-13.284-31.237-28.45-5.151-14.827-4.743-30.179-4.586-45.54.097-9.362-.06-18.728-.261-28.085-.05-2.397-.556-4.817-1.117-7.164-3.578-15.039-13.623-20.661-27.532-13.666C1.4 283.778-8.622 291.169-19 297.865V119.724c7.653-4.369 15.949-7.607 25.084-9.356"
                fill="currentColor"
                stroke="currentColor"
                opacity="0.5"
              />
              <path
                d="M12.38 278.266c13.909-6.995 23.96-1.374 27.533 13.666.554 2.343 1.06 4.764 1.115 7.16.203 9.361.36 18.727.261 28.084-.157 15.361-.565 30.714 4.587 45.541 5.273 15.166 15.013 26.002 31.241 28.447 10.25 1.542 21.042 1.958 31.281.585 17.895-2.405 35.566-6.488 53.299-10.039 11.92-2.385 23.853-4.083 36.074-3.118 19.649 1.545 31.985 15.239 29.532 34.784-1.25 9.947-4.313 19.883-7.987 29.265-5.527 14.112-12.048 27.846-17.853 41.841l-49.818 3.685c1.064-8.698 1.407-17.439.094-26.336-3.125-21.202-21.201-40.828-45.837-39.392-12.613.735-24.232 4.95-36.028 9.024-11.229 3.877-22.743 7.765-34.436 9.271-17.267 2.219-31.147-4.658-40.305-20.151-7.291-12.341-9.594-25.917-10.827-39.85-.786-8.889-1.036-17.878-3.306-26.521V297.88c10.382-6.698 20.408-14.094 31.38-19.614"
                fill="currentColor"
                stroke="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyAkashicSection;
