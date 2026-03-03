import type { NewsArticle } from '../types';



const FEEDS = [
    // Economic Times (Finance)
    { url: "https://economictimes.indiatimes.com/markets/rssfeeds/19770215.cms", category: "Markets" },
    { url: "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms", category: "Tech" },

    // World News
    { url: "http://feeds.bbci.co.uk/news/world/rss.xml", category: "World" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "World" },

    // Science & Health
    { url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "Science" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", category: "Health" },

    // Entertainment & Sports
    { url: "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", category: "Entertainment" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", category: "Sports" }
];

const PASTEL_COLORS = [
    '#FFB3BA', '#FFDFBA', '#FFFFBA', '#Baffc9', '#BAE1FF',
    '#E6B3FF', '#FFE1E8', '#C4FAF8', '#F5E6CC', '#E8DFF5'
];

export async function fetchRSSFeeds(onChunkLoaded?: (articles: NewsArticle[]) => void): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];

    // Map each feed to a fetch promise so they execute in parallel
    const feedPromises = FEEDS.map(async (feed) => {
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            const parser = new DOMParser();
            const xml = parser.parseFromString(data.contents, "text/xml");

            const items = Array.from(xml.querySelectorAll("item"));
            const feedArticles: NewsArticle[] = [];

            items.forEach((item, index) => {
                const title = item.querySelector("title")?.textContent || "";
                const descriptionRaw = item.querySelector("description")?.textContent || "";
                const link = item.querySelector("link")?.textContent || "";
                const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();

                const description = descriptionRaw.replace(/<[^>]*>?/gm, '').trim();

                if (!title || !link) return;

                const isBreaking = Math.random() > 0.95;
                const importanceValue = isBreaking ? 'breaking' : (Math.random() > 0.85 ? 'high' : 'normal');

                const tagsList = [`#${feed.category}`, `#${feed.url.includes('bbc') ? 'BBC' : feed.url.includes('nytimes') ? 'NYT' : 'ET'}`];
                if (feed.category === 'Markets' || feed.category === 'Wealth') tagsList.push('#Finance');
                if (isBreaking) tagsList.push('#Breaking');

                feedArticles.push({
                    id: `${feed.category}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                    headline: title,
                    summary: description.slice(0, 160) + (description.length > 160 ? "..." : ""),
                    fullStory: description.length > 0 ? description : title,
                    source: feed.url.includes('economictimes') ? "The Economic Times"
                        : feed.url.includes('bbc') ? "BBC News"
                            : feed.url.includes('nytimes') ? "New York Times"
                                : feed.url.includes('aljazeera') ? "Al Jazeera" : "World News",
                    sourceUrl: link,
                    timestamp: new Date(pubDate).toISOString(),
                    tags: tagsList,
                    importance: importanceValue,
                    themeColor: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
                });
            });

            // If a callback is provided, emit this chunk instantly
            if (onChunkLoaded && feedArticles.length > 0) {
                // Shuffle the individual chunk slightly
                onChunkLoaded(feedArticles.sort(() => Math.random() - 0.5));
            }

            allArticles.push(...feedArticles);
        } catch (err) {
            console.error(`Failed to fetch feed ${feed.category}:`, err);
        }
    });

    // Wait for all fetches to complete
    await Promise.allSettled(feedPromises);

    return allArticles.sort(() => Math.random() - 0.5);
}
