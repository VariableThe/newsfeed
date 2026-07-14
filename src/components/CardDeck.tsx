import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNews } from '../context/NewsContext';
import { NewsCard } from './NewsCard';
import { ExpandedStoryModal } from './ExpandedStoryModal';
import { SwipeHint } from './SwipeHint';
import { ReadingProgressBar } from './ReadingProgressBar';
import type { NewsArticle } from '../types';
import { Sparkles, RefreshCw } from 'lucide-react';

export const CardDeck: React.FC = () => {
    const { deck, swipedLeft, swipedRight, isLoading, resetFeed } = useNews();
    const [expandedArticle, setExpandedArticle] = useState<NewsArticle | null>(null);

    // Take the top 3 cards and reverse so the first renders on top
    const visibleCards = deck.slice(0, 3).reverse();

    return (
        <>
            <div className="relative w-full h-full flex flex-col items-center justify-between py-4 px-4 overflow-hidden">
                {/* Reading Progress */}
                <div className="w-full max-w-sm">
                    <ReadingProgressBar />
                </div>

                {/* Card Area */}
                <div className="flex-1 flex items-center justify-center w-full relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-5">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
                                    <div className="w-8 h-8 border-[3px] border-[var(--color-card-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-[var(--color-primary-text)] text-sm">Fetching latest news</p>
                                <p className="text-[var(--color-secondary-text)] text-xs mt-1">Pulling from live feeds...</p>
                            </div>
                        </div>
                    ) : deck.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center max-w-xs px-4"
                        >
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center"
                            >
                                <Sparkles size={36} className="text-[var(--color-accent)]" />
                            </motion.div>
                            <h3 className="text-xl font-bold mb-2 text-[var(--color-primary-text)]">You're all caught up!</h3>
                            <p className="text-[var(--color-secondary-text)] text-sm leading-relaxed mb-6">
                                You've read everything in your feed. Adjust your topics in Settings or reset to start fresh.
                            </p>
                            <button
                                onClick={resetFeed}
                                className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity"
                            >
                                <RefreshCw size={15} />
                                Refresh Feed
                            </button>
                        </motion.div>
                    ) : (
                        <div className="relative w-full max-w-sm aspect-[3/4]">
                            {/* Swipe hint shown over the deck */}
                            <SwipeHint />

                            <AnimatePresence>
                                {visibleCards.map((article, i) => {
                                    const indexFromTop = visibleCards.length - 1 - i;
                                    const isFront = indexFromTop === 0;

                                    return (
                                        <NewsCard
                                            key={article.id}
                                            article={article}
                                            index={indexFromTop}
                                            isFront={isFront}
                                            onSwipeLeft={swipedLeft}
                                            onSwipeRight={swipedRight}
                                            onSwipeUp={swipedLeft}
                                            onClick={(a) => setExpandedArticle(a)}
                                        />
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Bottom action hint row (only when cards are present) */}
                {!isLoading && deck.length > 0 && (
                    <div className="w-full max-w-sm flex items-center justify-between px-2 py-2">
                        <div className="flex flex-col items-center gap-1 opacity-60">
                            <div className="w-10 h-10 rounded-full border-2 border-red-400/40 bg-red-400/10 flex items-center justify-center">
                                <span className="text-red-400 text-lg">✕</span>
                            </div>
                            <span className="text-[10px] text-[var(--color-secondary-text)] font-medium">Skip</span>
                        </div>

                        <div className="flex flex-col items-center gap-1 opacity-40">
                            <div className="w-8 h-8 rounded-full border border-[var(--color-card-border)] bg-[var(--color-card-border)] flex items-center justify-center">
                                <span className="text-[var(--color-secondary-text)] text-sm">↑</span>
                            </div>
                            <span className="text-[10px] text-[var(--color-secondary-text)] font-medium">More</span>
                        </div>

                        <div className="flex flex-col items-center gap-1 opacity-60">
                            <div className="w-10 h-10 rounded-full border-2 border-green-400/40 bg-green-400/10 flex items-center justify-center">
                                <span className="text-green-400 text-lg">♥</span>
                            </div>
                            <span className="text-[10px] text-[var(--color-secondary-text)] font-medium">Save</span>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {expandedArticle && (
                    <ExpandedStoryModal
                        article={expandedArticle}
                        onClose={() => setExpandedArticle(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
