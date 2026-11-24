import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import type { TopBookItem } from '../types';
import type { StoreProductItem } from '@/pages/Store/types/store';
import { BookCard } from './BookCard';
import styles from './BookCarousel.module.css';

export interface BookCarouselRef {
  scrollPrev: () => void;
  scrollNext: () => void;
}

export interface BookCarouselProps {
  items: (TopBookItem | StoreProductItem | any)[];
  onSelectBook?: (item: any) => void;
  onScrollStateChange?: (canPrev: boolean, canNext: boolean) => void;
  className?: string;
}

export const BookCarousel = forwardRef<BookCarouselRef, BookCarouselProps>(
  function BookCarousel(
    { items, onSelectBook, onScrollStateChange, className = '' },
    ref
  ) {
    const railRef = useRef<HTMLUListElement>(null);
    const cardRefs = useRef<(HTMLElement | null)[]>([]);

    // Animation & physics state
    const targetScrollRef = useRef(0);
    const currentScrollRef = useRef(0);
    const isAnimatingRef = useRef(false);
    const rafIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Dragging state
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startScrollRef = useRef(0);
    const lastDragXRef = useRef(0);
    const dragVelocityRef = useRef(0);
    const hasDraggedPastThresholdRef = useRef(false);

    // Update Previous / Next button disabled states
    const updateScrollState = useCallback(() => {
      const rail = railRef.current;
      if (!rail) return;

      const { scrollLeft, scrollWidth, clientWidth } = rail;
      const canPrev = scrollLeft > 10;
      const canNext =
        scrollWidth > 0 && clientWidth > 0
          ? scrollLeft < scrollWidth - clientWidth - 10
          : items.length > 1;

      onScrollStateChange?.(canPrev, canNext);
    }, [items.length, onScrollStateChange]);

    // Apply authentic sine wave parallax tilt to cards based on distance from viewport center
    // Reconstructing Aardvark ParallaxSlider 54937.js onUpdate() logic
    const updateCardParallax = useCallback(() => {
      const rail = railRef.current;
      if (!rail) return;

      const wrapRect = rail.getBoundingClientRect();
      const wrapCenter = wrapRect.left + wrapRect.width / 2;
      const maxDistance = wrapRect.width / 2;
      if (maxDistance <= 0) return;

      cardRefs.current.forEach((cardEl, index) => {
        if (!cardEl) return;
        const item = items[index];
        if (!item) return;

        const rect = cardEl.getBoundingClientRect();
        const elCenter = rect.left + rect.width / 2;
        const norm = (elCenter - wrapCenter) / maxDistance;
        const clamped = Math.max(-2, Math.min(2, norm));
        const strength = Math.sin(clamped * 1.2);

        const moveY = strength * (item.initialYOffset ?? 6);
        const rotate = strength * (item.initialRotation ?? 2);

        cardEl.style.transform = `translateY(${moveY}%) rotate(${rotate}deg)`;
      });
    }, [items]);

    // Smooothy exponential lerp animation loop (lerpFactor = 0.225)
    const animateScroll = useCallback(() => {
      const rail = railRef.current;
      if (!rail) {
        isAnimatingRef.current = false;
        return;
      }

      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.25);
      lastTimeRef.current = now;

      // Smooothy exponential decay formula: 1 - exp(- (1 / lerpFactor) * dt)
      // With lerpFactor = 0.225, (1 / 0.225) ≈ 4.44
      const lerpSpeed = 1 / 0.225;
      const t = 1 - Math.exp(-lerpSpeed * dt);

      currentScrollRef.current += (targetScrollRef.current - currentScrollRef.current) * t;
      rail.scrollLeft = currentScrollRef.current;

      updateCardParallax();
      updateScrollState();

      // Check if settled
      if (Math.abs(targetScrollRef.current - currentScrollRef.current) > 1) {
        rafIdRef.current = requestAnimationFrame(animateScroll);
      } else {
        rail.scrollLeft = targetScrollRef.current;
        currentScrollRef.current = targetScrollRef.current;
        updateCardParallax();
        updateScrollState();
        isAnimatingRef.current = false;
        rafIdRef.current = null;
      }
    }, [updateCardParallax, updateScrollState]);

    const startAnimationTo = useCallback(
      (newTarget: number) => {
        const rail = railRef.current;
        if (!rail) return;

        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
        targetScrollRef.current = Math.max(0, Math.min(newTarget, maxScroll));
        currentScrollRef.current = rail.scrollLeft;
        lastTimeRef.current = performance.now();

        // If prefers-reduced-motion is active, jump immediately without lerp
        if (
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          rail.scrollLeft = targetScrollRef.current;
          currentScrollRef.current = targetScrollRef.current;
          updateCardParallax();
          updateScrollState();
          return;
        }

        if (!isAnimatingRef.current) {
          isAnimatingRef.current = true;
          lastTimeRef.current = performance.now();
          rafIdRef.current = requestAnimationFrame(animateScroll);
        }
      },
      [animateScroll, updateCardParallax, updateScrollState]
    );

    useImperativeHandle(ref, () => ({
      scrollPrev: () => {
        const rail = railRef.current;
        if (!rail) return;
        // Step roughly 2 compact card widths or 70% clientWidth
        const step = Math.min(rail.clientWidth * 0.7, 620);
        const nextTarget = (isAnimatingRef.current ? targetScrollRef.current : rail.scrollLeft) - step;
        startAnimationTo(nextTarget);
      },
      scrollNext: () => {
        const rail = railRef.current;
        if (!rail) return;
        const step = Math.min(rail.clientWidth * 0.7, 620);
        const nextTarget = (isAnimatingRef.current ? targetScrollRef.current : rail.scrollLeft) + step;
        startAnimationTo(nextTarget);
      },
    }));

    // Native scroll listener (e.g. trackpad or touch swipe)
    const handleNativeScroll = () => {
      if (!isAnimatingRef.current && !isDraggingRef.current) {
        const rail = railRef.current;
        if (!rail) return;
        currentScrollRef.current = rail.scrollLeft;
        targetScrollRef.current = rail.scrollLeft;
        updateCardParallax();
        updateScrollState();
      }
    };

    // Pointer Drag handlers with inertia & elastic bounce
    const handlePointerDown = (e: React.PointerEvent) => {
      const rail = railRef.current;
      if (!rail) return;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        isAnimatingRef.current = false;
      }

      isDraggingRef.current = true;
      hasDraggedPastThresholdRef.current = false;
      startXRef.current = e.clientX;
      startScrollRef.current = rail.scrollLeft;
      lastDragXRef.current = e.clientX;
      dragVelocityRef.current = 0;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const rail = railRef.current;
      if (!rail) return;

      const deltaX = e.clientX - startXRef.current;
      if (Math.abs(deltaX) > 6) {
        hasDraggedPastThresholdRef.current = true;
        if (!rail.hasPointerCapture(e.pointerId)) {
          try {
            rail.setPointerCapture(e.pointerId);
          } catch {
            // safe fallback
          }
        }
      }

      // Track instantaneous velocity for inertia release
      dragVelocityRef.current = e.clientX - lastDragXRef.current;
      lastDragXRef.current = e.clientX;

      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      let newScroll = startScrollRef.current - deltaX;

      // Elastic resistance if dragged beyond boundaries
      if (newScroll < 0) {
        newScroll = newScroll * 0.35;
      } else if (newScroll > maxScroll) {
        newScroll = maxScroll + (newScroll - maxScroll) * 0.35;
      }

      rail.scrollLeft = newScroll;
      currentScrollRef.current = newScroll;
      updateCardParallax();
      updateScrollState();
    };

    const handlePointerUpOrCancel = (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const rail = railRef.current;
      if (!rail) return;

      try {
        rail.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback if capture already lost
      }

      // Add inertia momentum based on release velocity
      const momentum = dragVelocityRef.current * 12;
      const proposedTarget = rail.scrollLeft - momentum;
      startAnimationTo(proposedTarget);
    };

    // Card click handler: suppress click if pointer was dragged
    const handleCardSelect = (item: TopBookItem) => {
      if (hasDraggedPastThresholdRef.current) {
        return;
      }
      onSelectBook?.(item);
    };

    useEffect(() => {
      const rail = railRef.current;
      if (!rail) return;

      updateScrollState();
      updateCardParallax();

      window.addEventListener('resize', updateScrollState, { passive: true });
      window.addEventListener('resize', updateCardParallax, { passive: true });

      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
        window.removeEventListener('resize', updateScrollState);
        window.removeEventListener('resize', updateCardParallax);
      };
    }, [updateCardParallax, updateScrollState]);

    return (
      <div className={`${styles.carouselWrapper} ${className}`.trim()}>
        <ul
          ref={railRef}
          className={styles.carouselRail}
          onScroll={handleNativeScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          aria-label="Top books collection"
          data-testid="top-books-carousel"
        >
          {items.map((item, idx) => (
            <BookCard
              key={item.id}
              item={item}
              index={idx}
              onSelect={() => handleCardSelect(item)}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              style={{
                transform: `translateY(${item.initialYOffset}%) rotate(${item.initialRotation}deg)`,
              }}
            />
          ))}
        </ul>
      </div>
    );
  }
);
