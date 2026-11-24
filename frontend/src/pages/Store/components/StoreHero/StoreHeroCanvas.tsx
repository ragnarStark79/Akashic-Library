import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '../../animation/useReducedMotion';
import styles from './StoreHeroCanvas.module.css';

export interface StoreHeroCanvasProps {
  className?: string;
}

export function StoreHeroCanvas({ className = '' }: StoreHeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desktopSvgRef = useRef<SVGSVGElement>(null);
  const mobileSvgRef = useRef<SVGSVGElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // 1. GSAP SVG path stroke breathing animation
  useEffect(() => {
    // Detect touch/coarse-pointer devices — disable animation on these
    const isTouch =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    if (prefersReducedMotion || isTouch) return;

    const desktopPaths = desktopSvgRef.current?.querySelectorAll('path');
    const mobilePaths = mobileSvgRef.current?.querySelectorAll('path');
    const allPaths = [...(desktopPaths ? Array.from(desktopPaths) : []), ...(mobilePaths ? Array.from(mobilePaths) : [])];

    if (!allPaths.length) return;

    gsap.set(allPaths, {
      attr: { 'stroke-width': 0 },
      rotate: 0,
      transformOrigin: 'center center',
      transformBox: 'fill-box',
    });

    const tl = gsap.timeline({ repeat: -1, yoyo: true })
      .to(allPaths, {
        attr: { 'stroke-width': 45 },
        rotate: 1.5,
        duration: 3.2,
        ease: 'sine.inOut',
      });

    return () => {
      tl.kill();
    };
  }, [prefersReducedMotion]);

  // 2. Ambient subtle organic canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect touch/coarse-pointer devices — disable animation on these
    const isTouch =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    let animationId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion || isTouch) {
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    // Organic floating particles / embers
    interface Particle {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      baseAlpha: number;
      hue: number;
    }

    const particles: Particle[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 600),
      radius: Math.random() * 3 + 1.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.2,
      alpha: Math.random() * 0.4 + 0.1,
      baseAlpha: Math.random() * 0.4 + 0.1,
      hue: Math.random() > 0.5 ? 42 : 28, // Golden yellow / warm amber
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.3;
        p.y += p.vy;
        p.alpha = p.baseAlpha + Math.sin(time * 2 + p.x * 0.02) * 0.15;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${Math.max(0, p.alpha)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 50%, 0.4)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`${styles.heroBg} ${className}`}
      data-testid="store-hero-canvas-container"
      aria-hidden="true"
    >
      {/* 2D Canvas for subtle organic floating ambient light */}
      <canvas
        ref={canvasRef}
        className={styles.ambientCanvas}
        data-testid="store-hero-ambient-canvas"
      />

      {/* Desktop SVG Organic Flow Paths (viewBox: 1920 x 1403) */}
      <svg
        ref={desktopSvgRef}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 1920 1403"
        className={styles.heroBgSvgDesktop}
      >
        {/* 1A. Upper-Left Turquoise / Teal Organic Accent Form */}
        <path
          className={styles.organicPathTeal}
          d="M-50 -50 L520 -50 C470 190 390 310 280 380 C180 440 40 430 -50 370 Z"
        />
        {/* 1B. Large Pale Cream / Yellow Flow Form */}
        <path
          className={styles.organicPathYellow}
          d="M1695.07 151.632c64.24-31.904 131.73-7.088 176.11 42.102 40.17 44.528 55.82 98.753 61.56 156.949 6.14 62.16-2.03 123.84-5.58 185.677-3.39 59.39-4.8 118.892-3.1 178.351 1.74 61.059 13.9 120.469 35.84 177.349 20.37 52.83 49.33 100.86 89.87 140.79 38.86 38.27 86.81 63.85 137.95 80.37 54.49 17.61 110.87 23.3 167.79 26.27V1403H563.858c22.618-20.94 45.485-41.67 68.618-62.06 63.364-55.84 125.132-113.62 174.673-181.67 43.123-59.23 71.916-126.11 74.453-200.77 2.373-69.83-16.711-137.56-47.531-200.28-29.35-59.73-69.362-113.06-112.134-168.345-33.98-70.665-59.64-141.34-26.451-209.729 14.422-48.177 37.313-91.294 76.771-124.226 54.474-45.449 114.019-50.265 177.528-22.453 57.146 25.041 98.342 69.929 140.732 113.528 45.29 46.59 90.28 93.645 138.12 137.532 35.4 32.486 79.11 50.935 127.66 56.479 46.17 5.271 86.45-6.277 120.85-38.421 37.86-35.39 61.71-79.931 84.98-125.169 20.81-40.424 41.24-81.195 64.93-119.919 19.97-32.658 45.75-61.364 81.1-78.913"
        />
        {/* 1C. Rich Warm Orange Foreground Flow Form */}
        <path
          className={styles.organicPathOrange}
          d="M957.607 848.011c20.203-17.228 39.917-18.164 60.863-1.598 24.27 19.186 39.37 45.721 56.29 70.767 20.96 31.054 43.97 59.866 77.1 79.279 41.59 24.371 83.09 22.411 120.71-5.291 52.77-38.829 86.04-99.464 141.58-134.68 55.94-35.443 123.8-13.01 158.65 32.594 24.12 31.568 37.13 67.993 49.5 105.059 15.59 46.719 30.26 93.909 49.19 139.269 17.07 40.92 45.88 73.4 88.67 90.21 28.36 11.14 57.68 9.52 87.02 3.74 41.87-8.25 78.62-28.78 116.22-47.63 33.58-16.84 67.56-33.2 102.44-47.01 26.07-10.33 55.11-9.2 82.05-3.2 56.46 12.08 85.31 54.13 71.77 110.37-5.95 24.65-16.34 48.25-25.99 72.01l-200.78 210.09c-1.38 21.8-56.65 62.14-72.01 78.21-83.44-113.45-193.12-200.93-308.88-278.2-32.4-21.62-122-69.18-168.22-88.23-46.23-19.06-83.56-40.17-105.3-15.59-6.32 7.14-8.24 18.89-4.06 34.64 17.72 66.79 82.4 117.75 128.69 165.26 41.55 42.65 79.03 83.98 109.75 135.17 27.95 54.83 33.11 111.22.04 165.6-11.32 18.46-23.77 36.39-36.62 54.15h-398.04c11.97-17.53 23.77-35.16 35.19-53.04 51.48-80.58 72.49-167.09 44.19-261.54-17.6-58.74-55.7-101.56-103.96-136.93-77.07-56.49-164.4-70.38-256.68-58.91-90.677 11.28-180.716 36.61-272.653 33.39-53.175-1.87-76.339-50.6-54.608-99.18 12.558-28.06 37.122-45.2 63.16-59.83 65.899-37.02 146.081-33.01 217.687-51.68 64.376-16.8 100.398-59.8 109.708-125.523 3.03-21.431 6.031-42.89 10.139-64.133 3.621-18.691 12.243-34.869 27.194-47.613"
        />
      </svg>

      {/* Mobile SVG Organic Flow Paths (viewBox: 402 x 874) */}
      <svg
        ref={mobileSvgRef}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 402 874"
        className={styles.heroBgSvgMobile}
      >
        {/* 1A. Mobile Upper-Left Turquoise / Teal Organic Accent Form */}
        <path
          className={styles.organicPathTeal}
          d="M-20 -20 L180 -20 C160 70 130 120 85 150 C45 175 10 165 -20 145 Z"
        />
        {/* 1B. Mobile Pale Cream / Yellow Flow Form */}
        <path
          className={styles.organicPathYellow}
          d="M189.759 317.853c25.652-21.403 53.691-23.67 83.597-10.574 26.911 11.792 46.31 32.93 66.272 53.461 21.327 21.939 42.513 44.098 65.039 64.764A100 100 0 0 0 422 438.279v159.838c-9.837-1.862-19.006-7.076-27.461-14.641-14.783-13.233-23.743-30.453-32.984-47.531-5.632-10.408-11.546-20.664-17.503-30.884-1.525-2.619-3.567-4.985-5.625-7.236-13.174-14.431-27.725-14.489-38.812 1.769-9.366 13.736-16.212 29.185-24.246 43.833-9.898 18.048-18.977 36.628-30.022 53.958-18.521 29.061-46.139 47.792-77.095 61.208-28.254 12.246-57.414 22.369-85.992 33.874-20.166 8.115-39.169 18.597-55.725 32.769-16.02 13.72-28.084 30.233-30.785 52.008-1.778 14.352 2.303 27.067 11.362 38.211 17.145 21.084 40.847 29.577 66.404 34.644 28.239 5.6 56.85 5.22 85.41 5.73 28.815.513 57.621 1.146 85.665 8.788 17.447 4.754 34.001 11.605 48.035 23.424a91 91 0 0 1 7.403 6.959H-28V661.367c6.342-2.235 12.783-4.262 19.285-6.147 26.26-7.61 52.728-14.539 78.803-22.731 38.178-11.995 59.704-39.148 65.035-78.102 3.587-26.214 4.754-52.805 6.028-79.275 1.601-33.276 2.808-66.557 12.455-98.761 6.792-22.687 17.572-42.991 36.153-58.498"
        />
        {/* 1C. Mobile Rich Warm Orange Flow Form */}
        <path
          className={styles.organicPathOrange}
          d="M283.204 609.36c9.513-8.112 18.797-8.554 28.662-.753 11.425 9.035 18.539 21.531 26.503 33.325 9.871 14.623 20.709 28.191 36.309 37.333 16.136 9.457 32.242 10.494 47.322 3.269V895h-16.915c-8.518-26.74-26.169-46.384-48.396-62.676-36.293-26.602-77.416-33.146-120.871-27.742-29.518 3.67-58.748 9.716-88.226 13.803-13.235 1.836-26.807 2.388-40.167 1.919-25.04-.881-35.948-23.829-25.715-46.703 5.914-13.215 17.482-21.284 29.743-28.174 18.949-10.646 40.112-13.255 61.021-16.795 13.867-2.344 27.924-4.006 41.487-7.542 30.315-7.909 47.278-28.157 51.663-59.109 1.426-10.091 2.84-20.197 4.774-30.2 1.705-8.801 5.765-16.42 12.806-22.421"
        />
      </svg>
    </div>
  );
}
