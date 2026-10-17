import { describe, it, expect } from 'vitest';
import {
    selectAllArticles,
    selectFilteredArticles,
    selectDeck,
    selectSaved,
    selectReadIds,
    selectTrendingIds,
    selectFeedHealth,
    selectIsEmpty,
    selectMatchesQuery,
} from '../selectors';
import { initialState } from '../newsReducer';
import type { State } from '../newsReducer';
import { FEEDS } from '../../data/feeds';
import type { FeedState, NewsArticle } from '../../types';

const A = '2026-10-15T00:00:00.000Z';
const B = '2026-10-15T01:00:00.000Z';
const C = '2026-10-15T02:00:00.000Z';

function article(id: string, overrides: Partial<NewsArticle> = {}): NewsArticle {
    return {
        id,
        headline: `Headline ${id}`,
        summary: `Summary ${id}`,
        fullStory: `Story ${id}`,
        hasFullContent: false,
        tags: ['World'],
        source: 'BBC World',
        sourceId: 'bbc-world',
        sourceUrl: `https://example.com/${id}`,
        timestamp: A,
        importance: 'normal',
        ...overrides,
    };
}

function feed(sourceId: string, articles: NewsArticle[], status: FeedState['status'] = 'success'): FeedState {
    return { sourceId, status, articles, fetchedAt: A };
}

function stateWith(feeds: FeedState[], extra: Partial<State> = {}): State {
    return {
        ...initialState,
        feeds: Object.fromEntries(feeds.map((f) => [f.sourceId, f])),
        ...extra,
    };
}

describe('selectAllArticles', () => {
    it('merges, dedupes and recency-sorts across feeds', () => {
        const state = stateWith([
            feed('bbc-world', [article('1', { timestamp: A }), article('2', { timestamp: C })]),
            feed('nyt-world', [article('2', { timestamp: C }), article('3', { timestamp: B })]),
        ]);
        const ids = selectAllArticles(state).map((a) => a.id);
        expect(ids).toEqual(['2', '3', '1']);
    });

    it('returns an empty array when no feeds have articles', () => {
        expect(selectAllArticles(initialState)).toEqual([]);
    });
});

describe('selectFilteredArticles', () => {
    const articles = [
        article('1', { tags: ['World'], sourceId: 'bbc-world', timestamp: A }),
        article('2', { tags: ['Tech'], sourceId: 'nyt-technology', timestamp: B }),
        article('3', { tags: ['World', 'Tech'], sourceId: 'et-tech', timestamp: C }),
    ];

    it('applies a topic filter matching any selected tag', () => {
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: ['Tech'], sources: [], unreadOnly: false },
        });
        expect(selectFilteredArticles(state).map((a) => a.id)).toEqual(['3', '2']);
    });

    it('applies a source filter on sourceId', () => {
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: [], sources: ['nyt-technology'], unreadOnly: false },
        });
        expect(selectFilteredArticles(state).map((a) => a.id)).toEqual(['2']);
    });

    it('combines topic and source filters', () => {
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: ['World'], sources: ['et-tech'], unreadOnly: false },
        });
        expect(selectFilteredArticles(state).map((a) => a.id)).toEqual(['3']);
    });

    it('filters out read articles when unreadOnly is set', () => {
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: [], sources: [], unreadOnly: true },
            readIds: ['3'],
        });
        expect(selectFilteredArticles(state).map((a) => a.id)).toEqual(['2', '1']);
    });

    it('empty topic and source arrays mean no restriction', () => {
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: [], sources: [], unreadOnly: false },
        });
        expect(selectFilteredArticles(state)).toHaveLength(3);
    });

    it('does not mutate the input state', () => {
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: ['World'], sources: [], unreadOnly: true },
            readIds: ['1'],
        });
        const snapshot = JSON.stringify(state);
        selectFilteredArticles(state);
        expect(JSON.stringify(state)).toBe(snapshot);
    });
});

