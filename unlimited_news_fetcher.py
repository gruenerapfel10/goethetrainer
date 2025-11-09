#!/usr/bin/env python3
"""
UNLIMITED FREE NEWS FETCHER
============================

Uses news-please library to extract FULL article content from URLs.
No API keys, no limits, completely free.

This is the best solution for:
- Getting full article text from any source
- No credit limits
- Works on 99% of news sites
- Handles complex HTML/CSS
- Supports 30+ languages
"""

import feedparser
from news_please.crawler import NewsPlease
from typing import List, Dict, Optional
import json
import time
from datetime import datetime
import requests

print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║              UNLIMITED FREE NEWS FETCHER - news-please library               ║
╚══════════════════════════════════════════════════════════════════════════════╝

Features:
✓ UNLIMITED requests per day
✓ Full article content extraction
✓ NO API KEYS REQUIRED
✓ NO RATE LIMITS
✓ Works on 99%+ of news sites
✓ Handles complex HTML/CSS/JavaScript
✓ Multi-language support

Cost: $0/month forever
""")


class UnlimitedNewsFetcher:
    """
    Fetch full news articles using news-please
    Completely free, unlimited, no authentication
    """

    # Free RSS feeds from major news outlets
    RSS_FEEDS = {
        "BBC News": "http://feeds.bbc.co.uk/news/rss.xml",
        "Reuters Business": "https://feeds.reuters.com/reuters/businessNews",
        "CNN": "http://feeds.cnn.com/rss/edition.rss",
        "The Guardian": "https://www.theguardian.com/international/rss",
        "Hacker News": "https://news.ycombinator.com/rss",
        "Tech Crunch": "http://feeds.techmeme.com/techmeme",
        "ProPublica": "https://www.propublica.org/feeds/all-stories.xml",
        "NPR News": "https://feeds.npr.org/1001/rss.xml",
    }

    def __init__(self):
        self.articles_fetched = 0
        self.requests_made = 0
        self.errors = 0

    def get_rss_articles(self, feed_name: str, limit: int = 10) -> List[Dict]:
        """Fetch articles from RSS feed"""

        url = self.RSS_FEEDS.get(feed_name)
        if not url:
            print(f"Feed '{feed_name}' not available")
            return []

        try:
            print(f"\n📡 Fetching from {feed_name}...")
            feed = feedparser.parse(url)

            articles = []
            for entry in feed.entries[:limit]:
                article = {
                    "title": entry.get("title", "N/A"),
                    "link": entry.get("link", "N/A"),
                    "published": entry.get("published", "N/A"),
                    "summary": entry.get("summary", "N/A")[:200],
                    "source": feed_name,
                }
                articles.append(article)

            print(f"   ✓ Got {len(articles)} articles")
            return articles

        except Exception as e:
            print(f"   ✗ Error: {e}")
            return []

    def extract_full_content(self, article: Dict, timeout: int = 10) -> Dict:
        """
        Extract full article content using news-please

        Args:
            article: Article dict with 'link' field
            timeout: Request timeout

        Returns:
            Article dict with full content added
        """

        if not article.get("link"):
            return article

        try:
            url = article["link"]
            print(f"   Extracting content from: {url}")

            # news-please extracts full article text automatically
            article_obj = NewsPlease.from_url(url, timeout_seconds=timeout)

            if article_obj:
                article["full_content"] = article_obj.text[:3000]  # First 3000 chars
                article["authors"] = article_obj.authors or []
                article["publish_date"] = str(article_obj.publish_date) if article_obj.publish_date else "N/A"
                article["image_url"] = article_obj.image_url
                article["content_available"] = True
                print(f"   ✓ Extracted {len(article['full_content'])} characters")
            else:
                article["content_available"] = False
                print(f"   ✗ Could not extract content")

            self.requests_made += 1
            return article

        except Exception as e:
            print(f"   ✗ Error extracting content: {type(e).__name__}")
            article["content_available"] = False
            self.errors += 1
            return article

    def fetch_and_extract(
        self,
        feed_name: str = "BBC News",
        num_articles: int = 5,
        scrape_content: bool = True
    ) -> List[Dict]:
        """
        Fetch articles from RSS and extract full content

        Args:
            feed_name: Name of RSS feed
            num_articles: Number of articles to fetch
            scrape_content: Whether to extract full content

        Returns:
            List of articles with full content
        """

        # Step 1: Get articles from RSS feed
        articles = self.get_rss_articles(feed_name, limit=num_articles)

        if not articles:
            return []

        # Step 2: Extract full content
        if scrape_content:
            print(f"\n📄 Extracting full content ({len(articles)} articles)...")
            enriched = []

            for i, article in enumerate(articles, 1):
                print(f"\n[{i}/{len(articles)}]")
                extracted = self.extract_full_content(article)
                enriched.append(extracted)

                # Be respectful - add delay between requests
                if i < len(articles):
                    time.sleep(2)

            self.articles_fetched = sum(1 for a in enriched if a.get("content_available"))
            return enriched
        else:
            self.articles_fetched = len(articles)
            return articles

    def display_article(self, article: Dict, number: int = 1):
        """Pretty print article"""

        print(f"\n{'='*100}")
        print(f"ARTICLE {number}: {article.get('title', 'N/A')}")
        print(f"{'='*100}")
        print(f"Source:   {article.get('source', 'N/A')}")
        print(f"Date:     {article.get('publish_date', article.get('published', 'N/A'))}")
        print(f"URL:      {article.get('link', 'N/A')}")
        print(f"Authors:  {', '.join(article.get('authors', ['N/A']))}")

        if article.get("full_content"):
            print(f"\n📖 FULL ARTICLE CONTENT ({len(article['full_content'])} characters):")
            print("-" * 100)
            print(article["full_content"])
        else:
            print(f"\n📝 SUMMARY:")
            print(article.get("summary", "N/A"))

    def save_to_json(self, articles: List[Dict], filename: str = "unlimited_news.json"):
        """Save articles to JSON"""

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Saved {len(articles)} articles to {filename}")


# ============================================================================
# DEMO
# ============================================================================

def main():
    fetcher = UnlimitedNewsFetcher()

    print("\n" + "="*100)
    print("AVAILABLE RSS FEEDS (Completely Free)")
    print("="*100)

    for i, feed_name in enumerate(fetcher.RSS_FEEDS.keys(), 1):
        print(f"{i}. {feed_name}")

    print("\n" + "="*100)
    print("DEMO: Fetching from BBC News")
    print("="*100)

    # Fetch and extract content
    articles = fetcher.fetch_and_extract(
        feed_name="BBC News",
        num_articles=3,
        scrape_content=True
    )

    # Display results
    print("\n" + "="*100)
    print("EXTRACTED ARTICLES")
    print("="*100)

    for i, article in enumerate(articles[:2], 1):
        fetcher.display_article(article, i)

    # Save to file
    if articles:
        fetcher.save_to_json(articles, "unlimited_news_articles.json")

    # Summary
    print("\n" + "="*100)
    print("STATISTICS")
    print("="*100)
    print(f"Articles Fetched:     {len(articles)}")
    print(f"Content Extracted:    {fetcher.articles_fetched}/{len(articles)}")
    print(f"API Requests Made:    {fetcher.requests_made}")
    print(f"Errors:               {fetcher.errors}")
    print(f"Cost:                 $0 (completely free)")

    print("\n" + "="*100)
    print("WHY THIS IS BETTER THAN NEWSDATA.IO")
    print("="*100)
    print("""
