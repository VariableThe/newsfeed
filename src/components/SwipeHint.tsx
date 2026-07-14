import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp, Heart, X, BookOpen } from 'lucide-react';

const STORAGE_KEY = 'newsfeed_swipe_hint_shown';

export const SwipeHint: React.FC = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const alreadyShown = sessionStorage.getItem(STORAGE_KEY);
        if (!alreadyShown) {
            // Show after a short delay so card renders first
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismiss = () => {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => dismiss(), 4500);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-end pointer-events-none pb-12"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                    onClick={dismiss}
                >
                    {/* Hint cards */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="pointer-events-auto mb-4 px-4 w-full max-w-xs"
                    >
                        <div className="bg-black/70 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
                            <p className="text-white text-center text-sm font-semibold mb-4 opacity-70 tracking-wide uppercase">How to use</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center hint-left">
                                        <div className="flex items-center gap-0.5">
                                            <ArrowLeft size={14} className="text-red-400" />
                                            <X size={12} className="text-red-400" />
                                        </div>
                                    </div>
                                    <span className="text-white/70 text-xs font-medium text-center leading-tight">Swipe left<br />to dismiss</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                                        <ArrowUp size={14} className="text-purple-400" style={{ animation: 'swipe-right-hint 1.2s ease-in-out infinite' }} />
                                    </div>
                                    <span className="text-white/70 text-xs font-medium text-center leading-tight">Tap to<br />read more</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center hint-right">
                                        <div className="flex items-center gap-0.5">
                                            <Heart size={12} className="text-green-400" />
                                            <ArrowRight size={14} className="text-green-400" />
                                        </div>
                                    </div>
                                    <span className="text-white/70 text-xs font-medium text-center leading-tight">Swipe right<br />to save</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <BookOpen size={12} className="text-white/40" />
                                <p className="text-white/40 text-xs text-center">Tap anywhere to dismiss</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
