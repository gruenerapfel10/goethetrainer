#!/usr/bin/env python3
"""
NewsData.io with Full Content Scraping
======================================

Since NewsData.io free tier doesn't provide full article content,
this script:
1. Uses NewsData.io to DISCOVER articles (1 credit = 10 articles)
2. Uses web scraping to fetch the FULL CONTENT from the links

This gives you best of both worlds:
- Efficient news discovery with NewsData.io
- Full article text via scraping
"""

import os
import json
import requests
from typing import Optional, List, Dict
from dotenv import load_dotenv
import time
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

class NewsDataWithContent:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize with NewsData API key"""
        self.api_key = api_key or os.getenv("NEWSDATA_API_KEY")
        if not self.api_key:
            raise ValueError("NewsData API key not found. Set NEWSDATA_API_KEY in .env")

        self.newsdata_url = "https://newsdata.io/api/1"
        self.credits_used = 0
        self.credits_limit = 200

    def fetch_from_newsdata(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        country: Optional[str] = None,
        limit_results: int = 10
    ) -> List[Dict]:
        """Fetch article metadata from NewsData.io"""

        params = {
            "apikey": self.api_key,
            "language": "en",
        }

        if query:
            params["q"] = query
        if category:
            params["category"] = category
        if country:
            params["country"] = country
        if limit_results:
            params["size"] = min(limit_results, 10)

        try:
            response = requests.get(
                f"{self.newsdata_url}/latest",
                params=params,
                timeout=10
            )
            response.raise_for_status()

            data = response.json()
            if data.get("status") == "success":
                self.credits_used += 1
                return data.get("results", [])
            else:
                print(f"API Error: {data.get('message')}")
                return []

        except requests.exceptions.RequestException as e:
            print(f"Request Error: {e}")
            return []

    def scrape_article_content(self, url: str, timeout: int = 5) -> Optional[str]:
        """
        Attempt to scrape full article content from URL

        Simple extraction: Gets text from <article>, <main>, or <body> tags
        For production, use: newspaper3k, trafilatura, or Firecrawl
        """
        try:
            # Set user agent to avoid blocking
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            response = requests.get(url, timeout=timeout, headers=headers)
            response.raise_for_status()

            # Simple HTML parsing
            html = response.text

            # Try to extract content from common article containers
            import re

            # Try <article> tag first
            article_match = re.search(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)
            if article_match:
                content = article_match.group(1)
            else:
                # Try <main> tag
                main_match = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)
                if main_match:
                    content = main_match.group(1)
                else:
                    # Fallback to body
                    body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
                    content = body_match.group(1) if body_match else html

            # Remove HTML tags
            content = re.sub(r'<[^>]+>', '\n', content)
            # Remove extra whitespace
            content = re.sub(r'\n\s*\n', '\n', content)
            # Clean up
            content = content.strip()

            return content[:2000] if content else None  # Return first 2000 chars

        except Exception as e:
            print(f"    ⚠️  Could not scrape {urlparse(url).netloc}: {type(e).__name__}")
            return None

    def enrich_articles_with_content(
        self,
        articles: List[Dict],
        scrape: bool = True,
        scrape_delay: float = 1.0
    ) -> List[Dict]:
        """
        Enrich articles with full content

        Args:
            articles: Articles from NewsData.io
            scrape: Whether to attempt scraping
            scrape_delay: Delay between scrape requests (be respectful!)
        """

        enriched = []

        for i, article in enumerate(articles, 1):
            enriched_article = article.copy()

            if scrape and article.get("link"):
                print(f"\n  Scraping {i}/{len(articles)}: {article.get('source_id')}")

                content = self.scrape_article_content(article.get("link"))

                if content:
                    enriched_article["full_content"] = content
                    enriched_article["content_available"] = True
                    print(f"    ✓ Got {len(content)} characters of content")
                else:
                    enriched_article["full_content"] = None
                    enriched_article["content_available"] = False
                    print(f"    ✗ Could not scrape content")

                # Be respectful - delay between requests
                if i < len(articles):
                    time.sleep(scrape_delay)

            enriched.append(enriched_article)

        return enriched

    def save_enriched_articles(self, articles: List[Dict], filename: str = "articles_with_content.json"):
        """Save articles with full content"""
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Saved {len(articles)} enriched articles to {filename}")

    def print_full_article(self, article: Dict, number: int = 1):
        """Print article with full content"""
        print(f"\n{'='*100}")
        print(f"ARTICLE {number}: {article.get('title')}")
        print(f"{'='*100}")
        print(f"Source:   {article.get('source_id')}")
        print(f"Date:     {article.get('pubDate')}")
        print(f"Category: {article.get('category', ['N/A'])[0]}")
        print(f"URL:      {article.get('link')}")

        print(f"\n📝 DESCRIPTION:")
        print(f"{article.get('description', 'N/A')}\n")

        if article.get('full_content'):
            print(f"📄 FULL CONTENT ({len(article['full_content'])} chars):")
            print(f"{article.get('full_content')}\n")
        else:
            print(f"ℹ️  Full content not available")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("🚀 NewsData.io + Web Scraping Integration\n")
    print("Strategy: Discover with NewsData.io, Get full content via scraping\n")

    fetcher = NewsDataWithContent()

    # Step 1: Fetch from NewsData.io
    print("="*100)
    print("STEP 1: Discover Articles with NewsData.io (1 credit)")
    print("="*100)

    articles = fetcher.fetch_from_newsdata(
        query="artificial intelligence",
        category="technology",
        limit_results=3  # Just 3 for demo
    )

    print(f"\n✓ Got {len(articles)} articles from NewsData.io")
    print(f"  Credits used: {fetcher.credits_used}/200")

    if not articles:
        print("No articles fetched")
        return

    # Step 2: Scrape full content
    print("\n" + "="*100)
    print("STEP 2: Scrape Full Content from Article Links")
    print("="*100)

    enriched_articles = fetcher.enrich_articles_with_content(
        articles,
        scrape=True,
        scrape_delay=2.0  # 2 second delay between requests (be respectful!)
    )

    # Step 3: Display results
    print("\n" + "="*100)
    print("STEP 3: Display Full Articles")
    print("="*100)

    successful_scrapes = sum(1 for a in enriched_articles if a.get('content_available'))

    for i, article in enumerate(enriched_articles[:2], 1):
        fetcher.print_full_article(article, i)

    # Step 4: Save
    print("\n" + "="*100)
    print("STEP 4: Save Enriched Articles")
    print("="*100)

    fetcher.save_enriched_articles(enriched_articles, "articles_with_content.json")

    # Summary
    print("\n" + "="*100)
    print("SUMMARY")
    print("="*100)
    print(f"Articles discovered:     {len(articles)}")
    print(f"Full content scraped:    {successful_scrapes}/{len(articles)}")
    print(f"Credits used:            {fetcher.credits_used}/200")
    print(f"Efficiency:              10 articles per 1 credit (max)")

    print("\n" + "="*100)
    print("PROS & CONS")
    print("="*100)
    print("""
PROS:
  ✓ Free tier cost: only 1 credit per 10 articles
  ✓ Get full article content via scraping
  ✓ Combine best of both services
  ✓ 2000 articles/day budget still available

CONS:
  ✗ Scraping adds latency (1-2s per article)
  ✗ Some sites block scrapers (User-Agent helps)
  ✗ Scraped content quality varies by site
  ✗ May need to handle site-specific HTML structure

BETTER ALTERNATIVE:
  Use Firecrawl (already in your .env!) for reliable scraping
  - More robust than manual HTML parsing
  - Handles JavaScript-rendered content
  - Better at extracting clean text
    """)

    print("\n" + "="*100)
    print("NEXT STEPS")
    print("="*100)
    print("""
Option 1: Improve scraping
  - Install: pip install newspaper3k beautifulsoup4
  - Use newspaper3k for better article extraction

Option 2: Use your Firecrawl API (already configured!)
  - FIRECRAWL_API_KEY is in your .env
  - Firecrawl is more robust than basic scraping

Option 3: Upgrade NewsData.io to paid plan
  - Get full 'content' field directly from API
  - No scraping needed
    """)


if __name__ == "__main__":
    main()
