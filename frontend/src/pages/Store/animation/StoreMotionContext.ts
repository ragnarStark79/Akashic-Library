import { createContext } from 'react';
import { STORE_EASINGS, STORE_DURATIONS } from './storeMotion';

export interface StoreMotionContextValue {
  prefersReducedMotion: boolean;
  easings: typeof STORE_EASINGS;
  durations: typeof STORE_DURATIONS;
}

export const StoreMotionContext = createContext<StoreMotionContextValue>({
  prefersReducedMotion: false,
  easings: STORE_EASINGS,
  durations: STORE_DURATIONS,
});
