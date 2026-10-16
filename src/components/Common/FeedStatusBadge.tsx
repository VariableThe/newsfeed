import type { ReactElement } from 'react';
import type { FeedStatus } from '../../types';

interface FeedStatusBadgeProps {
    status: FeedStatus;
    count?: number;
    error?: string;
    via?: string;
}

const mutedText = 'text-[var(--color-secondary-text)]';

function LoadingIndicator(): ReactElement {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            fill="none"
        >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
            <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

export function FeedStatusBadge({ status, count, error, via }: FeedStatusBadgeProps): ReactElement {
    const viaTitle = via ? ` via ${via}` : '';

    if (status === 'partial') {
        return (
            <span className={`inline-flex items-center gap-1.5 text-sm ${mutedText}`}>
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                {count ?? 0} items
            </span>
        );
    }

    if (status === 'error') {
        const truncated = error ? `${error.split(' ').slice(0, 4).join(' ')}...` : 'Feed failed';
        return (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-500" title={error ?? ''}>
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-red-500" />
                {truncated}
            </span>
        );
    }

    if (status === 'success') {
        if (count !== undefined) {
            return (
                <span className={`inline-flex items-center gap-1.5 text-sm ${mutedText}`} title={`${count} items${viaTitle}`}>
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    {count} items{viaTitle}
                </span>
            );
        }
        return <span className={`text-sm ${mutedText}`}>Feed</span>;
    }

    if (status === 'loading') {
        return (
            <span className={`inline-flex items-center gap-1.5 text-sm ${mutedText}`} role="status">
                <LoadingIndicator />
                Loading...
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1.5 text-sm ${mutedText}`}>
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-[var(--color-secondary-text)]" />
            Ready
        </span>
    );
}
