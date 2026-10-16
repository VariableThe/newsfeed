import type { FeedSource, NewsArticle } from '../types';
import { FEEDS, FEED_IDS } from '../data/feeds';
import { fetchFeedPayload } from './transport';
import type { TransportVia } from './transport';
import { parseRss, parseFeedJson } from './rssParser';
import { readFeedCache, writeFeedCache, isCacheFresh } from './cache';

export interface RefreshOutcome {
    sourceId: string;
    ok: boolean;
    count: number;
    via?: TransportVia;
    error?: string;
}

const DEFAULT_CONCURRENCY = 4;
const WORDS_PER_MINUTE = 220;

export function getFeedSource(sourceId: string): FeedSource | undefined {
    return FEEDS.find((feed) => feed.id === sourceId);
}

export function estimateReadMinutes(article: NewsArticle): number {
    const text = `${article.headline} ${article.summary} ${article.fullStory}`;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export async function refreshFeed(
    sourceId: string,
    opts?: { signal?: AbortSignal; force?: boolean },
): Promise<RefreshOutcome> {
    const source = getFeedSource(sourceId);
    if (!source) {
        return { sourceId, ok: false, count: 0, error: `unknown source: ${sourceId}` };
    }

    try {
        if (!opts?.force) {
            const cached = readFeedCache(sourceId);
            if (cached && isCacheFresh(cached)) {
                return { sourceId, ok: true, count: cached.articles.length };
            }
        }

        const result = await fetchFeedPayload(source, { signal: opts?.signal });
        if (!result.ok) {
            const stale = readFeedCache(sourceId);
            if (stale) {
                return { sourceId, ok: true, count: stale.articles.length, error: result.error };
            }
            return { sourceId, ok: false, count: 0, error: result.error };
        }

        const articles =
            result.format === 'json'
                ? parseFeedJson(JSON.parse(result.body), source)
                : parseRss(result.body, source);
        writeFeedCache(sourceId, articles);
        return { sourceId, ok: true, count: articles.length, via: result.via };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'refresh failed';
        const stale = readFeedCache(sourceId);
        if (stale) {
            return { sourceId, ok: true, count: stale.articles.length, error: message };
        }
        return { sourceId, ok: false, count: 0, error: message };
    }
}

export async function refreshAll(
    opts?: { signal?: AbortSignal; force?: boolean; concurrency?: number },
): Promise<RefreshOutcome[]> {
    const concurrency = Math.max(1, Math.floor(opts?.concurrency ?? DEFAULT_CONCURRENCY));
    const results: RefreshOutcome[] = new Array(FEED_IDS.length);
    let next = 0;

    async function worker(): Promise<void> {
        while (next < FEED_IDS.length) {
            const index = next;
            next += 1;
            try {
                results[index] = await refreshFeed(FEED_IDS[index], opts);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'refresh failed';
                results[index] = { sourceId: FEED_IDS[index], ok: false, count: 0, error: message };
            }
        }
    }

    const workerCount = Math.min(concurrency, FEED_IDS.length);
    const workers: Promise<void>[] = [];
    for (let i = 0; i < workerCount; i += 1) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return results;
}
