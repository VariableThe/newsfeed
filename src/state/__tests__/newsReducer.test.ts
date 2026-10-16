import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../newsReducer';
import type { Action, State } from '../newsReducer';
import type { NewsArticle } from '../../types';

const FIXED = '2026-10-15T00:00:00.000Z';

function article(id: number, overrides: Partial<NewsArticle> = {}): NewsArticle {
    return {
        id: `n-${id}`,
        headline: `Headline ${id}`,
        summary: `Summary ${id}`,
        fullStory: `Story ${id}`,
        hasFullContent: false,
        tags: ['World'],
        source: 'BBC World',
        sourceId: 'bbc-world',
        sourceUrl: `https://example.com/${id}`,
        timestamp: FIXED,
        importance: 'normal',
        ...overrides,
    };
}

function stateWith(feeds: State['feeds']): State {
    return { ...initialState, feeds };
}

describe('newsReducer', () => {
    it('returns the initial state for an unknown action', () => {
        const state = reducer(initialState, { type: 'SET_QUERY', query: 'x' });
        expect(state).not.toBe(initialState);
        expect(reducer(initialState, { type: 'RESET' })).toEqual({
            ...initialState,
            feeds: {},
            saved: [],
            readIds: [],
            seenIds: [],
            query: '',
            view: { kind: 'deck' },
        });
    });

    it('FEED_START marks the feed loading and preserves existing articles', () => {
        const existing = stateWith({
            'bbc-world': {
                sourceId: 'bbc-world',
                status: 'success',
                articles: [article(1)],
                fetchedAt: FIXED,
            },
        });
        const next = reducer(existing, { type: 'FEED_START', sourceId: 'bbc-world' });
        expect(next.feeds['bbc-world'].status).toBe('loading');
        expect(next.feeds['bbc-world'].articles).toHaveLength(1);

        const fresh = reducer(initialState, { type: 'FEED_START', sourceId: 'nyt-world' });
        expect(fresh.feeds['nyt-world'].status).toBe('loading');
        expect(fresh.feeds['nyt-world'].articles).toEqual([]);
    });

    it('FEED_SUCCESS stores articles sorted by recency with success status', () => {
        const older = article(1, { timestamp: '2026-10-14T00:00:00.000Z' });
        const newer = article(2, { timestamp: '2026-10-15T00:00:00.000Z' });
        const next = reducer(initialState, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: [older, newer],
            fetchedAt: FIXED,
        });
        expect(next.feeds['bbc-world'].status).toBe('success');
        expect(next.feeds['bbc-world'].articles.map((a) => a.id)).toEqual(['n-2', 'n-1']);
        expect(next.feeds['bbc-world'].fetchedAt).toBe(FIXED);
    });

    it('FEED_SUCCESS marks an empty feed list as partial', () => {
        const next = reducer(initialState, {
            type: 'FEED_SUCCESS',
            sourceId: 'nyt-sports',
            articles: [],
            fetchedAt: FIXED,
        });
        expect(next.feeds['nyt-sports'].status).toBe('partial');
        expect(next.feeds['nyt-sports'].articles).toEqual([]);
    });

    it('FEED_SUCCESS twice with overlapping articles does not duplicate', () => {
        const first = [article(1), article(2)];
        const second = [article(2, { summary: 'Updated summary' }), article(3)];
        const once = reducer(initialState, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: first,
            fetchedAt: FIXED,
        });
        const twice = reducer(once, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: second,
            fetchedAt: FIXED,
        });
        expect(twice.feeds['bbc-world'].articles).toHaveLength(3);
        const ids = twice.feeds['bbc-world'].articles.map((a) => a.id);
        expect(new Set(ids).size).toBe(3);
        const updated = twice.feeds['bbc-world'].articles.find((a) => a.id === 'n-2');
        expect(updated?.summary).toBe('Updated summary');
    });

    it('FEED_ERROR records the error and keeps prior articles', () => {
        const withArticles = reducer(initialState, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: [article(1)],
            fetchedAt: FIXED,
        });
        const next = reducer(withArticles, {
            type: 'FEED_ERROR',
            sourceId: 'bbc-world',
            error: 'all transports failed',
            fetchedAt: FIXED,
        });
        expect(next.feeds['bbc-world'].status).toBe('error');
        expect(next.feeds['bbc-world'].error).toBe('all transports failed');
        expect(next.feeds['bbc-world'].articles).toHaveLength(1);
    });

    it('SAVE_ARTICLE is idempotent and keeps the full snapshot newest-first', () => {
        const full = article(1, { fullStory: 'Long story', hasFullContent: true });
        const once = reducer(initialState, { type: 'SAVE_ARTICLE', article: full });
        const twice = reducer(once, { type: 'SAVE_ARTICLE', article: full });
        expect(twice.saved).toHaveLength(1);
        expect(twice.saved[0]).toEqual(full);
        expect(twice.saved[0].fullStory).toBe('Long story');
        expect(twice.saved[0].hasFullContent).toBe(true);

        const other = reducer(once, { type: 'SAVE_ARTICLE', article: article(2) });
        expect(other.saved.map((a) => a.id)).toEqual(['n-2', 'n-1']);
    });

    it('UNSAVE_ARTICLE removes by id', () => {
        const saved = reducer(initialState, { type: 'SAVE_ARTICLE', article: article(1) });
        const next = reducer(saved, { type: 'UNSAVE_ARTICLE', id: 'n-1' });
        expect(next.saved).toEqual([]);
    });

    it('MARK_READ is idempotent', () => {
        const once = reducer(initialState, { type: 'MARK_READ', id: 'n-1' });
        const twice = reducer(once, { type: 'MARK_READ', id: 'n-1' });
        expect(twice.readIds).toEqual(['n-1']);
    });

    it('MARK_ALL_READ merges ids without duplicating', () => {
        const read = reducer(initialState, { type: 'MARK_READ', id: 'n-1' });
        const next = reducer(read, { type: 'MARK_ALL_READ', ids: ['n-1', 'n-2', 'n-3'] });
        expect(next.readIds).toEqual(['n-1', 'n-2', 'n-3']);
    });

    it('caps readIds at 3000 dropping the oldest', () => {
        let state = initialState;
        for (let i = 0; i < 3005; i += 1) {
            state = reducer(state, { type: 'MARK_READ', id: `n-${i}` });
        }
        expect(state.readIds).toHaveLength(3000);
        expect(state.readIds[0]).toBe('n-5');
        expect(state.readIds[2999]).toBe('n-3004');
    });

    it('caps seenIds at 500 dropping the oldest', () => {
        let state = initialState;
        for (let i = 0; i < 503; i += 1) {
            state = reducer(state, { type: 'MARK_SEEN', ids: [`n-${i}`] });
        }
        expect(state.seenIds).toHaveLength(500);
        expect(state.seenIds[0]).toBe('n-3');
        expect(state.seenIds[499]).toBe('n-502');
    });

    it('SET_FILTERS merges a partial filter object', () => {
        const next = reducer(initialState, { type: 'SET_FILTERS', filters: { topics: ['World'] } });
        expect(next.filters).toEqual({ topics: ['World'], sources: [], unreadOnly: false });
        const again = reducer(next, { type: 'SET_FILTERS', filters: { unreadOnly: true } });
        expect(again.filters).toEqual({ topics: ['World'], sources: [], unreadOnly: true });
    });

    it('SET_QUERY, NAVIGATE, SET_THEME, SET_NOTIFICATIONS_ENABLED, SET_QUIET_HOURS update their fields', () => {
        let state = reducer(initialState, { type: 'SET_QUERY', query: 'hello' });
        expect(state.query).toBe('hello');
        state = reducer(state, { type: 'NAVIGATE', view: { kind: 'feed' } });
        expect(state.view).toEqual({ kind: 'feed' });
        state = reducer(state, { type: 'NAVIGATE', view: { kind: 'article', id: 'n-1' } });
        expect(state.view).toEqual({ kind: 'article', id: 'n-1' });
        state = reducer(state, { type: 'SET_THEME', theme: 'dark' });
        expect(state.theme).toBe('dark');
        state = reducer(state, { type: 'SET_NOTIFICATIONS_ENABLED', enabled: true });
        expect(state.notificationsEnabled).toBe(true);
        state = reducer(state, { type: 'SET_QUIET_HOURS', start: '22:00', end: '07:00' });
        expect(state.quietHoursStart).toBe('22:00');
        expect(state.quietHoursEnd).toBe('07:00');
    });

    it('RESET clears reading state but keeps preferences', () => {
        let state = initialState;
        state = reducer(state, { type: 'FEED_SUCCESS', sourceId: 'bbc-world', articles: [article(1)], fetchedAt: FIXED });
        state = reducer(state, { type: 'SAVE_ARTICLE', article: article(1) });
        state = reducer(state, { type: 'MARK_READ', id: 'n-1' });
        state = reducer(state, { type: 'SET_THEME', theme: 'dark' });
        state = reducer(state, { type: 'SET_FILTERS', filters: { topics: ['World'] } });
        state = reducer(state, { type: 'SET_QUIET_HOURS', start: '22:00', end: '07:00' });
        state = reducer(state, { type: 'SET_NOTIFICATIONS_ENABLED', enabled: true });
        state = reducer(state, { type: 'SET_QUERY', query: 'keep-me-out' });
        state = reducer(state, { type: 'NAVIGATE', view: { kind: 'feed' } });

        const next = reducer(state, { type: 'RESET' });
        expect(next.feeds).toEqual({});
        expect(next.saved).toEqual([]);
        expect(next.readIds).toEqual([]);
        expect(next.seenIds).toEqual([]);
        expect(next.query).toBe('');
        expect(next.view).toEqual({ kind: 'deck' });
        expect(next.theme).toBe('dark');
        expect(next.filters).toEqual({ topics: ['World'], sources: [], unreadOnly: false });
        expect(next.quietHoursStart).toBe('22:00');
        expect(next.quietHoursEnd).toBe('07:00');
        expect(next.notificationsEnabled).toBe(true);
    });

    it('HYDRATE merges persisted data without clobbering a newer in-memory feed list', () => {
        const inMemory = {
            'nyt-world': {
                sourceId: 'nyt-world' as const,
                status: 'success' as const,
                articles: [article(9, { sourceId: 'nyt-world' })],
                fetchedAt: '2026-10-16T00:00:00.000Z',
            },
        };
        const persisted = {
            version: 2,
            saved: [article(1)],
            readIds: ['n-1'],
            seenIds: [],
            filters: { topics: ['Tech'], sources: [], unreadOnly: false },
            theme: 'light' as const,
            notificationsEnabled: true,
            quietHoursStart: null,
            quietHoursEnd: null,
        };
        const next = reducer(stateWith(inMemory), { type: 'HYDRATE', persisted });
        expect(next.feeds).toBe(inMemory);
        expect(next.saved).toEqual([article(1)]);
        expect(next.readIds).toEqual(['n-1']);
        expect(next.filters.topics).toEqual(['Tech']);
        expect(next.theme).toBe('light');
        expect(next.notificationsEnabled).toBe(true);
        expect(next.hydrated).toBe(true);
    });

    it('is pure: same input and action produce equal output and do not mutate the input', () => {
        const input = reducer(initialState, { type: 'MARK_READ', id: 'n-1' });
        const snapshot = JSON.stringify(input);
        const action: Action = { type: 'SAVE_ARTICLE', article: article(1) };
        const out1 = reducer(input, action);
        const out2 = reducer(input, action);
        expect(out1).toEqual(out2);
        expect(out1).not.toBe(input);
        expect(JSON.stringify(input)).toBe(snapshot);
    });
});
