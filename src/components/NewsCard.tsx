import React from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { NewsArticle } from '../types';
import { useEffect } from 'react';
import { Heart, X, BookOpen, Zap, TrendingUp } from 'lucide-react';

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

    // Card opacity on drag
    const opacity = useTransform(() => {
        const absX = Math.abs(x.get());
        const upY = y.get() < 0 ? Math.abs(y.get()) : 0;
        const maxVal = Math.max(absX, upY);
        return 1 - (maxVal / 450);
    });

    const rotate = useTransform(x, [-200, 200], [-12, 12]);

    // Swipe direction tint overlays
    const likeOpacity = useTransform(x, [0, 80], [0, 1]);
    const nopeOpacity = useTransform(x, [-80, 0], [1, 0]);

    const scale = isFront ? 1 : 1 - index * 0.04;
    const yOffset = isFront ? 0 : index * 16;

    const swipeConfidenceThreshold = 90;

    useEffect(() => {
        controls.start({ scale, opacity: 1 });
    }, [scale, controls]);

    const handleDragEnd = async (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offsetX = info.offset.x;
        const velocityX = info.velocity.x;
        const offsetY = info.offset.y;
        const velocityY = info.velocity.y;

        if (offsetX > swipeConfidenceThreshold || velocityX > 500) {
            await controls.start({ x: 600, opacity: 0, rotate: 20, transition: { duration: 0.35 } });
            onSwipeRight(article.id);
        } else if (offsetX < -swipeConfidenceThreshold || velocityX < -500) {
            await controls.start({ x: -600, opacity: 0, rotate: -20, transition: { duration: 0.35 } });
            onSwipeLeft(article.id);
        } else if (offsetY < -swipeConfidenceThreshold || velocityY < -500) {
            await controls.start({ y: -600, opacity: 0, transition: { duration: 0.3 } });
            onSwipeUp(article.id);
        } else {
            controls.start({ x: 0, y: 0, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } });
        }
    };

    const importanceBadgeConfig = {
        breaking: { label: 'Breaking', icon: Zap, cls: 'bg-red-500 text-white shadow-red-500/40', dotCls: 'badge-breaking' },
        high: { label: 'Trending', icon: TrendingUp, cls: 'bg-orange-400 text-white shadow-orange-400/40', dotCls: '' },
        normal: null,
    };

    const badge = importanceBadgeConfig[article.importance];

    // Darken the theme color for gradient
    const bgColor = article.themeColor || '#6366F1';

    return (
        <motion.div
            className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing will-change-transform"
            style={{
                x,
                y,
                opacity,
                rotate,
                scale,
                top: yOffset,
                zIndex: 50 - index,
                boxShadow: isFront
                    ? `0 25px 60px -10px ${bgColor}60, 0 10px 30px -5px rgba(0,0,0,0.3)`
                    : '0 8px 24px rgba(0,0,0,0.2)',
            }}
            drag={isFront}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.75}
            onDragEnd={handleDragEnd}
            animate={controls}
            onClick={() => isFront && onClick(article)}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
        >
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: bgColor }}
            />

            {/* Background image if available */}
            {article.imageUrl && (
                <div
                    className="absolute inset-0 bg-center bg-cover opacity-30"
                    style={{ backgroundImage: `url(${article.imageUrl})` }}
                />
            )}

            {/* Dark gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

            {/* LIKE tint (right swipe) */}
            <motion.div
                className="absolute inset-0 bg-green-400/20 pointer-events-none flex items-center justify-center"
                style={{ opacity: likeOpacity }}
            >
                <motion.div
                    className="absolute top-8 right-8 bg-green-500 text-white rounded-2xl px-4 py-2 font-black text-lg rotate-12 border-4 border-white/30 shadow-xl"
                    style={{ opacity: likeOpacity }}
                >
                    <div className="flex items-center gap-1.5">
                        <Heart size={18} fill="white" />
                        SAVE
                    </div>
                </motion.div>
            </motion.div>

            {/* NOPE tint (left swipe) */}
            <motion.div
                className="absolute inset-0 bg-red-400/20 pointer-events-none"
                style={{ opacity: nopeOpacity }}
            >
                <motion.div
                    className="absolute top-8 left-8 bg-red-500 text-white rounded-2xl px-4 py-2 font-black text-lg -rotate-12 border-4 border-white/30 shadow-xl"
                    style={{ opacity: nopeOpacity }}
                >
                    <div className="flex items-center gap-1.5">
                        <X size={18} />
                        SKIP
                    </div>
                </motion.div>
            </motion.div>

            {/* Card Content */}
            <div className="relative z-10 flex flex-col h-full p-6">
                {/* Top bar: importance badge */}
                <div className="flex items-center justify-between mb-auto">
                    {badge ? (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${badge.cls} ${badge.dotCls}`}>
                            <badge.icon size={11} fill="currentColor" />
                            {badge.label}
                        </div>
                    ) : (
                        <div />
                    )}
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

                {/* Bottom content area */}
                <div className="flex flex-col gap-3 mt-auto">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                        {article.tags.slice(0, 3).map(tag => (
                            <span
                                key={tag}
                                className="text-[10px] font-bold px-2.5 py-1 bg-white/15 backdrop-blur-md rounded-full text-white/90 border border-white/10"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Headline */}
                    <h2 className="text-2xl font-extrabold leading-tight text-white line-clamp-4 tracking-tight">
                        {article.headline}
                    </h2>

                    {/* Summary */}
                    <p className="text-white/80 font-medium line-clamp-2 text-sm leading-relaxed">
                        {article.summary}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/15">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black"
                                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                            >
                                {article.source.charAt(0)}
                            </div>
                            <span className="text-xs text-white/70 font-semibold">{article.source}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/50 text-[10px] font-medium">
                            <BookOpen size={10} />
                            <span>Tap to read</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
