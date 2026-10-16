import { useSyncExternalStore } from 'react';

function subscribe(query: string, onChange: () => void): () => void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => undefined;
    }
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', onChange);
    return () => {
        mediaQueryList.removeEventListener('change', onChange);
    };
}

function getSnapshot(query: string): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => subscribe(query, onChange),
        () => getSnapshot(query),
    );
}
