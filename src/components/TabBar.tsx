import type { ReactElement } from 'react';
import { Bookmark, Layers, Newspaper } from 'lucide-react';
import { useHashRoute } from '../hooks/useHashRoute';
import { useNews } from '../state/newsStore';
import type { View } from '../state/newsReducer';

type Tab = 'deck' | 'feed' | 'saved';

const tabs: { id: Tab; label: string; icon: ReactElement }[] = [
    { id: 'deck', label: 'Deck', icon: <Layers size={20} aria-hidden="true" /> },
    { id: 'feed', label: 'Feed', icon: <Newspaper size={20} aria-hidden="true" /> },
    { id: 'saved', label: 'Saved', icon: <Bookmark size={20} aria-hidden="true" /> },
];

function tabView(tab: Tab): View {
    if (tab === 'feed') return { kind: 'feed' };
    if (tab === 'saved') return { kind: 'saved' };
    return { kind: 'deck' };
}

export function TabBar(): ReactElement {
    const { view, navigate } = useHashRoute();
    const { openDeck, openFeed, openSaved } = useNews();
    const active: Tab = view.kind === 'article' ? 'deck' : view.kind;

    const select = (tab: Tab): void => {
        if (tab === 'feed') openFeed();
        else if (tab === 'saved') openSaved();
        else openDeck();
        navigate(tabView(tab));
    };

    return (
        <nav
            aria-label="Primary"
            className="border-t border-[var(--color-card-border)] bg-[var(--color-card-dark)] pb-[env(safe-area-inset-bottom)] md:border-b md:border-t-0 md:pb-0"
        >
            <div className="mx-auto grid max-w-2xl grid-cols-3">
                {tabs.map((tab) => {
                    const selected = active === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            aria-current={selected ? 'page' : undefined}
                            onClick={() => {
                                select(tab.id);
                            }}
                            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--color-accent)] ${
                                selected
                                    ? 'text-[var(--color-accent)]'
                                    : 'text-[var(--color-secondary-text)]'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
