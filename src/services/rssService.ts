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

const BOLD_COLORS = [
    '#E63946', '#F4A261', '#2A9D8F', '#264653', '#8338EC',
    '#3A86FF', '#FF006E', '#118AB2', '#073B4C', '#D90429'
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
                    themeColor: BOLD_COLORS[Math.floor(Math.random() * BOLD_COLORS.length)]
                });
            });

            // If a callback is provided, emit this chunk instantly
            if (onChunkLoaded && feedArticles.length > 0) {
                // Keep chunk sorted by importance and timestamp
                onChunkLoaded(
                    feedArticles.sort((a, b) => {
                        const weight = { breaking: 3, high: 2, normal: 1 };
                        const weightA = weight[a.importance] || 1;
                        const weightB = weight[b.importance] || 1;
                        if (weightA !== weightB) return weightB - weightA;
                        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                    })
                );
            }

            allArticles.push(...feedArticles);
        } catch (err) {
            console.error(`Failed to fetch feed ${feed.category}:`, err);
        }
    });

    // Wait for all fetches to complete
    await Promise.allSettled(feedPromises);

    // Sort primarily by importance, then by timestamp descending
    return allArticles.sort((a, b) => {
        const weight = { breaking: 3, high: 2, normal: 1 };
        const weightA = weight[a.importance] || 1;
        const weightB = weight[b.importance] || 1;
        if (weightA !== weightB) return weightB - weightA;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}
