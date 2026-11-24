/**
 * Centralized Route-to-Navigation Resolver for Akashic Library.
 *
 * Implements strict mapping from application view modes to primary top-level
 * navigation IDs ('discover' [Home], 'genres', 'community', 'library', 'about', or undefined).
 *
 * Requirements:
 * - Discovery / Home -> 'discover' (Visible label: "Home")
 * - Genres / Genre Detail / Explore Genre -> 'genres'
 * - Book Reviews / Reading Room / Community Hub / Thread Detail -> 'community'
 * - Personal Library -> 'library'
 * - About -> 'about'
 * - Book Details / Search Results / Auth / Unknown -> undefined (No primary active item)
 */

export type ActiveNavSection = 'discover' | 'genres' | 'community' | 'library' | 'about';

export function resolveActiveNavigation(viewMode?: string | null): ActiveNavSection | undefined {
  if (!viewMode) {
    return 'discover';
  }

  const normalized = viewMode.trim().toLowerCase();

  switch (normalized) {
    // Primary Landing & Discovery
    case 'discover':
    case 'home':
      return 'discover';

    // Genres & Categories
    case 'genres':
    case 'genre-detail':
    case 'genre':
      return 'genres';

    // Community, Reader Experiences, Reviews, Reading Room & Marginalia
    case 'community':
    case 'community-thread':
    case 'book-reviews':
    case 'reviews':
    case 'reading-room':
      return 'community';

    // Personal Library & Desk
    case 'library':
    case 'my-library':
      return 'library';

    // About
    case 'about':
      return 'about';

    // Contextual views with NO top-level selection
    case 'book-detail':
    case 'book':
    case 'search':
    case 'search-results':
    case 'auth':
    case 'signin':
    case 'register':
    case 'account-settings':
    case 'settings':
    case 'moderation':
      return undefined;

    // Unknown or unmapped views
    default:
      return undefined;
  }
}

