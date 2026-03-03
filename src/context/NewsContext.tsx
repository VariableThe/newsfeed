/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { NewsArticle } from '../types';
import { mockNews } from '../data/mockNews';
import { fetchRSSFeeds } from '../services/rssService';

interface NewsContextType {
    deck: NewsArticle[];
    history: NewsArticle[];
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
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
    const [deck, setDeck] = useState<NewsArticle[]>([]);
    const [history, setHistory] = useState<NewsArticle[]>([]);
    const [allFetchedNews, setAllFetchedNews] = useState<NewsArticle[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false); // Disabled by default
    const [importanceThreshold, setImportanceThreshold] = useState<'normal' | 'high' | 'breaking'>('breaking');

    // Fetch feeds on mount
    useEffect(() => {
        let mounted = true;
        const loadNews = async () => {
            setIsLoading(true);
            const rssNews = await fetchRSSFeeds((chunk) => {
                if (!mounted) return;

                const newTags = Array.from(new Set(chunk.flatMap(a => a.tags)));

                setAllTags(prev => Array.from(new Set([...prev, ...newTags])).sort());
                setSelectedTags(prev => Array.from(new Set([...prev, ...newTags])).sort());
                setAllFetchedNews(prev => {
                    // Prevent duplicate IDs if chunks somehow overlap
                    const existingIds = new Set(prev.map(a => a.id));
                    const uniqueChunk = chunk.filter(a => !existingIds.has(a.id));
                    return [...prev, ...uniqueChunk];
                });

                // Immediately stop loading spinner on first chunk
                setIsLoading(false);
            });

            if (!mounted) return;

            // Fallback if absolutely everything failed
            if (rssNews.length === 0) {
                const items = mockNews;
                const newTags = Array.from(new Set(items.flatMap(a => a.tags))).sort();

                setAllFetchedNews(items);
                setAllTags(newTags);
                setSelectedTags(newTags);
            }
            setIsLoading(false);
        };

        loadNews();
        return () => { mounted = false; };
    }, []);

    // Filter deck based on selected tags whenever selected tags change
    useEffect(() => {
        // We only want to show articles that haven't been swiped yet and match the tags
        const unswiped = allFetchedNews.filter(article => !history.some(h => h.id === article.id));

        if (selectedTags.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDeck([]);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDeck(unswiped.filter(article => article.tags.some(tag => selectedTags.includes(tag))));
        }
    }, [selectedTags, history, allFetchedNews]);

    const handleSwipe = (id: string) => {
        const swipedArticle = deck.find(a => a.id === id);
        if (swipedArticle) {
            setHistory(prev => [...prev, swipedArticle]);
            // Remove from deck immediately
            setDeck(prevDeck => prevDeck.filter(a => a.id !== id));
        }
    };

    const swipedLeft = (id: string) => handleSwipe(id); // Dismiss
    const swipedRight = (id: string) => handleSwipe(id); // Save/Like (could have different logic later)

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleNotifications = () => {
        setNotificationsEnabled(prev => !prev);
    }

    return (
        <NewsContext.Provider value={{
            deck,
            history,
            selectedTags,
            swipedLeft,
            swipedRight,
            toggleTag,
            allTags,
            notificationsEnabled,
            toggleNotifications,
            importanceThreshold,
            setImportanceThreshold,
            isLoading
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
