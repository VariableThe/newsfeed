import React from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { NewsArticle } from '../types';
import { useEffect } from 'react';

interface NewsCardProps {
    article: NewsArticle;
    onSwipeLeft: (id: string) => void;
    onSwipeRight: (id: string) => void;
    onSwipeUp: (id: string) => void;
    onClick: (article: NewsArticle) => void;
    isFront: boolean;
    index: number;
}

export const NewsCard: React.FC<NewsCardProps> = ({
    article,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onClick,
    isFront,
    index
}) => {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const opacity = useTransform(() => {
        const absX = Math.abs(x.get());
        const upY = y.get() < 0 ? Math.abs(y.get()) : 0;
        const maxVal = Math.max(absX, upY);
        return 1 - (maxVal / 400); // Fades down to 0.5 at 200px
    });

    const rotate = useTransform(x, [-200, 200], [-10, 10]);
    const scale = isFront ? 1 : 1 - index * 0.05;
    const yOffset = isFront ? 0 : index * 20;

    const swipeConfidenceThreshold = 100;

    useEffect(() => {
        controls.start({ scale, opacity: 1 });
    }, [scale, controls]);

    const handleDragEnd = async (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offsetX = info.offset.x;
        const velocityX = info.velocity.x;
        const offsetY = info.offset.y;
        const velocityY = info.velocity.y;

        if (offsetX > swipeConfidenceThreshold || velocityX > 500) {
            await controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } });
            onSwipeRight(article.id);
        } else if (offsetX < -swipeConfidenceThreshold || velocityX < -500) {
            await controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } });
            onSwipeLeft(article.id);
        } else if (offsetY < -swipeConfidenceThreshold || velocityY < -500) {
            // Swipe up
            await controls.start({ y: -500, opacity: 0, transition: { duration: 0.3 } });
            onSwipeUp(article.id);
        } else {
            controls.start({ x: 0, y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
        }
    };

    return (
        <motion.div
            className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl border border-[var(--color-card-border)] shadow-xl flex flex-col p-6 overflow-hidden cursor-grab active:cursor-grabbing will-change-transform"
            style={{
                x,
                y,
                opacity,
                rotate,
                scale,
                top: yOffset,
                zIndex: 50 - index,
                backgroundColor: article.themeColor || 'var(--color-card-dark)'
            }}
            drag={isFront ? true : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
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

                    {/* Source and Timestamp */}
                    <div className="flex justify-between items-end">
                        <div className="text-xs text-white/70 font-bold uppercase tracking-wider">
                            {article.source}
                        </div>
                        <div className="text-xs text-white/60 font-medium">
                            {new Intl.DateTimeFormat('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }).format(new Date(article.timestamp))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle overlay gradient to frame text at the bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-white/10 to-transparent pointer-events-none" />
        </motion.div>
    );
};
