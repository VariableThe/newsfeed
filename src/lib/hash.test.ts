import { describe, it, expect } from 'vitest';
import { contentId } from './hash';

describe('contentId', () => {
    it('returns the same id for the same input', () => {
        expect(contentId('hello world')).toBe(contentId('hello world'));
    });

    it('returns different ids for different inputs', () => {
        expect(contentId('a')).not.toBe(contentId('b'));
    });

    it('is stable across calls', () => {
        const first = contentId('stable-input');
        for (let i = 0; i < 100; i++) {
            expect(contentId('stable-input')).toBe(first);
        }
    });

    it('returns a non-empty hex-ish string with a prefix', () => {
        const id = contentId('anything');
        expect(id).toMatch(/^n-[0-9a-f]+$/);
        expect(id.length).toBeGreaterThan(2);
    });
});
