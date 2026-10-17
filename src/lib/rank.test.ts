import { describe, it, expect } from 'vitest';
import type { NewsArticle } from '../types';
import { dedupeArticles, sortByRecency, computeTrending } from './rank';

function makeArticle(overrides: Partial<NewsArticle>): NewsArticle {
    return {
        id: 'x',
        headline: 'Headline',
        summary: 's',
        fullStory: 'f',
        hasFullContent: false,
        tags: [],
        source: 'src',
        sourceId: 's1',
        sourceUrl: 'https://example.com/a',
        timestamp: '2026-10-16T10:00:00Z',
        importance: 'normal',
        ...overrides,
    };
}

describe('dedupeArticles', () => {
    it('dedupes by normalized URL (utm variants collapse)', () => {
        const a = makeArticle({ id: 'a1', sourceUrl: 'https://example.com/story?utm_source=x' });
        const b = makeArticle({ id: 'a2', sourceUrl: 'https://example.com/story?utm_source=y' });
        const result = dedupeArticles([a, b]);
        expect(result).toHaveLength(1);
    });

    it('keeps the newest article when URLs collide', () => {
        const older = makeArticle({ id: 'a-older', timestamp: '2026-10-16T09:00:00Z', sourceUrl: 'https://example.com/story' });
        const newer = makeArticle({ id: 'z-newer', timestamp: '2026-10-16T11:00:00Z', sourceUrl: 'https://example.com/story?utm_source=x' });
        const result = dedupeArticles([older, newer]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('z-newer');
    });

    it('dedupes by normalized title within the same 60-minute bucket', () => {
        const a = makeArticle({ id: 'a1', headline: 'Big Story', sourceUrl: 'https://one.com/1', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'a2', headline: 'big story!', sourceUrl: 'https://two.com/2', timestamp: '2026-10-16T10:30:00Z' });
        const result = dedupeArticles([a, b]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('a2');
    });

    it('keeps same-title articles more than 60 minutes apart', () => {
        const a = makeArticle({ id: 'a1', headline: 'Big Story', sourceUrl: 'https://one.com/1', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'a2', headline: 'Big Story', sourceUrl: 'https://two.com/2', timestamp: '2026-10-16T11:01:00Z' });
        const result = dedupeArticles([a, b]);
        expect(result).toHaveLength(2);
    });

    it('breaks timestamp ties with the lexicographically first id', () => {
        const a = makeArticle({ id: 'b-second', headline: 'Big Story', sourceUrl: 'https://one.com/1', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'a-first', headline: 'Big Story', sourceUrl: 'https://two.com/2', timestamp: '2026-10-16T10:00:00Z' });
        const result = dedupeArticles([a, b]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('a-first');
    });

    it('produces an identical order across repeated runs', () => {
        const input = [
            makeArticle({ id: 'a', headline: 'One', sourceUrl: 'https://one.com/1', timestamp: '2026-10-16T10:00:00Z' }),
            makeArticle({ id: 'b', headline: 'Two', sourceUrl: 'https://two.com/2', timestamp: '2026-10-16T09:00:00Z' }),
            makeArticle({ id: 'c', headline: 'Three', sourceUrl: 'https://three.com/3', timestamp: '2026-10-16T11:00:00Z' }),
        ];
        const first = dedupeArticles(input).map(a => a.id);
        const second = dedupeArticles(input).map(a => a.id);
        expect(second).toEqual(first);
    });
});

describe('sortByRecency', () => {
    it('sorts by timestamp descending', () => {
        const a = makeArticle({ id: 'a', timestamp: '2026-10-16T09:00:00Z' });
        const b = makeArticle({ id: 'b', timestamp: '2026-10-16T11:00:00Z' });
        const c = makeArticle({ id: 'c', timestamp: '2026-10-16T10:00:00Z' });
        const result = sortByRecency([a, b, c]);
        expect(result.map(x => x.id)).toEqual(['b', 'c', 'a']);
    });

    it('breaks timestamp ties by id ascending', () => {
        const a = makeArticle({ id: 'z-id', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'a-id', timestamp: '2026-10-16T10:00:00Z' });
        const result = sortByRecency([a, b]);
        expect(result.map(x => x.id)).toEqual(['a-id', 'z-id']);
    });

    it('never shuffles randomly (repeated runs are identical)', () => {
        const input = Array.from({ length: 20 }, (_, i) =>
            makeArticle({ id: `id-${String(i).padStart(2, '0')}`, timestamp: `2026-10-16T${String(23 - i).padStart(2, '0')}:00:00Z` }),
        );
        const first = sortByRecency(input).map(a => a.id);
        const second = sortByRecency(input).map(a => a.id);
        expect(second).toEqual(first);
    });
});

describe('computeTrending', () => {
    it('flags a headline shared by 2 distinct sources within 60 minutes', () => {
        const a = makeArticle({ id: 'a', headline: 'Major Event', sourceId: 's1', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'b', headline: 'Major Event', sourceId: 's2', timestamp: '2026-10-16T10:30:00Z' });
        const trending = computeTrending([a, b]);
        expect(trending.has('a')).toBe(true);
        expect(trending.has('b')).toBe(true);
    });

    it('does not flag identical sources', () => {
        const a = makeArticle({ id: 'a', headline: 'Major Event', sourceId: 's1', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'b', headline: 'Major Event', sourceId: 's1', timestamp: '2026-10-16T10:30:00Z' });
        const trending = computeTrending([a, b]);
        expect(trending.size).toBe(0);
    });

    it('does not flag gaps greater than 60 minutes', () => {
        const a = makeArticle({ id: 'a', headline: 'Major Event', sourceId: 's1', timestamp: '2026-10-16T10:00:00Z' });
        const b = makeArticle({ id: 'b', headline: 'Major Event', sourceId: 's2', timestamp: '2026-10-16T11:01:00Z' });
        const trending = computeTrending([a, b]);
        expect(trending.size).toBe(0);
    });
});
