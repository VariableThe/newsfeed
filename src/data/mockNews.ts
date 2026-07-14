import type { NewsArticle } from '../types';

export const mockNews: NewsArticle[] = [
    {
        id: "1",
        headline: "RBI Keeps Repo Rate Unchanged at 6.5% for Seventh Straight Meeting",
        summary: "The Monetary Policy Committee voted unanimously to hold rates steady, citing sticky core inflation and resilient domestic demand.",
        fullStory: "The Reserve Bank of India (RBI) Governor-headed Monetary Policy Committee (MPC) on Friday decided to keep the benchmark repo rate unchanged at 6.5 per cent for the seventh consecutive time. The central bank remains focused on withdrawal of accommodation to ensure that inflation progressively aligns with the target while supporting growth. The governor noted that global headwinds, including elevated commodity prices and geopolitical tensions, continue to pose upside risks to inflation. Domestic growth, however, remains robust, with GDP expansion supported by strong investment activity and improving rural demand.",
        tags: ["#RBI", "#Markets", "#Finance", "#Breaking"],
        source: "The Economic Times",
        sourceUrl: "https://economictimes.indiatimes.com",
        timestamp: new Date().toISOString(),
        importance: "breaking",
        themeColor: "#FF6B6B",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80"
    },
    {
        id: "2",
        headline: "Polycab India Shares Surge 5% on Blowout Q3 Earnings Beat",
        summary: "Strong cable and wire volumes drove a 15% revenue beat against street expectations. Management guided for further margin expansion.",
        fullStory: "Shares of Polycab India surged over 5% in early trade following a robust Q3 earnings report. The company reported a 15% year-on-year growth in revenue, driven primarily by strong volume growth in its core cables and wires segment. Margins also expanded by 120 basis points due to favorable raw material pricing. The management provided an optimistic outlook for Q4, citing a strong order book and sustained government infrastructure spending. Several brokerage houses upgraded their target prices, with the consensus now pointing to a 25% upside from current levels.",
        tags: ["#Markets", "#Earnings", "#Finance"],
        source: "Mint",
        sourceUrl: "https://livemint.com",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        importance: "normal",
        themeColor: "#4ECDC4",
        imageUrl: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&q=80"
    },
    {
        id: "3",
        headline: "Fintech Startup 'CashFlow' Raises $50M Series B to Conquer Southeast Asia",
        summary: "The B2B payments platform plans to expand aggressively into Singapore and Indonesia with its AI-powered reconciliation engine.",
        fullStory: "CashFlow, a leading B2B payments and reconciliation platform, announced it has raised $50 million in a Series B funding round led by Sequoia Capital India. The new funds will be deployed towards product enhancement and aggressive expansion into the Southeast Asian markets, specifically Singapore and Indonesia. The startup's AI-driven reconciliation engine has reduced manual accounting work by up to 80% for its enterprise clients. CashFlow plans to triple its engineering headcount over the next 18 months. 'This funding allows us to accelerate our mission of making cross-border B2B payments as seamless as sending a text message,' said the CEO.",
        tags: ["#FinTech", "#Startup", "#Funding", "#Tech"],
        source: "TechCrunch",
        sourceUrl: "https://techcrunch.com",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        importance: "high",
        themeColor: "#A8E6CF",
        imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80"
    },
    {
        id: "4",
        headline: "Upcoming Tech IPOs: Five Unicorns to Watch in Q2 2025",
        summary: "Market sentiment improves as several unicorns dust off their IPO plans amid improving macro conditions and renewed investor appetite.",
        fullStory: "With the broader market showing signs of stabilization, several prominent technology unicorns are preparing for public market debuts. Analysts point to improving macroeconomic indicators, cooling inflation, and a growing appetite for tech stocks as key drivers. The anticipated IPOs span fintech, SaaS, and consumer tech. Bankers report a surge in pre-IPO roadshows and investor meetings. 'This is the most activity we've seen in the IPO pipeline since 2021,' said one senior banker at a leading investment firm. Retail investor enthusiasm is also high, with several IPO subscription apps reporting record sign-ups.",
        tags: ["#IPO", "#Tech", "#Markets"],
        source: "CNBC",
        sourceUrl: "https://cnbc.com",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        importance: "normal",
        themeColor: "#B5A6FF",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80"
    },
    {
        id: "5",
        headline: "Global Markets Rally on Renewed Fed Rate Cut Hopes",
        summary: "US futures edge higher as investors digest softer jobs data and dovish Federal Reserve commentary, fueling hopes of imminent cuts.",
        fullStory: "Global equity markets experienced a broad-based rally on Thursday, fueled by growing investor optimism that major central banks may begin cutting interest rates sooner than previously anticipated. The positive sentiment was bolstered by softer-than-expected employment data from the US, which eased concerns about sustained inflationary pressures. The S&P 500 gained 1.2%, while European indices rose over 1.5%. Asian markets opened higher on Friday, with India's Nifty 50 touching a fresh all-time high. Gold also rallied 0.8% as the dollar weakened on the rate-cut expectations.",
        tags: ["#Markets", "#World", "#Finance"],
        source: "Bloomberg",
        sourceUrl: "https://bloomberg.com",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        importance: "normal",
        themeColor: "#FFD166",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80"
    },
    {
        id: "6",
        headline: "NASA's Artemis Mission Captures Breathtaking New Lunar Surface Images",
        summary: "The latest batch of high-resolution photos from the Artemis program reveals previously unseen geological formations near the lunar south pole.",
        fullStory: "NASA's Artemis program has released a stunning collection of high-resolution images from its latest lunar reconnaissance mission, revealing previously unknown geological formations near the Moon's south pole. Scientists are particularly excited about a series of ancient lava tubes that could provide natural shelter for future lunar habitats. 'These formations could be game-changers for our long-term lunar colonization plans,' said Dr. Elena Rodriguez, a planetary geologist at NASA's Jet Propulsion Laboratory. The images were captured by the Lunar Reconnaissance Orbiter using its new ultra-high-resolution camera system installed during last year's upgrade mission.",
        tags: ["#Science", "#Space", "#World"],
        source: "BBC Science",
        sourceUrl: "https://bbc.co.uk/science",
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        importance: "high",
        themeColor: "#1A1A2E",
        imageUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80"
    },
    {
        id: "7",
        headline: "OpenAI Unveils GPT-5: 'Most Capable AI Model We've Ever Built'",
        summary: "The next-generation model shows dramatic improvements in reasoning, coding, and multimodal understanding, with a live demo leaving experts stunned.",
        fullStory: "OpenAI has officially unveiled GPT-5, its most powerful AI model to date, claiming dramatic improvements across all benchmarks including reasoning, coding, mathematical problem-solving, and multimodal understanding. In a live demonstration, the model solved complex graduate-level physics problems, wrote and debugged a full-stack web application in under 2 minutes, and composed original music from a text description. CEO Sam Altman called it 'a genuine step change in AI capability.' The model will be rolled out to ChatGPT Plus subscribers first, followed by API access. Google, Meta, and Anthropic are all expected to respond with their own major model announcements within the month.",
        tags: ["#Tech", "#AI", "#World"],
        source: "The Verge",
        sourceUrl: "https://theverge.com",
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        importance: "breaking",
        themeColor: "#10B981",
        imageUrl: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80"
    },
    {
        id: "8",
        headline: "India's Startup Ecosystem Mints Three New Unicorns in a Single Week",
        summary: "The milestone underscores India's growing prominence as the third-largest startup ecosystem globally, with investor confidence at a two-year high.",
        fullStory: "India's thriving startup ecosystem created three new unicorns — companies valued at over $1 billion — in a single week, highlighting the country's growing stature as a global innovation hub. The three companies span health-tech, agri-tech, and enterprise SaaS. The burst of valuations comes as global venture capital sentiment has improved significantly following a prolonged funding winter. 'India is now undeniably the third-largest startup ecosystem in the world, and we're just getting started,' said a partner at a leading VC firm. The country is on track to have over 200 unicorns by end of 2025.",
        tags: ["#Startup", "#India", "#Funding", "#Finance"],
        source: "Economic Times",
        sourceUrl: "https://economictimes.indiatimes.com",
        timestamp: new Date(Date.now() - 54000000).toISOString(),
        importance: "high",
        themeColor: "#FF9F43",
        imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80"
    },
    {
        id: "9",
        headline: "Climate Summit Reaches Historic Agreement on Carbon Reduction Targets",
        summary: "140 nations signed a landmark accord pledging aggressive emissions cuts by 2035, marking the most ambitious global climate deal in history.",
        fullStory: "In a historic breakthrough at the Global Climate Summit, 140 nations agreed to an ambitious new framework for carbon emissions reductions by 2035. The agreement, hailed as the most significant climate deal since the Paris Accord, commits signatories to reducing emissions by 50% from 2020 levels and sets legally binding deadlines for coal phase-out. Developing nations secured a $500 billion climate finance package from wealthy nations. Climate activists cautiously welcomed the deal, though many urged faster timelines. 'This is a turning point, but the real test will be implementation,' said the UN Secretary-General. Markets responded positively, with clean energy stocks rallying significantly.",
        tags: ["#World", "#Climate", "#Science"],
        source: "New York Times",
        sourceUrl: "https://nytimes.com",
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        importance: "breaking",
        themeColor: "#06B6D4",
        imageUrl: "https://images.unsplash.com/photo-1581093458791-9d42a2e0b9f0?w=400&q=80"
    },
    {
        id: "10",
        headline: "Apple Vision Pro 2 Leaks Reveal Dramatically Thinner Design and All-Day Battery",
        summary: "A major supply chain leak suggests Apple's next spatial computing headset will be 40% lighter with a new micro-OLED display technology.",
        fullStory: "Leaked supply chain documents suggest Apple's second-generation Vision Pro headset will feature a dramatically thinner and lighter form factor — reportedly 40% lighter than the current model — achieved through new custom silicon and a revolutionary micro-OLED display panel sourced from a Sony-Apple joint venture. Battery life is said to have improved from 2 hours to approximately 8 hours of mixed-use operation. The new device is also rumored to feature an improved EyeSight external display, a wider field of view, and a significantly lower price point starting at $2,499 — down from the original $3,499 launch price. An announcement is expected at WWDC.",
        tags: ["#Tech", "#Apple", "#World"],
        source: "MacRumors",
        sourceUrl: "https://macrumors.com",
        timestamp: new Date(Date.now() - 32400000).toISOString(),
        importance: "high",
        themeColor: "#6366F1",
        imageUrl: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80"
    },
];

export const availableTags = Array.from(
    new Set(mockNews.flatMap(article => article.tags))
).sort();
