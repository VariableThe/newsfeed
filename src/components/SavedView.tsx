import type { ReactElement } from 'react';
import { Bookmark, BookmarkX } from 'lucide-react';
import { useNews } from '../state/newsStore';
import { useHashRoute } from '../hooks/useHashRoute';
import { formatRelativeTime } from '../lib/format';
import { EmptyState } from './Common/EmptyState';
import { IconButton } from './Common/IconButton';

export function SavedView(): ReactElement {
    const { saved, unsaveArticle, openArticle, openFeed } = useNews();
    const { navigate } = useHashRoute();

    if (saved.length === 0) {
        return (
            <EmptyState
                icon={<Bookmark size={28} aria-hidden="true" />}
                title="No saved stories"
                description="Save a story from the deck or feed and it will wait for you here."
                action={{ label: 'Browse stories', onClick: openFeed }}
            />
        );
    }

    return (
        <section aria-label="Saved stories" className="h-full overflow-y-auto">
            <ul className="divide-y divide-[var(--color-card-border)] px-4">
                {saved.map((article) => (
                    <li key={article.id}>
                        <div className="flex items-start gap-3 py-3">
                            <button
                                type="button"
                                onClick={() => {
                                    openArticle(article.id);
                                    navigate({ kind: 'article', id: article.id });
                                }}
                                className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                                aria-label={article.headline}
                            >
                                <p className="text-xs text-[var(--color-secondary-text)]">
                                    {article.source} ·{' '}
                                    <time dateTime={article.timestamp}>
                                        {formatRelativeTime(article.timestamp)}
                                    </time>
                                </p>
                                <p className="mt-0.5 font-semibold leading-snug text-[var(--color-primary-text)]">
                                    {article.headline}
                                </p>
                                <p className="mt-0.5 line-clamp-1 text-sm text-[var(--color-secondary-text)]">
                                    {article.summary}
                                </p>
                            </button>
                            <IconButton
                                label={`Remove ${article.headline} from saved`}
                                onClick={() => {
                                    unsaveArticle(article.id);
                                }}
                            >
                                <BookmarkX size={19} aria-hidden="true" />
                            </IconButton>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
