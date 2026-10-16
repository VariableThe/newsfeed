import type { FeedSource } from '../types';

export type TransportVia = 'same-origin' | 'direct' | 'cors.lol' | 'rss2json';

export interface TransportAttempt {
  via: TransportVia;
  error: string;
}

export type TransportResult =
  | { ok: true; body: string; format: 'xml' | 'json'; via: TransportVia }
  | { ok: false; error: string; attempts: TransportAttempt[] };

const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_BACKOFF_MS = 500;
const MAX_TRIES_PER_TRANSPORT = 2; // initial try + at most one retry

interface TransportDef {
  via: TransportVia;
  format: 'xml' | 'json';
  buildUrl: (source: FeedSource) => string;
}

const TRANSPORTS: TransportDef[] = [
  { via: 'same-origin', format: 'xml', buildUrl: (source) => feedProxyPath(source.id) },
  { via: 'direct', format: 'xml', buildUrl: (source) => source.url },
  {
    via: 'cors.lol',
    format: 'xml',
    buildUrl: (source) => `https://api.cors.lol/?url=${encodeURIComponent(source.url)}`,
  },
  {
    via: 'rss2json',
    format: 'json',
    buildUrl: (source) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`,
  },
];

/** Same-origin path used for the Vercel rewrite / Vite dev proxy. */
export function feedProxyPath(sourceId: string): string {
  return `/feeds/${encodeURIComponent(sourceId)}`;
}

/** Internal error carrying the short diagnostic label surfaced to the UI. */
class TransportError extends Error {
  readonly label: string;

  constructor(label: string) {
    super(label);
    this.name = 'TransportError';
    this.label = label;
  }
}

function delay(ms: number, outerSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (outerSignal?.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', onAbort);
      resolve();
    };
    const timer = setTimeout(() => {
      outerSignal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    outerSignal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isRetryableLabel(label: string): boolean {
  if (label === 'timeout' || label === 'network') return true;
  return /^5\d{2}$/.test(label);
}

/**
 * Perform one fetch with a per-attempt timeout and return the body text.
 * Throws TransportError on any failure; never rejects with anything else.
 */
async function fetchOnce(
  url: string,
  timeoutMs: number,
  outerSignal: AbortSignal | undefined,
): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;

  const onOuterAbort = (): void => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) {
      controller.abort();
    } else {
      outerSignal.addEventListener('abort', onOuterAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new TransportError(String(response.status));
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      throw new TransportError('html');
    }

    const text = await response.text();
    const head = text.slice(0, 512).trimStart().toLowerCase();
    if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
      throw new TransportError('html');
    }

    return text;
  } catch (err) {
    if (outerSignal?.aborted) {
      throw new TransportError('aborted');
    }
    if (err instanceof TransportError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TransportError(timedOut ? 'timeout' : 'network');
    }
    if (err instanceof TypeError) {
      throw new TransportError('network');
    }
    throw new TransportError(err instanceof Error ? err.message : 'network');
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onOuterAbort);
  }
}

/**
 * Try, in order: same-origin /feeds/<id>, then source.url directly, then
 * https://api.cors.lol/?url=<encoded>, then
 * https://api.rss2json.com/v1/api.json?rss_url=<encoded> (returns format 'json').
 * Stop at the first success. Never throws; never returns fabricated content.
 */
export async function fetchFeedPayload(
  source: FeedSource,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<TransportResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const outerSignal = opts?.signal;
  const attempts: TransportAttempt[] = [];

  if (outerSignal?.aborted) {
    return { ok: false, error: 'aborted', attempts };
  }

  for (const transport of TRANSPORTS) {
    for (let tryIndex = 0; tryIndex < MAX_TRIES_PER_TRANSPORT; tryIndex += 1) {
      try {
        const text = await fetchOnce(transport.buildUrl(source), timeoutMs, outerSignal);
        return { ok: true, body: text, format: transport.format, via: transport.via };
      } catch (err) {
        if (outerSignal?.aborted) {
          attempts.push({ via: transport.via, error: 'aborted' });
          return { ok: false, error: 'aborted', attempts };
        }

        const label = err instanceof TransportError ? err.label : 'network';
        attempts.push({ via: transport.via, error: label });

        const isLastTry = tryIndex === MAX_TRIES_PER_TRANSPORT - 1;
        if (isLastTry || !isRetryableLabel(label)) {
          break; // move on to the next transport
        }
        await delay(RETRY_BACKOFF_MS, outerSignal);
      }
    }
  }

  const summary = `all transports failed (${attempts.map((a) => `${a.via}: ${a.error}`).join(', ')})`;
  return { ok: false, error: summary, attempts };
}
