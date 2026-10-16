import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { FeedState, NewsArticle } from '../types';
import { FEED_IDS, ALL_TOPICS } from '../data/feeds';
import { reducer, initialState } from './newsReducer';
import type { Filters, State, ThemePreference, View } from './newsReducer';
import { loadPersisted, savePersisted } from './persistence';
import {
    selectAllArticles,
    selectDeck,
    selectFeedHealth,
    selectFilteredArticles,
    selectIsEmpty,
    selectReadIds,
    selectSaved,
    selectTrendingIds,
} from './selectors';
import type { FeedHealth } from './selectors';
import { refreshAll, refreshFeed as refreshFeedService } from '../services/feedService';
import type { RefreshOutcome } from '../services/feedService';
import { readFeedCache } from '../services/cache';
import {
    getPermission,
    isInQuietHours,
    requestPermission,
    selectNotifiable,
    sendNotification,
} from '../services/notifications';
import type { NotificationPermission } from '../services/notifications';
import { computeTrending } from '../lib/rank';
import { useMediaQuery } from '../hooks/useMediaQuery';

export interface NewsStore {
    articles: NewsArticle[];
    filtered: NewsArticle[];
    deck: NewsArticle[];
    saved: NewsArticle[];
    feeds: Record<string, FeedState>;
    feedHealth: FeedHealth[];
    trendingIds: Set<string>;
    readIds: Set<string>;
    isLoading: boolean;
    isRefreshing: boolean;
    isEmpty: boolean;
    lastUpdated: string | null;
    error: string | null;
    filters: Filters;
    query: string;
    view: View;
    theme: ThemePreference;
    resolvedTheme: 'light' | 'dark';
    notificationsPermission: NotificationPermission;
    notificationsEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    topics: string[];
    sources: string[];
    refresh: () => Promise<void>;
    refreshFeed: (sourceId: string) => Promise<void>;
    openDeck: () => void;
    openFeed: () => void;
    openSaved: () => void;
    openArticle: (id: string) => void;
    closeArticle: () => void;
    saveArticle: (id: string) => void;
    unsaveArticle: (id: string) => void;
    toggleSaved: (id: string) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    setQuery: (query: string) => void;
    setTopics: (topics: string[]) => void;
    toggleTopic: (topic: string) => void;
    setSources: (sources: string[]) => void;
    toggleSource: (sourceId: string) => void;
    clearFilters: () => void;
    setTheme: (theme: ThemePreference) => void;
    enableNotifications: () => Promise<NotificationPermission>;
    disableNotifications: () => void;
    setQuietHours: (start: string | null, end: string | null) => void;
    resetReadingState: () => void;
}

const NewsStoreContext = createContext<NewsStore | null>(null);

/** Module-level guard: the initial fetch happens once per page load, even under StrictMode. */
let bootstrapped = false;

function initState(): State {
    const persisted = loadPersisted();
    return reducer(initialState, { type: 'HYDRATE', persisted });
}

function computeError(feedHealth: FeedHealth[]): string | null {
    if (feedHealth.length === 0) return null;
    const allFailed = feedHealth.every((health) => health.status === 'error');
    const anyArticles = feedHealth.some((health) => health.count > 0);
    if (!allFailed || anyArticles) return null;
    const messages = feedHealth
        .map((health) => health.error)
        .filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join('; ') : 'all feeds failed';
}

