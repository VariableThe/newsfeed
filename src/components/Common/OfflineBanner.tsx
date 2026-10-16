import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

export function OfflineBanner(): ReactElement | null {
    const [isOnline, setIsOnline] = useState(
        () => typeof navigator === 'undefined' || navigator.onLine,
    );

    useEffect(() => {
        const update = (): void => {
            setIsOnline(navigator.onLine);
        };
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-dark)] px-4 py-3 text-sm text-[var(--color-primary-text)] shadow-lg"
        >
            You are offline. Shown articles may be stale.
        </div>
    );
}
