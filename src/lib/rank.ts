import type { NewsArticle } from '../types';
import { normalizeTitle, normalizeUrl } from './normalize';

const WINDOW_MS = 60 * 60 * 1000;

function timeBucket(timestamp: string): number {
    return Math.floor(Date.parse(timestamp) / WINDOW_MS);
}

function pickWinner(group: NewsArticle[]): NewsArticle {
    return group.reduce((a, b) => {
        const ta = Date.parse(a.timestamp);
        const tb = Date.parse(b.timestamp);
        if (ta !== tb) return ta > tb ? a : b;
        return a.id < b.id ? a : b;
    });
}

export function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
    const byUrl = new Map<string, NewsArticle[]>();
    for (const article of articles) {
        const key = normalizeUrl(article.sourceUrl);
        const group = byUrl.get(key);
        if (group) {
            group.push(article);
        } else {
            byUrl.set(key, [article]);
        }
    }

    const urlWinners = Array.from(byUrl.values()).map(pickWinner);

    const byTitleBucket = new Map<string, NewsArticle[]>();
    for (const article of urlWinners) {
        const key = `${normalizeTitle(article.headline)}@${timeBucket(article.timestamp)}`;
        const group = byTitleBucket.get(key);
        if (group) {
            group.push(article);
        } else {
            byTitleBucket.set(key, [article]);
        }
    }

    return Array.from(byTitleBucket.values()).map(pickWinner);
}

export function sortByRecency(articles: NewsArticle[]): NewsArticle[] {
    return [...articles].sort((a, b) => {
        const ta = Date.parse(a.timestamp);
        const tb = Date.parse(b.timestamp);
        if (ta !== tb) return tb - ta;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

export function computeTrending(articles: NewsArticle[]): Set<string> {
    const trending = new Set<string>();

    const byTitle = new Map<string, NewsArticle[]>();
    for (const article of articles) {
        const key = normalizeTitle(article.headline);
        const group = byTitle.get(key);
        if (group) {
            group.push(article);
        } else {
            byTitle.set(key, [article]);
        }
    }

    for (const group of byTitle.values()) {
        if (group.length < 2) continue;

        const sorted = [...group].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const gap = Date.parse(sorted[j].timestamp) - Date.parse(sorted[i].timestamp);
                if (gap > WINDOW_MS) break;
                if (sorted[i].sourceId !== sorted[j].sourceId) {
                    trending.add(sorted[i].id);
                    trending.add(sorted[j].id);
                }
            }
        }
    }

    return trending;
}
