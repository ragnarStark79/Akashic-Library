import React, { useMemo } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { STORE_EASINGS, STORE_DURATIONS } from './storeMotion';
import { StoreMotionContext } from './StoreMotionContext';

export function StoreMotionProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  const value = useMemo(
    () => ({
      prefersReducedMotion,
      easings: STORE_EASINGS,
      durations: STORE_DURATIONS,
    }),
    [prefersReducedMotion]
  );

  return <StoreMotionContext.Provider value={value}>{children}</StoreMotionContext.Provider>;
}