export function NewsProvider(props: { children: ReactNode }): ReactElement {
    const [state, dispatch] = useReducer(reducer, initialState, initState);
    const [refreshingCount, setRefreshingCount] = useState(0);
    const notifyPendingRef = useRef(false);
    const stateRef = useRef(state);

    const {
        hydrated,
        saved,
        readIds,
        seenIds,
        filters,
        theme,
        notificationsEnabled,
        quietHoursStart,
        quietHoursEnd,
    } = state;

    useEffect(() => {
        stateRef.current = state;
    });

    // Persist on meaningful changes only — never on every query keystroke.
    useEffect(() => {
        if (!hydrated) return;
        savePersisted({ saved, readIds, seenIds, filters, theme, notificationsEnabled, quietHoursStart, quietHoursEnd });
    }, [hydrated, saved, readIds, seenIds, filters, theme, notificationsEnabled, quietHoursStart, quietHoursEnd]);

    const applyOutcome = useCallback((outcome: RefreshOutcome): void => {
        if (outcome.ok) {
            const cached = readFeedCache(outcome.sourceId);
            dispatch({
                type: 'FEED_SUCCESS',
                sourceId: outcome.sourceId,
                articles: cached?.articles ?? [],
                fetchedAt: cached?.fetchedAt ?? new Date().toISOString(),
            });
        } else {
            dispatch({
                type: 'FEED_ERROR',
                sourceId: outcome.sourceId,
                error: outcome.error ?? 'unknown error',
                fetchedAt: new Date().toISOString(),
            });
        }
    }, []);

    const refresh = useCallback(async (): Promise<void> => {
        setRefreshingCount((count) => count + 1);
        try {
            for (const sourceId of FEED_IDS) {
                dispatch({ type: 'FEED_START', sourceId });
            }
            const outcomes = await refreshAll();
            for (const outcome of outcomes) {
                applyOutcome(outcome);
            }
            notifyPendingRef.current = true;
        } finally {
            setRefreshingCount((count) => count - 1);
        }
    }, [applyOutcome]);

    const refreshFeed = useCallback(
        async (sourceId: string): Promise<void> => {
            setRefreshingCount((count) => count + 1);
            try {
                dispatch({ type: 'FEED_START', sourceId });
                const outcome = await refreshFeedService(sourceId);
                applyOutcome(outcome);
                notifyPendingRef.current = true;
            } finally {
                setRefreshingCount((count) => count - 1);
            }
        },
        [applyOutcome],
    );

    // Fetch on mount exactly once; the module-level guard covers StrictMode double-mounting.
    useEffect(() => {
        if (bootstrapped) return;
        bootstrapped = true;
        void refresh();
    }, [refresh]);

    // Notify after a successful refresh, at most once per article.
    useEffect(() => {
        if (!notifyPendingRef.current) return;
        if (!state.notificationsEnabled || getPermission() !== 'granted') {
            notifyPendingRef.current = false;
            return;
        }
        if (isInQuietHours(state.quietHoursStart, state.quietHoursEnd)) {
            return; // re-check on the next state change once quiet hours end
        }
        notifyPendingRef.current = false;

        const articles = selectAllArticles(state);
        const notifiable = selectNotifiable(articles, {
            trendingIds: computeTrending(articles),
            seenIds: new Set(state.seenIds),
            quietStart: state.quietHoursStart,
            quietEnd: state.quietHoursEnd,
        });
        const seen: string[] = [];
        for (const article of notifiable) {
            const sent = sendNotification(article, () => {
                dispatch({ type: 'NAVIGATE', view: { kind: 'article', id: article.id } });
                dispatch({ type: 'MARK_READ', id: article.id });
            });
            if (sent) seen.push(article.id);
        }
        if (seen.length > 0) {
            dispatch({ type: 'MARK_SEEN', ids: seen });
        }
    }, [state]);

    const darkQuery = useMediaQuery('(prefers-color-scheme: dark)');
    const resolvedTheme: 'light' | 'dark' =
        state.theme === 'system' ? (darkQuery ? 'dark' : 'light') : state.theme;

    useEffect(() => {
        document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    }, [resolvedTheme]);

    const openDeck = useCallback((): void => {
        dispatch({ type: 'NAVIGATE', view: { kind: 'deck' } });
    }, []);
    const openFeed = useCallback((): void => {
        dispatch({ type: 'NAVIGATE', view: { kind: 'feed' } });
    }, []);
    const openSaved = useCallback((): void => {
        dispatch({ type: 'NAVIGATE', view: { kind: 'saved' } });
    }, []);
    const openArticle = useCallback((id: string): void => {
        dispatch({ type: 'NAVIGATE', view: { kind: 'article', id } });
        dispatch({ type: 'MARK_READ', id });
    }, []);
    const closeArticle = useCallback((): void => {
        dispatch({ type: 'NAVIGATE', view: { kind: 'feed' } });
    }, []);

    const saveArticle = useCallback((id: string): void => {
        const article = selectAllArticles(stateRef.current).find((a) => a.id === id);
        if (article) {
            dispatch({ type: 'SAVE_ARTICLE', article });
        }
    }, []);
    const unsaveArticle = useCallback((id: string): void => {
        dispatch({ type: 'UNSAVE_ARTICLE', id });
    }, []);
    const toggleSaved = useCallback((id: string): void => {
        const current = stateRef.current;
        const isSaved = current.saved.some((a) => a.id === id);
        if (isSaved) {
            dispatch({ type: 'UNSAVE_ARTICLE', id });
            return;
        }
        const article = selectAllArticles(current).find((a) => a.id === id);
        if (article) {
            dispatch({ type: 'SAVE_ARTICLE', article });
        }
    }, []);
    const markRead = useCallback((id: string): void => {
        dispatch({ type: 'MARK_READ', id });
    }, []);
    const markAllRead = useCallback((): void => {
        const ids = selectFilteredArticles(stateRef.current).map((a) => a.id);
        dispatch({ type: 'MARK_ALL_READ', ids });
    }, []);

    const setQuery = useCallback((query: string): void => {
        dispatch({ type: 'SET_QUERY', query });
    }, []);
    const setTopics = useCallback((topics: string[]): void => {
        dispatch({ type: 'SET_FILTERS', filters: { topics } });
    }, []);
    const toggleTopic = useCallback((topic: string): void => {
        const current = stateRef.current.filters.topics;
        const next = current.includes(topic)
            ? current.filter((t) => t !== topic)
            : [...current, topic];
        dispatch({ type: 'SET_FILTERS', filters: { topics: next } });
    }, []);
    const setSources = useCallback((sources: string[]): void => {
        dispatch({ type: 'SET_FILTERS', filters: { sources } });
    }, []);
    const toggleSource = useCallback((sourceId: string): void => {
        const current = stateRef.current.filters.sources;
        const next = current.includes(sourceId)
            ? current.filter((s) => s !== sourceId)
            : [...current, sourceId];
        dispatch({ type: 'SET_FILTERS', filters: { sources: next } });
    }, []);
    const clearFilters = useCallback((): void => {
        dispatch({ type: 'SET_FILTERS', filters: { topics: [], sources: [], unreadOnly: false } });
    }, []);
    const setTheme = useCallback((theme: ThemePreference): void => {
        dispatch({ type: 'SET_THEME', theme });
    }, []);
    const enableNotifications = useCallback(async (): Promise<NotificationPermission> => {
        const permission = await requestPermission();
        if (permission === 'granted') {
            dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', enabled: true });
        }
        return permission;
    }, []);
    const disableNotifications = useCallback((): void => {
        dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', enabled: false });
    }, []);
    const setQuietHours = useCallback((start: string | null, end: string | null): void => {
        dispatch({ type: 'SET_QUIET_HOURS', start, end });
    }, []);
    const resetReadingState = useCallback((): void => {
        dispatch({ type: 'RESET' });
    }, []);

    const value = useMemo<NewsStore>(() => {
        const articles = selectAllArticles(state);
        const filtered = selectFilteredArticles(state);
        const deck = selectDeck(state);
        const feedHealth = selectFeedHealth(state);
        const trendingIds = selectTrendingIds(state);
        const readIds = selectReadIds(state);
        const isRefreshing = refreshingCount > 0;
        const lastUpdated = feedHealth.reduce<string | null>((newest, health) => {
            if (health.fetchedAt && (newest === null || health.fetchedAt > newest)) {
                return health.fetchedAt;
            }
            return newest;
        }, null);

        return {
            articles,
            filtered,
            deck,
            saved: selectSaved(state),
            feeds: state.feeds,
            feedHealth,
            trendingIds,
            readIds,
            isLoading: isRefreshing && articles.length === 0,
            isRefreshing,
            isEmpty: selectIsEmpty(state),
            lastUpdated,
            error: computeError(feedHealth),
            filters: state.filters,
            query: state.query,
            view: state.view,
            theme: state.theme,
            resolvedTheme,
            notificationsPermission: getPermission(),
            notificationsEnabled: state.notificationsEnabled,
            quietHoursStart: state.quietHoursStart,
            quietHoursEnd: state.quietHoursEnd,
            topics: ALL_TOPICS,
            sources: FEED_IDS,
            refresh,
            refreshFeed,
            openDeck,
            openFeed,
            openSaved,
            openArticle,
            closeArticle,
            saveArticle,
            unsaveArticle,
            toggleSaved,
            markRead,
            markAllRead,
            setQuery,
            setTopics,
            toggleTopic,
            setSources,
            toggleSource,
            clearFilters,
            setTheme,
            enableNotifications,
            disableNotifications,
            setQuietHours,
            resetReadingState,
        };
    }, [
        state,
        refreshingCount,
        resolvedTheme,
        refresh,
        refreshFeed,
        openDeck,
        openFeed,
        openSaved,
        openArticle,
        closeArticle,
        saveArticle,
        unsaveArticle,
        toggleSaved,
        markRead,
        markAllRead,
        setQuery,
        setTopics,
        toggleTopic,
        setSources,
        toggleSource,
        clearFilters,
        setTheme,
        enableNotifications,
        disableNotifications,
        setQuietHours,
        resetReadingState,
    ]);

    return <NewsStoreContext.Provider value={value}>{props.children}</NewsStoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the store surface requires both exports here
export function useNews(): NewsStore {
    const context = useContext(NewsStoreContext);
    if (context === null) {
        throw new Error('useNews must be used within a NewsProvider');
    }
    return context;
}
