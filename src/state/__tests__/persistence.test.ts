import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    SCHEMA_VERSION,
    loadPersisted,
    savePersisted,
    clearPersisted,
    defaultPersisted,
} from '../persistence';
import { initialState } from '../newsReducer';
import type { NewsArticle } from '../../types';

const FIXED = '2026-10-15T00:00:00.000Z';

function article(id: number): NewsArticle {
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
    };
}

const LEGACY_KEYS = [
    'newsfeed_selected_tags_v2',
    'newsfeed_has_customized_tags_v2',
    'newsfeed_is_dark_mode',
    'newsfeed_notifications_enabled',
    'newsfeed_importance_threshold',
    'newsfeed_history_ids',
    'newsfeed_saved_ids',
];

function sampleState() {
    return {
        ...initialState,
        saved: [article(1)],
        readIds: ['n-1'],
        seenIds: ['n-2'],
        filters: { topics: ['World'], sources: ['bbc-world'], unreadOnly: true },
        theme: 'dark' as const,
        notificationsEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
    };
}

describe('persistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('exposes schema version 2', () => {
        expect(SCHEMA_VERSION).toBe(2);
    });

    it('round-trips save then load', () => {
        savePersisted(sampleState());
        const loaded = loadPersisted();
        expect(loaded.version).toBe(SCHEMA_VERSION);
        expect(loaded.saved).toEqual([article(1)]);
        expect(loaded.readIds).toEqual(['n-1']);
        expect(loaded.seenIds).toEqual(['n-2']);
        expect(loaded.filters).toEqual({ topics: ['World'], sources: ['bbc-world'], unreadOnly: true });
        expect(loaded.theme).toBe('dark');
        expect(loaded.notificationsEnabled).toBe(true);
        expect(loaded.quietHoursStart).toBe('22:00');
        expect(loaded.quietHoursEnd).toBe('07:00');
    });

    it('returns defaults when the key is missing', () => {
        expect(loadPersisted()).toEqual(defaultPersisted());
    });

    it('returns defaults and removes the key on corrupt JSON', () => {
        localStorage.setItem('newsfeed_state_v2', '{broken json');
        expect(loadPersisted()).toEqual(defaultPersisted());
        expect(localStorage.getItem('newsfeed_state_v2')).toBeNull();
    });

    it('returns defaults on a wrong schema version', () => {
        const payload = { ...defaultPersisted(), version: 1 };
        localStorage.setItem('newsfeed_state_v2', JSON.stringify(payload));
        expect(loadPersisted()).toEqual(defaultPersisted());
    });

    it('returns defaults on wrong-shaped fields', () => {
        const base = defaultPersisted();
        const badShapes: unknown[] = [
            { ...base, saved: 'nope' },
            { ...base, readIds: 'nope' },
            { ...base, seenIds: 42 },
            { ...base, filters: null },
            { ...base, filters: { topics: 'World', sources: [], unreadOnly: false } },
            { ...base, filters: { topics: [], sources: [], unreadOnly: 'yes' } },
            { ...base, theme: 'blue' },
            { ...base, notificationsEnabled: 'yes' },
            { ...base, quietHoursStart: '9pm' },
            { ...base, quietHoursEnd: '25:00' },
            { ...base, quietHoursStart: 22 },
            'not a record',
            42,
        ];
        for (const bad of badShapes) {
            localStorage.setItem('newsfeed_state_v2', JSON.stringify(bad));
            expect(loadPersisted()).toEqual(defaultPersisted());
        }
    });

    it('removes legacy keys on first load', () => {
        for (const key of LEGACY_KEYS) {
            localStorage.setItem(key, 'stale-value');
        }
        loadPersisted();
        for (const key of LEGACY_KEYS) {
            expect(localStorage.getItem(key)).toBeNull();
        }
    });

    it('does not remove legacy keys when a valid v2 state already exists', () => {
        savePersisted(sampleState());
        localStorage.setItem('newsfeed_saved_ids', '["n-1"]');
        loadPersisted();
        expect(localStorage.getItem('newsfeed_saved_ids')).toBe('["n-1"]');
    });

    it('savePersisted never throws when storage write fails', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota exceeded');
        });
        expect(() => savePersisted(sampleState())).not.toThrow();
    });

    it('loadPersisted never throws when storage read fails', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage unavailable');
        });
        expect(() => loadPersisted()).not.toThrow();
        expect(loadPersisted()).toEqual(defaultPersisted());
    });

    it('clearPersisted removes the v2 key', () => {
        savePersisted(sampleState());
        clearPersisted();
        expect(localStorage.getItem('newsfeed_state_v2')).toBeNull();
    });

    it('clearPersisted does not throw when the key is missing', () => {
        expect(() => clearPersisted()).not.toThrow();
    });
});
