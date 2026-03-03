import React from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import type { NewsArticle } from '../types';

interface ExpandedStoryModalProps {
    article: NewsArticle;
    onClose: () => void;
}

export const ExpandedStoryModal: React.FC<ExpandedStoryModalProps> = ({ article, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4 sm:p-0"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--color-card-border)]"
                style={{ backgroundColor: article.themeColor || 'var(--color-card-dark)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-card-border)]">
                    <div className="text-sm font-semibold text-[var(--color-secondary-text)]">
                        {article.source}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-[var(--color-card-border)] transition-colors text-[var(--color-primary-text)] bg-transparent"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 overscroll-contain">
                    <h2 className="text-2xl font-bold leading-tight mb-4">
                        {article.headline}
                    </h2>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {article.tags.map(tag => (
                            <span key={tag} className="text-xs font-semibold px-2 py-1 bg-white/50 rounded-full text-[var(--color-primary-text)] border border-white/40">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="prose max-w-none">
                        <p className="text-[var(--color-primary-text)] font-medium leading-relaxed text-lg mb-4">
                            {article.summary}
                        </p>
                        <p className="text-[var(--color-secondary-text)] leading-relaxed">
                            {article.fullStory}
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--color-card-border)] bg-white/30 backdrop-blur-md">
                    <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-3 px-4 bg-[var(--color-accent)] hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <span>Read Full Article</span>
                        <ExternalLink size={18} className="ml-2" />
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
};
