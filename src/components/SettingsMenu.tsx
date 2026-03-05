import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Bell, Check } from 'lucide-react';
import { useNews } from '../context/NewsContext';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

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
        toggleDarkMode
    } = useNews();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-[var(--color-background-dark)] border-l border-[var(--color-card-border)] z-50 shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-[var(--color-card-border)] bg-white/30 backdrop-blur-md">
                            <h2 className="text-xl font-bold flex items-center text-[var(--color-primary-text)]">
                                <Settings2 className="mr-3 text-[var(--color-accent)]" />
                                Settings
                            </h2>
                            <button onClick={onClose} className="p-2 text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] rounded-full transition-colors bg-white/50 border border-white/40">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">

                            {/* Content Preferences */}
                            <section>
                                <h3 className="text-sm font-semibold text-[var(--color-secondary-text)] uppercase tracking-wider mb-4">
                                    Content Preferences
                                </h3>
                                <p className="text-sm text-[var(--color-secondary-text)] mb-4 leading-relaxed">
                                    Select the tags you want to see in your feed. Unselected tags will be hidden.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {allTags.map(tag => {
                                        const isSelected = selectedTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors flex items-center ${isSelected
                                                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-md'
                                                    : 'bg-white/50 border-white/40 text-[var(--color-secondary-text)] hover:bg-white/80'
                                                    }`}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Appearance */}
                            <section>
                                <h3 className="text-sm font-semibold text-[var(--color-secondary-text)] uppercase tracking-wider mb-4 flex items-center">
                                    <Settings2 size={16} className="mr-2" />
                                    Appearance
                                </h3>

                                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-white/40 mb-4 shadow-sm dark:bg-white/5 dark:border-white/10">
                                    <div>
                                        <div className="font-semibold text-[var(--color-primary-text)] mb-1">Dark Mode</div>
                                        <div className="text-xs text-[var(--color-secondary-text)]">Toggle dark appearance</div>
                                    </div>
                                    <button
                                        onClick={toggleDarkMode}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`}
                                    >
                                        <motion.div
                                            className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                                            animate={{ left: isDarkMode ? '26px' : '2px' }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            </section>

                            {/* Push Notifications */}
                            <section>
                                <h3 className="text-sm font-semibold text-[var(--color-secondary-text)] uppercase tracking-wider mb-4 flex items-center">
                                    <Bell size={16} className="mr-2" />
                                    Push Notifications
                                </h3>

                                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-white/40 mb-4 shadow-sm">
                                    <div>
                                        <div className="font-semibold text-[var(--color-primary-text)] mb-1">Enable Alerts</div>
                                        <div className="text-xs text-[var(--color-secondary-text)]">Receive mock push notifications</div>
                                    </div>
                                    <button
                                        onClick={toggleNotifications}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`}
                                    >
                                        <motion.div
                                            className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                                            animate={{ left: notificationsEnabled ? '26px' : '2px' }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                {notificationsEnabled && (
                                    <div className="space-y-3 p-4 bg-white/30 rounded-xl border border-white/40 shadow-sm">
                                        <div className="text-sm font-medium mb-2">Importance Threshold</div>

                                        {(['normal', 'high', 'breaking'] as const).map(level => (
                                            <label key={level} className="flex items-center gap-3 cursor-pointer">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center
                          ${importanceThreshold === level
                                                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                                                        : 'border-[var(--color-secondary-text)]'}`}
                                                >
                                                    {importanceThreshold === level && <Check size={12} className="text-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="threshold"
                                                    value={level}
                                                    checked={importanceThreshold === level}
                                                    onChange={() => setImportanceThreshold(level)}
                                                    className="hidden"
                                                />
                                                <span className="capitalize text-sm">{level} News and Above</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </section>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
