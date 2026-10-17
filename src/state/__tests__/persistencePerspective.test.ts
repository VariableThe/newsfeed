import { describe, it, expect, beforeEach } from 'vitest';
import { reducer, initialState } from '../newsReducer';
import type { State } from '../newsReducer';
import { loadPersisted, savePersisted } from '../persistence';
import { selectSaved } from '../selectors';
import type { NewsArticle } from '../../types';

const FIXED = '2026-10-15T00:00:00.000Z';

function article(id: number, overrides: Partial<NewsArticle> = {}): NewsArticle {
    return {
        id: `n-${id}`,
        headline: `Headline ${id}`,
        summary: `Summary ${id}`,
        fullStory: `Story ${id}`,
        hasFullContent: true,
        tags: ['World'],
        source: 'BBC World',
        sourceId: 'bbc-world',
        sourceUrl: `https://example.com/${id}`,
        timestamp: FIXED,
        importance: 'normal',
        ...overrides,
    };
}

function persistState(state: State): void {
    savePersisted(state);
}

function hydrateFresh(): State {
    const persisted = loadPersisted();
    return reducer(initialState, { type: 'HYDRATE', persisted });
}

describe('persistence across reload (AC1 regression)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('saved article survives a reload with the same id', () => {
        // Save an article in the "old" session.
        let old = initialState;
        old = reducer(old, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: [article(1), article(2)],
            fetchedAt: FIXED,
        });
        // Save article 1 by id
        const articleToSave = old.feeds['bbc-world'].articles[0];
        old = reducer(old, { type: 'SAVE_ARTICLE', article: articleToSave });
        expect(selectSaved(old)).toHaveLength(1);
        expect(selectSaved(old)[0].id).toBe('n-1');

        // Persist
        persistState(old);

        // Simulate a reload: fresh initialState + HYDRATE from storage.
        const fresh = hydrateFresh();
        const savedAfterReload = selectSaved(fresh);

        expect(savedAfterReload).toHaveLength(1);
        expect(savedAfterReload[0].id).toBe('n-1');
        expect(savedAfterReload[0]).toMatchObject({
            id: 'n-1',
            headline: 'Headline 1',
            summary: 'Summary 1',
            fullStory: 'Story 1',
            hasFullContent: true,
        });
    });

    it('saved article survives a rotated feed list (old article no longer fetched)', () => {
        // Session 1: fetch and save
        let old = initialState;
        const oldList = [article(1), article(2)];
        old = reducer(old, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: oldList,
            fetchedAt: FIXED,
        });
        old = reducer(old, { type: 'SAVE_ARTICLE', article: oldList[0] });
        persistState(old);

        // Session 2: reload
        let fresh = hydrateFresh();
        expect(selectSaved(fresh)).toHaveLength(1);

        // Session 2 continues: a rotated feed list that no longer contains article n-1.
        const rotatedList = [article(3, { sourceUrl: 'https://example.com/3' }), article(4, { sourceUrl: 'https://example.com/4' })];
        fresh = reducer(fresh, {
            type: 'FEED_SUCCESS',
            sourceId: 'bbc-world',
            articles: rotatedList,
            fetchedAt: '2026-10-16T00:00:00.000Z',
        });

        // The saved copy must still be there.
        const saved = selectSaved(fresh);
        expect(saved).toHaveLength(1);
        expect(saved[0].id).toBe('n-1');
        expect(saved[0]).toMatchObject({
            id: 'n-1',
            headline: 'Headline 1',
            summary: 'Summary 1',
        });
    });
});
