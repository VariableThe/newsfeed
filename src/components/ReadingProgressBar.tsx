import React from 'react';
import { useNews } from '../context/NewsContext';

export const ReadingProgressBar: React.FC = () => {
    const { deck, totalArticleCount, history } = useNews();
    const read = history.length;
    const total = totalArticleCount || deck.length + read;
    const progress = total > 0 ? (read / total) * 100 : 0;
    const remaining = deck.length;

    return (
        <div className="w-full px-4 pb-2 flex flex-col gap-1.5">
            {/* Label row */}
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-secondary-text)]">
                    Today's Feed
                </span>
                <span className="text-[10px] font-semibold text-[var(--color-secondary-text)]">
                    {remaining > 0 ? (
                        <><span className="text-[var(--color-accent)]">{remaining}</span> remaining</>
                    ) : (
                        'All caught up ✓'
                    )}
                </span>
            </div>

            {/* Progress track */}
            <div className="relative h-1.5 w-full rounded-full overflow-hidden bg-[var(--color-card-border)]">
                <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out shimmer-bar"
                    style={{ width: `${Math.max(progress, progress > 0 ? 4 : 0)}%` }}
                />
            </div>
        </div>
    );
};
