#!/usr/bin/env python3
"""
Simple News Fetcher - Direct RSS from News Sources
====================================================

Works directly with news publisher RSS feeds (not Google).
No API keys, no limits, completely free.
"""

import feedparser
import json
from typing import List, Dict
import time

# Direct RSS feeds from news publishers (completely free, no auth)
NEWS_FEEDS = {
    "BBC News": "http://feeds.bbc.co.uk/news/rss.xml",
    "Reuters": "https://feeds.reuters.com/reuters/topNews",
    "CNN": "http://feeds.cnn.com/rss/edition.rss",
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "The Guardian": "https://www.theguardian.com/world/rss",
    "ProPublica": "https://www.propublica.org/feeds/all-stories.xml",
}


def fetch_news(source: str = "BBC News", limit: int = 5) -> List[Dict]:
    """Fetch articles from RSS feed"""

    url = NEWS_FEEDS.get(source)
    if not url:
        print(f"❌ Source '{source}' not found")
        return []

    print(f"📰 Fetching from {source}...")

    try:
        feed = feedparser.parse(url)

        if not feed.entries:
            print(f"   ❌ No articles found")
            return []

        articles = []
        for entry in feed.entries[:limit]:
            article = {
                "title": entry.get("title", "N/A"),
                "link": entry.get("link", "N/A"),
                "published": entry.get("published", "N/A"),
                "summary": entry.get("summary", "N/A")[:200],
                "source": source,
            }
            articles.append(article)

        print(f"   ✓ Got {len(articles)} articles\n")
        return articles

    except Exception as e:
        print(f"   ❌ Error: {e}\n")
        return []


def show_articles(articles: List[Dict]):
    """Display articles"""

    print("="*100)
    print(f"ARTICLES ({len(articles)} total)")
    print("="*100)

    for i, article in enumerate(articles, 1):
        print(f"\n{i}. {article['title']}")
        print(f"   Source: {article['source']}")
        print(f"   Date: {article['published']}")
        print(f"   Link: {article['link']}")
        print(f"   Summary: {article['summary']}...")


def save_json(articles: List[Dict], filename: str = "news_articles.json"):
    """Save to JSON"""

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Saved to {filename}")


def main():
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                      SIMPLE NEWS FETCHER                                     ║
║                    100% FREE, NO API KEYS, NO LIMITS                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")

    print("Available news sources:")
    for i, source in enumerate(NEWS_FEEDS.keys(), 1):
        print(f"  {i}. {source}")

    print("\n" + "="*100)
    print("FETCHING NEWS")
    print("="*100 + "\n")

    # Fetch from all sources
    all_articles = []

    for source in ["BBC News", "Reuters", "CNN"]:
        articles = fetch_news(source, limit=3)
        all_articles.extend(articles)
        time.sleep(1)

    # Display
    if all_articles:
        show_articles(all_articles)
        save_json(all_articles)

        print("\n" + "="*100)
        print("SUMMARY")
        print("="*100)
        print(f"Total articles: {len(all_articles)}")
        print(f"Cost: $0 FREE")
        print(f"Limits: UNLIMITED")
        print(f"Auth required: NO")
    else:
        print("❌ No articles fetched")


if __name__ == "__main__":
    main()
