import { useState, useCallback, useRef, useEffect } from 'react';
import type { PortalTransitionStage, StoreViewMode } from '../types/store';
import { useReducedMotion } from './useReducedMotion';

interface UseStoreTransitionOptions {
  onTransitionToStore?: (view: StoreViewMode) => void;
  onTransitionToLibrary?: (targetView?: string) => void;
}

export function useStoreTransition(options: UseStoreTransitionOptions = {}) {
  const { onTransitionToStore, onTransitionToLibrary } = options;
  const [stage, setStage] = useState<PortalTransitionStage>('idle');
  const [targetExperience, setTargetExperience] = useState<'store' | 'library'>('store');
  const prefersReducedMotion = useReducedMotion();
  const timerRef = useRef<number | null>(null);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerPortalToStore = useCallback(
    (targetView: StoreViewMode = 'store') => {
      if (stage !== 'idle') return;

      setTargetExperience('store');
      setStage('entering');

      const duration = prefersReducedMotion ? 100 : 900;
      const midpoint = prefersReducedMotion ? 50 : 450;

      // At midpoint, switch destination state so content renders beneath curtain
      timerRef.current = window.setTimeout(() => {
        onTransitionToStore?.(targetView);
      }, midpoint);

      // Complete transition
      timerRef.current = window.setTimeout(() => {
        setStage('idle');
      }, duration);
    },
    [stage, prefersReducedMotion, onTransitionToStore]
  );

  const triggerPortalToLibrary = useCallback(
    (targetLibraryView: string = 'discover') => {
      if (stage !== 'idle') return;

      setTargetExperience('library');
      setStage('exiting');

      const duration = prefersReducedMotion ? 100 : 900;
      const midpoint = prefersReducedMotion ? 50 : 450;

      // At midpoint, switch to Library view
      timerRef.current = window.setTimeout(() => {
        onTransitionToLibrary?.(targetLibraryView);
      }, midpoint);

      // Complete transition
      timerRef.current = window.setTimeout(() => {
        setStage('idle');
      }, duration);
    },
    [stage, prefersReducedMotion, onTransitionToLibrary]
  );

  return {
    stage,
    targetExperience,
    isTransitioning: stage !== 'idle',
    triggerPortalToStore,
    triggerPortalToLibrary,
  };
}
