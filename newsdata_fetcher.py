#!/usr/bin/env python3
"""
NewsData.io API Client
=====================

Credit System Explanation:
- 1 API request = 1 credit consumed
- 1 credit = 10 articles (free tier)
- 200 credits/day = 2,000 articles/day maximum
- Rate limits: 30 credits per 15 min, 10 credits per second

So you CAN get up to 10 articles in a SINGLE request (1 credit).
Multiple requests increase your article count linearly (1 credit per request).
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

class NewsDataFetcher:
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize NewsData API client

        Args:
            api_key: NewsData API key (uses NEWSDATA_API_KEY from .env if not provided)
        """
        self.api_key = api_key or os.getenv("NEWSDATA_API_KEY")
        if not self.api_key:
            raise ValueError("NewsData API key not found. Set NEWSDATA_API_KEY in .env")

        self.base_url = "https://newsdata.io/api/1"
        self.credits_used = 0
        self.credits_limit = 200

    def fetch_latest_news(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        country: Optional[str] = None,
        language: str = "en",
        limit_results: int = 10,
        full_content: bool = False,
        timeout: int = 10
    ) -> Dict:
        """
        Fetch latest news from NewsData API

        Args:
            query: Search keyword (e.g., "artificial intelligence")
            category: News category (business, tech, sports, etc.)
            country: Country code (e.g., "us", "gb", "in")
            language: Language code (default: "en")
            limit_results: Max articles to fetch (1-10, free tier max)
            full_content: Include full article text (True/False) - requires paid plan
            timeout: Request timeout in seconds

        Returns:
            dict with articles and metadata

        NOTE: The 'content' field shows "ONLY AVAILABLE IN PAID PLANS" on free tier.
        Full article content requires a Professional or Corporate plan.
        The 'description' field contains the article summary on free tier.
        """

        params = {
            "apikey": self.api_key,
            "language": language,
        }

        if query:
            params["q"] = query
        if category:
            params["category"] = category
        if country:
            params["country"] = country
        if limit_results:
            params["size"] = min(limit_results, 10)  # Max 10 per request

        # Note: full_content parameter requires paid plan
        # Free tier will return "ONLY AVAILABLE IN PAID PLANS" regardless
        if full_content:
            params["full_content"] = 1

        try:
            response = requests.get(
                f"{self.base_url}/latest",
                params=params,
                timeout=timeout
            )
            response.raise_for_status()

            data = response.json()

            # Track credit usage
            if data.get("status") == "success":
                self.credits_used += 1
                print(f"✓ Request successful | Credits used: {self.credits_used}/{self.credits_limit}")

            return data

        except requests.exceptions.RequestException as e:
            print(f"✗ API Error: {e}")
            return {"status": "error", "message": str(e)}

    def fetch_news_paginated(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        country: Optional[str] = None,
        num_articles: int = 50,
        full_content: bool = False
    ) -> List[Dict]:
        """
        Fetch multiple pages of news (makes multiple requests)

        Args:
            query: Search keyword
            category: News category
            country: Country code
            num_articles: Total articles to fetch (will make multiple requests)
            full_content: Include full article text

        Returns:
            list of all articles collected
        """

        articles = []
        pages_needed = (num_articles + 9) // 10  # 10 articles per request

        print(f"\n📰 Fetching ~{num_articles} articles ({pages_needed} requests)...")

        for page in range(pages_needed):
            if self.credits_used >= self.credits_limit:
                print(f"⚠️  Daily credit limit reached ({self.credits_limit})")
                break

            result = self.fetch_latest_news(
                query=query,
                category=category,
                country=country,
                limit_results=10,
                full_content=full_content
            )

            if result.get("status") == "success":
                page_articles = result.get("results", [])
                articles.extend(page_articles)
                print(f"  → Page {page + 1}: Got {len(page_articles)} articles")

                # Respect rate limits: 10 credits per second
                if page < pages_needed - 1:
                    time.sleep(1)  # Be safe, wait 1 second between requests
            else:
                print(f"  → Page {page + 1}: Error - {result.get('message')}")
                break

        return articles[:num_articles]  # Trim to exact number requested

    def save_articles_to_json(self, articles: List[Dict], filename: str = "articles.json"):
        """Save articles to JSON file"""
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(articles)} articles to {filename}")

    def print_articles_summary(self, articles: List[Dict], max_display: int = 5):
        """Print summary of articles"""
        print(f"\n📊 Articles Summary (showing {min(max_display, len(articles))}/{len(articles)})")
        print("=" * 100)

        for i, article in enumerate(articles[:max_display], 1):
            print(f"\n{i}. {article.get('title', 'N/A')}")
            print(f"   Source: {article.get('source_id', 'Unknown')}")
            print(f"   Date: {article.get('pubDate', 'N/A')}")
            print(f"   Sentiment: {article.get('sentiment', 'N/A')}")
            print(f"   Category: {article.get('category', ['N/A'])[0] if article.get('category') else 'N/A'}")
            print(f"   Description: {article.get('description', 'N/A')[:100]}...")


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

def main():
    print("🚀 NewsData.io API Client\n")

    # Initialize client
    fetcher = NewsDataFetcher()

    # Example 1: Single request (1 credit = 10 articles)
    print("\n" + "="*100)
    print("EXAMPLE 1: Single Request (1 Credit)")
    print("="*100)
    result = fetcher.fetch_latest_news(
        query="artificial intelligence",
        category="technology",
        country="us",
        limit_results=10,
        full_content=False
    )

    if result.get("status") == "success":
        articles = result.get("results", [])
        print(f"Got {len(articles)} articles with 1 credit")
        fetcher.print_articles_summary(articles, max_display=2)

    # Example 2: Multiple requests for more articles
    print("\n" + "="*100)
    print("EXAMPLE 2: Multiple Requests (3 Credits = ~30 Articles)")
    print("="*100)
    multi_articles = fetcher.fetch_news_paginated(
        query="machine learning",
        category="technology",
        country="us",
        num_articles=30,
        full_content=False
    )
    fetcher.print_articles_summary(multi_articles, max_display=3)

    # Example 3: Save to file
    if multi_articles:
        fetcher.save_articles_to_json(multi_articles, "fetched_articles.json")

    # Final summary
    print("\n" + "="*100)
    print("CREDIT USAGE SUMMARY")
    print("="*100)
    print(f"Credits Used: {fetcher.credits_used}/{fetcher.credits_limit}")
    print(f"Articles Retrieved: {len(multi_articles)}")
    print(f"Efficiency: {len(multi_articles) / fetcher.credits_used:.1f} articles/credit")
    print(f"Daily Capacity: {(fetcher.credits_limit - fetcher.credits_used) * 10} articles remaining")


if __name__ == "__main__":
    main()
