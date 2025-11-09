#!/usr/bin/env python3
"""
Simple News Fetcher
===================

Fetch news articles from free RSS feeds.
No API keys, no limits, no authentication required.
"""

import feedparser
import json
from typing import List, Dict


def fetch_news(rss_url: str, limit: int = 10) -> List[Dict]:
    """
    Fetch articles from any RSS feed

    Args:
        rss_url: RSS feed URL
        limit: Number of articles to fetch

    Returns:
        List of articles
    """

    print(f"📰 Fetching from: {rss_url}")

    try:
        feed = feedparser.parse(rss_url)

        articles = []
        for entry in feed.entries[:limit]:
            article = {
                "title": entry.get("title", "N/A"),
                "link": entry.get("link", "N/A"),
                "published": entry.get("published", "N/A"),
                "summary": entry.get("summary", "")[:150],
            }
            articles.append(article)

        print(f"✓ Got {len(articles)} articles\n")
        return articles

    except Exception as e:
        print(f"❌ Error: {e}\n")
        return []


def show(articles: List[Dict]):
    """Display articles"""

    for i, a in enumerate(articles, 1):
        print(f"{i}. {a['title']}")
        print(f"   {a['link']}")
        print(f"   {a['published']}\n")


def save(articles: List[Dict], filename: str = "news.json"):
    """Save to JSON"""

    with open(filename, "w") as f:
        json.dump(articles, f, indent=2)
    print(f"Saved {len(articles)} articles to {filename}")


# Free RSS feeds
FEEDS = {
    "Hacker News": "https://news.ycombinator.com/rss",
    "Tech Crunch": "http://feeds.techmeme.com/techmeme",
    "Lobsters": "https://lobste.rs/rss",
}


if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════════╗
║          SIMPLE NEWS FETCHER                                   ║
║      Free RSS News Aggregator (No API Keys Required)           ║
╚════════════════════════════════════════════════════════════════╝
""")

    all_articles = []

    # Fetch from Hacker News (works great)
    articles = fetch_news("https://news.ycombinator.com/rss", limit=10)
    all_articles.extend(articles)

    # Display
    if all_articles:
        print("="*70)
        print("ARTICLES")
        print("="*70 + "\n")
        show(all_articles[:5])

        # Save
        save(all_articles)

        print(f"\nTotal: {len(all_articles)} articles")
        print("Cost: FREE")
