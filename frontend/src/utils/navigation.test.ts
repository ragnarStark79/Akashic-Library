import { describe, it, expect } from 'vitest';
import { resolveActiveNavigation } from './navigation';

describe('resolveActiveNavigation', () => {
  it('maps default landing and home views to "discover" (Home)', () => {
    expect(resolveActiveNavigation()).toBe('discover');
    expect(resolveActiveNavigation('')).toBe('discover');
    expect(resolveActiveNavigation('discover')).toBe('discover');
    expect(resolveActiveNavigation('home')).toBe('discover');
    expect(resolveActiveNavigation('DISCOVER')).toBe('discover');
  });

  it('maps all genre routes to "genres"', () => {
    expect(resolveActiveNavigation('genres')).toBe('genres');
    expect(resolveActiveNavigation('genre-detail')).toBe('genres');
    expect(resolveActiveNavigation('genre')).toBe('genres');
  });

  it('maps community, reviews, and reading room to "community"', () => {
    expect(resolveActiveNavigation('community')).toBe('community');
    expect(resolveActiveNavigation('community-thread')).toBe('community');
    expect(resolveActiveNavigation('book-reviews')).toBe('community');
    expect(resolveActiveNavigation('reviews')).toBe('community');
    expect(resolveActiveNavigation('reading-room')).toBe('community');
  });

  it('maps personal library to "library"', () => {
    expect(resolveActiveNavigation('library')).toBe('library');
    expect(resolveActiveNavigation('my-library')).toBe('library');
  });

  it('maps about to "about"', () => {
    expect(resolveActiveNavigation('about')).toBe('about');
  });

  it('returns undefined (no active item) for Book Details', () => {
    expect(resolveActiveNavigation('book-detail')).toBeUndefined();
    expect(resolveActiveNavigation('book')).toBeUndefined();
  });

  it('returns undefined (no active item) for Search Results', () => {
    expect(resolveActiveNavigation('search')).toBeUndefined();
    expect(resolveActiveNavigation('search-results')).toBeUndefined();
  });

  it('returns undefined (no active item) for Authentication view', () => {
    expect(resolveActiveNavigation('auth')).toBeUndefined();
    expect(resolveActiveNavigation('signin')).toBeUndefined();
    expect(resolveActiveNavigation('register')).toBeUndefined();
  });

  it('returns undefined (no active item) for unknown or unmatched views', () => {
    expect(resolveActiveNavigation('unknown-route')).toBeUndefined();
    expect(resolveActiveNavigation('settings')).toBeUndefined();
    expect(resolveActiveNavigation('account-settings')).toBeUndefined();
    expect(resolveActiveNavigation('moderation')).toBeUndefined();
    expect(resolveActiveNavigation('404')).toBeUndefined();
  });
});

