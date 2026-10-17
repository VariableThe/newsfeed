import { describe, it, expect } from 'vitest';
import { sourceColor } from './palette';
import { FEED_IDS } from '../data/feeds';

describe('sourceColor', () => {
    it('is deterministic per sourceId', () => {
        expect(sourceColor('bbc-world')).toBe(sourceColor('bbc-world'));
    });

    it('maps every real catalog id to a valid 6-digit hex', () => {
        for (const id of FEED_IDS) {
            expect(sourceColor(id)).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});
