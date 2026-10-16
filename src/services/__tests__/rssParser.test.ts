import { describe, it, expect } from 'vitest';
import { parseRss, parseFeedJson } from '../rssParser';
import type { FeedSource } from '../../types';

import bbcXml from './fixtures/bbc-world.xml?raw';
import nytXml from './fixtures/nyt-world.xml?raw';
import atomXml from './fixtures/atom-feed.xml?raw';
import malformedXml from './fixtures/malformed.xml?raw';
import missingDatesXml from './fixtures/missing-dates.xml?raw';
import entitiesXml from './fixtures/html-entities.xml?raw';
import rss2jsonRaw from './fixtures/rss2json.json?raw';

const BBC: FeedSource = {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    topics: ['World'],
};

const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

function must<T>(value: T | undefined, what: string): T {
    if (value === undefined) throw new Error(`expected ${what} to be defined`);
    return value;
}

function rssDoc(items: string, channelExtra = ''): string {
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>T</title><link>https://example.com/</link>${channelExtra}</channel>${items}</rss>`;
}

describe('parseRss — RSS 2.0 fixtures', () => {
    it('extracts CDATA titles and descriptions', () => {
        const articles = parseRss(bbcXml, BBC);
        const markets = must(
            articles.find((a) => a.headline === 'Markets rally as inflation cools (updated)'),
            'updated markets article',
        );
        expect(markets.summary).toBe(
            'Global stocks rose sharply on Thursday as inflation data came in cooler than expected. Follow our live coverage for the latest updates throughout the day.',
        );
    });

    it('extracts media:thumbnail and media:content images', () => {
        const articles = parseRss(bbcXml, BBC);
        const markets = must(
            articles.find((a) => a.headline === 'Markets rally as inflation cools (updated)'),
            'markets article',
        );
        expect(markets.imageUrl).toBe('https://ichef.bbci.co.uk/news/800/cpsprod/markets.jpg');

        const nyt = parseRss(nytXml, BBC);
        const accord = must(nyt.find((a) => a.headline === 'UN reaches climate accord'), 'climate article');
        expect(accord.imageUrl).toBe('https://static01.nyt.com/images/2026/10/14/climate/800.jpg');
    });

    it('uses an image enclosure but ignores non-image enclosures', () => {
        const articles = parseRss(bbcXml, BBC);
        const bank = must(articles.find((a) => a.headline === 'Bank holds rates steady'), 'bank article');
        expect(bank.imageUrl).toBe('https://ichef.bbci.co.uk/news/1200/cpsprod/bank.jpg');

        const tech = must(articles.find((a) => a.headline === 'Tech shares slide amid chip warning'), 'tech article');
        expect(tech.imageUrl).toBeUndefined();
    });

    it('rejects relative and data: image URLs', () => {
        const articles = parseRss(bbcXml, BBC);
        const probe = must(articles.find((a) => a.headline === 'Probe lands on asteroid'), 'probe article');
        expect(probe.imageUrl).toBeUndefined();

        const festival = must(articles.find((a) => a.headline === 'Festival opens in capital'), 'festival article');
        expect(festival.imageUrl).toBeUndefined();
    });

    it('truncates summaries to 200 characters with an ellipsis', () => {
        const articles = parseRss(bbcXml, BBC);
        const wallStreet = must(
            articles.find((a) => a.headline === 'Week on Wall Street delivers a bumpy ride'),
            'wall street article',
        );
        expect(wallStreet.summary).toHaveLength(200);
        expect(wallStreet.summary.endsWith('…')).toBe(true);
        expect(wallStreet.fullStory.length).toBeGreaterThan(200);
        expect(wallStreet.hasFullContent).toBe(false);
    });

    it('dedupes items that share a link, keeping the most recent', () => {
        const articles = parseRss(bbcXml, BBC);
        const markets = articles.filter((a) => a.sourceUrl === 'https://bbc.com/news/articles/markets-rally');
        expect(markets).toHaveLength(1);
        expect(markets[0].headline).toBe('Markets rally as inflation cools (updated)');
        expect(markets[0].timestamp).toBe('2026-10-15T12:15:00.000Z');
    });

    it('returns articles sorted by recency', () => {
        const articles = parseRss(bbcXml, BBC);
        for (let i = 1; i < articles.length; i += 1) {
            expect(Date.parse(articles[i - 1].timestamp)).toBeGreaterThanOrEqual(
                Date.parse(articles[i].timestamp),
            );
        }
    });

    it('normalizes sourceUrl (https, no www, tracking params dropped)', () => {
        const articles = parseRss(bbcXml, BBC);
        const bank = must(articles.find((a) => a.headline === 'Bank holds rates steady'), 'bank article');
        expect(bank.sourceUrl).toBe('https://bbc.com/news/articles/bank-rates');
    });

    it('sets hasFullContent from content:encoded but not from description alone', () => {
        const nyt = parseRss(nytXml, BBC);
        const accord = must(nyt.find((a) => a.headline === 'UN reaches climate accord'), 'climate article');
        expect(accord.hasFullContent).toBe(true);
        expect(accord.fullStory).toBe(
            'Delegates from 194 countries agreed on Friday to a binding framework that commits signatories to steeper emissions cuts through the end of the decade. The final text was adopted by consensus shortly after midnight.',
        );

        const strike = must(nyt.find((a) => a.headline === 'City transit strike ends'), 'strike article');
        expect(strike.hasFullContent).toBe(false);
        expect(strike.fullStory).toBe(strike.summary);
    });

    it('uses guid[isPermaLink="true"] as the link when the link element is missing', () => {
        const nyt = parseRss(nytXml, BBC);
        const strike = must(nyt.find((a) => a.headline === 'City transit strike ends'), 'strike article');
        expect(strike.sourceUrl).toBe('https://nytimes.com/2026/10/14/transit-strike.html');
    });

    it('prefers the link element over a permalink guid', () => {
        const nyt = parseRss(nytXml, BBC);
        const earnings = must(nyt.find((a) => a.headline === 'Q3 earnings beat expectations'), 'earnings article');
        expect(earnings.sourceUrl).toBe('https://nytimes.com/2026/10/14/earnings-beat.html');
    });

    it('falls back to the channel lastBuildDate when an item has no pubDate', () => {
        const articles = parseRss(missingDatesXml, BBC);
        expect(articles).toHaveLength(2);
        expect(articles[0].timestamp).toBe('2026-10-16T06:00:00.000Z');
        expect(articles[1].timestamp).toBe('2026-10-16T06:00:00.000Z');
    });

    it('ignores an invalid pubDate and uses the channel lastBuildDate', () => {
        const xml = rssDoc(
            '<item><title>Bad date</title><link>https://example.com/b</link><pubDate>not a real date</pubDate></item>',
            '<lastBuildDate>Mon, 02 Jun 2025 08:00:00 GMT</lastBuildDate>',
        );
        const articles = parseRss(xml, BBC);
        expect(articles[0].timestamp).toBe(new Date('Mon, 02 Jun 2025 08:00:00 GMT').toISOString());
    });

    it('parses dc:date as an item date source', () => {
        const xml =
            '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>T</title></channel><item><title>Dated via dc</title><link>https://example.com/e</link><dc:date>2024-03-01T12:00:00Z</dc:date></item></rss>';
        const articles = parseRss(xml, BBC);
        expect(articles[0].timestamp).toBe('2024-03-01T12:00:00.000Z');
    });

    it('falls back to fallbackIso, then to the Unix epoch, when no date exists', () => {
        const xml = rssDoc('<item><title>Undated</title><link>https://example.com/a</link></item>');
        expect(parseRss(xml, BBC)[0].timestamp).toBe(EPOCH_ISO);
        expect(parseRss(xml, BBC, '2020-05-05T00:00:00.000Z')[0].timestamp).toBe('2020-05-05T00:00:00.000Z');
        expect(parseRss(xml, BBC, 'garbage')[0].timestamp).toBe(EPOCH_ISO);
    });

    it('returns [] for malformed XML without throwing', () => {
        let articles: ReturnType<typeof parseRss> = [];
        expect(() => {
            articles = parseRss(malformedXml, BBC);
        }).not.toThrow();
        expect(articles).toEqual([]);
    });

    it('skips items that have no title', () => {
        const xml = rssDoc(
            '<item><link>https://example.com/c</link><description>No headline here.</description></item>' +
                '<item><title>Has title</title><link>https://example.com/d</link></item>',
        );
        const articles = parseRss(xml, BBC);
        expect(articles).toHaveLength(1);
        expect(articles[0].headline).toBe('Has title');
    });

    it('decodes HTML entities in titles and descriptions', () => {
        const articles = parseRss(entitiesXml, BBC);
        // The entity-decoded <review> is tag-like, so stripHtml removes it (XSS safety).
        expect(articles[0].headline).toBe('Tom & Jerry\'s "Big" Day © 2026');
        expect(articles[0].summary).toBe('5 > 3 & 2 < 4 and "quotes" plus \'apostrophes\'.');
    });

    it('produces stable, unique ids across repeated parses', () => {
        const first = parseRss(bbcXml, BBC);
        const second = parseRss(bbcXml, BBC);
        expect(second.map((a) => a.id)).toEqual(first.map((a) => a.id));
        const ids = first.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('tags articles with catalog metadata and normal importance', () => {
        const articles = parseRss(bbcXml, BBC);
        for (const article of articles) {
            expect(article.tags).toEqual(['World']);
            expect(article.source).toBe('BBC World');
            expect(article.sourceId).toBe('bbc-world');
            expect(article.importance).toBe('normal');
            expect(article.summary.length).toBeLessThanOrEqual(200);
        }
    });
});

describe('parseRss — Atom', () => {
    it('parses entries, taking the first valid date in pubDate/published/updated order', () => {
        const articles = parseRss(atomXml, BBC);
        expect(articles.map((a) => a.headline)).toEqual([
            'Atom Entry Three',
            'Atom Entry One',
            'Atom Entry Two',
        ]);

        const one = must(articles.find((a) => a.headline === 'Atom Entry One'), 'entry one');
        expect(one.timestamp).toBe('2026-10-15T09:00:00.000Z');
        expect(one.hasFullContent).toBe(true);
        expect(one.fullStory).toBe('Full first entry body with plain text content.');
        expect(one.summary).toBe('First entry summary.');
        expect(one.sourceUrl).toBe('https://example.org/entries/one');
        expect(one.imageUrl).toBe('https://example.org/img/one.jpg');
    });

    it('uses published when updated is absent', () => {
        const xml =
            '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>T</title>' +
            '<entry><title>Only published</title><link rel="alternate" href="https://example.org/p"/>' +
            '<published>2026-10-14T07:00:00Z</published></entry></feed>';
        const articles = parseRss(xml, BBC);
        expect(articles[0].timestamp).toBe('2026-10-14T07:00:00.000Z');
    });

    it('falls back to the feed-level updated when an entry has no dates', () => {
        const articles = parseRss(atomXml, BBC);
        const three = must(articles.find((a) => a.headline === 'Atom Entry Three'), 'entry three');
        expect(three.timestamp).toBe('2026-10-15T10:00:00.000Z');
        expect(three.hasFullContent).toBe(false);
        expect(three.fullStory).toBe('Third entry has a summary but no content and no dates.');
        expect(three.summary).toBe('Third entry has a summary but no content and no dates.');
    });
});

describe('parseFeedJson', () => {
    const payload = JSON.parse(rss2jsonRaw) as unknown;

    it('maps the rss2json v1 shape', () => {
        const articles = parseFeedJson(payload, BBC);
        expect(articles).toHaveLength(4);

        const markets = must(articles.find((a) => a.headline === 'Markets rally as inflation cools'), 'markets');
        expect(markets.sourceUrl).toBe('https://bbc.com/news/articles/markets-rally');
        expect(Date.parse(markets.timestamp)).toBe(Date.parse('2026-10-15 11:30:00'));
        expect(markets.summary).toBe('Global stocks rose sharply on Thursday.');
        expect(markets.fullStory).toBe(
            'Global stocks rose sharply on Thursday as inflation data came in cooler than expected across major economies.',
        );
        expect(markets.hasFullContent).toBe(true);
        expect(markets.imageUrl).toBe('https://ichef.bbci.co.uk/news/800/cpsprod/markets.jpg');
        expect(markets.importance).toBe('normal');
    });

    it('falls back to an image enclosure when the thumbnail is empty', () => {
        const articles = parseFeedJson(payload, BBC);
        const bank = must(articles.find((a) => a.headline === 'Bank holds rates steady'), 'bank');
        expect(bank.imageUrl).toBe('https://ichef.bbci.co.uk/news/900/cpsprod/bank.jpg');
        expect(bank.hasFullContent).toBe(false);
        expect(bank.fullStory).toBe(bank.headline);
        expect(bank.summary).toBe('');
    });

    it('rejects a relative thumbnail URL', () => {
        const articles = parseFeedJson(payload, BBC);
        const festival = must(articles.find((a) => a.headline === 'Festival opens in capital'), 'festival');
        expect(festival.imageUrl).toBeUndefined();

        const probe = must(articles.find((a) => a.headline === 'Probe lands on asteroid'), 'probe');
        expect(probe.imageUrl).toBeUndefined();
    });

    it('falls back to the epoch when pubDate and fallbackIso are missing', () => {
        const noDates = { status: 'ok', items: [{ title: 'No date', link: 'https://example.com/nd' }] };
        expect(parseFeedJson(noDates, BBC)[0].timestamp).toBe(EPOCH_ISO);
        expect(parseFeedJson(noDates, BBC, '2021-01-02T03:04:05.000Z')[0].timestamp).toBe(
            '2021-01-02T03:04:05.000Z',
        );
    });

    it('returns [] for unknown or mismatched shapes', () => {
        expect(parseFeedJson(null, BBC)).toEqual([]);
        expect(parseFeedJson(42, BBC)).toEqual([]);
        expect(parseFeedJson('nope', BBC)).toEqual([]);
        expect(parseFeedJson({}, BBC)).toEqual([]);
        expect(parseFeedJson({ status: 'ok' }, BBC)).toEqual([]);
        expect(parseFeedJson({ status: 'error', items: [] }, BBC)).toEqual([]);
        expect(parseFeedJson({ status: 'ok', items: 'nope' }, BBC)).toEqual([]);
        expect(parseFeedJson({ status: 'ok', items: [42, null, { link: 'https://example.com/x' }] }, BBC)).toEqual(
            [],
        );
    });
});
