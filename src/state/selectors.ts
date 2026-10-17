import type { FeedStatus, NewsArticle } from '../types';
import { FEEDS } from '../data/feeds';
import { computeTrending, dedupeArticles, sortByRecency } from '../lib/rank';
import type { State } from './newsReducer';

export interface FeedHealth {
    sourceId: string;
    name: string;
    status: FeedStatus;
    count: number;
    error?: string;
    fetchedAt?: string;
}

export function selectAllArticles(state: State): NewsArticle[] {
    const merged: NewsArticle[] = [];
    for (const feedState of Object.values(state.feeds)) {
        merged.push(...feedState.articles);
    }
    return sortByRecency(dedupeArticles(merged));
}

export function selectMatchesQuery(article: NewsArticle, query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (needle === '') return true;
    if (article.headline.toLowerCase().includes(needle)) return true;
    if (article.summary.toLowerCase().includes(needle)) return true;
    if (article.source.toLowerCase().includes(needle)) return true;
    return article.tags.some((tag) => tag.toLowerCase().includes(needle));
}

export function selectFilteredArticles(state: State): NewsArticle[] {
    const { topics, sources, unreadOnly } = state.filters;
    const readSet = new Set(state.readIds);
    const query = state.query;

    return selectAllArticles(state).filter((article) => {
        if (topics.length > 0 && !article.tags.some((tag) => topics.includes(tag))) return false;
        if (sources.length > 0 && !sources.includes(article.sourceId)) return false;
        if (unreadOnly && readSet.has(article.id)) return false;
        if (!selectMatchesQuery(article, query)) return false;
        return true;
    });
}

export function selectDeck(state: State): NewsArticle[] {
    const readSet = new Set(state.readIds);
    return selectFilteredArticles(state).filter((article) => !readSet.has(article.id));
}

export function selectSaved(state: State): NewsArticle[] {
    return state.saved;
}

export function selectReadIds(state: State): Set<string> {
    return new Set(state.readIds);
}

export function selectTrendingIds(state: State): Set<string> {
    return computeTrending(selectAllArticles(state));
}

export function selectFeedHealth(state: State): FeedHealth[] {
    return FEEDS.map((feed) => {
        const feedState = state.feeds[feed.id];
        return {
            sourceId: feed.id,
            name: feed.name,
            status: feedState?.status ?? 'idle',
            count: feedState?.articles.length ?? 0,
            error: feedState?.error,
            fetchedAt: feedState?.fetchedAt,
        };
    });
}

export function selectIsEmpty(state: State): boolean {
    const feedStates = Object.values(state.feeds);
    return feedStates.every((feedState) => feedState.articles.length === 0);
}
