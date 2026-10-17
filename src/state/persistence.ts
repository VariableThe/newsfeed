import type { NewsArticle } from '../types';
import type { Filters, ThemePreference } from './newsReducer';

export const SCHEMA_VERSION = 2;

const STORAGE_KEY = 'newsfeed_state_v2';

const LEGACY_KEYS = [
    'newsfeed_selected_tags_v2',
    'newsfeed_has_customized_tags_v2',
    'newsfeed_is_dark_mode',
    'newsfeed_notifications_enabled',
    'newsfeed_importance_threshold',
    'newsfeed_history_ids',
    'newsfeed_saved_ids',
];

const THEME_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface PersistedState {
    version: number;
    saved: NewsArticle[];
    readIds: string[];
    seenIds: string[];
    filters: Filters;
    theme: ThemePreference;
    notificationsEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
}

export function defaultPersisted(): PersistedState {
    return {
        version: SCHEMA_VERSION,
        saved: [],
        readIds: [],
        seenIds: [],
        filters: { topics: [], sources: [], unreadOnly: false },
        theme: 'system',
        notificationsEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isArticleArray(value: unknown): value is NewsArticle[] {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                isRecord(item) &&
                typeof item.id === 'string' &&
                typeof item.headline === 'string' &&
                typeof item.sourceUrl === 'string' &&
                typeof item.timestamp === 'string',
        )
    );
}

function isQuietHoursBound(value: unknown): value is string | null {
    return value === null || (typeof value === 'string' && HHMM.test(value));
}

function validatePersisted(value: unknown): PersistedState | null {
    if (!isRecord(value)) return null;
    if (value.version !== SCHEMA_VERSION) return null;
    if (!isArticleArray(value.saved)) return null;
    if (!isStringArray(value.readIds)) return null;
    if (!isStringArray(value.seenIds)) return null;
    if (!isRecord(value.filters)) return null;
    if (!isStringArray(value.filters.topics)) return null;
    if (!isStringArray(value.filters.sources)) return null;
    if (typeof value.filters.unreadOnly !== 'boolean') return null;
    if (typeof value.theme !== 'string' || !THEME_VALUES.includes(value.theme as ThemePreference)) {
        return null;
    }
    if (typeof value.notificationsEnabled !== 'boolean') return null;
    if (!isQuietHoursBound(value.quietHoursStart)) return null;
    if (!isQuietHoursBound(value.quietHoursEnd)) return null;

    return {
        version: SCHEMA_VERSION,
        saved: value.saved,
        readIds: value.readIds,
        seenIds: value.seenIds,
        filters: {
            topics: value.filters.topics,
            sources: value.filters.sources,
            unreadOnly: value.filters.unreadOnly,
        },
        theme: value.theme as ThemePreference,
        notificationsEnabled: value.notificationsEnabled,
        quietHoursStart: value.quietHoursStart,
        quietHoursEnd: value.quietHoursEnd,
    };
}

function removeKey(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // Storage unavailable: nothing to remove.
    }
}

function removeLegacyKeys(): void {
    for (const key of LEGACY_KEYS) removeKey(key);
}

export function loadPersisted(): PersistedState {
    let raw: string | null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        return defaultPersisted();
    }

    if (raw === null) {
        removeLegacyKeys();
        return defaultPersisted();
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        const validated = validatePersisted(parsed);
        if (validated === null) {
            removeKey(STORAGE_KEY);
            return defaultPersisted();
        }
        return validated;
    } catch {
        removeKey(STORAGE_KEY);
        return defaultPersisted();
    }
}

export function savePersisted(state: {
    saved: NewsArticle[];
    readIds: string[];
    seenIds: string[];
    filters: Filters;
    theme: ThemePreference;
    notificationsEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
}): void {
    const payload: PersistedState = {
        version: SCHEMA_VERSION,
        saved: state.saved,
        readIds: state.readIds,
        seenIds: state.seenIds,
        filters: state.filters,
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Quota exceeded or private mode: state stays in memory only.
    }
}

export function clearPersisted(): void {
    removeKey(STORAGE_KEY);
}
