import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { mockNews } from '../data/mockNews';

export const MockNotification: React.FC = () => {
    const { notificationsEnabled, importanceThreshold } = useNews();
    const [activeNotification, setActiveNotification] = useState<typeof mockNews[0] | null>(null);

    useEffect(() => {
        if (!notificationsEnabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveNotification(null);
            return;
        }

        // Simulate random mock notifications
        const triggerRandomNotification = () => {
            // Filter candidates based on importance threshold
            const importanceValues = { 'normal': 0, 'high': 1, 'breaking': 2 };
            const currentThresholdValue = importanceValues[importanceThreshold];

            const candidates = mockNews.filter(
                article => importanceValues[article.importance] >= currentThresholdValue
            );

            if (candidates.length > 0) {
                const randomArticle = candidates[Math.floor(Math.random() * candidates.length)];
                setActiveNotification(randomArticle);

                // Auto dismiss after 5 seconds
                setTimeout(() => {
                    setActiveNotification(null);
                }, 5000);
            }
        };

        // Trigger first notification after 5 seconds, then randomly every 20-30 seconds
        const initialTimer = setTimeout(triggerRandomNotification, 5000);

        // In a real app we'd clear this properly, but for prototype it's fine
        const intervalMapper = setInterval(() => {
            // Randomly trigger mostly breaking/high news randomly
            if (Math.random() > 0.6) {
                triggerRandomNotification();
            }
        }, 20000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(intervalMapper);
        };
    }, [notificationsEnabled, importanceThreshold]);

    return (
        <AnimatePresence>
            {activeNotification && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0, scale: 0.9 }}
                    className="fixed top-4 left-4 right-4 z-50 px-4 flex justify-center pointer-events-none"
                >
                    <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl p-4 pointer-events-auto flex gap-4 items-start text-[var(--color-primary-text)]">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
              ${activeNotification.importance === 'breaking' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <BellRing size={16} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                                <span className={activeNotification.importance === 'breaking' ? 'text-red-600' : 'text-blue-600'}>
                                    {activeNotification.importance} Alert
                                </span>
                                <span className="text-[var(--color-secondary-text)] font-semibold text-[10px]">Just now</span>
                            </div>
                            <h4 className="font-bold text-sm leading-snug line-clamp-2 mb-1">
                                {activeNotification.headline}
                            </h4>
                            <p className="text-xs text-[var(--color-secondary-text)] line-clamp-1 font-medium">
                                {activeNotification.source}
                            </p>
                        </div>

                        <button
                            onClick={() => setActiveNotification(null)}
                            className="p-1 text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] rounded-full bg-white/50 flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
