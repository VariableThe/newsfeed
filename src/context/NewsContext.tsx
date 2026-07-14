/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { NewsArticle } from '../types';
import { mockNews, availableTags } from '../data/mockNews';
import { fetchRSSFeeds } from '../services/rssService';

interface NewsContextType {
    deck: NewsArticle[];
    history: NewsArticle[];
    savedArticles: NewsArticle[];
    selectedTags: string[];
    swipedLeft: (id: string) => void;
    swipedRight: (id: string) => void;
    toggleTag: (tag: string) => void;
    selectAllTags: () => void;
    deselectAllTags: () => void;
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

const STORAGE_KEYS = {
    SELECTED_TAGS: 'newsfeed_selected_tags_v2',
    HAS_CUSTOMIZED_TAGS: 'newsfeed_has_customized_tags_v2',
    DARK_MODE: 'newsfeed_is_dark_mode',
    NOTIFICATIONS: 'newsfeed_notifications_enabled',
    THRESHOLD: 'newsfeed_importance_threshold',
    HISTORY_IDS: 'newsfeed_history_ids',
    SAVED_IDS: 'newsfeed_saved_ids',
};

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
    const [deck, setDeck] = useState<NewsArticle[]>([]);
    const [history, setHistory] = useState<NewsArticle[]>([]);
    const [savedArticles, setSavedArticles] = useState<NewsArticle[]>([]);
    const [allFetchedNews, setAllFetchedNews] = useState<NewsArticle[]>([]);
    const [allTags, setAllTags] = useState<string[]>(availableTags);
    const [isLoading, setIsLoading] = useState(true);
    const [totalArticleCount, setTotalArticleCount] = useState(0);

    // Initialize state from localStorage (or defaults)
    const [selectedTags, setSelectedTags] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_TAGS);
            return stored ? JSON.parse(stored) : availableTags;
        } catch {
            return availableTags;
        }
    });

    const [hasCustomizedTags, setHasCustomizedTags] = useState<boolean>(() => {
        return localStorage.getItem(STORAGE_KEYS.HAS_CUSTOMIZED_TAGS) === 'true';
    });

    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
            return stored !== null ? stored === 'true' : true;
        } catch {
            return true;
        }
    });

    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
            return stored === 'true';
        } catch {
            return false;
        }
    });

    const [importanceThreshold, setImportanceThresholdState] = useState<'normal' | 'high' | 'breaking'>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.THRESHOLD);
            return (stored === 'normal' || stored === 'high' || stored === 'breaking') ? stored : 'breaking';
        } catch {
            return 'breaking';
        }
    });

    // Sync Dark Mode to DOM and localStorage
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        try {
            localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDarkMode));
        } catch (e) {
            console.error('Failed to save dark mode to localStorage', e);
        }
    }, [isDarkMode]);

    // Sync Notifications to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, String(notificationsEnabled));
        } catch (e) {
            console.error('Failed to save notifications setting to localStorage', e);
        }
    }, [notificationsEnabled]);

    const setImportanceThreshold = (level: 'normal' | 'high' | 'breaking') => {
        setImportanceThresholdState(level);
        try {
            localStorage.setItem(STORAGE_KEYS.THRESHOLD, level);
        } catch (e) {
            console.error('Failed to save importance threshold to localStorage', e);
        }
    };

    // Fetch feeds on mount
    useEffect(() => {
        let mounted = true;
        const loadNews = async () => {
            setIsLoading(true);
            const rssNews = await fetchRSSFeeds((chunk) => {
                if (!mounted) return;

                const newTags = Array.from(new Set(chunk.flatMap(a => a.tags)));
                setAllTags(prev => {
                    const merged = Array.from(new Set([...prev, ...newTags])).sort();
                    return merged;
                });

                // If user hasn't customized their tags, automatically select newly discovered tags so ALL tags stay selected!
                if (!hasCustomizedTags) {
                    setSelectedTags(prev => {
                        const merged = Array.from(new Set([...prev, ...newTags])).sort();
                        try {
                            localStorage.setItem(STORAGE_KEYS.SELECTED_TAGS, JSON.stringify(merged));
                        } catch { /* ignore */ }
                        return merged;
                    });
                }

                setAllFetchedNews(prev => {
                    const existingIds = new Set(prev.map(a => a.id));
                    const uniqueChunk = chunk.filter(a => !existingIds.has(a.id));
                    const updated = [...prev, ...uniqueChunk];
                    setTotalArticleCount(updated.length);

                    // Rehydrate history/saved articles from device memory if available
                    try {
                        const storedHistoryIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_IDS) || '[]');
                        const storedSavedIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_IDS) || '[]');
                        if (storedHistoryIds.length > 0) {
                            const historyMatches = updated.filter(a => storedHistoryIds.includes(a.id));
                            setHistory(historyMatches);
                        }
                        if (storedSavedIds.length > 0) {
                            const savedMatches = updated.filter(a => storedSavedIds.includes(a.id));
                            setSavedArticles(savedMatches);
                        }
                    } catch { /* ignore */ }

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

                // Rehydrate history/saved articles from device memory for fallback items
                try {
                    const storedHistoryIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY_IDS) || '[]');
                    const storedSavedIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_IDS) || '[]');
                    if (storedHistoryIds.length > 0) {
                        const historyMatches = items.filter(a => storedHistoryIds.includes(a.id));
                        setHistory(historyMatches);
                    }
                    if (storedSavedIds.length > 0) {
                        const savedMatches = items.filter(a => storedSavedIds.includes(a.id));
                        setSavedArticles(savedMatches);
                    }
                } catch { /* ignore */ }
            }
            setIsLoading(false);
        };

        loadNews();
        return () => { mounted = false; };
    }, [hasCustomizedTags]);

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

    // Sync history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.HISTORY_IDS, JSON.stringify(history.map(a => a.id)));
        } catch { /* ignore */ }
    }, [history]);

    // Sync saved articles to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.SAVED_IDS, JSON.stringify(savedArticles.map(a => a.id)));
        } catch { /* ignore */ }
    }, [savedArticles]);

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

    const updateAndPersistTags = (newTags: string[]) => {
        setSelectedTags(newTags);
        setHasCustomizedTags(true);
        try {
            localStorage.setItem(STORAGE_KEYS.SELECTED_TAGS, JSON.stringify(newTags));
            localStorage.setItem(STORAGE_KEYS.HAS_CUSTOMIZED_TAGS, 'true');
        } catch (e) {
            console.error('Failed to save selected tags to localStorage', e);
        }
    };

    const toggleTag = (tag: string) => {
        const next = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];
        updateAndPersistTags(next);
    };

    const selectAllTags = () => {
        updateAndPersistTags([...allTags]);
    };

    const deselectAllTags = () => {
        updateAndPersistTags([]);
    };

    const toggleNotifications = () => setNotificationsEnabled(prev => !prev);
    const toggleDarkMode = () => setIsDarkMode(prev => !prev);

    const resetFeed = () => {
        setHistory([]);
        setSavedArticles([]);
        try {
            localStorage.removeItem(STORAGE_KEYS.HISTORY_IDS);
            localStorage.removeItem(STORAGE_KEYS.SAVED_IDS);
        } catch { /* ignore */ }
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
            selectAllTags,
            deselectAllTags,
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
