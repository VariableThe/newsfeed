import { describe, it, expect, beforeEach } from 'vitest';
import {
    FEED_CACHE_TTL_MS,
    readFeedCache,
    writeFeedCache,
    isCacheFresh,
    clearFeedCache,
} from '../cache';
import type { NewsArticle } from '../../types';

const FIXED = '2026-10-15T00:00:00.000Z';
const MAX_BYTES = 200 * 1024;

function article(n: number): NewsArticle {
    return {
        id: `n-${n}`,
        headline: `Headline ${n}`,
        summary: `Summary ${n}`,
        fullStory: `Story ${n}`,
        hasFullContent: false,
        tags: ['World'],
        source: 'BBC World',
        sourceId: 'bbc-world',
        sourceUrl: `https://example.com/${n}`,
        timestamp: FIXED,
        importance: 'normal',
    };
}

describe('feed cache', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('round-trips articles through localStorage', () => {
        const articles = [article(1), article(2)];
        const written = writeFeedCache('bbc-world', articles, FIXED);
        expect(written).toEqual({ sourceId: 'bbc-world', articles, fetchedAt: FIXED });

        const read = readFeedCache('bbc-world');
        expect(read).toEqual({ sourceId: 'bbc-world', articles, fetchedAt: FIXED });
    });

    it('defaults fetchedAt to now', () => {
        const before = Date.now();
        const entry = writeFeedCache('bbc-world', []);
        const after = Date.now();
        const parsed = Date.parse(entry.fetchedAt);
        expect(Number.isNaN(parsed)).toBe(false);
        expect(parsed).toBeGreaterThanOrEqual(before);
        expect(parsed).toBeLessThanOrEqual(after);
    });

    it('returns null for a missing key', () => {
        expect(readFeedCache('nyt-world')).toBeNull();
    });

    it('returns null for corrupt JSON', () => {
        localStorage.setItem('newsfeed_feed_cache_v2:nyt-world', '{broken json');
        expect(readFeedCache('nyt-world')).toBeNull();
    });

    it('returns null when the stored shape does not match', () => {
        localStorage.setItem(
            'newsfeed_feed_cache_v2:nyt-world',
            JSON.stringify({ sourceId: 'other-feed', articles: [], fetchedAt: FIXED }),
        );
        expect(readFeedCache('nyt-world')).toBeNull();

        localStorage.setItem(
            'newsfeed_feed_cache_v2:nyt-world',
            JSON.stringify({ sourceId: 'nyt-world', articles: 'nope', fetchedAt: FIXED }),
        );
        expect(readFeedCache('nyt-world')).toBeNull();

        localStorage.setItem(
            'newsfeed_feed_cache_v2:nyt-world',
            JSON.stringify({ sourceId: 'nyt-world', articles: [] }),
        );
        expect(readFeedCache('nyt-world')).toBeNull();
    });

    it('isCacheFresh inside the TTL and stale at the boundary', () => {
        const now = Date.now();
        const fresh = (fetchedAt: string) => ({ sourceId: 'x', articles: [], fetchedAt });

        expect(isCacheFresh(fresh(new Date(now).toISOString()))).toBe(true);
        expect(isCacheFresh(fresh(new Date(now - FEED_CACHE_TTL_MS + 1000).toISOString()))).toBe(true);
        expect(isCacheFresh(fresh(new Date(now - FEED_CACHE_TTL_MS).toISOString()))).toBe(false);
        expect(isCacheFresh(fresh(new Date(now - FEED_CACHE_TTL_MS - 60_000).toISOString()))).toBe(false);
        expect(isCacheFresh(fresh('not a date'))).toBe(false);
    });

    it('skips oversized writes without throwing but still returns the entry', () => {
        const fat: NewsArticle = { ...article(1), headline: 'x'.repeat(4000) };
        const articles = Array.from({ length: 60 }, (_, i) => ({ ...fat, id: `n-${i}` }));
        expect(JSON.stringify(articles).length).toBeGreaterThan(MAX_BYTES);

        let entry: ReturnType<typeof writeFeedCache> | undefined;
        expect(() => {
            entry = writeFeedCache('bbc-world', articles, FIXED);
        }).not.toThrow();

        expect(entry?.articles).toHaveLength(60);
        expect(localStorage.getItem('newsfeed_feed_cache_v2:bbc-world')).toBeNull();
    });

    it('clearFeedCache removes only feed cache entries', () => {
        writeFeedCache('bbc-world', [article(1)], FIXED);
        writeFeedCache('nyt-world', [article(2)], FIXED);
        localStorage.setItem('newsfeed_preferences', '{"theme":"dark"}');

        clearFeedCache();

        expect(readFeedCache('bbc-world')).toBeNull();
        expect(readFeedCache('nyt-world')).toBeNull();
        expect(localStorage.getItem('newsfeed_preferences')).toBe('{"theme":"dark"}');
    });

    it('clearFeedCache with nothing stored does not throw', () => {
        expect(() => clearFeedCache()).not.toThrow();
    });
});
