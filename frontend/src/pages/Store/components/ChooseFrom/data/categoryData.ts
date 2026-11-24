import type { CategoryItem, CategoryJitter } from '../types';

export const CATEGORIES: CategoryItem[] = [
  { id: 'horror', label: 'Horror', slug: 'horror' },
  { id: 'science-fiction', label: 'Science Fiction', slug: 'science-fiction' },
  { id: 'romance', label: 'Romance', slug: 'romance' },
  { id: 'thriller', label: 'Thriller', slug: 'thriller' },
  { id: 'literary-fiction', label: 'Literary Fiction', slug: 'literary-fiction' },
  { id: 'fantasy', label: 'Fantasy', slug: 'fantasy' },
  { id: 'gothic-fiction', label: 'Gothic Fiction', slug: 'gothic-fiction' },
  { id: 'historical-fiction', label: 'Historical Fiction', slug: 'historical-fiction' },
  { id: 'magical-realism', label: 'Magical Realism', slug: 'magical-realism' },
  { id: 'contemporary-fiction', label: 'Contemporary Fiction', slug: 'contemporary-fiction', hasWordBreak: true },
  { id: 'and-more', label: 'and more!', slug: 'all' },
];

export const HOLDERS_COUNT = 4;

export const DEFAULT_CATEGORY_JITTER: CategoryJitter = { x: 0, y: 0, r: 0 };

/**
 * Deterministic organic offset and rotation table matching original Aardvark website.
 * Each category has handcrafted, asymmetric offsets (x, y percentages) and rotation angles (degrees)
 * for the 4 floating book positions, avoiding mechanical symmetry and re-render instability.
 */
export const CATEGORY_JITTERS: readonly (readonly CategoryJitter[])[] = [
  // 0: Horror
  [
    { x: -8.5, y: -6.2, r: -7.5 },
    { x: 7.2, y: -4.8, r: 6.8 },
    { x: -5.4, y: 7.8, r: 4.2 },
    { x: 8.8, y: 9.4, r: -8.1 },
  ],
  // 1: Science Fiction
  [
    { x: -4.2, y: -9.5, r: -3.8 },
    { x: 9.6, y: -2.4, r: 8.4 },
    { x: -9.1, y: 4.6, r: -6.2 },
    { x: 5.8, y: 8.2, r: 4.5 },
  ],
  // 2: Romance
  [
    { x: -9.8, y: -3.6, r: 7.2 },
    { x: 4.5, y: -8.4, r: -5.6 },
    { x: -3.2, y: 9.1, r: -8.4 },
    { x: 9.2, y: 4.8, r: 6.9 },
  ],
  // 3: Thriller
  [
    { x: -6.4, y: -8.1, r: -6.5 },
    { x: 8.1, y: -6.7, r: 5.4 },
    { x: -8.6, y: 5.3, r: 5.8 },
    { x: 6.7, y: 7.9, r: -7.3 },
  ],
  // 4: Literary Fiction
  [
    { x: -7.8, y: -5.2, r: 4.8 },
    { x: 6.4, y: -9.1, r: -6.2 },
    { x: -4.9, y: 8.5, r: -4.5 },
    { x: 8.3, y: 6.1, r: 7.8 },
  ],
  // 5: Fantasy
  [
    { x: -5.6, y: -7.8, r: -8.2 },
    { x: 8.9, y: -3.5, r: 6.1 },
    { x: -7.3, y: 6.4, r: 7.5 },
    { x: 7.1, y: 8.7, r: -5.4 },
  ],
  // 6: Gothic Fiction
  [
    { x: -8.9, y: -4.3, r: -5.7 },
    { x: 5.2, y: -7.6, r: 7.9 },
    { x: -6.1, y: 8.9, r: -6.8 },
    { x: 9.4, y: 5.2, r: 4.2 },
  ],
  // 7: Historical Fiction
  [
    { x: -4.7, y: -8.9, r: 6.3 },
    { x: 7.8, y: -5.1, r: -4.9 },
    { x: -8.2, y: 7.1, r: 5.2 },
    { x: 6.3, y: 9.2, r: -6.7 },
  ],
  // 8: Magical Realism
  [
    { x: -9.2, y: -6.7, r: -7.1 },
    { x: 6.7, y: -8.2, r: 5.8 },
    { x: -5.1, y: 6.8, r: -5.3 },
    { x: 8.6, y: 7.4, r: 8.1 },
  ],
  // 9: Contemporary Fiction
  [
    { x: -6.8, y: -7.4, r: 5.5 },
    { x: 8.4, y: -4.2, r: -7.2 },
    { x: -7.7, y: 8.3, r: 6.4 },
    { x: 5.9, y: 6.8, r: -4.8 },
  ],
  // 10: and more!
  [
    { x: -7.5, y: -5.8, r: -6.4 },
    { x: 7.6, y: -7.3, r: 6.6 },
    { x: -6.8, y: 7.5, r: 4.8 },
    { x: 8.1, y: 8.4, r: -7.0 },
  ],
];

/**
 * Returns strongly typed jitter coordinates for a given category and holder index.
 * Bounds-checked and guarantees non-null/non-undefined return with fallback.
 */
export function getCategoryJitter(
  catIndex: number | null | undefined,
  holderIndex: number
): CategoryJitter {
  if (
    catIndex === null ||
    catIndex === undefined ||
    catIndex < 0 ||
    catIndex >= CATEGORY_JITTERS.length
  ) {
    return DEFAULT_CATEGORY_JITTER;
  }
  const categoryRow = CATEGORY_JITTERS[catIndex];
  if (!categoryRow) {
    return DEFAULT_CATEGORY_JITTER;
  }
  const jitter = categoryRow[holderIndex];
  return jitter ?? DEFAULT_CATEGORY_JITTER;
}

// Dynamically import all 44 category cover images via Vite glob
const imageModules = import.meta.glob<{ default: string }>(
  '../../../assets/images/categories/*.webp',
  { eager: true }
);

export function getCategoryCoverImage(
  holderIndex: number,
  catIndex: number | null | undefined
): string | null {
  if (
    catIndex === null ||
    catIndex === undefined ||
    catIndex < 0 ||
    catIndex >= CATEGORIES.length
  ) {
    return null;
  }
  const key = `../../../assets/images/categories/cat_${catIndex}_holder_${holderIndex}.webp`;
  const mod = imageModules[key];
  return mod?.default ?? null;
}

export function getCategoryImagesForHolder(holderIndex: number): string[] {
  const result: string[] = [];
  for (let catIdx = 0; catIdx < CATEGORIES.length; catIdx++) {
    const key = `../../../assets/images/categories/cat_${catIdx}_holder_${holderIndex}.webp`;
    const mod = imageModules[key];
    if (mod) {
      result.push(mod.default);
    } else {
      // Fallback
      result.push('');
    }
  }
  return result;
}
