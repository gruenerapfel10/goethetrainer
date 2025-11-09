#!/usr/bin/env python3
"""
Simple Google News Fetcher
===========================

Just fetch articles from Google News RSS feeds.
No API keys, no limits, completely free.
"""

import feedparser
import json
from typing import List, Dict
import time

# Google News RSS feeds (free, no auth needed)
GOOGLE_NEWS_FEEDS = {
    "top_stories": "https://news.google.com/rss",
    "world": "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRndvSkwyMHZNRGxrTlRndE5qUkJKaUlnZW5CU0ZnSmxBag",
    "business": "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRndvSkwyMHZNRGRqTVRNM1F6RTNKaUlnZW5CU0ZnSmxBag",
    "technology": "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRndvSkwyMHZNRE51YlhObEtpSWdlbkJTRmdKbEFq",
    "entertainment": "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRndvSkwyMHZNRE51YjNoRU1pSWdlbkJTRmdKbEFq",
    "sports": "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRndvSkwyMHZNRE51YW1GQkppSWdlbkJTRmdKbEFq",
    "science": "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRndvSkwyMHZNRE51YVdOQkppSWdlbkJTRmdKbEFq",
}


def fetch_google_news(category: str = "top_stories", limit: int = 10) -> List[Dict]:
    """
    Fetch articles from Google News RSS feed

    Args:
        category: news category (top_stories, world, business, technology, etc.)
        limit: number of articles to fetch

    Returns:
        List of articles
    """

    url = GOOGLE_NEWS_FEEDS.get(category, GOOGLE_NEWS_FEEDS["top_stories"])

    print(f"📰 Fetching {category} from Google News...")
    print(f"   URL: {url}\n")

    try:
        feed = feedparser.parse(url)

        articles = []
        for entry in feed.entries[:limit]:
            article = {
                "title": entry.get("title", "N/A"),
                "link": entry.get("link", "N/A"),
                "published": entry.get("published", "N/A"),
                "summary": entry.get("summary", "N/A"),
                "source": entry.get("source", {}).get("title", "N/A") if entry.get("source") else "N/A",
            }
            articles.append(article)

        return articles

    except Exception as e:
        print(f"❌ Error: {e}")
        return []


def display_articles(articles: List[Dict], show_summary: bool = True):
    """Print articles nicely"""

    print("\n" + "="*100)
    print(f"FETCHED {len(articles)} ARTICLES")
    print("="*100)

    for i, article in enumerate(articles, 1):
        print(f"\n{i}. {article['title']}")
        print(f"   Source: {article['source']}")
        print(f"   Date: {article['published']}")
        print(f"   Link: {article['link']}")

        if show_summary:
            summary = article['summary'][:100].replace("<p>", "").replace("</p>", "")
            print(f"   Summary: {summary}...")


def save_articles(articles: List[Dict], filename: str = "google_news.json"):
    """Save articles to JSON file"""

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Saved {len(articles)} articles to {filename}")


def main():
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                     GOOGLE NEWS SIMPLE FETCHER                               ║
║                                                                              ║
║  Features:                                                                   ║
║  ✓ Completely FREE                                                           ║
║  ✓ No API keys required                                                      ║
║  ✓ No limits                                                                 ║
║  ✓ Real-time updates                                                         ║
║  ✓ Multiple categories                                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")

    print("Available categories:")
    for i, category in enumerate(GOOGLE_NEWS_FEEDS.keys(), 1):
        print(f"  {i}. {category}")

    # Fetch from multiple categories
    all_articles = []

    categories = ["technology", "business", "science"]

    for category in categories:
        articles = fetch_google_news(category=category, limit=5)
        all_articles.extend(articles)
        time.sleep(1)  # Be polite - wait between requests

    # Display
    if all_articles:
        display_articles(all_articles[:10])

        # Save
        save_articles(all_articles, "google_news_articles.json")

        print("\n" + "="*100)
        print("SUMMARY")
        print("="*100)
        print(f"Total articles fetched: {len(all_articles)}")
        print(f"Categories: {len(categories)}")
        print(f"Cost: $0 (completely free)")
    else:
        print("❌ No articles fetched")


if __name__ == "__main__":
    main()
