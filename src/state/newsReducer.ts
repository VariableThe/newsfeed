import type { FeedState, FeedStatus, NewsArticle } from '../types';
import { sortByRecency } from '../lib/rank';
import type { PersistedState } from './persistence';

export interface Filters {
    topics: string[];
    sources: string[];
    unreadOnly: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type View =
    | { kind: 'deck' }
    | { kind: 'feed' }
    | { kind: 'saved' }
    | { kind: 'article'; id: string };

export interface State {
    feeds: Record<string, FeedState>;
    saved: NewsArticle[];
    readIds: string[];
    seenIds: string[];
    filters: Filters;
    query: string;
    view: View;
    theme: ThemePreference;
    notificationsEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    hydrated: boolean;
}

const READ_CAP = 3000;
const SEEN_CAP = 500;

export type Action =
    | { type: 'HYDRATE'; persisted: PersistedState }
    | { type: 'FEED_START'; sourceId: string }
    | { type: 'FEED_SUCCESS'; sourceId: string; articles: NewsArticle[]; fetchedAt: string }
    | { type: 'FEED_ERROR'; sourceId: string; error: string; fetchedAt: string }
    | { type: 'SAVE_ARTICLE'; article: NewsArticle }
    | { type: 'UNSAVE_ARTICLE'; id: string }
    | { type: 'MARK_READ'; id: string }
    | { type: 'MARK_ALL_READ'; ids: string[] }
    | { type: 'SET_FILTERS'; filters: Partial<Filters> }
    | { type: 'SET_QUERY'; query: string }
    | { type: 'NAVIGATE'; view: View }
    | { type: 'SET_THEME'; theme: ThemePreference }
    | { type: 'SET_NOTIFICATIONS_ENABLED'; enabled: boolean }
    | { type: 'SET_QUIET_HOURS'; start: string | null; end: string | null }
    | { type: 'MARK_SEEN'; ids: string[] }
    | { type: 'RESET' };

export const initialState: State = {
    feeds: {},
    saved: [],
    readIds: [],
    seenIds: [],
    filters: { topics: [], sources: [], unreadOnly: false },
    query: '',
    view: { kind: 'deck' },
    theme: 'system',
    notificationsEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    hydrated: false,
};

/** Append ids that are not already present, dropping oldest beyond the cap. */
function appendCapped(existing: string[], incoming: string[], cap: number): string[] {
    const seen = new Set(existing);
    const merged = [...existing];
    for (const id of incoming) {
        if (!seen.has(id)) {
            seen.add(id);
            merged.push(id);
        }
    }
    return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

/** Merge a freshly parsed article list into a source's existing list. */
function mergeArticles(existing: NewsArticle[], incoming: NewsArticle[]): NewsArticle[] {
    const byId = new Map<string, NewsArticle>();
    for (const article of existing) byId.set(article.id, article);
    for (const article of incoming) byId.set(article.id, article);
    return sortByRecency(Array.from(byId.values()));
}

function feedStatus(articleCount: number): FeedStatus {
    return articleCount === 0 ? 'partial' : 'success';
}

export function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'HYDRATE': {
            const p = action.persisted;
            return {
                ...state,
                feeds: state.feeds,
                saved: p.saved,
                readIds: p.readIds,
                seenIds: p.seenIds,
                filters: p.filters,
                theme: p.theme,
                notificationsEnabled: p.notificationsEnabled,
                quietHoursStart: p.quietHoursStart,
                quietHoursEnd: p.quietHoursEnd,
                hydrated: true,
            };
        }
        case 'FEED_START': {
            const current = state.feeds[action.sourceId];
            return {
                ...state,
                feeds: {
                    ...state.feeds,
                    [action.sourceId]: {
                        sourceId: action.sourceId,
                        status: 'loading',
                        articles: current?.articles ?? [],
                        fetchedAt: current?.fetchedAt,
                    },
                },
            };
        }
        case 'FEED_SUCCESS': {
            const current = state.feeds[action.sourceId];
            const merged = mergeArticles(current?.articles ?? [], action.articles);
            return {
                ...state,
                feeds: {
                    ...state.feeds,
                    [action.sourceId]: {
                        sourceId: action.sourceId,
                        status: feedStatus(merged.length),
                        articles: merged,
                        fetchedAt: action.fetchedAt,
                    },
                },
            };
        }
        case 'FEED_ERROR': {
            const current = state.feeds[action.sourceId];
            return {
                ...state,
                feeds: {
                    ...state.feeds,
                    [action.sourceId]: {
                        sourceId: action.sourceId,
                        status: 'error',
                        articles: current?.articles ?? [],
                        error: action.error,
                        fetchedAt: action.fetchedAt,
                    },
                },
            };
        }
        case 'SAVE_ARTICLE': {
            const without = state.saved.filter((a) => a.id !== action.article.id);
            return { ...state, saved: [action.article, ...without] };
        }
        case 'UNSAVE_ARTICLE':
            return { ...state, saved: state.saved.filter((a) => a.id !== action.id) };
        case 'MARK_READ':
            if (state.readIds.includes(action.id)) return state;
            return { ...state, readIds: appendCapped(state.readIds, [action.id], READ_CAP) };
        case 'MARK_ALL_READ':
            return { ...state, readIds: appendCapped(state.readIds, action.ids, READ_CAP) };
        case 'SET_FILTERS':
            return { ...state, filters: { ...state.filters, ...action.filters } };
        case 'SET_QUERY':
            return { ...state, query: action.query };
        case 'NAVIGATE':
            return { ...state, view: action.view };
        case 'SET_THEME':
            return { ...state, theme: action.theme };
        case 'SET_NOTIFICATIONS_ENABLED':
            return { ...state, notificationsEnabled: action.enabled };
        case 'SET_QUIET_HOURS':
            return { ...state, quietHoursStart: action.start, quietHoursEnd: action.end };
        case 'MARK_SEEN':
            return { ...state, seenIds: appendCapped(state.seenIds, action.ids, SEEN_CAP) };
        case 'RESET':
            return {
                ...state,
                feeds: {},
                saved: [],
                readIds: [],
                seenIds: [],
                query: '',
                view: { kind: 'deck' },
            };
        default:
            return state;
    }
}
