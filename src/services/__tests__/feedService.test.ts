import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    refreshFeed,
    refreshAll,
    getFeedSource,
    estimateReadMinutes,
} from '../feedService';
import { readFeedCache, writeFeedCache, clearFeedCache } from '../cache';
import { FEED_IDS } from '../../data/feeds';
import type { FeedSource, NewsArticle } from '../../types';

const BBC: FeedSource = {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    homepage: 'https://www.bbc.com/news/world',
    topics: ['World'],
};

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

interface FakeResponse {
    ok: boolean;
    status: number;
    headers: { get(name: string): string | null };
    text(): Promise<string>;
}

function fakeResponse(body: string, init?: { status?: number; contentType?: string }): FakeResponse {
    const status = init?.status ?? 200;
    const contentType = init?.contentType ?? 'application/rss+xml';
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
        },
        text: () => Promise.resolve(body),
    };
}

type FetchCall = (url: unknown, init?: { signal?: AbortSignal }) => Promise<unknown>;

function stubFetch(impl: FetchCall): ReturnType<typeof vi.fn> {
    const mock = vi.fn(impl);
    vi.stubGlobal('fetch', mock);
    return mock;
}

describe('feedService', () => {
    beforeEach(() => {
        localStorage.clear();
        clearFeedCache();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('getFeedSource', () => {
        it('resolves a known source id', () => {
            expect(getFeedSource('bbc-world')).toEqual(BBC);
        });

        it('returns undefined for an unknown source id', () => {
            expect(getFeedSource('does-not-exist')).toBeUndefined();
        });
    });

    describe('refreshFeed', () => {
        it('returns ok:false for an unknown source id', async () => {
            const outcome = await refreshFeed('does-not-exist');
            expect(outcome).toEqual({
                sourceId: 'does-not-exist',
                ok: false,
                count: 0,
                error: 'unknown source: does-not-exist',
            });
        });

        it('short-circuits the network when a fresh cache entry exists', async () => {
            const cached = [article(1), article(2)];
            writeFeedCache('bbc-world', cached, new Date().toISOString());
            const mock = stubFetch(async () => fakeResponse('<rss></rss>'));

            const outcome = await refreshFeed('bbc-world');

            expect(outcome).toEqual({ sourceId: 'bbc-world', ok: true, count: 2 });
            expect(outcome.via).toBeUndefined();
            expect(outcome.error).toBeUndefined();
            expect(mock).not.toHaveBeenCalled();
        });

        it('fetches when the cache is stale and caches the parser output', async () => {
            writeFeedCache('bbc-world', [article(1)], new Date(Date.now() - 6 * 60 * 1000).toISOString());
            const xml = '<rss><channel><title>BBC</title><item><title>Headline 1</title><link>https://example.com/1</link><description>Summary 1</description></item></channel></rss>';
            const mock = stubFetch(async () => fakeResponse(xml));

            const outcome = await refreshFeed('bbc-world');

            expect(outcome.ok).toBe(true);
            expect(outcome.count).toBeGreaterThanOrEqual(1);
            expect(mock).toHaveBeenCalled();
            const cached = readFeedCache('bbc-world');
            expect(cached).not.toBeNull();
            expect(cached!.articles.length).toBe(outcome.count);
        });

        it('fetches when no cache entry exists', async () => {
            const mock = stubFetch(async () => fakeResponse('<rss><channel><title>x</title></channel></rss>'));
            const outcome = await refreshFeed('bbc-world');
            expect(outcome.ok).toBe(true);
            expect(outcome.count).toBe(0);
            expect(mock).toHaveBeenCalled();
        });

        it('falls back to stale cache on transport failure and carries the error', async () => {
            const stale = [article(1), article(2), article(3)];
            writeFeedCache('bbc-world', stale, new Date(Date.now() - 10 * 60 * 1000).toISOString());
            const mock = stubFetch(async () => {
                throw new Error('network down');
            });

            const outcome = await refreshFeed('bbc-world', { force: true });

            expect(outcome.ok).toBe(true);
            expect(outcome.count).toBe(3);
            expect(outcome.error).toBeDefined();
            expect(mock).toHaveBeenCalled();
        });

        it('reports ok:false when transport fails and no cache exists', async () => {
            stubFetch(async () => fakeResponse('not found', { status: 404 }));
            const outcome = await refreshFeed('bbc-world');
            expect(outcome.ok).toBe(false);
            expect(outcome.count).toBe(0);
            expect(outcome.error).toBeDefined();
        });

        it('parses json-format payloads via parseFeedJson', async () => {
            const jsonBody = JSON.stringify({
                status: 'ok',
                items: [
                    {
                        title: 'JSON Headline',
                        link: 'https://example.com/json',
                        description: 'JSON summary',
                        pubDate: FIXED,
                    },
                ],
            });
            stubFetch(async (url: unknown) => {
                if (String(url).includes('rss2json')) {
                    return fakeResponse(jsonBody, { contentType: 'application/json' });
                }
                return fakeResponse('not found', { status: 404 });
            });

            const outcome = await refreshFeed('bbc-world', { force: true });

            expect(outcome.ok).toBe(true);
            expect(outcome.count).toBe(1);
            const cached = readFeedCache('bbc-world');
            expect(cached?.articles[0]?.headline).toBe('JSON Headline');
        });

        it('respects the force option by bypassing a fresh cache', async () => {
            writeFeedCache('bbc-world', [article(1)], FIXED);
            const mock = stubFetch(async () => fakeResponse('<rss><channel></channel></rss>'));

            const outcome = await refreshFeed('bbc-world', { force: true });

            expect(outcome.ok).toBe(true);
            expect(mock).toHaveBeenCalled();
        });
    });

    describe('refreshAll', () => {
        it('returns one outcome per feed and never throws', async () => {
            const xml = '<rss><channel><title>empty</title></channel></rss>';
            stubFetch(async () => fakeResponse(xml));

            const outcomes = await refreshAll();

            expect(outcomes).toHaveLength(FEED_IDS.length);
            expect(outcomes.every((o) => typeof o.ok === 'boolean')).toBe(true);
            expect(outcomes.every((o) => typeof o.count === 'number')).toBe(true);
        });

        it('runs with bounded concurrency and handles partial failure', async () => {
            const xml = '<rss><channel><title>empty</title></channel></rss>';
            let inFlight = 0;
            let maxInFlight = 0;
            stubFetch(async (url: unknown) => {
                inFlight += 1;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise((resolve) => setTimeout(resolve, 10));
                inFlight -= 1;
                const urlStr = String(url);
                if (urlStr.includes('nyt-sports') || urlStr.includes('Sports')) {
                    throw new Error('network down');
                }
                return fakeResponse(xml);
            });

            const outcomes = await refreshAll({ concurrency: 2, force: true });

            expect(outcomes).toHaveLength(FEED_IDS.length);
            const failed = outcomes.filter((o) => !o.ok);
            expect(failed.length).toBeGreaterThan(0);
            expect(failed.every((o) => o.sourceId === 'nyt-sports')).toBe(true);
            expect(maxInFlight).toBeLessThanOrEqual(2);
            expect(maxInFlight).toBeGreaterThan(1);
        });
    });

    describe('estimateReadMinutes', () => {
        it('returns 1 for a 1-word article', () => {
            const a = article(1, { headline: 'Hi', summary: '', fullStory: '' });
            expect(estimateReadMinutes(a)).toBe(1);
        });

        it('returns 1 for exactly 220 words', () => {
            const words = Array.from({ length: 218 }, () => 'word').join(' ');
            const a = article(1, { headline: 'Hi there', summary: words, fullStory: '' });
            expect(estimateReadMinutes(a)).toBe(1);
        });

        it('returns 2 for 221 words', () => {
            const words = Array.from({ length: 219 }, () => 'word').join(' ');
            const a = article(1, { headline: 'Hi there', summary: words, fullStory: '' });
            expect(estimateReadMinutes(a)).toBe(2);
        });
    });
});
