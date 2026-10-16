export interface NewsArticle {
  id: string;              // stable content hash, identical across reloads
  headline: string;
  summary: string;         // plain text, <= 200 chars
  fullStory: string;       // plain text: content:encoded if present, else description, else headline
  hasFullContent: boolean; // true only when fullStory came from content:encoded / full article body
  tags: string[];          // topic labels from the feed catalog, no '#' prefix
  source: string;          // display name from the feed catalog
  sourceId: string;        // catalog feed id
  sourceUrl: string;       // canonical article URL
  timestamp: string;       // ISO 8601
  imageUrl?: string;
  importance: 'normal' | 'trending';
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;         // MUST be https
  homepage?: string;
  topics: string[];    // non-empty
}

export type FeedStatus = 'idle' | 'loading' | 'success' | 'partial' | 'error';

export interface FeedState {
  sourceId: string;
  status: FeedStatus;
  articles: NewsArticle[];
  error?: string;
  fetchedAt?: string;  // ISO
}
