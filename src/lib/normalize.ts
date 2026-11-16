const TRACKING_PARAMS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'fbclid',
    'gclid',
    'ref',
    'ref_src',
]);

export function isSafeHttpUrl(url: string): boolean {
    const trimmed = url.trim();
    if (trimmed === '') return false;

    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (trimmed === '') return '';

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return '';
    }

    if (!isSafeHttpUrl(trimmed)) return '';

    parsed.protocol = 'https:';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';

    const params = Array.from(parsed.searchParams.entries())
        .filter(([key]) => !TRACKING_PARAMS.has(key))
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const search = new URLSearchParams();
    for (const [key, value] of params) {
        search.append(key, value);
    }
    parsed.search = search.toString();

    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';

    return parsed.toString();
}

export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#(\d+);/g, (_, code) => {
            const n = Number(code);
            return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
            const n = parseInt(hex, 16);
            return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
        })
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}