describe('selectDeck', () => {
    it('returns filtered unread articles recency-sorted', () => {
        const articles = [
            article('1', { timestamp: A }),
            article('2', { timestamp: C }),
            article('3', { timestamp: B }),
        ];
        const state = stateWith([feed('bbc-world', articles)], {
            readIds: ['2'],
        });
        expect(selectDeck(state).map((a) => a.id)).toEqual(['3', '1']);
    });

    it('respects unreadOnly from filters as well', () => {
        const articles = [article('1', { timestamp: A }), article('2', { timestamp: B })];
        const state = stateWith([feed('bbc-world', articles)], {
            filters: { topics: [], sources: [], unreadOnly: true },
            readIds: ['2'],
        });
        expect(selectDeck(state).map((a) => a.id)).toEqual(['1']);
    });
});

describe('selectSaved / selectReadIds', () => {
    it('selectSaved returns the saved snapshots', () => {
        const saved = [article('9'), article('8')];
        const state = stateWith([], { saved });
        expect(selectSaved(state)).toBe(saved);
    });

    it('selectReadIds returns a Set of the read ids', () => {
        const state = stateWith([], { readIds: ['1', '2'] });
        expect(selectReadIds(state)).toEqual(new Set(['1', '2']));
    });
});

describe('selectTrendingIds', () => {
    it('flags a cross-source headline appearing within the trending window', () => {
        const shared = 'Shared headline';
        const articles = [
            article('1', { headline: shared, sourceId: 'bbc-world', timestamp: A }),
            article('2', { headline: shared, sourceId: 'nyt-world', timestamp: B }),
            article('3', { headline: 'Unique story', sourceId: 'bbc-world', timestamp: A }),
        ];
        const state = stateWith([feed('bbc-world', articles)]);
        expect(selectTrendingIds(state)).toEqual(new Set(['1', '2']));
    });

    it('does not flag the same headline from a single source', () => {
        const articles = [
            article('1', { headline: 'Same source story', sourceId: 'bbc-world', timestamp: A }),
            article('2', { headline: 'Same source story', sourceId: 'bbc-world', timestamp: B }),
        ];
        const state = stateWith([feed('bbc-world', articles)]);
        expect(selectTrendingIds(state).size).toBe(0);
    });
});

describe('selectFeedHealth', () => {
    it('reports health for every catalog feed, idle when absent', () => {
        const state = stateWith([
            feed('bbc-world', [article('1')]),
            feed('nyt-world', [], 'partial'),
            feed('et-markets', [], 'error'),
        ]);
        const health = selectFeedHealth(state);
        expect(health).toHaveLength(FEEDS.length);
        const byId = Object.fromEntries(health.map((h) => [h.sourceId, h]));
        expect(byId['bbc-world']).toMatchObject({ name: 'BBC World', status: 'success', count: 1 });
        expect(byId['nyt-world']).toMatchObject({ status: 'partial', count: 0 });
        expect(byId['et-markets']).toMatchObject({ status: 'error', count: 0 });
        expect(byId['nyt-sports']).toMatchObject({ status: 'idle', count: 0 });
    });
});

describe('selectIsEmpty', () => {
    it('is true when no feed has articles', () => {
        expect(selectIsEmpty(initialState)).toBe(true);
        expect(selectIsEmpty(stateWith([feed('bbc-world', [], 'partial')]))).toBe(true);
    });

    it('is false when any feed has articles', () => {
        expect(selectIsEmpty(stateWith([feed('bbc-world', [article('1')])]))).toBe(false);
    });
});

describe('selectMatchesQuery', () => {
    const sample = article('1', {
        headline: 'Market Rally Continues',
        summary: 'Stocks climbed today',
        source: 'BBC World',
        tags: ['Markets', 'Business'],
    });

    it('matches headline, summary, source and tags case-insensitively', () => {
        expect(selectMatchesQuery(sample, 'market')).toBe(true);
        expect(selectMatchesQuery(sample, 'RALLY')).toBe(true);
        expect(selectMatchesQuery(sample, 'stocks')).toBe(true);
        expect(selectMatchesQuery(sample, 'bbc')).toBe(true);
        expect(selectMatchesQuery(sample, 'business')).toBe(true);
    });

    it('trims the query', () => {
        expect(selectMatchesQuery(sample, '  market  ')).toBe(true);
    });

    it('an empty query matches everything', () => {
        expect(selectMatchesQuery(sample, '')).toBe(true);
        expect(selectMatchesQuery(sample, '   ')).toBe(true);
    });

    it('returns false when nothing matches', () => {
        expect(selectMatchesQuery(sample, 'zebra')).toBe(false);
    });
});
