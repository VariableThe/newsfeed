import React from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { NewsArticle } from '../types';
import { useEffect } from 'react';

interface NewsCardProps {
    article: NewsArticle;
    onSwipeLeft: (id: string) => void;
    onSwipeRight: (id: string) => void;
    onClick: (article: NewsArticle) => void;
    isFront: boolean;
    index: number;
}

export const NewsCard: React.FC<NewsCardProps> = ({
    article,
    onSwipeLeft,
    onSwipeRight,
    onClick,
    isFront,
    index
}) => {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
    const rotate = useTransform(x, [-200, 200], [-10, 10]);
    const scale = isFront ? 1 : 1 - index * 0.05;
    const yOffset = isFront ? 0 : index * 20;

    const swipeConfidenceThreshold = 100;

    useEffect(() => {
        controls.start({ scale, opacity: 1 });
    }, [scale, controls]);

    const handleDragEnd = async (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset > swipeConfidenceThreshold || velocity > 500) {
            await controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } });
            onSwipeRight(article.id);
        } else if (offset < -swipeConfidenceThreshold || velocity < -500) {
            await controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } });
            onSwipeLeft(article.id);
        } else {
            controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
        }
    };

    return (
        <motion.div
            className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl border border-[var(--color-card-border)] shadow-xl flex flex-col p-6 overflow-hidden cursor-grab active:cursor-grabbing will-change-transform"
            style={{
                x,
                opacity,
                rotate,
                scale,
                y: yOffset,
                zIndex: 50 - index,
                backgroundColor: article.themeColor || 'var(--color-card-dark)'
            }}
            drag={isFront ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={handleDragEnd}
            animate={controls}
            onClick={() => isFront && onClick(article)}
            initial={{ scale: 0.95, opacity: 0 }}
            exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.2 } }}
        >
            {/* Importance Badge */}
            {article.importance !== 'normal' && (
                <div className={`absolute top-6 left-6 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
          ${article.importance === 'breaking' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-orange-500/20 text-orange-500 border border-orange-500/50'}`}>
                    {article.importance}
                </div>
            )}

            {/* Content Area */}
            <div className="z-10 flex flex-col h-full pt-10">
                <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-3xl font-extrabold leading-tight line-clamp-4 mb-4 text-white">
                        {article.headline}
                    </h2>
                    <p className="text-white/90 font-medium line-clamp-3 text-base">
                        {article.summary}
                    </p>
                </div>

                <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-white/20">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                            <span key={tag} className="text-xs font-bold px-3 py-1 bg-black/20 backdrop-blur-sm rounded-full text-white shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Source & Timestamp */}
                    <div className="flex justify-between items-center text-xs text-white/70 font-bold uppercase tracking-wider w-full">
                        <span>{article.source}</span>
                        <span className="text-right text-white/50">{new Date(article.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                </div>
            </div>

            {/* Subtle overlay gradient to frame text at the bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-white/10 to-transparent pointer-events-none" />
        </motion.div>
    );
};
