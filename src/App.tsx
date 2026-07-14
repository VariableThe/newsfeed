import { useState } from 'react';
import { Settings2, Zap } from 'lucide-react';
import { NewsProvider } from './context/NewsContext';
import { CardDeck } from './components/CardDeck';
import { SettingsMenu } from './components/SettingsMenu';
import { MockNotification } from './components/MockNotification';
import { useNews } from './context/NewsContext';

function NewsFeedApp() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { deck, isLoading } = useNews();

    return (
        <div className="relative w-full h-full max-w-md mx-auto bg-[var(--color-background-dark)] shadow-2xl overflow-hidden flex flex-col">

            {/* Dot-grid background */}
            <div className="absolute inset-0 dot-grid pointer-events-none" />

            {/* Header */}
            <header className="flex-none relative z-10 px-5 pt-10 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, #3B82F6))',
                            boxShadow: '0 4px 14px var(--color-accent-glow)',
                        }}
                    >
                        <Zap size={17} fill="white" className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-[var(--color-primary-text)] leading-none">
                            newsfeed
                        </h1>
                        <p className="text-[10px] text-[var(--color-secondary-text)] font-medium leading-none mt-0.5">
                            {isLoading ? 'Loading...' : `${deck.length} stories`}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="relative w-9 h-9 rounded-2xl border border-[var(--color-card-border)] flex items-center justify-center text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] hover:border-[var(--color-accent)]/30 transition-all bg-transparent"
                    style={{ backgroundColor: 'var(--color-card-border)' }}
                >
                    <Settings2 size={17} />
                </button>
            </header>

            {/* Divider */}
            <div className="flex-none h-px mx-5 bg-[var(--color-card-border)]" />

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden">
                <CardDeck />
            </main>

            {/* Global Overlays */}
            <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <MockNotification />
        </div>
    );
}

export default function App() {
    return (
        <NewsProvider>
            <div className="min-h-screen bg-black w-full flex justify-center sm:py-8 sm:px-4 text-[var(--color-primary-text)]">
                <div className="w-full sm:max-w-md sm:h-[860px] sm:rounded-[44px] overflow-hidden relative sm:border-[8px] sm:border-[#111] shadow-2xl"
                    style={{ boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)' }}>
                    <NewsFeedApp />
                </div>
            </div>
        </NewsProvider>
    );
}
