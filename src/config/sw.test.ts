/**
 * Behavioural test for public/sw.js
 * Imports the real script (via ?raw) and evaluates it in a fake service-worker
 * environment, then drives it with synthetic fetch events. Structural text
 * checks alone cannot catch dead code (e.g. reading `mode` off a URL object),
 * so the navigation branch is exercised for real here.
 * vitest globals OFF, jsdom.
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import swSource from '../../public/sw.js?raw';

const ORIGIN = 'http://localhost';
const SHELL_BODY = '<html><body>cached shell</body></html>';

interface SwRequest {
    url: string;
    method: string;
    mode: string;
}

interface SwFetchEvent {
    request: SwRequest;
    respondWith: (response: Promise<FakeResponse>) => void;
}

type SwFetchHandler = (event: SwFetchEvent) => void;

/** Minimal stand-in for the global Response the worker synthesises. */
class FakeResponse {
    readonly status: number;
    readonly statusText: string;
    readonly body: string;
    readonly headers: Record<string, string>;

    constructor(body: string, init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}) {
        this.body = body;
        this.status = init.status ?? 200;
        this.statusText = init.statusText ?? 'OK';
        this.headers = init.headers ?? {};
    }

    get ok(): boolean {
        return this.status >= 200 && this.status < 300;
    }

    header(name: string): string | null {
        const key = Object.keys(this.headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
        if (key === undefined) return null;
        return this.headers[key];
    }

    clone(): FakeResponse {
        return new FakeResponse(this.body, {
            status: this.status,
            statusText: this.statusText,
            headers: { ...this.headers },
        });
    }

    text(): Promise<string> {
        return Promise.resolve(this.body);
    }
}

interface HarnessOptions {
    /** Network behaviour for every fetch() the worker makes. */
    fetchImpl: (request: SwRequest) => Promise<FakeResponse>;
    /** Paths already in the shell cache, mirroring the install-time precache. */
    cachedPaths?: string[];
}

interface Dispatch {
    intercepted: boolean;
    response?: Promise<FakeResponse>;
}

interface Harness {
    fetchMock: Mock<(request: SwRequest) => Promise<FakeResponse>>;
    /** Fire a synthetic fetch event and report what the worker responded with. */
    dispatch: (request: SwRequest) => Dispatch;
    /** Fire a synthetic same-origin navigation; fails if not intercepted. */
    navigate: (path: string) => Promise<FakeResponse>;
    /** Paths currently stored in the cache. */
    cachedPaths: () => string[];
}

function cacheKey(request: string | SwRequest): string {
    const raw = typeof request === 'string' ? request : request.url;
    return new URL(raw, ORIGIN).pathname;
}

function createHarness(options: HarnessOptions): Harness {
    const store = new Map<string, FakeResponse>();
    for (const path of options.cachedPaths ?? []) {
        store.set(cacheKey(path), new FakeResponse(SHELL_BODY, { headers: { 'Content-Type': 'text/html' } }));
    }

    const cacheApi = {
        addAll: async () => {},
        match: async (request: string | SwRequest) => store.get(cacheKey(request)),
        put: async (request: string | SwRequest, response: FakeResponse) => {
            store.set(cacheKey(request), response);
        },
    };

    const listeners = new Map<string, SwFetchHandler>();
    const selfShim = {
        location: { origin: ORIGIN },
        addEventListener: (type: string, handler: SwFetchHandler) => {
            listeners.set(type, handler);
        },
        skipWaiting: () => {},
    };
    const cachesShim = {
        open: async () => cacheApi,
        keys: async () => ['newsfeed-v2', 'newsfeed-feeds-v2'],
        delete: async () => true,
    };
    const clientsShim = { claim: () => {} };

    const fetchMock = vi.fn((request: SwRequest) => options.fetchImpl(request));

    // Evaluate the real worker source with the service-worker globals injected.
    const evaluate = new Function('self', 'caches', 'clients', 'fetch', 'Response', swSource);
    evaluate(selfShim, cachesShim, clientsShim, fetchMock, FakeResponse);

    const registered = listeners.get('fetch');
    if (registered === undefined) {
        throw new Error('public/sw.js did not register a fetch listener');
    }
    const onFetch: SwFetchHandler = registered;

    const dispatch = (request: SwRequest): Dispatch => {
        let response: Promise<FakeResponse> | undefined;
        onFetch({
            request,
            respondWith: (value: Promise<FakeResponse>) => {
                response = value;
            },
        });
        return { intercepted: response !== undefined, response };
    };

    return {
        fetchMock,
        dispatch,
        cachedPaths: () => [...store.keys()],
        navigate: (path: string) => {
            const result = dispatch({ url: new URL(path, ORIGIN).toString(), method: 'GET', mode: 'navigate' });
            if (result.response === undefined) {
                throw new Error(`navigation to ${path} was not intercepted`);
            }
            return result.response;
        },
    };
}

const offline = () => Promise.reject(new TypeError('Failed to fetch'));

function htmlResponse(body: string): FakeResponse {
    return new FakeResponse(body, { headers: { 'Content-Type': 'text/html' } });
}

