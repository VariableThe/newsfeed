import type { NewsArticle } from '../types';
import { sortByRecency } from '../lib/rank';

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

const NOTIFIABLE_LIMIT = 3;

export function getPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
        return await Notification.requestPermission();
    } catch {
        return 'denied';
    }
}

function parseMinutes(value: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
}

export function isInQuietHours(start: string | null, end: string | null, at: Date = new Date()): boolean {
    if (start === null || end === null) return false;
    const startMinutes = parseMinutes(start);
    const endMinutes = parseMinutes(end);
    if (startMinutes === null || endMinutes === null) return false;

    const now = at.getHours() * 60 + at.getMinutes();
    if (startMinutes <= endMinutes) {
        return now >= startMinutes && now <= endMinutes;
    }
    // Window crosses midnight, e.g. 22:00 -> 07:00.
    return now >= startMinutes || now <= endMinutes;
}

export function selectNotifiable(
    articles: NewsArticle[],
    opts: {
        trendingIds: Set<string>;
        seenIds: Set<string>;
        quietStart: string | null;
        quietEnd: string | null;
        at?: Date;
    },
): NewsArticle[] {
    if (isInQuietHours(opts.quietStart, opts.quietEnd, opts.at)) return [];

    return sortByRecency(articles)
        .filter((article) => opts.trendingIds.has(article.id))
        .filter((article) => !opts.seenIds.has(article.id))
        .filter((article) => article.sourceUrl.trim() !== '')
        .slice(0, NOTIFIABLE_LIMIT);
}

export function sendNotification(article: NewsArticle, onClick?: () => void): boolean {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission !== 'granted') return false;

    try {
        const notification = new Notification(article.headline, {
            body: article.summary,
            tag: `newsfeed-${article.id}`,
        });
        if (onClick) {
            notification.onclick = () => {
                onClick();
                notification.close();
            };
        }
        return true;
    } catch {
        return false;
    }
}
