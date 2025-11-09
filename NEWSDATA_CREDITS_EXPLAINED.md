# NewsData.io Credits System - Complete Explanation

## TL;DR - How Credits Work

| Item | Details |
|------|---------|
| **Daily Limit** | 200 credits/day |
| **Articles per Credit** | 10 articles (free tier) |
| **Max Daily Articles** | 200 × 10 = **2,000 articles/day** |
| **Cost per Request** | 1 credit = 1 API call |
| **Articles per Request** | Max 10 articles per request |
| **Efficiency** | 10 articles/credit (max) |

## Key Concepts

### Credit = API Request (NOT articles)
- **1 credit is consumed for EVERY API request you make**, regardless of how many articles you get back
- You can't "save credits" by getting fewer articles in a single request
- Example:
  - Request 1 article → 1 credit used
  - Request 10 articles → 1 credit used (most efficient)
  - Request 10 articles × 20 times → 20 credits used

### Single Request Can Return Up To 10 Articles
```python
# This costs 1 credit and returns 10 articles
response = api.fetch_latest_news(
    query="AI",
    limit_results=10  # Max 10 per request
)
```

### Multiple Requests For More Articles
To get 100 articles:
```python
# This costs 10 credits (10 requests × 1 credit each)
articles = api.fetch_news_paginated(
    query="AI",
    num_articles=100  # Will make 10 requests internally
)
```

## Daily Budget Calculation

**You have 200 credits/day:**

| Scenario | Requests | Articles | Credits Used | Remaining Credits |
|----------|----------|----------|---------------|--------------------|
| 1 small search | 1 | 10 | 1 | 199 |
| Daily news digest | 20 | 200 | 20 | 180 |
| Medium collection | 50 | 500 | 50 | 150 |
| Large collection | 100 | 1,000 | 100 | 100 |
| Max usage | 200 | 2,000 | 200 | 0 |

## Rate Limits (Important!)

These limits **reset periodically** and are separate from daily credits:

| Time Window | Limit | What It Means |
|------------|-------|---------------|
| Per 15 minutes | 30 credits | Max 300 articles per 15 min |
| Per second | 10 credits | Can't spam too fast |
| Per day | 200 credits | 2,000 articles max |

**Solution:** Space out requests by 1-2 seconds to stay safe.

## Optimization Strategies

### Strategy 1: Always Request Maximum Articles
```python
# GOOD - Gets 10 articles with 1 credit
fetch_latest_news(limit_results=10)

# BAD - Gets 1 article with 1 credit (wastes 9 article slots)
fetch_latest_news(limit_results=1)
```

### Strategy 2: Batch Similar Queries
```python
# Instead of 5 separate requests, combine into fewer broad queries:
fetch_latest_news(query="AI OR machine learning", limit_results=10)  # 1 credit
fetch_latest_news(query="climate", category="science", limit_results=10)  # 1 credit
```

### Strategy 3: Use Pagination Wisely
```python
# Good: Get all 50 articles at once (5 credits)
articles = fetcher.fetch_news_paginated(num_articles=50)

# Wasteful: Get 10 articles 5 times when you could get 50 at once
```

### Strategy 4: Cache Results
```python
# Get articles once, store them, reuse within 2-4 hours
# Avoids redundant API calls
```

## What Consumes Credits vs What Doesn't

### CONSUMES 1 Credit
- ✅ `/latest` endpoint (newest news)
- ✅ `/crypto` endpoint (crypto news)
- ✅ `/archive` endpoint (historical, paid tier)

### DOES NOT Consume Credits
- ❌ `/sources` endpoint (list of news sources)
- ❌ Error responses that fail authentication

## Free Tier Limitations

| Feature | Free | Professional |
|---------|------|---------------|
| Daily Credits | 200 | 20,000+ |
| Articles per Credit | 10 | 50 |
| Max Articles/Day | 2,000 | 1,000,000+ |
| Sentiment Analysis | ❌ | ✅ |
| AI Tags | ✅ | ✅ |
| Full Content | ✅ | ✅ |
| Historical Data (Archive) | ❌ | ✅ |

## Example: Daily News Aggregator

**Goal:** Fetch 500 articles per day across 5 topics

```python
topics = [
    {"query": "AI", "category": "technology"},
    {"query": "climate", "category": "science"},
    {"query": "markets", "category": "business"},
    {"query": "startup", "category": "technology"},
    {"query": "health", "category": "health"},
]

credits_budget = 200
articles_goal = 500
requests_available = 50  # 200 credits ÷ 4 requests per topic = 50 requests

# This would use exactly 50 credits (50 requests × 1 credit each)
# And get approximately 500 articles (50 requests × 10 articles)
```

## Python Script Usage

The provided `newsdata_fetcher.py` includes:

```python
# Single request: 1 credit → 10 articles
fetcher.fetch_latest_news(query="AI", limit_results=10)

# Multiple requests: 3 credits → 30 articles
fetcher.fetch_news_paginated(query="AI", num_articles=30)

# Track credit usage
print(fetcher.credits_used)  # Shows how many credits you've used
```

## Pro Tips

1. **Always fetch max 10 articles per request** - You're paying the same 1 credit anyway
2. **Batch your searches** - Group related queries to reduce total requests
3. **Cache aggressively** - Store results for 2-4 hours locally
4. **Monitor daily quota** - Script tracks credits_used automatically
5. **Space out requests** - Add 1-2 second delays between requests to respect rate limits
6. **Use pagination helper** - `fetch_news_paginated()` handles spacing automatically

## Monthly Budget Example

If you use consistently at 50 credits/day:

```
50 credits/day × 30 days = 1,500 credits
1,500 credits × 10 articles = 15,000 articles/month

Cost: $0 (you're on free tier!)
```

## Common Mistakes to Avoid

❌ **Making 10 separate requests for 10 articles** (costs 10 credits, gets 10 articles)
✅ **Making 1 request for 10 articles** (costs 1 credit, gets 10 articles)

❌ **Ignoring rate limits and spamming requests**
✅ **Adding 1-2 second delays between requests**

❌ **Not caching results**
✅ **Caching for 2-4 hours** to avoid duplicate API calls

❌ **Requesting full content unnecessarily**
✅ **Using full_content=1 only when needed**