describe('public/sw.js structural tests', () => {
    it('should contain cache name bump to v2', () => {
        expect(swSource).toContain("const CACHE = 'newsfeed-v2'");
        expect(swSource).toContain("const RUNTIME = 'newsfeed-feeds-v2'");
    });

    it('should not contain bogus timeout option', () => {
        expect(swSource).not.toContain('timeout');
    });

    it('should not contain dead POST method clause', () => {
        // The fixed sw.js removes the dead code || event.request.method === 'POST'
        expect(swSource).not.toContain("event.request.method === 'POST'");
    });

    it('should read navigation mode off the request, never off the URL', () => {
        expect(swSource).toContain("event.request.mode === 'navigate'");
        expect(swSource).not.toContain('url.mode');
    });

    it('should have cache-first for same-origin assets', () => {
        expect(swSource).toContain('isSameOrigin');
    });

    it('should have network-first for /feeds/ requests', () => {
        expect(swSource).toContain("url.pathname.startsWith('/feeds/')");
    });

    it('should not intercept non-GET requests', () => {
        // Has the method check but NOT the dead POST clause
        expect(swSource).toMatch(/if\s*\(\s*event\.request\.method\s*!==\s*['"]GET['"]\s*\)/);
        // The source uses single-quoted 'GET' so the regex with [""] should match
        expect(swSource).not.toContain("event.request.method === 'POST'");
    });

    it('should have synthetic error response for failed /feeds/', () => {
        expect(swSource).toContain('status: 503');
        expect(swSource).toContain('text/plain');
    });

    it('should bump cache names from v1 to v2', () => {
        expect(swSource).toContain("'newsfeed-v2'");
        expect(swSource).toContain("'newsfeed-feeds-v2'");
    });
});

describe('public/sw.js offline navigation', () => {
    it('serves the cached shell for an offline navigation to a non-precached path', async () => {
        // `/anything-else` only resolves through the navigate branch: the static
        // asset branch has nothing cached for it. While the mode check read
        // `url.mode` (always undefined) this fell through to the 503 error page.
        const harness = createHarness({
            cachedPaths: ['/', '/index.html'],
            fetchImpl: offline,
        });

        const response = await harness.navigate('/anything-else');

        expect(response.status).toBe(200);
        expect(response.header('Content-Type')).toBe('text/html');
        expect(await response.text()).toBe(SHELL_BODY);
        expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    });

    it('serves the cached shell for an offline navigation to /', async () => {
        const harness = createHarness({
            cachedPaths: ['/', '/index.html'],
            fetchImpl: offline,
        });

        const response = await harness.navigate('/');

        expect(response.status).toBe(200);
        expect(await response.text()).toBe(SHELL_BODY);
    });

    it('is not broken by a rejecting background revalidation', async () => {
        // The response must be served while the network request is still
        // pending, and the later rejection must not escape the handler.
        let rejectRevalidation: (reason: Error) => void = () => {};
        const harness = createHarness({
            cachedPaths: ['/index.html'],
            fetchImpl: () =>
                new Promise<FakeResponse>((_resolve, reject) => {
                    rejectRevalidation = reject;
                }),
        });

        const response = await harness.navigate('/anything-else');

        expect(response.status).toBe(200);
        expect(await response.text()).toBe(SHELL_BODY);
        expect(harness.fetchMock).toHaveBeenCalledTimes(1);

        rejectRevalidation(new TypeError('Failed to fetch'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(harness.cachedPaths()).toContain('/index.html');
    });

    it('returns a plain non-HTML error when offline with no cached shell', async () => {
        const harness = createHarness({
            cachedPaths: [],
            fetchImpl: offline,
        });

        const response = await harness.navigate('/anything-else');

        expect(response.status).toBeGreaterThanOrEqual(500);
        expect(response.header('Content-Type')).toBe('text/plain');
        expect(await response.text()).not.toContain('<');
    });

    it('revalidates the cache in the background instead of the static branch', async () => {
        const harness = createHarness({
            cachedPaths: ['/', '/index.html'],
            fetchImpl: async () => htmlResponse('<html>fresh</html>'),
        });

        const response = await harness.navigate('/');

        expect(await response.text()).toBe(SHELL_BODY);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(harness.cachedPaths()).toContain('/');
    });

    it('does not intercept a same-origin navigation that is not GET', () => {
        const harness = createHarness({
            cachedPaths: ['/', '/index.html'],
            fetchImpl: offline,
        });

        const result = harness.dispatch({ url: `${ORIGIN}/feeds/example`, method: 'POST', mode: 'navigate' });

        expect(result.intercepted).toBe(false);
        expect(harness.fetchMock).not.toHaveBeenCalled();
    });

    it('leaves cross-origin requests to the network', async () => {
        const harness = createHarness({
            cachedPaths: ['/', '/index.html'],
            fetchImpl: async () => htmlResponse('<html>other origin</html>'),
        });

        const result = harness.dispatch({ url: 'https://example.com/', method: 'GET', mode: 'navigate' });

        expect(result.intercepted).toBe(true);
        expect(harness.fetchMock).toHaveBeenCalledTimes(1);
        const response = await result.response;
        expect(await response?.text()).toBe('<html>other origin</html>');
    });
});
