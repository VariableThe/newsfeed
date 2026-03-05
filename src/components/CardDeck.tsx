import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNews } from '../context/NewsContext';
import { NewsCard } from './NewsCard';
import { ExpandedStoryModal } from './ExpandedStoryModal';
import type { NewsArticle } from '../types';

export const CardDeck: React.FC = () => {
    const { deck, swipedLeft, swipedRight, isLoading } = useNews();
    const [expandedArticle, setExpandedArticle] = useState<NewsArticle | null>(null);

    // Take the top 3 cards and reverse them so the first one in the array renders on top
    const visibleCards = deck.slice(0, 3).reverse();

    return (
        <>
            <div className="relative w-full h-[calc(100vh-80px)] xl:h-[720px] flex flex-col items-center justify-center p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--color-secondary-text)]">
                        <div className="w-10 h-10 border-4 border-[var(--color-card-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                        <p className="font-medium">Fetching the latest news...</p>
                    </div>
                ) : deck.length === 0 ? (
                    <div className="text-center text-[var(--color-secondary-text)] max-w-xs">
                        <h3 className="text-xl font-medium mb-2 text-[var(--color-primary-text)]">You're all caught up!</h3>
                        <p>Check back later or adjust your tag selections to see more news.</p>
                    </div>
                ) : (
                    <div className="relative w-full max-w-sm aspect-[3/4]">
                        <AnimatePresence>
                            {visibleCards.map((article, i) => {
                                // Calculate the true index from the top of the deck (0 is top)
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
