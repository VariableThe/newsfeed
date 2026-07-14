/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { NewsArticle } from '../types';
import { mockNews } from '../data/mockNews';
import { fetchRSSFeeds } from '../services/rssService';

interface NewsContextType {
    deck: NewsArticle[];
    history: NewsArticle[];
    savedArticles: NewsArticle[];
    selectedTags: string[];
    swipedLeft: (id: string) => void;
    swipedRight: (id: string) => void;
    toggleTag: (tag: string) => void;
    allTags: string[];
    notificationsEnabled: boolean;
    toggleNotifications: () => void;
    importanceThreshold: 'normal' | 'high' | 'breaking';
    setImportanceThreshold: (level: 'normal' | 'high' | 'breaking') => void;
    isLoading: boolean;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    totalArticleCount: number;
    resetFeed: () => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
    const [deck, setDeck] = useState<NewsArticle[]>([]);
    const [history, setHistory] = useState<NewsArticle[]>([]);
    const [savedArticles, setSavedArticles] = useState<NewsArticle[]>([]);
    const [allFetchedNews, setAllFetchedNews] = useState<NewsArticle[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>(['#Finance', '#World', '#Breaking', '#Tech', '#Science']);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [importanceThreshold, setImportanceThreshold] = useState<'normal' | 'high' | 'breaking'>('breaking');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [totalArticleCount, setTotalArticleCount] = useState(0);

    // Apply dark mode class to html element
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Fetch feeds on mount
    useEffect(() => {
        let mounted = true;
        const loadNews = async () => {
            setIsLoading(true);
            const rssNews = await fetchRSSFeeds((chunk) => {
                if (!mounted) return;

                const newTags = Array.from(new Set(chunk.flatMap(a => a.tags)));
                setAllTags(prev => Array.from(new Set([...prev, ...newTags])).sort());

                setAllFetchedNews(prev => {
                    const existingIds = new Set(prev.map(a => a.id));
                    const uniqueChunk = chunk.filter(a => !existingIds.has(a.id));
                    const updated = [...prev, ...uniqueChunk];
                    setTotalArticleCount(updated.length);
                    return updated;
                });

                setIsLoading(false);
            });

            if (!mounted) return;

            if (rssNews.length === 0) {
                const items = mockNews;
                const newTags = Array.from(new Set(items.flatMap(a => a.tags))).sort();
                setAllFetchedNews(items);
                setAllTags(newTags);
                setTotalArticleCount(items.length);
            }
            setIsLoading(false);
        };

        loadNews();
        return () => { mounted = false; };
    }, []);

    // Filter deck based on selected tags and history
    useEffect(() => {
        const swipedIds = new Set(history.map(h => h.id));
        const unswiped = allFetchedNews.filter(article => !swipedIds.has(article.id));

        if (selectedTags.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDeck([]);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDeck(unswiped.filter(article => article.tags.some(tag => selectedTags.includes(tag))));
        }
    }, [selectedTags, history, allFetchedNews]);

    const handleDismiss = (id: string) => {
        const article = deck.find(a => a.id === id);
        if (article) {
            setHistory(prev => [...prev, article]);
            setDeck(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleSave = (id: string) => {
        const article = deck.find(a => a.id === id);
        if (article) {
            setSavedArticles(prev => {
                if (prev.some(a => a.id === id)) return prev;
                return [...prev, article];
            });
            setHistory(prev => [...prev, article]);
            setDeck(prev => prev.filter(a => a.id !== id));
        }
    };

    const swipedLeft = (id: string) => handleDismiss(id);
    const swipedRight = (id: string) => handleSave(id);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleNotifications = () => setNotificationsEnabled(prev => !prev);
    const toggleDarkMode = () => setIsDarkMode(prev => !prev);

    const resetFeed = () => {
        setHistory([]);
        setSavedArticles([]);
    };

    return (
        <NewsContext.Provider value={{
            deck,
            history,
            savedArticles,
            selectedTags,
            swipedLeft,
            swipedRight,
            toggleTag,
            allTags,
            notificationsEnabled,
            toggleNotifications,
            importanceThreshold,
            setImportanceThreshold,
            isLoading,
            isDarkMode,
            toggleDarkMode,
            totalArticleCount,
            resetFeed,
        }}>
            {children}
        </NewsContext.Provider>
    );
}

export function useNews() {
    const context = useContext(NewsContext);
    if (context === undefined) {
        throw new Error('useNews must be used within a NewsProvider');
    }
    return context;
}
