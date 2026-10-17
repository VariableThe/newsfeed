import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFeedPayload, feedProxyPath } from '../transport';
import type { FeedSource } from '../../types';

const BBC: FeedSource = {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    topics: ['World'],
};

const XML_BODY = '<rss><channel><title>BBC World</title></channel></rss>';
const JSON_BODY = '{"status":"ok","items":[]}';

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

describe('feedProxyPath', () => {
    it('builds the same-origin proxy path', () => {
        expect(feedProxyPath('bbc-world')).toBe('/feeds/bbc-world');
    });
});

describe('fetchFeedPayload', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the same-origin body and short-circuits before any other transport', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') return fakeResponse(XML_BODY);
            return fakeResponse('not found', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result).toEqual({ ok: true, body: XML_BODY, format: 'xml', via: 'same-origin' });
        expect(mock).toHaveBeenCalledTimes(1);
    });

    it('falls through to direct when same-origin returns 404 without retrying it', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') return fakeResponse('no rewrite here', { status: 404 });
            if (url === BBC.url) return fakeResponse(XML_BODY);
            return fakeResponse('nope', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.via).toBe('direct');
        expect(result.format).toBe('xml');
        expect(mock).toHaveBeenCalledTimes(2);
        expect(mock.mock.calls[0][0]).toBe('/feeds/bbc-world');
        expect(mock.mock.calls[1][0]).toBe(BBC.url);
    });

    it('tries a third-party proxy when direct fails with a CORS-like TypeError', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') return fakeResponse('nf', { status: 404 });
            if (url === BBC.url) throw new TypeError('Failed to fetch');
            if (String(url).startsWith('https://api.cors.lol/')) return fakeResponse(XML_BODY);
            return fakeResponse('nf', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.via).toBe('cors.lol');
        expect(result.format).toBe('xml');
        // same-origin 404 (not retried), direct TypeError retried once, cors.lol success
        expect(mock).toHaveBeenCalledTimes(4);
        expect(mock.mock.calls[0][0]).toBe('/feeds/bbc-world');
        expect(mock.mock.calls[1][0]).toBe(BBC.url);
        expect(mock.mock.calls[2][0]).toBe(BBC.url);
    });

    it('reports every failed attempt with a concise summary when all transports fail', async () => {
        const mock = stubFetch(async () => fakeResponse('gone', { status: 404 }));

        const result = await fetchFeedPayload(BBC);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.attempts).toEqual([
            { via: 'same-origin', error: '404' },
            { via: 'direct', error: '404' },
            { via: 'cors.lol', error: '404' },
            { via: 'rss2json', error: '404' },
        ]);
        expect(result.error).toBe(
            'all transports failed (same-origin: 404, direct: 404, cors.lol: 404, rss2json: 404)',
        );
        expect(mock).toHaveBeenCalledTimes(4); // 4xx is never retried
    });

    it('treats a 200 text/html response as a failure and moves on', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') {
                return fakeResponse('<!doctype html><html><body>proxy exploded</body></html>', {
                    status: 200,
                    contentType: 'text/html',
                });
            }
            if (url === BBC.url) return fakeResponse(XML_BODY);
            return fakeResponse('nf', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.via).toBe('direct');
        expect(mock).toHaveBeenCalledTimes(2);
    });

    it('treats a 200 body that looks like HTML as a failure even without a text/html content-type', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') {
                return fakeResponse('\n   <!doctype html><html><head><title>Error</title></head></html>', {
                    status: 200,
                    contentType: 'text/plain',
                });
            }
            if (url === BBC.url) return fakeResponse(XML_BODY);
            return fakeResponse('nf', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.via).toBe('direct');
        expect(mock).toHaveBeenCalledTimes(2);
    });

    it('retries a timeout at most once per transport', async () => {
        const mock = stubFetch(
            (_url: unknown, init?: { signal?: AbortSignal }) =>
                new Promise<never>((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => {
                        reject(new DOMException('The operation was aborted.', 'AbortError'));
                    });
                }),
        );

        const result = await fetchFeedPayload(BBC, { timeoutMs: 20 });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        // 4 transports x (initial try + 1 retry)
        expect(mock).toHaveBeenCalledTimes(8);
        expect(result.attempts.every((a) => a.error === 'timeout')).toBe(true);
        expect(result.error).toContain('timeout');
    });

    it('retries a 5xx once and then moves on to the next transport', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') return fakeResponse('service unavailable', { status: 503 });
            if (url === BBC.url) return fakeResponse(XML_BODY);
            return fakeResponse('nf', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.via).toBe('direct');
        const sameOriginCalls = mock.mock.calls.filter((c) => c[0] === '/feeds/bbc-world');
        expect(sameOriginCalls.length).toBe(2); // initial + exactly one retry
        expect(mock).toHaveBeenCalledTimes(3);
    });

    it('returns format "json" only for the rss2json transport', async () => {
        const mock = stubFetch(async (url: unknown) => {
            if (url === '/feeds/bbc-world') return fakeResponse('nf', { status: 404 });
            if (url === BBC.url) throw new TypeError('Failed to fetch');
            if (String(url).startsWith('https://api.cors.lol/')) {
                return fakeResponse('rate limited', { status: 429 });
            }
            if (String(url).startsWith('https://api.rss2json.com/')) return fakeResponse(JSON_BODY);
            return fakeResponse('nf', { status: 404 });
        });

        const result = await fetchFeedPayload(BBC);

        expect(result).toEqual({ ok: true, body: JSON_BODY, format: 'json', via: 'rss2json' });
        // same-origin 404 (not retried) + direct TypeError retried once + cors.lol 429
        // (not retried) + rss2json success
        expect(mock).toHaveBeenCalledTimes(5);
        const corsLolCalls = mock.mock.calls.filter((c) => String(c[0]).startsWith('https://api.cors.lol/'));
        expect(corsLolCalls).toHaveLength(1);
    });

    it('fails fast without calling fetch when the caller signal is already aborted', async () => {
        const mock = stubFetch(async () => fakeResponse(XML_BODY));
        const controller = new AbortController();
        controller.abort();

        const result = await fetchFeedPayload(BBC, { signal: controller.signal });

        expect(result).toEqual({ ok: false, error: 'aborted', attempts: [] });
        expect(mock).not.toHaveBeenCalled();
    });

    it('aborts the in-flight attempt when the caller signal fires and stops the chain', async () => {
        const calls: unknown[] = [];
        stubFetch(
            (url: unknown, init?: { signal?: AbortSignal }) =>
                new Promise<never>((_resolve, reject) => {
                    calls.push(url);
                    init?.signal?.addEventListener('abort', () => {
                        reject(new DOMException('The operation was aborted.', 'AbortError'));
                    });
                }),
        );
        const controller = new AbortController();
        const pending = fetchFeedPayload(BBC, { signal: controller.signal, timeoutMs: 5000 });
        setTimeout(() => controller.abort(), 15);

        const result = await pending;

        expect(result).toEqual({
            ok: false,
            error: 'aborted',
            attempts: [{ via: 'same-origin', error: 'aborted' }],
        });
        expect(calls).toEqual(['/feeds/bbc-world']);
    });
});
