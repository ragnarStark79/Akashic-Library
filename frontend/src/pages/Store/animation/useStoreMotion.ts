import { useContext } from 'react';
import { StoreMotionContext } from './StoreMotionContext';

export function useStoreMotion() {
  return useContext(StoreMotionContext);
}
