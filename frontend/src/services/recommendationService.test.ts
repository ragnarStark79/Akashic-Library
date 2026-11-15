import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSafeExternalUrl,
  normalizeRecommendationBook,
  fetchPersonalizedRecommendations,
  fetchSimilarBooks,
  fetchExternalLinks,
} from './recommendationService';
import * as discoveryService from './discoveryService';
import type { RecommendationBook } from '@/types/discovery';

describe('recommendationService', () => {
  beforeEach(() => {
    vi.spyOn(discoveryService, 'getDiscoveryDataMode').mockReturnValue('demo');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isSafeExternalUrl', () => {
    it('accepts valid http and https URLs', () => {
      expect(isSafeExternalUrl('https://openlibrary.org/books/OL123M')).toBe(true);
      expect(isSafeExternalUrl('http://archive.org/details/book')).toBe(true);
      expect(isSafeExternalUrl('https://books.google.com/preview?id=xyz')).toBe(true);
    });

    it('rejects unsafe schemes such as javascript:, data:, and file:', () => {
      expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeExternalUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('rejects empty, null, undefined, and malformed strings', () => {
      expect(isSafeExternalUrl('')).toBe(false);
      expect(isSafeExternalUrl(null)).toBe(false);
      expect(isSafeExternalUrl(undefined)).toBe(false);
      expect(isSafeExternalUrl('not-a-valid-url')).toBe(false);
    });
  });

  describe('normalizeRecommendationBook', () => {
    it('normalizes author objects and primary cover', () => {
      const raw: RecommendationBook = {
        id: 'rec-1',
        title: 'Ficciones',
        authors: [{ name: 'Jorge Luis Borges' }, { name: 'Adolfo Bioy Casares' }],
        covers: [
          { url: 'https://example.com/cover-thumb.jpg', size: 'S', is_primary: false },
          { url: 'https://example.com/cover-primary.jpg', size: 'L', is_primary: true },
        ],
        subjects: ['Metaphysics', 'Labyrinths'],
        recommendation_reason: 'Because you like related subjects',
      };

      const normalized = normalizeRecommendationBook(raw);

      expect(normalized.id).toBe('rec-1');
      expect(normalized.title).toBe('Ficciones');
      expect(normalized.authors).toEqual(['Jorge Luis Borges', 'Adolfo Bioy Casares']);
      expect(normalized.cover_url).toBe('https://example.com/cover-primary.jpg');
      expect(normalized.recommendation_reason).toBe('Because you like related subjects');
    });

    it('handles string authors and empty covers array gracefully', () => {
      const raw: RecommendationBook = {
        id: 'rec-2',
        title: 'The Dispossessed',
        authors: ['Ursula K. Le Guin'],
        covers: [],
        subjects: ['Science Fiction'],
        recommendation_reason: 'Popular in Akashic Library',
      };

      const normalized = normalizeRecommendationBook(raw);

      expect(normalized.authors).toEqual(['Ursula K. Le Guin']);
      expect(normalized.cover_url).toBeNull();
      expect(normalized.recommendation_reason).toBe('Popular in Akashic Library');
    });

    it('handles missing authors with Unknown Author fallback', () => {
      const raw: RecommendationBook = {
        id: 'rec-3',
        title: 'Anonymous Manuscript',
        authors: [],
      };

      const normalized = normalizeRecommendationBook(raw);
      expect(normalized.authors).toEqual(['Unknown Author']);
    });
  });

  describe('demo mode endpoints', () => {
    it('fetchPersonalizedRecommendations returns demo recommendations with reasons', async () => {
      const res = await fetchPersonalizedRecommendations();
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0]?.recommendation_reason).toBeDefined();
    });

    it('fetchSimilarBooks returns similar books', async () => {
      const res = await fetchSimilarBooks('6af72791ebebc613760355ec');
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0]?.title).toBe('Invisible Cities');
    });

    it('fetchExternalLinks returns verified access options', async () => {
      const res = await fetchExternalLinks('6af72791ebebc613760355ec');
      expect(res.access_options).toBeDefined();
      expect(res.access_options?.length).toBeGreaterThan(0);
      expect(res.access_options?.[0]?.type).toBe('INFORMATION');
    });
  });
});
