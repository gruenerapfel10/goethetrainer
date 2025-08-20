# Job Search Implementation

## Overview
The job search feature aggregates job listings from multiple sources using web scraping (via Firecrawl) and free APIs. This avoids the need for expensive LinkedIn API partnerships.

## Architecture

### Providers
1. **SearchProvider** (`/lib/jobs/providers/search-provider.ts`)
   - Uses Firecrawl's search API to find job listings across the web
   - Extracts structured data from job pages
   - No authentication required

2. **LinkedInProvider** (`/lib/jobs/providers/linkedin-provider.ts`)
   - Scrapes LinkedIn job search pages using Firecrawl
   - Extracts job details using AI-powered extraction
   - No LinkedIn API needed

3. **ArbeitnowProvider** (`/lib/jobs/providers/arbeitnow-provider.ts`)
   - Free API for European job listings
   - No authentication required
   - Direct API access

### Job Aggregator
The `JobAggregator` class (`/lib/jobs/job-aggregator.ts`) combines results from all providers:
- Fetches from all providers in parallel
- Deduplicates jobs based on title + company
- Sorts by posting date (newest first)
- Handles provider failures gracefully

## API Endpoints

### GET /api/jobs/search
Fetch jobs with query parameters:
```
GET /api/jobs/search?keywords=software+engineer&location=remote&limit=20
```

Parameters:
- `keywords`: Search keywords
- `location`: Job location
- `remote`: true/false for remote jobs
- `experienceLevel`: entry/mid/senior/executive
- `jobType`: full-time/part-time/contract/internship
- `limit`: Max results (default: 20, max: 100)
- `offset`: Pagination offset

### POST /api/jobs/search
Same as GET but with request body for more complex queries.

## Frontend Integration
The jobs page (`/app/jobs/page.tsx`) automatically fetches jobs when:
- Page loads
- Filters change
- User clicks refresh

Jobs link to their original source when clicked.

## Configuration
Requires environment variables:
```env
FIRECRAWL_URL=your-firecrawl-url
FIRECRAWL_API_KEY=your-api-key
```

## Adding New Providers
1. Create a new provider class implementing `JobProvider` interface
2. Add provider to `JobAggregator` constructor
3. Provider should return empty array on failure (not throw)

## Limitations
- Web scraping may be affected by site structure changes
- Some job boards may have anti-scraping measures
- Results depend on Firecrawl's ability to extract data
- Free APIs may have rate limits

## Future Enhancements
- Add more job board providers (Indeed, Glassdoor via scraping)
- Implement caching to reduce API calls
- Add job alerts/notifications
- Store job searches for tracking applications