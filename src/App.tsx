import { useState } from 'react';
import type { ReactElement } from 'react';
import { Inbox, Settings2, TriangleAlert, Zap } from 'lucide-react';
import { NewsProvider, useNews } from './state/newsStore';
import { useHashRoute } from './hooks/useHashRoute';
import { ArticleView } from './components/ArticleView';
import { DeckView } from './components/DeckView';
import { FeedView } from './components/FeedView';
import { SavedView } from './components/SavedView';
import { SettingsDialog } from './components/SettingsDialog';
import { TabBar } from './components/TabBar';
import { EmptyState } from './components/Common/EmptyState';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { OfflineBanner } from './components/Common/OfflineBanner';
import { Spinner } from './components/Common/Spinner';

type BaseView = 'deck' | 'feed' | 'saved';

function Shell(): ReactElement {
    const { view, navigate } = useHashRoute();
    const {
        deck,
        isLoading,
        isEmpty,
        error,
        refresh,
        closeArticle,
        isRefreshing,
    } = useNews();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [base, setBase] = useState<BaseView>('deck');
    if (view.kind !== 'article' && view.kind !== base) {
        setBase(view.kind);
    }

    const closeOverlay = (): void => {
        closeArticle();
        navigate({ kind: 'feed' });
    };

    const renderBase = (): ReactElement => {
        if (isLoading) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8" role="status" aria-label="Loading stories">
                    <Spinner label="Loading stories…" />
                </div>
            );
        }
        if (error !== null) {
            return (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center" role="alert">
                    <TriangleAlert size={28} aria-hidden="true" className="mb-3 text-red-500" />
                    <h2 className="text-lg font-bold text-[var(--color-primary-text)]">
                        Couldn&apos;t load stories
                    </h2>
                    <p className="mt-2 max-w-sm text-sm text-[var(--color-secondary-text)]">{error}</p>
                    <button
                        type="button"
                        onClick={() => {
                            void refresh();
                        }}
                        disabled={isRefreshing}
                        className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--color-accent)] px-5 font-medium text-white disabled:opacity-50"
                    >
                        {isRefreshing ? 'Retrying…' : 'Try again'}
                    </button>
                </div>
            );
        }
        if (isEmpty) {
            return (
                <EmptyState
                    icon={<Inbox size={28} aria-hidden="true" />}
                    title="No stories yet"
                    description="No feed has delivered articles. Check your connection and refresh."
                    action={{ label: 'Refresh', onClick: () => { void refresh() } }}
                />
            );
        }
        if (base === 'feed') return <FeedView />;
        if (base === 'saved') return <SavedView />;
        return <DeckView />;
    };

    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-[var(--color-background-dark)]">
            <header className="order-1 flex flex-none items-center gap-2.5 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
                <div
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, #3B82F6))',
                        boxShadow: '0 4px 14px var(--color-accent-glow)',
                    }}
                >
                    <Zap size={17} fill="white" />
                </div>
                <div>
                    <h1 className="text-lg font-black leading-none tracking-tight text-[var(--color-primary-text)]">
                        newsfeed
                    </h1>
                    <p className="mt-0.5 text-[11px] font-medium leading-none text-[var(--color-secondary-text)]">
                        {isLoading ? 'Loading…' : `${deck.length} stories to swipe`}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Open settings"
                    onClick={() => {
                        setSettingsOpen(true);
                    }}
                    className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[var(--color-card-border)] text-[var(--color-secondary-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                >
                    <Settings2 size={18} aria-hidden="true" />
                </button>
            </header>

            <div className="order-3 md:order-2">
                <TabBar />
            </div>

            <main className="order-2 min-h-0 flex-1 md:order-3">
                {renderBase()}
            </main>

            {view.kind === 'article' ? (
                <ArticleView id={view.id} onClose={closeOverlay} />
            ) : null}
            {settingsOpen ? (
                <SettingsDialog
                    onClose={() => {
                        setSettingsOpen(false);
                    }}
                />
            ) : null}
            <OfflineBanner />
        </div>
    );
}

export default function App(): ReactElement {
    return (
        <NewsProvider>
            <ErrorBoundary>
                <Shell />
            </ErrorBoundary>
        </NewsProvider>
    );
}
