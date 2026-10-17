import { useState } from 'react';
import type { ReactElement } from 'react';
import { Bookmark, Flame } from 'lucide-react';
import type { NewsArticle } from '../types';
import { formatRelativeTime } from '../lib/format';
import { sourceColor } from '../lib/palette';
import { estimateReadMinutes } from '../services/feedService';

interface ArticleCardProps {
    article: NewsArticle;
    isTrending: boolean;
    isSaved: boolean;
}

export function ArticleCard({ article, isTrending, isSaved }: ArticleCardProps): ReactElement {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = article.imageUrl !== undefined && article.imageUrl !== '' && !imageFailed;
    const fallbackGradient = `linear-gradient(135deg, ${sourceColor(article.sourceId)}, var(--color-accent))`;

    return (
        <article className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card-dark)] shadow-xl">
            <div className="relative h-56 w-full shrink-0 overflow-hidden">
                {showImage ? (
                    <img
                        src={article.imageUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() => {
                            setImageFailed(true);
                        }}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full"
                        style={{ background: fallbackGradient }}
                    />
                )}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                />
                <div className="absolute left-4 right-4 top-4 flex items-center gap-2">
                    <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {article.source}
                    </span>
                    {isTrending ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            <Flame size={12} aria-hidden="true" />
                            Trending
                        </span>
                    ) : null}
                    <span className="ml-auto rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {formatRelativeTime(article.timestamp)}
                    </span>
                </div>
                {isSaved ? (
                    <span className="absolute bottom-3 right-4 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        <Bookmark size={12} aria-hidden="true" />
                        Saved
                    </span>
                ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
                <h2 className="text-xl font-bold leading-snug text-[var(--color-primary-text)]">
                    {article.headline}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--color-secondary-text)]">
                    {article.summary}
                </p>
                {article.tags.length > 0 ? (
                    <ul aria-label="Topics" className="flex flex-wrap gap-1.5">
                        {article.tags.map((tag) => (
                            <li
                                key={tag}
                                className="rounded-full border border-[var(--color-card-border)] px-2.5 py-0.5 text-xs text-[var(--color-secondary-text)]"
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                ) : null}
                <p className="mt-auto pt-1 text-xs text-[var(--color-secondary-text)]">
                    {estimateReadMinutes(article)} min read
                </p>
            </div>
        </article>
    );
}
