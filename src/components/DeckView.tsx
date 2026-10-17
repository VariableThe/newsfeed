import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Bookmark, BookmarkCheck, Inbox, X } from 'lucide-react';
import { useNews } from '../state/newsStore';
import { useHashRoute } from '../hooks/useHashRoute';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { NewsArticle } from '../types';
import { ArticleCard } from './ArticleCard';
import { EmptyState } from './Common/EmptyState';
import { IconButton } from './Common/IconButton';

const SWIPE_THRESHOLD = 110;

export function DeckView(): ReactElement {
    const {
        deck,
        saved,
        trendingIds,
        isLoading,
        openArticle,
        markRead,
        toggleSaved,
    } = useNews();
    const { navigate } = useHashRoute();
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

    const current = deck[0];
    const upcoming = deck.slice(1, 3);
    const savedIds = new Set(saved.map((article) => article.id));

    const skip = useCallback(() => {
        if (!current) return;
        markRead(current.id);
    }, [current, markRead]);

    const save = useCallback(() => {
        if (!current) return;
        toggleSaved(current.id);
    }, [current, toggleSaved]);

    const open = useCallback(() => {
        if (!current) return;
        openArticle(current.id);
        navigate({ kind: 'article', id: current.id });
    }, [current, navigate, openArticle]);

    // Latest front article and actions, read by the window keydown handler so
    // the listener below never closes over stale state and never resubscribes.
    const currentRef = useRef<NewsArticle | undefined>(undefined);
    const actionsRef = useRef({ skip, save, open });
    useEffect(() => {
        currentRef.current = current;
        actionsRef.current = { skip, save, open };
    });

    useEffect(() => {
        const isEditableTarget = (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) return false;
            const tag = target.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
        };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (
                event.key !== 'ArrowLeft'
                && event.key !== 'ArrowRight'
                && event.key !== 'ArrowUp'
                && event.key !== 'Enter'
            ) {
                return;
            }
            if (isEditableTarget(event.target)) return;
            if (document.querySelector('[role="dialog"]')) return;
            if (!currentRef.current) return;
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                actionsRef.current.skip();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                actionsRef.current.save();
            } else {
                event.preventDefault();
                actionsRef.current.open();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    if (isLoading && deck.length === 0) {
        return (
            <div role="status" aria-label="Loading stories" className="flex h-full flex-col gap-4 p-5">
                <div className="h-56 animate-pulse rounded-3xl bg-[var(--color-card-border)]" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-[var(--color-card-border)]" />
                <div className="h-4 w-full animate-pulse rounded bg-[var(--color-card-border)]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-card-border)]" />
            </div>
        );
    }

    if (!current) {
        return (
            <EmptyState
                icon={<Inbox size={28} aria-hidden="true" />}
                title="You're all caught up"
                description="Every unread story has been swiped through. Pull fresh stories or adjust your filters."
            />
        );
    }

    const isCurrentSaved = savedIds.has(current.id);

    return (
        <section aria-label="Story deck" className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1 px-4 pt-4">
                {upcoming.map((article, depth) => (
                    <div
                        key={article.id}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-4 top-4"
                        style={{
                            transform: `translateY(${(depth + 1) * 12}px) scale(${1 - (depth + 1) * 0.04})`,
                            opacity: 1 - (depth + 1) * 0.35,
                            zIndex: -depth - 1,
                        }}
                    >
                        <div className="h-full overflow-hidden rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card-dark)]">
                            <div className="p-5">
                                <p className="truncate text-sm font-semibold text-[var(--color-secondary-text)]">
                                    {article.headline}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={current.id}
                        className="relative z-10 h-full"
                        drag={reduceMotion ? false : 'x'}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.7}
                        onDragEnd={(_event, info) => {
                            if (info.offset.x < -SWIPE_THRESHOLD) skip();
                            else if (info.offset.x > SWIPE_THRESHOLD) save();
                        }}
                        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    >
                        <ArticleCard
                            article={current}
                            isTrending={trendingIds.has(current.id)}
                            isSaved={isCurrentSaved}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            <p className="mt-2 text-center text-xs text-[var(--color-secondary-text)]" aria-hidden="true">
                Drag left to skip · right to save · or use the buttons
            </p>

            <div className="flex items-center justify-center gap-4 px-4 pb-2 pt-1">
                <IconButton label="Skip story" onClick={skip} variant="outline" className="h-14 w-14 rounded-full">
                    <X size={22} aria-hidden="true" />
                </IconButton>
                <IconButton
                    label={isCurrentSaved ? 'Unsave story' : 'Save story'}
                    onClick={save}
                    variant="solid"
                    ariaPressed={isCurrentSaved}
                    className="h-16 w-16 rounded-full"
                >
                    {isCurrentSaved ? (
                        <BookmarkCheck size={24} aria-hidden="true" />
                    ) : (
                        <Bookmark size={24} aria-hidden="true" />
                    )}
                </IconButton>
                <IconButton label="Open article" onClick={open} variant="outline" className="h-14 w-14 rounded-full">
                    <BookOpen size={22} aria-hidden="true" />
                </IconButton>
            </div>
        </section>
    );
}
