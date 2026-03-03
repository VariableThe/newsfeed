import { useState } from 'react';
import { Settings2, Zap } from 'lucide-react';
import { NewsProvider } from './context/NewsContext';
import { CardDeck } from './components/CardDeck';
import { SettingsMenu } from './components/SettingsMenu';
import { MockNotification } from './components/MockNotification';

function NewsFeedApp() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="relative w-full h-full max-w-md mx-auto bg-[var(--color-background-dark)] shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex-none h-20 pt-8 pb-4 px-6 flex items-center justify-between border-b border-[var(--color-card-border)] z-10 bg-[var(--color-background-dark)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Zap size={18} fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FinFlash</h1>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 -mr-2 text-[var(--color-secondary-text)] hover:text-white rounded-full bg-transparent transition-colors cursor-pointer"
        >
          <Settings2 size={24} />
        </button>
      </header>

      {/* Main Content (Deck) */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-[var(--color-background-dark)]">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--color-primary-text)_1px,_transparent_1px)] bg-[length:24px_24px] pointer-events-none" />
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
      <div className="min-h-screen bg-black w-full flex justify-center sm:py-8 sm:px-4 text-[var(--color-primary-text)] font-sans">
        <div className="w-full sm:max-w-md sm:h-[800px] sm:rounded-[40px] overflow-hidden relative sm:border-[8px] sm:border-[#1A1A1A] shadow-2xl">
          <NewsFeedApp />
        </div>
      </div>
    </NewsProvider>
  );
}
