#!/usr/bin/env python3
"""
FREE NEWS SOURCES - TRULY UNLIMITED, NO PAYWALLS
=================================================

No APIs, no limits, no credit systems. Just open data.

Options:
1. GDELT + Web Scraping (Unlimited, Real-time)
2. Common Crawl News Crawl (Massive historical dataset)
3. RSS Feeds from News Sites (Direct from sources)
4. news-please (Python library for news extraction)
"""

import feedparser
import requests
from typing import List, Dict, Optional
import time
from urllib.parse import urlparse

print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    FREE NEWS SOURCES - TRULY UNLIMITED                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

Option 1: GDELT Project (100% Free, Real-time)
──────────────────────────────────────────────
- NO API KEY REQUIRED
- NO LIMITS on requests
- Real-time: Updates every 60 seconds
- Coverage: 100+ languages, worldwide
- Provides: URLs + metadata
- Full content: Via web scraping from URLs

✓ Use case: News discovery + real-time monitoring
✗ Trade-off: Need to scrape full content yourself

GDELT RSS Feeds:
- https://feeds.gdeltproject.org/gcnews/gcnews.rss (All news)
- Coverage: 100K+ articles per day


Option 2: Common Crawl News Dataset (100% Free, Historical)
────────────────────────────────────────────────────────────
- NO API KEY REQUIRED
- NO LIMITS
- Monthly snapshots of news from 50+ countries
- Format: WARC files (archive format)
- Includes FULL ARTICLE TEXT in archives

✓ Use case: Bulk news analysis, historical trends
✗ Trade-off: Not real-time, requires WARC parsing

Data available on AWS S3:
- s3://commoncrawl/news-crawl/
- Free to download via AWS CLI


Option 3: Direct RSS Feeds (100% Free, Real-time)
──────────────────────────────────────────────────
- NO API REQUIRED
- Direct from news publishers
- Real-time feeds
- Often include full article summaries

Popular free news RSS feeds:
- BBC News: http://feeds.bbc.co.uk/news/rss.xml
- Reuters: https://feeds.reuters.com/reuters/businessNews
- CNN: http://feeds.cnn.com/rss/edition.rss
- HN: https://news.ycombinator.com/rss
- Google News: https://news.google.com/rss


Option 4: news-please (Python library)
──────────────────────────────────────
- Open source, no API needed
- Automatically extracts article text from URLs
- Handles complex HTML/CSS
- Works on most news sites

pip install news-please


╔══════════════════════════════════════════════════════════════════════════════╗
║                        COST COMPARISON                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

NewsData.io (Paid):
  Free tier: 200 credits/day = 2,000 articles/day
  Paid: $29-$199/month
  Full content: NO on free tier

GDELT (Free):
  Unlimited articles/day
  Full content: Need to scrape from URLs
  Cost: $0

Common Crawl (Free):
  Millions of articles
  Full content: YES (in WARC archives)
  Cost: $0
  Trade-off: 1 month latency

✓ Clear winner: GDELT + Basic scraping = UNLIMITED FREE NEWS


╔══════════════════════════════════════════════════════════════════════════════╗
║                        IMPLEMENTATION BELOW                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")


class GDELTNewsFetcher:
    """
    Fetch news from GDELT Project - 100% free, unlimited
    """

    GDELT_RSS_URL = "https://feeds.gdeltproject.org/gcnews/gcnews.rss"

    def fetch_latest_news(self, limit: int = 20) -> List[Dict]:
        """
        Fetch latest news from GDELT RSS feed (updated every 60 seconds)

        Args:
            limit: Number of articles to fetch

        Returns:
            List of articles with URL, title, source, date
        """

        try:
            print(f"📡 Fetching from GDELT: {self.GDELT_RSS_URL}\n")

            feed = feedparser.parse(self.GDELT_RSS_URL)

            if not feed.entries:
                print("❌ Could not fetch GDELT feed")
                return []

            articles = []
            for entry in feed.entries[:limit]:
                article = {
                    "title": entry.get("title", "N/A"),
                    "link": entry.get("link", "N/A"),
                    "published": entry.get("published", "N/A"),
                    "summary": entry.get("summary", "N/A"),
                    "source": "GDELT",
                }
                articles.append(article)

            print(f"✓ Fetched {len(articles)} articles from GDELT")
            return articles

        except Exception as e:
            print(f"❌ Error: {e}")
            return []

    def scrape_article_content(self, url: str, timeout: int = 5) -> Optional[str]:
        """
        Scrape full article content from URL

        For production use: pip install news-please
        news_please automatically handles article extraction
        """

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            response = requests.get(url, timeout=timeout, headers=headers)
            response.raise_for_status()

            # Try to extract text content
            import re

            html = response.text

            # Remove script and style tags
            html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
            html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)

            # Extract text from paragraphs
            paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
            content = '\n'.join(paragraphs)

            # Remove HTML tags
            content = re.sub(r'<[^>]+>', '', content)
            # Decode HTML entities
            content = content.replace('&nbsp;', ' ').replace('&amp;', '&')
            # Remove extra whitespace
            content = re.sub(r'\n\s*\n', '\n', content).strip()

            return content[:2000] if content else None

        except Exception as e:
            print(f"    ⚠️  Could not scrape: {type(e).__name__}")
            return None

    def fetch_and_scrape(self, limit: int = 5, scrape: bool = True):
        """Fetch articles and optionally scrape full content"""

        articles = self.fetch_latest_news(limit=limit)

        if not articles:
            return []

        print("\n" + "="*100)
        print("FETCHED ARTICLES FROM GDELT (free, unlimited)")
        print("="*100)

        for i, article in enumerate(articles[:3], 1):
            print(f"\n{i}. {article['title']}")
            print(f"   Source: GDELT")
            print(f"   Date: {article['published']}")
            print(f"   URL: {article['link']}")
            print(f"   Summary: {article['summary'][:100]}...")

            if scrape:
                print(f"\n   Scraping full content...")
                content = self.scrape_article_content(article['link'])
                if content:
                    print(f"   ✓ Got {len(content)} characters")
                    print(f"   Content preview: {content[:150]}...")
                    article['full_content'] = content
                    time.sleep(2)  # Be respectful
                else:
                    print(f"   ✗ Could not scrape")

        return articles


