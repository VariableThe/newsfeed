import type { FormEvent, ReactElement } from 'react';
import { Bookmark, BookmarkCheck, CheckCheck, Inbox, RefreshCw, Search, X } from 'lucide-react';
import { useNews } from '../state/newsStore';
import { useHashRoute } from '../hooks/useHashRoute';
import { getFeedSource } from '../services/feedService';
import { formatDateTime, formatRelativeTime, truncate } from '../lib/format';
import { EmptyState } from './Common/EmptyState';
import { FeedStatusBadge } from './Common/FeedStatusBadge';
import { IconButton } from './Common/IconButton';
import { Spinner } from './Common/Spinner';

function sourceName(sourceId: string): string {
    return getFeedSource(sourceId)?.name ?? sourceId;
}

export function FeedView(): ReactElement {
    const {
        articles,
        filtered,
        readIds,
        saved,
        query,
        topics,
        sources,
        filters,
        feedHealth,
        lastUpdated,
        isRefreshing,
        setQuery,
        toggleTopic,
        toggleSource,
        clearFilters,
        toggleSaved,
        markAllRead,
        openArticle,
        refresh,
        refreshFeed,
    } = useNews();
    const { navigate } = useHashRoute();

    const savedIds = new Set(saved.map((article) => article.id));
    const hasActiveFilters =
        filters.topics.length > 0 || filters.sources.length > 0 || query.trim() !== '';
    const headerLine = hasActiveFilters
        ? `${filtered.length} of ${articles.length} stories`
        : `${articles.length} stories`;
    const problemFeeds = feedHealth.filter(
        (health) => health.status === 'error' || health.count === 0,
    );

    const open = (id: string): void => {
        openArticle(id);
        navigate({ kind: 'article', id });
    };

    const onSearch = (event: FormEvent<HTMLInputElement>): void => {
        setQuery(event.currentTarget.value);
    };

    return (
        <section aria-label="All stories" className="flex h-full flex-col">
            <div className="shrink-0 space-y-3 p-4 pb-2">
                <form role="search" onSubmit={(event) => event.preventDefault()}>
                    <label htmlFor="feed-search" className="sr-only">
                        Search stories
                    </label>
                    <div className="relative">
                        <Search
                            size={17}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary-text)]"
                        />
                        <input
                            id="feed-search"
                            type="search"
                            value={query}
                            onChange={onSearch}
                            placeholder="Search headlines, sources, topics…"
                            className="min-h-[44px] w-full rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-dark)] py-2 pl-10 pr-9 text-sm text-[var(--color-primary-text)] placeholder:text-[var(--color-secondary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                        />
                        {query !== '' ? (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                    setQuery('');
                                }}
                                className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-[var(--color-secondary-text)]"
                            >
                                <X size={17} aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                </form>

                <div>
                    <p id="topic-filters-label" className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary-text)]">
                        Topics
                    </p>
                    <div role="group" aria-labelledby="topic-filters-label" className="flex flex-wrap gap-1.5">
                        {topics.map((topic) => {
                            const active = filters.topics.includes(topic);
                            return (
                                <button
                                    key={topic}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        toggleTopic(topic);
                                    }}
                                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                                        active
                                            ? 'border-transparent bg-[var(--color-accent)] text-white'
                                            : 'border-[var(--color-card-border)] text-[var(--color-secondary-text)]'
                                    }`}
                                >
                                    {topic}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <p id="source-filters-label" className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary-text)]">
                        Sources
                    </p>
                    <div role="group" aria-labelledby="source-filters-label" className="flex flex-wrap gap-1.5">
                        {sources.map((sourceId) => {
                            const active = filters.sources.includes(sourceId);
                            return (
                                <button
                                    key={sourceId}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        toggleSource(sourceId);
                                    }}
                                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                                        active
                                            ? 'border-transparent bg-[var(--color-accent)] text-white'
                                            : 'border-[var(--color-card-border)] text-[var(--color-secondary-text)]'
                                    }`}
                                >
                                    {sourceName(sourceId)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <p aria-live="polite" className="text-sm text-[var(--color-secondary-text)]">
                        {headerLine}
                    </p>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                        >
                            Clear filters
                        </button>
                    ) : null}
                    <span className="ml-auto flex items-center gap-1">
                        <IconButton label="Mark all as read" onClick={markAllRead}>
                            <CheckCheck size={19} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                            label={isRefreshing ? 'Refreshing stories' : 'Refresh stories'}
                            onClick={() => {
                                void refresh();
                            }}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? (
                                <Spinner label="" />
                            ) : (
                                <RefreshCw size={19} aria-hidden="true" />
                            )}
                        </IconButton>
                    </span>
                </div>
                <p className="text-xs text-[var(--color-secondary-text)]">
                    {lastUpdated ? (
                        <>
                            Last updated{' '}
                            <time dateTime={lastUpdated}>
                                {formatDateTime(lastUpdated)} ({formatRelativeTime(lastUpdated)} ago)
                            </time>
                        </>
                    ) : (
                        'Never updated — pull to refresh.'
                    )}
                </p>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-[var(--color-card-border)] overflow-y-auto px-4">
                {filtered.map((article) => {
                    const isRead = readIds.has(article.id);
                    const isSaved = savedIds.has(article.id);
                    return (
                        <li key={article.id}>
                            <div className="flex items-start gap-3 py-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        open(article.id);
                                    }}
                                    className={`min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ${isRead ? 'opacity-60' : ''}`}
                                    aria-label={`${article.headline}${isRead ? ' (read)' : ''}`}
                                >
                                    <p className="text-xs text-[var(--color-secondary-text)]">
                                        {article.source} ·{' '}
                                        <time dateTime={article.timestamp}>
                                            {formatRelativeTime(article.timestamp)}
                                        </time>
                                        {isRead ? ' · Read' : null}
                                    </p>
                                    <p className="mt-0.5 font-semibold leading-snug text-[var(--color-primary-text)]">
                                        {article.headline}
                                    </p>
                                    <p className="mt-0.5 line-clamp-1 text-sm text-[var(--color-secondary-text)]">
                                        {truncate(article.summary, 140)}
                                    </p>
                                </button>
                                <IconButton
                                    label={isSaved ? `Unsave ${article.headline}` : `Save ${article.headline}`}
                                    onClick={() => {
                                        toggleSaved(article.id);
                                    }}
                                    ariaPressed={isSaved}
                                >
                                    {isSaved ? (
                                        <BookmarkCheck size={19} aria-hidden="true" className="text-[var(--color-accent)]" />
                                    ) : (
                                        <Bookmark size={19} aria-hidden="true" />
                                    )}
                                </IconButton>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={<Inbox size={28} aria-hidden="true" />}
                    title="No stories match"
                    description="Try a different search or clear the active filters."
                    action={{ label: 'Clear filters', onClick: clearFilters }}
                />
            ) : null}

            {problemFeeds.length > 0 ? (
                <div className="shrink-0 border-t border-[var(--color-card-border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--color-primary-text)]">
                        Feeds needing attention
                    </h3>
                    <ul className="mt-2 space-y-2">
                        {problemFeeds.map((health) => (
                            <li
                                key={health.sourceId}
                                className="flex min-h-[44px] items-center gap-2 text-sm"
                            >
                                <span className="min-w-0 flex-1 truncate text-[var(--color-primary-text)]">
                                    {health.name}
                                </span>
                                <FeedStatusBadge
                                    status={health.status}
                                    count={health.count}
                                    error={health.error}
                                />
                                {health.status === 'error' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void refreshFeed(health.sourceId);
                                        }}
                                        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--color-card-border)] px-3 text-sm font-medium text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                                    >
                                        Retry
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    );
}
