import type { FeedSource, NewsArticle } from '../types';
import { contentId } from '../lib/hash';
import { normalizeTitle, normalizeUrl, stripHtml } from '../lib/normalize';
import { dedupeArticles, sortByRecency } from '../lib/rank';

const SUMMARY_MAX = 200;
const EPOCH_ISO = '1970-01-01T00:00:00.000Z';
const RSS_ROOTS = new Set(['rss', 'rdf']);
const ATOM_ROOT = 'feed';

function childText(element: Element, localName: string): string {
    for (const child of Array.from(element.children)) {
        const name = child.localName;
        if (name === localName || name.endsWith(`:${localName}`)) {
            const text = child.textContent ?? '';
            if (text.trim()) return text;
        }
    }
    return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDate(candidate: string | undefined): string | null {
    if (!candidate) return null;
    const time = Date.parse(candidate);
    return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function truncateSummary(text: string): string {
    return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 1)}…` : text;
}

function parseXmlDocument(xml: string): Document | null {
    let doc: Document;
    try {
        doc = new DOMParser().parseFromString(xml, 'text/xml');
    } catch {
        return null;
    }
    const root = doc.documentElement;
    if (!root || root.localName === 'parsererror') return null;
    return doc;
}

function isFeedRoot(doc: Document): boolean {
    const name = doc.documentElement.localName;
    if (name === ATOM_ROOT) return true;
    return RSS_ROOTS.has(name);
}

/** Channel-level <lastBuildDate> (RSS) or feed-level <updated> (Atom), as ISO. */
function channelFallbackIso(doc: Document): string | null {
    const channel = doc.querySelector('channel');
    if (channel) {
        const iso = parseDate(childText(channel, 'lastBuildDate'));
        if (iso) return iso;
    }
    const root = doc.documentElement;
    if (root.localName === ATOM_ROOT) {
        const iso = parseDate(childText(root, 'updated'));
        if (iso) return iso;
    }
    return null;
}

function isMediaElement(el: Element): boolean {
    return (el.namespaceURI ?? '').includes('mrss');
}

function isHttpUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Priority: media:content[url], media:thumbnail[url], enclosure[url] with an
 * image type, then <image><url>. Relative and data: URLs are rejected.
 */
function extractImageUrl(item: Element): string | undefined {
    const children = Array.from(item.children);
    const candidates: string[] = [];

    const pushMedia = (localName: 'content' | 'thumbnail'): void => {
        for (const child of children) {
            if (child.localName !== localName || !isMediaElement(child)) continue;
            const url = child.getAttribute('url');
            if (url) candidates.push(url);
        }
    };

    pushMedia('content');
    pushMedia('thumbnail');

    for (const child of children) {
        if (child.localName !== 'enclosure') continue;
        const type = child.getAttribute('type') ?? '';
        const url = child.getAttribute('url');
        if (url && type.startsWith('image/')) candidates.push(url);
    }

    for (const child of children) {
        if (child.localName !== 'image') continue;
        for (const grandchild of child.children) {
            if (grandchild.localName === 'url') {
                const text = (grandchild.textContent ?? '').trim();
                if (text) candidates.push(text);
            }
        }
    }

    return candidates.find(isHttpUrl);
}

function extractLink(item: Element): string {
    const linkEls = Array.from(item.children).filter((child) => child.localName === 'link');
    const alternate = linkEls.find((el) => el.getAttribute('rel') === 'alternate');
    const primary = alternate ?? linkEls[0];
    const href = primary?.getAttribute('href');
    if (href) return href;

    for (const el of linkEls) {
        const text = (el.textContent ?? '').trim();
        if (text) return text;
    }

    const guid = Array.from(item.children).find((el) => el.localName === 'guid');
    const guidText = (guid?.textContent ?? '').trim();
    if (guid && guid.getAttribute('isPermaLink') === 'true' && guidText) {
        return guidText;
    }

    return '';
}

function resolveTimestamp(
    item: Element,
    channelIso: string | null,
    fallbackIso?: string,
): string {
    // dc:date has localName 'date' in XML documents.
    for (const field of ['pubDate', 'published', 'updated', 'date'] as const) {
        const iso = parseDate(childText(item, field));
        if (iso) return iso;
    }
    if (channelIso) return channelIso;
    if (fallbackIso) {
        const iso = parseDate(fallbackIso);
        if (iso) return iso;
    }
    return EPOCH_ISO;
}

function toArticle(
    item: Element,
    source: FeedSource,
    channelIso: string | null,
    fallbackIso?: string,
): NewsArticle[] {
    const headline = stripHtml(childText(item, 'title'));
    if (!headline) return [];

    const description =
        stripHtml(childText(item, 'description')) || stripHtml(childText(item, 'summary'));
    const summary = truncateSummary(description);

    // Atom <content> and RSS <content:encoded> share the localName 'content';
    // media:content is self-closing and never carries text content.
    const fullBody = stripHtml(childText(item, 'encoded')) || stripHtml(childText(item, 'content'));
    let fullStory: string;
    let hasFullContent: boolean;
    if (fullBody) {
        fullStory = fullBody;
        hasFullContent = true;
    } else if (description) {
        fullStory = description;
        hasFullContent = false;
    } else {
        fullStory = headline;
        hasFullContent = false;
    }

    const link = extractLink(item);
    const sourceUrl = normalizeUrl(link);

    const article: NewsArticle = {
        id: contentId(`${sourceUrl}|${normalizeTitle(headline)}`),
        headline,
        summary,
        fullStory,
        hasFullContent,
        tags: [...source.topics],
        source: source.name,
        sourceId: source.id,
        sourceUrl,
        timestamp: resolveTimestamp(item, channelIso, fallbackIso),
        importance: 'normal',
    };

    const imageUrl = extractImageUrl(item);
    if (imageUrl) article.imageUrl = imageUrl;
    return [article];
}

export function parseRss(xml: string, source: FeedSource, fallbackIso?: string): NewsArticle[] {
    const doc = parseXmlDocument(xml);
    if (!doc || !isFeedRoot(doc)) return [];

    const items = Array.from(doc.querySelectorAll('item, entry'));
    if (items.length === 0) return [];

    const channelIso = channelFallbackIso(doc);
    const articles = items.flatMap((item) => toArticle(item, source, channelIso, fallbackIso));
    return sortByRecency(dedupeArticles(articles));
}

function textField(raw: Record<string, unknown>, key: 'description' | 'content'): string {
    return typeof raw[key] === 'string' ? stripHtml(raw[key] as string) : '';
}

function jsonImageUrl(raw: Record<string, unknown>): string | undefined {
    const thumbnail = raw.thumbnail;
    if (typeof thumbnail === 'string' && thumbnail && isHttpUrl(thumbnail)) {
        return thumbnail;
    }
    const enclosure = raw.enclosure;
    if (isRecord(enclosure)) {
        const link = enclosure.link;
        const type = enclosure.type;
        if (
            typeof link === 'string' &&
            typeof type === 'string' &&
            type.startsWith('image/') &&
            isHttpUrl(link)
        ) {
            return link;
        }
    }
    return undefined;
}

function jsonItemToArticle(
    raw: unknown,
    source: FeedSource,
    fallbackIso?: string,
): NewsArticle[] {
    if (!isRecord(raw)) return [];
    const headline = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!headline) return [];

    const link = typeof raw.link === 'string' ? raw.link.trim() : '';
    const sourceUrl = normalizeUrl(link);
    const description = textField(raw, 'description');
    const content = textField(raw, 'content');

    let fullStory: string;
    let hasFullContent: boolean;
    if (content) {
        fullStory = content;
        hasFullContent = true;
    } else if (description) {
        fullStory = description;
        hasFullContent = false;
    } else {
        fullStory = headline;
        hasFullContent = false;
    }

    const article: NewsArticle = {
        id: contentId(`${sourceUrl}|${normalizeTitle(headline)}`),
        headline,
        summary: truncateSummary(description),
        fullStory,
        hasFullContent,
        tags: [...source.topics],
        source: source.name,
        sourceId: source.id,
        sourceUrl,
        timestamp: parseDate(typeof raw.pubDate === 'string' ? raw.pubDate : undefined)
            ?? (fallbackIso ? parseDate(fallbackIso) : null)
            ?? EPOCH_ISO,
        importance: 'normal',
    };

    const imageUrl = jsonImageUrl(raw);
    if (imageUrl) article.imageUrl = imageUrl;
    return [article];
}

export function parseFeedJson(
    json: unknown,
    source: FeedSource,
    fallbackIso?: string,
): NewsArticle[] {
    if (!isRecord(json)) return [];
    if (json.status !== undefined && json.status !== 'ok') return [];
    if (!Array.isArray(json.items)) return [];

    const articles = json.items.flatMap((item) => jsonItemToArticle(item, source, fallbackIso));
    return sortByRecency(dedupeArticles(articles));
}
