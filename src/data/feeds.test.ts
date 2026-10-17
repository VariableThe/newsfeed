import { describe, it, expect } from 'vitest';
import { FEEDS, FEED_IDS, ALL_TOPICS } from './feeds';

describe('feed catalog', () => {
    it('uses only https urls', () => {
        for (const feed of FEEDS) {
            expect(feed.url.startsWith('https://')).toBe(true);
        }
    });

    it('has unique kebab-case ids', () => {
        const ids = FEEDS.map(f => f.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) {
            expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
    });

    it('gives every feed at least one topic', () => {
        for (const feed of FEEDS) {
            expect(feed.topics.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('derives ALL_TOPICS as the deduped sorted union of feed topics', () => {
        const expected = Array.from(new Set(FEEDS.flatMap(f => f.topics))).sort();
        expect(ALL_TOPICS).toEqual(expected);
    });

    it('derives FEED_IDS from FEEDS', () => {
        expect(FEED_IDS).toEqual(FEEDS.map(f => f.id));
    });
});
