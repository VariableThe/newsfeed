import type { NewsArticle } from '../types';

export const mockNews: NewsArticle[] = [
    {
        id: "1",
        headline: "RBI Keeps Repo Rate Unchanged at 6.5%",
        summary: "The Monetary Policy Committee voted to hold rates steady, citing sticky inflation concerns.",
        fullStory: "The Reserve Bank of India (RBI) Governor-headed Monetary Policy Committee (MPC) on Friday decided to keep the benchmark repo rate unchanged at 6.5 per cent for the seventh consecutive time. The central bank remains focused on withdrawal of accommodation to ensure that inflation progressively aligns with the target while supporting growth.",
        tags: ["#RBI", "#Markets", "#Economy"],
        source: "The Economic Times",
        sourceUrl: "https://economictimes.indiatimes.com",
        timestamp: new Date().toISOString(),
        importance: "breaking",
        themeColor: "#FFA69E"
    },
    {
        id: "2",
        headline: "Polycab India Shares Surge 5% on Q3 Earnings Beat",
        summary: "Strong cable and wire volumes drove a 15% revenue beat against street expectations.",
        fullStory: "Shares of Polycab India surged over 5% in early trade following a robust Q3 earnings report. The company reported a 15% year-on-year growth in revenue, driven primarily by strong volume growth in its core cables and wires segment. Margins also expanded by 120 basis points due to favorable raw material pricing.",
        tags: ["#Polycab", "#Markets", "#Earnings"],
        source: "Mint",
        sourceUrl: "https://livemint.com",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        importance: "normal",
        themeColor: "#8DC6FF"
    },
    {
        id: "3",
        headline: "Fintech Startup 'CashFlow' Raises $50M Series B",
        summary: "The B2B payments platform plans to use the fresh capital to expand into Southeast Asia.",
        fullStory: "CashFlow, a leading B2B payments and reconciliation platform, announced it has raised $50 million in a Series B funding round led by Sequoia Capital India. The new funds will be deployed towards product enhancement and aggressive expansion into the Southeast Asian markets, specifically Singapore and Indonesia.",
        tags: ["#FinTech", "#Startup", "#Funding"],
        source: "TechCrunch",
        sourceUrl: "https://techcrunch.com",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        importance: "high",
        themeColor: "#8DF0C5"
    },
    {
        id: "4",
        headline: "Upcoming Tech IPOs to Watch in Q2",
        summary: "Market sentiment improves as several unicorns prepare for public market debuts.",
        fullStory: "With the broader market showing signs of stabilization, several prominent technology unicorns are dusting off their IPO plans for the upcoming quarter. Analysts point to improving macroeconomic indicators and a growing appetite for tech stocks as key drivers for this renewed confidence in public listings.",
        tags: ["#IPO", "#Tech", "#Markets"],
        source: "CNBC",
        sourceUrl: "https://cnbc.com",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        importance: "normal",
        themeColor: "#B5A6FF"
    },
    {
        id: "5",
        headline: "Global Markets Rally Amid Rate Cut Hopes",
        summary: "US futures edge higher as investors digest recent jobs data and Federal Reserve commentary.",
        fullStory: "Global equity markets experienced a broad-based rally on Thursday, fueled by growing investor optimism that major central banks may begin cutting interest rates sooner than previously anticipated. The positive sentiment was bolstered by softer-than-expected employment data from the US, which eased concerns about sustained inflationary pressures.",
        tags: ["#Markets", "#Global", "#Economy"],
        source: "Bloomberg",
        sourceUrl: "https://bloomberg.com",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        importance: "normal",
        themeColor: "#FFD166"
    }
];

export const availableTags = Array.from(
    new Set(mockNews.flatMap(article => article.tags))
).sort();
