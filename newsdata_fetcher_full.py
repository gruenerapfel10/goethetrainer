#!/usr/bin/env python3
"""
NewsData.io API Client - Extended Version
==========================================

IMPORTANT: Full article content is ONLY available on PAID plans.

Free Tier Limitations:
- 'content' field always shows: "ONLY AVAILABLE IN PAID PLANS"
- 'sentiment' field always shows: "ONLY AVAILABLE IN PROFESSIONAL AND CORPORATE PLANS"
- 'ai_tag' field always shows: "ONLY AVAILABLE IN PROFESSIONAL AND CORPORATE PLANS"
- 'ai_summary' field always shows: "ONLY AVAILABLE IN PAID PLANS"

What IS available on free tier:
- 'title' - Article headline ✓
- 'description' - Article summary/snippet ✓
- 'link' - URL to full article ✓
- 'pubDate' - Publication date ✓
- 'image_url' - Article image ✓
- 'source_id' - News source name ✓
- 'category' - Article category ✓
- 'country' - Article country ✓
- 'language' - Article language ✓
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
        """Initialize NewsData API client"""
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
        timeout: int = 10
    ) -> Dict:
        """Fetch latest news from NewsData API"""

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
    ) -> List[Dict]:
        """Fetch multiple pages of news"""

        articles = []
        pages_needed = (num_articles + 9) // 10

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
            )

            if result.get("status") == "success":
                page_articles = result.get("results", [])
                articles.extend(page_articles)
                print(f"  ✓ Page {page + 1}: Got {len(page_articles)} articles (Credit {self.credits_used}/{self.credits_limit})")

                if page < pages_needed - 1:
                    time.sleep(1)
            else:
                print(f"  ✗ Page {page + 1}: Error - {result.get('message')}")
                break

        return articles[:num_articles]

    def save_articles_to_json(self, articles: List[Dict], filename: str = "articles.json"):
        """Save articles to JSON file"""
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(articles)} articles to {filename}")

    def get_article_summary(self, article: Dict) -> Dict:
        """Extract key fields available on free tier"""
        return {
            "id": article.get("article_id"),
            "title": article.get("title"),
            "description": article.get("description"),  # This is the summary on free tier
            "link": article.get("link"),  # URL to read full article online
            "source": article.get("source_id"),
            "date": article.get("pubDate"),
            "image": article.get("image_url"),
            "category": article.get("category", [None])[0],
            "country": article.get("country", [None])[0],
            "language": article.get("language"),
        }

    def print_article_details(self, article: Dict, number: int = 1):
        """Print article with all available free tier data"""
        summary = self.get_article_summary(article)

        print(f"\n{'='*100}")
        print(f"Article {number}: {summary['title']}")
        print(f"{'='*100}")
        print(f"Source:      {summary['source']}")
        print(f"Date:        {summary['date']}")
        print(f"Category:    {summary['category']}")
        print(f"Language:    {summary['language']}")
        print(f"Country:     {summary['country']}")
        print(f"\nDescription (Article Summary):\n{summary['description']}")
        print(f"\nFull Article URL: {summary['link']}")
        print(f"Image URL: {summary['image']}")
        print(f"\nArticle ID: {summary['id']}")


# ============================================================================
# MAIN - DEMONSTRATION
# ============================================================================

def main():
    print("🚀 NewsData.io API Client - Full Version\n")
    print("⚠️  IMPORTANT: Full article content is NOT available on free tier")
    print("    'content' field will always show: 'ONLY AVAILABLE IN PAID PLANS'")
    print("    What you CAN access: title, description, link, source, date, image\n")

    # Initialize client
    fetcher = NewsDataFetcher()

    # Fetch articles
    print("\n" + "="*100)
    print("FETCHING ARTICLES")
    print("="*100)

    articles = fetcher.fetch_news_paginated(
        query="artificial intelligence",
        category="technology",
        num_articles=5  # Just 5 for demo
    )

    # Display detailed info for first 3 articles
    print("\n" + "="*100)
    print("ARTICLE DETAILS (Available on Free Tier)")
    print("="*100)

    for i, article in enumerate(articles[:3], 1):
        fetcher.print_article_details(article, i)

    # Save all articles
    print("\n" + "="*100)
    print("SAVING ARTICLES")
    print("="*100)

    fetcher.save_articles_to_json(articles, "fetched_articles_full.json")

    # Show what fields are available vs what require paid plan
    print("\n" + "="*100)
    print("FIELD AVAILABILITY SUMMARY")
    print("="*100)

    if articles:
        sample = articles[0]
        print("\n✅ AVAILABLE ON FREE TIER:")
        for field in ["article_id", "title", "description", "link", "source_id",
                      "pubDate", "image_url", "category", "country", "language"]:
            value = sample.get(field, "N/A")
            if isinstance(value, str) and len(value) > 60:
                value = value[:60] + "..."
            print(f"   {field}: {value}")

        print("\n❌ NOT AVAILABLE ON FREE TIER (Paid plans only):")
        for field in ["content", "ai_summary", "sentiment", "ai_tag", "ai_region", "ai_org"]:
            value = sample.get(field, "N/A")
            print(f"   {field}: {value}")

    # Summary
    print("\n" + "="*100)
    print("USAGE SUMMARY")
    print("="*100)
    print(f"Credits Used:       {fetcher.credits_used}/{fetcher.credits_limit}")
    print(f"Articles Fetched:   {len(articles)}")
    print(f"Remaining Credits:  {fetcher.credits_limit - fetcher.credits_used}")
    print(f"Remaining Articles: {(fetcher.credits_limit - fetcher.credits_used) * 10}")

    # Pro tip
    print("\n" + "="*100)
    print("💡 TO GET FULL ARTICLE CONTENT")
    print("="*100)
    print("""
Options:
1. **Use the 'link' field** to programmatically fetch the full article from the source
   - You already have article['link'] which is the URL
   - Use requests.get() or beautifulsoup to scrape the full text

2. **Upgrade to a paid plan** ($29-$199/month)
   - Get full 'content' field with complete article text
   - Get 'ai_summary' for AI-generated summaries
   - Get sentiment analysis

3. **Combine services**
   - Use NewsData.io for discovery + titles + links
   - Use web scraping (Firecrawl, BeautifulSoup) for full content from links
    """)


if __name__ == "__main__":
    main()
