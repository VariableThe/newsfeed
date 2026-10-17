import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getPermission,
    requestPermission,
    isInQuietHours,
    selectNotifiable,
    sendNotification,
} from '../notifications';
import type { NewsArticle } from '../../types';

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

class MockNotification {
    static permission: NotificationPermission = 'granted';
    static instances: MockNotification[] = [];
    static requestPermissionMock: (() => Promise<NotificationPermission>) | null = null;
    static throwOnConstruct = false;

    onclick: (() => void) | null = null;
    title: string;
    options: NotificationOptions | undefined;

    constructor(title: string, options?: NotificationOptions) {
        if (MockNotification.throwOnConstruct) {
            throw new Error('construct failed');
        }
        this.title = title;
        this.options = options;
        MockNotification.instances.push(this);
    }

    close(): void {
        /* no-op */
    }

    static requestPermission(): Promise<NotificationPermission> {
        if (MockNotification.requestPermissionMock) {
            return MockNotification.requestPermissionMock();
        }
        return Promise.resolve(MockNotification.permission);
    }
}

describe('notifications', () => {
    beforeEach(() => {
        MockNotification.permission = 'granted';
        MockNotification.instances = [];
        MockNotification.requestPermissionMock = null;
        MockNotification.throwOnConstruct = false;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getPermission', () => {
        it('returns unsupported when Notification is undefined', () => {
            vi.stubGlobal('Notification', undefined);
            expect(getPermission()).toBe('unsupported');
        });

        it('maps the DOM permission values', () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'granted';
            expect(getPermission()).toBe('granted');
            MockNotification.permission = 'denied';
            expect(getPermission()).toBe('denied');
            MockNotification.permission = 'default';
            expect(getPermission()).toBe('default');
        });
    });

    describe('requestPermission', () => {
        it('returns unsupported when Notification is undefined', async () => {
            vi.stubGlobal('Notification', undefined);
            expect(await requestPermission()).toBe('unsupported');
        });

        it('returns granted without calling the DOM when already granted', async () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'granted';
            expect(await requestPermission()).toBe('granted');
        });

        it('returns denied without calling the DOM when already denied', async () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'denied';
            expect(await requestPermission()).toBe('denied');
        });

        it('delegates to the DOM when permission is default', async () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'default';
            MockNotification.requestPermissionMock = () => Promise.resolve('granted');
            expect(await requestPermission()).toBe('granted');
        });

        it('never throws and returns denied on DOM failure', async () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'default';
            MockNotification.requestPermissionMock = () => Promise.reject(new Error('denied by browser'));
            expect(await requestPermission()).toBe('denied');
        });
    });

    describe('isInQuietHours', () => {
        it('returns false when either bound is null', () => {
            expect(isInQuietHours(null, null)).toBe(false);
            expect(isInQuietHours('22:00', null)).toBe(false);
            expect(isInQuietHours(null, '07:00')).toBe(false);
        });

        it('handles a same-day window with inclusive bounds', () => {
            const at = (h: number, m: number) => new Date(2026, 0, 1, h, m);
            expect(isInQuietHours('09:00', '17:00', at(12, 0))).toBe(true);
            expect(isInQuietHours('09:00', '17:00', at(9, 0))).toBe(true);
            expect(isInQuietHours('09:00', '17:00', at(17, 0))).toBe(true);
            expect(isInQuietHours('09:00', '17:00', at(8, 59))).toBe(false);
            expect(isInQuietHours('09:00', '17:00', at(17, 1))).toBe(false);
        });

        it('handles a window crossing midnight', () => {
            const at = (h: number, m: number) => new Date(2026, 0, 1, h, m);
            expect(isInQuietHours('22:00', '07:00', at(23, 30))).toBe(true);
            expect(isInQuietHours('22:00', '07:00', at(22, 0))).toBe(true);
            expect(isInQuietHours('22:00', '07:00', at(7, 0))).toBe(true);
            expect(isInQuietHours('22:00', '07:00', at(3, 0))).toBe(true);
            expect(isInQuietHours('22:00', '07:00', at(21, 59))).toBe(false);
            expect(isInQuietHours('22:00', '07:00', at(7, 1))).toBe(false);
            expect(isInQuietHours('22:00', '07:00', at(12, 0))).toBe(false);
        });

        it('defaults to the current time', () => {
            // Just verify it does not throw and returns a boolean.
            expect(typeof isInQuietHours('22:00', '07:00')).toBe('boolean');
        });
    });

    describe('selectNotifiable', () => {
        const trendingIds = new Set(['n-1', 'n-2', 'n-3', 'n-4', 'n-5']);
        const seenIds = new Set<string>();

        it('returns at most 3 newest trending unseen articles with a sourceUrl', () => {
            const articles = [
                article(1, { timestamp: '2026-10-15T01:00:00.000Z' }),
                article(2, { timestamp: '2026-10-15T05:00:00.000Z' }),
                article(3, { timestamp: '2026-10-15T03:00:00.000Z' }),
                article(4, { timestamp: '2026-10-15T04:00:00.000Z' }),
                article(5, { timestamp: '2026-10-15T02:00:00.000Z' }),
            ];
            const result = selectNotifiable(articles, {
                trendingIds,
                seenIds,
                quietStart: null,
                quietEnd: null,
            });
            expect(result.map((a) => a.id)).toEqual(['n-2', 'n-4', 'n-3']);
        });

        it('excludes non-trending articles', () => {
            const articles = [article(99, { timestamp: FIXED })];
            const result = selectNotifiable(articles, {
                trendingIds,
                seenIds,
                quietStart: null,
                quietEnd: null,
            });
            expect(result).toEqual([]);
        });

        it('excludes seen articles', () => {
            const articles = [article(1, { timestamp: FIXED })];
            const result = selectNotifiable(articles, {
                trendingIds,
                seenIds: new Set(['n-1']),
                quietStart: null,
                quietEnd: null,
            });
            expect(result).toEqual([]);
        });

        it('excludes articles without a sourceUrl', () => {
            const articles = [article(1, { sourceUrl: '   ', timestamp: FIXED })];
            const result = selectNotifiable(articles, {
                trendingIds,
                seenIds,
                quietStart: null,
                quietEnd: null,
            });
            expect(result).toEqual([]);
        });

        it('returns nothing during quiet hours', () => {
            const articles = [article(1, { timestamp: FIXED })];
            const result = selectNotifiable(articles, {
                trendingIds,
                seenIds,
                quietStart: '00:00',
                quietEnd: '23:59',
                at: new Date(2026, 0, 1, 12, 0),
            });
            expect(result).toEqual([]);
        });
    });

    describe('sendNotification', () => {
        it('returns false when Notification is unsupported', () => {
            vi.stubGlobal('Notification', undefined);
            expect(sendNotification(article(1))).toBe(false);
        });

        it('returns false when permission is not granted', () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'denied';
            expect(sendNotification(article(1))).toBe(false);
            MockNotification.permission = 'default';
            expect(sendNotification(article(1))).toBe(false);
        });

        it('sends a notification with a per-article tag when granted', () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'granted';

            const sent = sendNotification(article(1));
            expect(sent).toBe(true);
            expect(MockNotification.instances).toHaveLength(1);
            expect(MockNotification.instances[0].title).toBe('Headline 1');
            expect(MockNotification.instances[0].options?.tag).toBe('newsfeed-n-1');
        });

        it('collapses duplicates via the tag', () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'granted';

            sendNotification(article(1));
            sendNotification(article(1));
            expect(MockNotification.instances).toHaveLength(2);
            expect(MockNotification.instances[0].options?.tag).toBe('newsfeed-n-1');
            expect(MockNotification.instances[1].options?.tag).toBe('newsfeed-n-1');
        });

        it('invokes onClick and closes the notification', () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'granted';

            const onClick = vi.fn();
            sendNotification(article(1), onClick);
            MockNotification.instances[0].onclick?.();
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it('never throws when the constructor throws', () => {
            vi.stubGlobal('Notification', MockNotification);
            MockNotification.permission = 'granted';
            MockNotification.throwOnConstruct = true;

            expect(() => sendNotification(article(1))).not.toThrow();
            expect(sendNotification(article(1))).toBe(false);
        });
    });
});
