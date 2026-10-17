import { useCallback, useEffect, useState } from 'react';
import type { View } from '../state/newsReducer';

const ARTICLE_HASH = /^#\/article\/([A-Za-z0-9-]+)$/;

function parseHash(): View | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (hash === '' || hash === '#' || hash === '#/') return { kind: 'deck' };
    if (hash === '#/feed') return { kind: 'feed' };
    if (hash === '#/saved') return { kind: 'saved' };
    const articleMatch = ARTICLE_HASH.exec(hash);
    if (articleMatch) return { kind: 'article', id: articleMatch[1] };
    return null;
}

function viewToHash(view: View): string {
    switch (view.kind) {
        case 'deck':
            return '#/';
        case 'feed':
            return '#/feed';
        case 'saved':
            return '#/saved';
        case 'article':
            return `#/article/${encodeURIComponent(view.id)}`;
    }
}

export function useHashRoute(): { view: View; navigate: (view: View) => void } {
    const [view, setView] = useState<View>(() => parseHash() ?? { kind: 'deck' });

    useEffect(() => {
        const syncFromHash = (): void => {
            const next = parseHash();
            if (next !== null) setView(next);
        };
        window.addEventListener('hashchange', syncFromHash);
        window.addEventListener('popstate', syncFromHash);
        return () => {
            window.removeEventListener('hashchange', syncFromHash);
            window.removeEventListener('popstate', syncFromHash);
        };
    }, []);

    const navigate = useCallback((next: View): void => {
        const hash = viewToHash(next);
        if (window.location.hash !== hash) {
            window.location.hash = hash;
        }
        setView(next);
    }, []);

    return { view, navigate };
}
