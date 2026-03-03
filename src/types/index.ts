export interface NewsArticle {
    id: string;
    headline: string;
    summary: string;
    fullStory: string;
    tags: string[];
    source: string;
    sourceUrl: string;
    timestamp: string;
    importance: 'normal' | 'high' | 'breaking';
    themeColor?: string;
}
