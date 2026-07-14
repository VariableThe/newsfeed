import React from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, Heart, Share2, Clock } from 'lucide-react';
import type { NewsArticle } from '../types';

interface ExpandedStoryModalProps {
    article: NewsArticle;
    onClose: () => void;
}

export const ExpandedStoryModal: React.FC<ExpandedStoryModalProps> = ({ article, onClose }) => {
    const bgColor = article.themeColor || '#6366F1';

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(new Date(article.timestamp));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '88vh', backgroundColor: 'var(--color-background-dark)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Colored header band */}
                <div
                    className="relative flex-none overflow-hidden"
                    style={{ backgroundColor: bgColor, minHeight: '130px' }}
                >
                    {/* Background image */}
                    {article.imageUrl && (
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-40"
                            style={{ backgroundImage: `url(${article.imageUrl})` }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />

                    {/* Header controls */}
                    <div className="relative z-10 flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                            >
                                {article.source.charAt(0)}
                            </div>
                            <span className="text-white/90 text-sm font-semibold">{article.source}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/50 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Importance badge */}
                    {article.importance !== 'normal' && (
                        <div className="relative z-10 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${article.importance === 'breaking'
                                ? 'bg-red-500 text-white'
                                : 'bg-orange-400 text-white'}`}>
                                {article.importance === 'breaking' ? '⚡ Breaking' : '📈 Trending'}
                            </span>
                        </div>
                    )}

                    {/* Handle bar */}
                    <div className="relative z-10 flex justify-center pt-2 pb-1">
                        <div className="w-10 h-1 rounded-full bg-white/30" />
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="p-5">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {article.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-full border text-[var(--color-accent)] border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Headline */}
                        <h2 className="text-xl font-extrabold leading-tight mb-3 text-[var(--color-primary-text)] tracking-tight">
                            {article.headline}
                        </h2>

                        {/* Date */}
                        <div className="flex items-center gap-1.5 text-[var(--color-secondary-text)] text-xs mb-5">
                            <Clock size={11} />
                            <span>{formattedDate}</span>
                        </div>

                        {/* Summary */}
                        <p className="text-[var(--color-primary-text)] font-semibold leading-relaxed text-sm mb-4 border-l-2 pl-3" style={{ borderColor: bgColor }}>
                            {article.summary}
                        </p>

                        {/* Full story */}
                        <p className="text-[var(--color-secondary-text)] leading-relaxed text-sm">
                            {article.fullStory}
                        </p>
                    </div>
                </div>

                {/* Action bar */}
                <div className="flex-none p-4 border-t border-[var(--color-card-border)] bg-[var(--color-background-dark)]">
                    <div className="flex gap-3">
                        <button className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card-border)] text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] transition-colors flex-shrink-0">
                            <Heart size={20} />
                        </button>
                        <button className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card-border)] text-[var(--color-secondary-text)] hover:text-[var(--color-primary-text)] transition-colors flex-shrink-0">
                            <Share2 size={20} />
                        </button>
                        <a
                            href={article.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-2xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: bgColor }}
                        >
                            <span>Read Full Article</span>
                            <ExternalLink size={15} />
                        </a>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
