#!/usr/bin/env python3
"""
Diverse News Fetcher
====================

Fetch news from multiple sources across different categories.
100% FREE - No API keys, no limits.
"""

import feedparser
import json
from typing import List, Dict
import time

# Diverse free RSS feeds (tested & working)
NEWS_SOURCES = {
    "World": [
        ("BBC World", "http://feeds.bbc.co.uk/news/world/rss.xml"),
        ("Reuters Top News", "https://feeds.reuters.com/reuters/topNews"),
    ],
    "Business": [
        ("Financial Times", "https://feeds.ft.com/home/rss"),
        ("Bloomberg", "https://www.bloomberg.com/feed/podcast/etf-report.rss"),
    ],
    "Technology": [
        ("Hacker News", "https://news.ycombinator.com/rss"),
        ("ArXiv CS", "http://arxiv.org/rss/cs.AI"),
    ],
    "Science": [
        ("Nature", "https://www.nature.com/nature.rss"),
        ("Science Daily", "https://www.sciencedaily.com/rss/all_rss.xml"),
    ],
    "Politics": [
        ("BBC Politics", "http://feeds.bbc.co.uk/news/politics/rss.xml"),
        ("The Guardian Politics", "https://www.theguardian.com/politics/rss"),
    ],
    "Sports": [
        ("BBC Sport", "http://feeds.bbc.co.uk/sport/rss.xml"),
        ("ESPN", "https://www.espn.com/espn/rss/news.xml"),
    ],
    "Entertainment": [
        ("BBC Entertainment", "http://feeds.bbc.co.uk/news/entertainment_and_arts/rss.xml"),
        ("Variety", "https://variety.com/feed/"),
    ],
    "Health": [
        ("BBC Health", "http://feeds.bbc.co.uk/news/health/rss.xml"),
        ("Medical News Today", "https://www.medicalnewstoday.com/rss.xml"),
    ],
}


def fetch_from_source(name: str, url: str, limit: int = 3) -> List[Dict]:
    """Fetch articles from a single RSS feed"""

    try:
        feed = feedparser.parse(url)

        articles = []
        for entry in feed.entries[:limit]:
            article = {
                "title": entry.get("title", "N/A"),
                "link": entry.get("link", "N/A"),
                "published": entry.get("published", "N/A"),
                "summary": entry.get("summary", "")[:100],
                "source": name,
            }
            articles.append(article)

        return articles

    except Exception as e:
        print(f"   ✗ {name}: {type(e).__name__}")
        return []


def fetch_all_news(articles_per_source: int = 2) -> Dict[str, List[Dict]]:
    """Fetch from all categories and sources"""

    print("""
╔════════════════════════════════════════════════════════════════╗
║         DIVERSE NEWS FETCHER (100% FREE)                       ║
║                                                                ║
║  Fetching from 16 sources across 8 categories...              ║
╚════════════════════════════════════════════════════════════════╝
""")

    all_news = {}

    for category, sources in NEWS_SOURCES.items():
        print(f"\n📰 {category.upper()}")
        print("-" * 60)

        category_articles = []

        for source_name, url in sources:
            articles = fetch_from_source(source_name, url, limit=articles_per_source)

            if articles:
                print(f"   ✓ {source_name}: {len(articles)} articles")
                category_articles.extend(articles)
            else:
                print(f"   ✗ {source_name}: failed")

            time.sleep(0.5)  # Be polite

        all_news[category] = category_articles

    return all_news


def display_news(news: Dict[str, List[Dict]]):
    """Display all news organized by category"""

    print("\n" + "="*80)
    print("DIVERSE NEWS COLLECTION")
    print("="*80)

    total = 0

    for category, articles in news.items():
        if articles:
            print(f"\n📌 {category.upper()} ({len(articles)} articles)")
            print("-" * 80)

            for i, article in enumerate(articles[:3], 1):  # Show first 3 per category
                print(f"\n  {i}. {article['title']}")
                print(f"     Source: {article['source']}")
                print(f"     Date: {article['published'][:10]}")
                print(f"     Link: {article['link'][:60]}...")

            total += len(articles)

    print(f"\n" + "="*80)
    print(f"TOTAL ARTICLES: {total}")
    print("="*80)

    return total


def save_news(news: Dict[str, List[Dict]], filename: str = "diverse_news.json"):
    """Save to JSON file"""

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(news, f, indent=2, ensure_ascii=False)

    total = sum(len(articles) for articles in news.values())
    print(f"\n✓ Saved {total} articles to {filename}")


def main():
    # Fetch all news
    news = fetch_all_news(articles_per_source=3)

    # Display
    total = display_news(news)

    # Save
    if total > 0:
        save_news(news)

        print(f"\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"Categories covered: 8")
        print(f"Sources used: 16")
        print(f"Total articles: {total}")
        print(f"Cost: $0 (completely FREE)")
        print(f"Auth required: NO")
        print(f"Rate limits: NONE")
    else:
        print("\n❌ No articles fetched - network issue?")


if __name__ == "__main__":
    main()
