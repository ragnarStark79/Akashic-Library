import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCategoryImagesPreloader } from './useCategoryImagesPreloader';

describe('useCategoryImagesPreloader Hook', () => {
  it('initializes and preloads all 44 category cover images', () => {
    const { result } = renderHook(() => useCategoryImagesPreloader());

    // Strict requirement: all 44 covers (11 categories * 4 holders)
    expect(result.current.totalCount).toBe(44);
    expect(typeof result.current.isLoaded).toBe('boolean');
    expect(typeof result.current.loadedCount).toBe('number');
    expect(typeof result.current.isUrlLoaded).toBe('function');
  });
});
