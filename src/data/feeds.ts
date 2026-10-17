import type { FeedSource } from '../types';

export const FEEDS: FeedSource[] = [
    {
        id: 'bbc-world',
        name: 'BBC World',
        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
        homepage: 'https://www.bbc.com/news/world',
        topics: ['World'],
    },
    {
        id: 'bbc-business',
        name: 'BBC Business',
        url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
        homepage: 'https://www.bbc.com/news/business',
        topics: ['Business'],
    },
    {
        id: 'bbc-science',
        name: 'BBC Science & Environment',
        url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
        homepage: 'https://www.bbc.com/news/science_and_environment',
        topics: ['Science'],
    },
    {
        id: 'nyt-world',
        name: 'New York Times World',
        url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        homepage: 'https://www.nytimes.com/section/world',
        topics: ['World'],
    },
    {
        id: 'nyt-technology',
        name: 'New York Times Technology',
        url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
        homepage: 'https://www.nytimes.com/section/technology',
        topics: ['Tech'],
    },
    {
        id: 'nyt-health',
        name: 'New York Times Health',
        url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
        homepage: 'https://www.nytimes.com/section/health',
        topics: ['Health'],
    },
    {
        id: 'nyt-sports',
        name: 'New York Times Sports',
        url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
        homepage: 'https://www.nytimes.com/section/sports',
        topics: ['Sports'],
    },
    {
        id: 'et-markets',
        name: 'Economic Times Markets',
        url: 'https://economictimes.indiatimes.com/markets/rssfeeds/19770215.cms',
        homepage: 'https://economictimes.indiatimes.com/markets',
        topics: ['Markets', 'Business'],
    },
    {
        id: 'et-tech',
        name: 'Economic Times Tech',
        url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms',
        homepage: 'https://economictimes.indiatimes.com/tech',
        topics: ['Tech'],
    },
];

export const FEED_IDS: string[] = FEEDS.map(feed => feed.id);

export const ALL_TOPICS: string[] = Array.from(new Set(FEEDS.flatMap(feed => feed.topics))).sort();
