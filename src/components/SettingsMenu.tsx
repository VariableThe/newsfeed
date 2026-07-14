import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Bell, Check, Tag, Sun, Moon, BookMarked, RefreshCw, Heart } from 'lucide-react';
import { useNews } from '../context/NewsContext';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const TAG_EMOJI: Record<string, string> = {
    '#Finance': '💰',
    '#Markets': '📈',
    '#Tech': '💻',
    '#World': '🌍',
    '#Science': '🔬',
    '#Breaking': '⚡',
    '#Startup': '🚀',
    '#Funding': '💵',
    '#AI': '🤖',
    '#Health': '❤️',
    '#Sports': '⚽',
    '#Entertainment': '🎬',
    '#Climate': '🌿',
    '#India': '🇮🇳',
    '#Space': '🪐',
    '#FinTech': '🏦',
    '#Apple': '🍎',
    '#Earnings': '📊',
    '#Economy': '🏛️',
    '#IPO': '🎯',
};

const getTagEmoji = (tag: string) => TAG_EMOJI[tag] ?? '📰';

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
    const {
        allTags,
        selectedTags,
        toggleTag,
        notificationsEnabled,
        toggleNotifications,
        importanceThreshold,
        setImportanceThreshold,
        isDarkMode,
        toggleDarkMode,
        history,
        savedArticles,
        resetFeed,
    } = useNews();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        className="fixed top-0 right-0 bottom-0 w-[88vw] max-w-sm z-50 flex flex-col"
                        style={{ backgroundColor: 'var(--color-background-dark)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-[var(--color-card-border)]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
                                    <Settings2 size={16} className="text-[var(--color-accent)]" />
                                </div>
                                <h2 className="text-lg font-bold text-[var(--color-primary-text)]">Settings</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full border border-[var(--color-card-border)] flex items-center justify-center text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] transition-colors bg-transparent"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">

                            {/* Stats strip */}
                            <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-[var(--color-card-border)]">
                                <div className="p-3 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card-border)]/50 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                                        <BookMarked size={14} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-[var(--color-primary-text)] leading-none">{history.length}</div>
                                        <div className="text-[10px] text-[var(--color-secondary-text)] font-medium mt-0.5">Articles Read</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card-border)]/50 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                                        <Heart size={14} className="text-green-400" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-[var(--color-primary-text)] leading-none">{savedArticles.length}</div>
                                        <div className="text-[10px] text-[var(--color-secondary-text)] font-medium mt-0.5">Saved</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col gap-6">

                                {/* Topic Preferences */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag size={14} className="text-[var(--color-accent)]" />
                                        <h3 className="text-xs font-bold text-[var(--color-secondary-text)] uppercase tracking-widest">Topics</h3>
                                    </div>
                                    <p className="text-xs text-[var(--color-secondary-text)] mb-3 leading-relaxed">
                                        Choose which topics appear in your feed.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {allTags.map(tag => {
                                            const isSelected = selectedTags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleTag(tag)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isSelected
                                                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-md'
                                                        : 'border-[var(--color-card-border)] text-[var(--color-secondary-text)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-primary-text)]'
                                                        }`}
                                                    style={{ backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-card-border)' }}
                                                >
                                                    <span>{getTagEmoji(tag)}</span>
                                                    <span>{tag.replace('#', '')}</span>
                                                    {isSelected && <Check size={10} className="ml-0.5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Appearance */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        {isDarkMode ? <Moon size={14} className="text-[var(--color-accent)]" /> : <Sun size={14} className="text-[var(--color-accent)]" />}
                                        <h3 className="text-xs font-bold text-[var(--color-secondary-text)] uppercase tracking-widest">Appearance</h3>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--color-card-border)]" style={{ backgroundColor: 'var(--color-card-border)' }}>
                                        <div>
                                            <div className="font-semibold text-[var(--color-primary-text)] text-sm">Dark Mode</div>
                                            <div className="text-xs text-[var(--color-secondary-text)] mt-0.5">
                                                {isDarkMode ? 'Currently dark' : 'Currently light'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleDarkMode}
                                            className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${isDarkMode ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`}
                                        >
                                            <motion.div
                                                className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                                                animate={{ left: isDarkMode ? '26px' : '2px' }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </section>

                                {/* Notifications */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Bell size={14} className="text-[var(--color-accent)]" />
                                        <h3 className="text-xs font-bold text-[var(--color-secondary-text)] uppercase tracking-widest">Notifications</h3>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--color-card-border)] mb-3" style={{ backgroundColor: 'var(--color-card-border)' }}>
                                        <div>
                                            <div className="font-semibold text-[var(--color-primary-text)] text-sm">Push Alerts</div>
                                            <div className="text-xs text-[var(--color-secondary-text)] mt-0.5">Simulated breaking news alerts</div>
                                        </div>
                                        <button
                                            onClick={toggleNotifications}
                                            className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${notificationsEnabled ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`}
                                        >
                                            <motion.div
                                                className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                                                animate={{ left: notificationsEnabled ? '26px' : '2px' }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {notificationsEnabled && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 rounded-2xl border border-[var(--color-card-border)] space-y-3" style={{ backgroundColor: 'var(--color-card-border)' }}>
                                                    <div className="text-xs font-semibold text-[var(--color-secondary-text)] uppercase tracking-wider">Alert Threshold</div>
                                                    {(['normal', 'high', 'breaking'] as const).map(level => {
                                                        const config = {
                                                            normal: { label: 'All news', emoji: '📰', desc: 'Including routine updates' },
                                                            high: { label: 'High & Breaking', emoji: '📈', desc: 'Trending and breaking only' },
                                                            breaking: { label: 'Breaking only', emoji: '⚡', desc: 'Only urgent alerts' },
                                                        };
                                                        const isActive = importanceThreshold === level;
                                                        return (
                                                            <button
                                                                key={level}
                                                                onClick={() => setImportanceThreshold(level)}
                                                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${isActive
                                                                    ? 'bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30'
                                                                    : 'hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <span className="text-base">{config[level].emoji}</span>
                                                                <div className="flex-1">
                                                                    <div className={`text-xs font-semibold ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary-text)]'}`}>
                                                                        {config[level].label}
                                                                    </div>
                                                                    <div className="text-[10px] text-[var(--color-secondary-text)]">{config[level].desc}</div>
                                                                </div>
                                                                {isActive && (
                                                                    <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                                                                        <Check size={9} className="text-white" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>

                                {/* Feed Management */}
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <RefreshCw size={14} className="text-[var(--color-accent)]" />
                                        <h3 className="text-xs font-bold text-[var(--color-secondary-text)] uppercase tracking-widest">Feed</h3>
                                    </div>
                                    <button
                                        onClick={() => { resetFeed(); onClose(); }}
                                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-semibold"
                                    >
                                        <RefreshCw size={15} />
                                        Reset Feed
                                        <span className="ml-auto text-xs text-red-400/60 font-normal">Clears read history</span>
                                    </button>
                                </section>

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