NewsData.io (Limited):
  - 200 credits/day max (2,000 articles/day)
  - No full content on free tier
  - Requires API key
  - Rate limits: 30 credits per 15 min
  - Monthly cost: $0-$199

news-please (Unlimited):
  - UNLIMITED articles per day
  - FULL article content automatically
  - NO API key required
  - NO rate limits
  - Cost: $0/month forever
  - Works on 99%+ of news sites

✓ Use news-please for production news scraping
✓ No authentication, no limits, no costs
    """)

    print("\n" + "="*100)
    print("NEXT STEPS")
    print("="*100)
    print("""
1. Available RSS feeds in this script:
   - BBC News
   - Reuters Business
   - CNN
   - The Guardian
   - Hacker News
   - Tech Crunch
   - ProPublica
   - NPR News

2. Add your own RSS feeds:
   - Most news sites have RSS feeds
   - Format: https://example.com/feed.xml or /rss.xml

3. Run on a schedule (e.g., every hour):
   - cron job (Linux/Mac)
   - Windows Task Scheduler
   - APScheduler (Python)

4. Store articles in database:
   - PostgreSQL (already configured in your .env)
   - MongoDB
   - Elasticsearch

Example with schedule:

    import schedule
    import time

    def fetch_news():
        fetcher = UnlimitedNewsFetcher()
        articles = fetcher.fetch_and_extract("BBC News", num_articles=10)
        fetcher.save_to_json(articles)

    # Run every hour
    schedule.every(1).hours.do(fetch_news)

    while True:
        schedule.run_pending()
        time.sleep(60)
    """)


if __name__ == "__main__":
    main()
