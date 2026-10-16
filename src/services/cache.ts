import type { NewsArticle } from '../types';

export const FEED_CACHE_TTL_MS: number = 5 * 60 * 1000;

export interface CachedFeed {
    sourceId: string;
    articles: NewsArticle[];
    fetchedAt: string;
}

const CACHE_KEY_PREFIX = 'newsfeed_feed_cache_v2:';
/** Skip writes above this size to stay clear of localStorage quota errors. */
const MAX_CACHE_ENTRY_BYTES = 200 * 1024;

function cacheKey(sourceId: string): string {
    return `${CACHE_KEY_PREFIX}${sourceId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readFeedCache(sourceId: string): CachedFeed | null {
    try {
        const raw = localStorage.getItem(cacheKey(sourceId));
        if (raw === null) return null;

        const parsed: unknown = JSON.parse(raw);
        if (!isRecord(parsed)) return null;
        if (parsed.sourceId !== sourceId) return null;
        if (!Array.isArray(parsed.articles)) return null;
        if (typeof parsed.fetchedAt !== 'string') return null;

        return {
            sourceId: parsed.sourceId as string,
            articles: parsed.articles as NewsArticle[],
            fetchedAt: parsed.fetchedAt,
        };
    } catch {
        return null;
    }
}

export function writeFeedCache(
    sourceId: string,
    articles: NewsArticle[],
    fetchedAt: string = new Date().toISOString(),
): CachedFeed {
    const entry: CachedFeed = { sourceId, articles, fetchedAt };
    try {
        const raw = JSON.stringify(entry);
        if (raw !== undefined && new TextEncoder().encode(raw).length <= MAX_CACHE_ENTRY_BYTES) {
            localStorage.setItem(cacheKey(sourceId), raw);
        }
    } catch {
        // Private mode or quota exceeded: keep serving the in-memory entry.
    }
    return entry;
}

export function isCacheFresh(entry: CachedFeed): boolean {
    const fetchedAt = Date.parse(entry.fetchedAt);
    if (Number.isNaN(fetchedAt)) return false;
    return Date.now() - fetchedAt < FEED_CACHE_TTL_MS;
}

export function clearFeedCache(): void {
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key !== null && key.startsWith(CACHE_KEY_PREFIX)) keys.push(key);
        }
        for (const key of keys) {
            localStorage.removeItem(key);
        }
    } catch {
        // Storage unavailable: nothing to clear.
    }
}
