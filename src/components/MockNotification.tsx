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

        const triggerRandomNotification = () => {
            const importanceValues = { 'normal': 0, 'high': 1, 'breaking': 2 };
            const currentThresholdValue = importanceValues[importanceThreshold];
            const candidates = mockNews.filter(
                article => importanceValues[article.importance] >= currentThresholdValue
            );

            if (candidates.length > 0) {
                const randomArticle = candidates[Math.floor(Math.random() * candidates.length)];
                setActiveNotification(randomArticle);
                setTimeout(() => setActiveNotification(null), 5000);
            }
        };

        const initialTimer = setTimeout(triggerRandomNotification, 5000);
        const intervalMapper = setInterval(() => {
            if (Math.random() > 0.6) triggerRandomNotification();
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
                    initial={{ y: -90, opacity: 0, scale: 0.92 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -90, opacity: 0, scale: 0.92 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute top-3 left-3 right-3 z-[60] pointer-events-none"
                >
                    <div
                        className="w-full rounded-2xl shadow-2xl px-4 py-3 pointer-events-auto flex gap-3 items-start border border-white/10"
                        style={{
                            background: 'rgba(20, 20, 25, 0.92)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                        }}
                    >
                        {/* Icon */}
                        <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md
                            ${activeNotification.importance === 'breaking'
                                ? 'bg-red-500'
                                : activeNotification.importance === 'high'
                                    ? 'bg-orange-400'
                                    : 'bg-[var(--color-accent)]'}`}
                        >
                            <BellRing size={16} className="text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider
                                    ${activeNotification.importance === 'breaking' ? 'text-red-400'
                                        : activeNotification.importance === 'high' ? 'text-orange-300'
                                            : 'text-purple-300'}`}>
                                    {activeNotification.importance === 'breaking' ? '⚡ Breaking' : '📈 Alert'}
                                </span>
                                <span className="text-white/30 text-[9px] font-medium">· now</span>
                            </div>
                            <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2">
                                {activeNotification.headline}
                            </h4>
                            <p className="text-white/50 text-[10px] mt-0.5 font-medium">{activeNotification.source}</p>
                        </div>

                        {/* Dismiss button */}
                        <button
                            onClick={() => setActiveNotification(null)}
                            className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
