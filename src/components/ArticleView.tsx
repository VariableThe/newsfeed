import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, Share2, X } from 'lucide-react';
import { useNews } from '../state/newsStore';
import { formatDateTime, formatRelativeTime } from '../lib/format';
import { hostFromUrl } from '../lib/format';
import { EmptyState } from './Common/EmptyState';
import { IconButton } from './Common/IconButton';

interface ArticleViewProps {
    id: string;
    onClose: () => void;
}

function focusablesIn(root: HTMLElement): HTMLElement[] {
    return Array.from(
        root.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function ArticleView({ id, onClose }: ArticleViewProps): ReactElement {
    const { articles, saved, toggleSaved, markRead } = useNews();
    const dialogRef = useRef<HTMLDivElement>(null);
    const [shareMessage, setShareMessage] = useState('');

    const article = articles.find((item) => item.id === id) ?? saved.find((item) => item.id === id);
    const isSaved = saved.some((item) => item.id === id);

    useEffect(() => {
        markRead(id);
    }, [id, markRead]);

    useEffect(() => {
        const dialog = dialogRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        dialog?.focus();

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !dialog) return;
            const focusables = focusablesIn(dialog);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus();
        };
    }, [onClose]);

    if (!article) {
        return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Story not available"
                    tabIndex={-1}
                    className="w-full max-w-lg rounded-3xl bg-[var(--color-card-dark)] outline-none"
                >
                    <EmptyState
                        title="Story not available"
                        description="This story is no longer in the current feed snapshot."
                        action={{ label: 'Back', onClick: onClose }}
                    />
                </div>
            </div>
        );
    }

    const sourceHost = hostFromUrl(article.sourceUrl);

    const share = async (): Promise<void> => {
        setShareMessage('');
        const shareData = {
            title: article.headline,
            text: article.summary,
            url: article.sourceUrl,
        };
        const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
        if (typeof nav.share === 'function') {
            try {
                await nav.share(shareData);
            } catch {
                // User dismissed the share sheet; nothing to report.
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(article.sourceUrl);
            setShareMessage('Link copied to clipboard');
        } catch {
            setShareMessage('Could not copy the link on this device');
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={article.headline}
                tabIndex={-1}
                className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[var(--color-card-dark)] outline-none sm:rounded-3xl"
            >
                <div className="flex items-center gap-2 border-b border-[var(--color-card-border)] p-3">
                    <span className="rounded-full bg-[var(--color-card-border)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-text)]">
                        {article.source}
                    </span>
                    <span className="text-xs text-[var(--color-secondary-text)]">
                        <time dateTime={article.timestamp}>{formatDateTime(article.timestamp)}</time>
                        {' · '}
                        {formatRelativeTime(article.timestamp)}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                        <IconButton label="Share story" onClick={() => void share()}>
                            <Share2 size={19} aria-hidden="true" />
                        </IconButton>
                        <IconButton label="Close article" onClick={onClose}>
                            <X size={20} aria-hidden="true" />
                        </IconButton>
                    </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <h2 className="text-2xl font-bold leading-tight text-[var(--color-primary-text)]">
                        {article.headline}
                    </h2>
                    {article.tags.length > 0 ? (
                        <ul aria-label="Topics" className="mt-3 flex flex-wrap gap-1.5">
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

                    {!article.hasFullContent ? (
                        <p role="note" className="mt-4 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-border)]/40 p-3 text-sm text-[var(--color-secondary-text)]">
                            Showing an excerpt — the feed only provided a summary for this story.
                        </p>
                    ) : null}

                    <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-primary-text)]">
                        {article.fullStory}
                    </p>

                    <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                    >
                        <ExternalLink size={17} aria-hidden="true" />
                        {article.hasFullContent
                            ? 'Open original'
                            : `Read the full article at ${sourceHost === '' ? article.source : sourceHost}`}
                    </a>

                    <div aria-live="polite" className="mt-2 min-h-5 text-sm text-[var(--color-secondary-text)]">
                        {shareMessage}
                    </div>
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--color-card-border)] p-3">
                    <button
                        type="button"
                        onClick={() => {
                            toggleSaved(article.id);
                        }}
                        aria-pressed={isSaved}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-card-border)] px-4 text-sm font-medium text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                    >
                        {isSaved ? (
                            <BookmarkCheck size={17} aria-hidden="true" />
                        ) : (
                            <Bookmark size={17} aria-hidden="true" />
                        )}
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            markRead(article.id);
                        }}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-card-border)] px-4 text-sm font-medium text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                    >
                        Mark read
                    </button>
                </div>
            </div>
        </div>
    );
}
