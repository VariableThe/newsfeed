import type { ReactElement } from 'react';

interface SpinnerProps {
    label?: string;
    className?: string;
}

export function Spinner({ label = 'Loading', className = '' }: SpinnerProps): ReactElement {
    return (
        <span
            role="status"
            aria-label={label}
            className={`inline-flex items-center gap-2 ${className}`}
        >
            <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
            <span>{label}</span>
        </span>
    );
}