class NewsRSSFetcher:
    """
    Fetch from direct RSS feeds - 100% free, no API needed
    """

    FEEDS = {
        "BBC News": "http://feeds.bbc.co.uk/news/rss.xml",
        "Reuters Business": "https://feeds.reuters.com/reuters/businessNews",
        "CNN": "http://feeds.cnn.com/rss/edition.rss",
        "Hacker News": "https://news.ycombinator.com/rss",
    }

    def fetch_from_feed(self, feed_name: str, limit: int = 5) -> List[Dict]:
        """Fetch articles from a specific RSS feed"""

        url = self.FEEDS.get(feed_name)
        if not url:
            print(f"Feed '{feed_name}' not found")
            return []

        try:
            print(f"📡 Fetching from {feed_name}: {url}\n")

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

            print(f"✓ Fetched {len(articles)} articles from {feed_name}")
            return articles

        except Exception as e:
            print(f"❌ Error fetching {feed_name}: {e}")
            return []

    def fetch_all_feeds(self, limit: int = 5) -> List[Dict]:
        """Fetch from all available RSS feeds"""

        all_articles = []

        for feed_name in self.FEEDS.keys():
            articles = self.fetch_from_feed(feed_name, limit)
            all_articles.extend(articles)
            time.sleep(1)  # Be respectful to servers

        return all_articles


# ============================================================================
# DEMO
# ============================================================================

def main():
    print("\n" + "="*100)
    print("DEMO: GDELT (Unlimited, Free News Source)")
    print("="*100)

    # Note: feedparser needs to be installed
    try:
        import feedparser
    except ImportError:
        print("\n⚠️  feedparser not installed. Installing...")
        import subprocess
        subprocess.run(["pip", "install", "feedparser"], check=True)
        import feedparser

    gdelt = GDELTNewsFetcher()
    articles = gdelt.fetch_and_scrape(limit=5, scrape=False)  # Set scrape=True to get full content

    print("\n" + "="*100)
    print("RECOMMENDED: news-please Library")
    print("="*100)
    print("""
For PRODUCTION use, install:
  pip install news-please beautifulsoup4

Then use:
  from news_please.crawler import NewsPlease

  article = NewsPlease.from_url('https://example.com/article')
  print(article.text)  # Full article text

This handles:
✓ Complex HTML/CSS
✓ JavaScript-rendered content
✓ Paywall bypassing (legal for research)
✓ Multiple languages
✓ Better accuracy than regex-based scraping
    """)

    print("\n" + "="*100)
    print("SUMMARY: Why Use Free Alternatives?")
    print("="*100)
    print("""
GDELT Benefits:
✓ 100% FREE
✓ NO API KEY
✓ UNLIMITED articles
✓ Real-time (updates every 60 seconds)
✓ 100+ languages, worldwide coverage
✓ No authentication needed
✓ No rate limits
✓ No credit system

NewsData.io (comparison):
✗ Free tier: Only 2,000 articles/day
✗ Requires API key
✗ No full content on free tier
✗ Rate limits (30 credits per 15 min)
✗ Paid plan: $29-$199/month

📊 RECOMMENDATION:
Use GDELT + news-please for production news scraping.
Zero cost, unlimited scale, better control.
    """)


if __name__ == "__main__":
    main()
