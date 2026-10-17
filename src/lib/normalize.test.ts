import { describe, it, expect } from 'vitest';
import { normalizeUrl, normalizeTitle, stripHtml } from './normalize';

describe('normalizeUrl', () => {
    it('forces https', () => {
        expect(normalizeUrl('http://example.com/a')).toBe('https://example.com/a');
    });

    it('lowercases the host', () => {
        expect(normalizeUrl('https://EXAMPLE.com/A')).toBe('https://example.com/A');
    });

    it('strips a leading www', () => {
        expect(normalizeUrl('https://www.example.com/')).toBe('https://example.com/');
    });

    it('drops utm_*, fbclid, gclid, ref and ref_src', () => {
        const dirty = 'https://example.com/a?utm_source=newsletter&id=7&fbclid=abc&gclid=xyz&ref=home&ref_src=twsrc';
        expect(normalizeUrl(dirty)).toBe('https://example.com/a?id=7');
    });

    it('sorts the remaining query params', () => {
        expect(normalizeUrl('https://example.com/?b=2&a=1')).toBe('https://example.com/?a=1&b=2');
    });

    it('strips the hash', () => {
        expect(normalizeUrl('https://example.com/a#section')).toBe('https://example.com/a');
    });

    it('strips trailing slashes except the root', () => {
        expect(normalizeUrl('https://example.com/foo/')).toBe('https://example.com/foo');
        expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    });
});

describe('normalizeTitle', () => {
    it('lowercases and strips punctuation', () => {
        expect(normalizeTitle('Stocks: Up!')).toBe('stocks up');
        expect(normalizeTitle('COVID-19 Crisis')).toBe('covid 19 crisis');
    });

    it('collapses whitespace', () => {
        expect(normalizeTitle('  Big    Story\tHere ')).toBe('big story here');
    });
});

describe('stripHtml', () => {
    it('removes tags without using innerHTML', () => {
        expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });

    it('decodes named entities', () => {
        expect(stripHtml('&amp;&lt;&gt;&quot;')).toBe('&<>"');
    });

    it('decodes &nbsp; as a space', () => {
        expect(stripHtml('a&nbsp;b')).toBe('a b');
    });

    it('decodes numeric entities', () => {
        expect(stripHtml('&#65;&#x42;&#39;')).toBe("AB'");
    });
});
