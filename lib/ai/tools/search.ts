import { z } from 'zod';
import type { Session } from 'next-auth';
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';
import type { SearchResponse } from '@/lib/firecrawl/firecrawl-types';

interface SearchProps {
  // Props removed - will be provided at execution time
}

// Initialize FirecrawlApp instance
const getFirecrawlApp = () => {
  const firecrawlUrl = process.env.FIRECRAWL_URL || 'http://localhost:3002';
  return new FirecrawlApp(firecrawlUrl);
};

export const search = () => {
  const app = getFirecrawlApp();
  return {
    description: `Search for web pages related to the user's query. This tool can only be used ONCE per request. Provides comprehensive results for analysis without requiring additional searches or scraping. AFTERWARDS MUST USE EXTRACT TOOL TO EXTRACT SOURCES.`,

    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Comprehensive search query to find relevant web pages - make it detailed to get complete information in one search',
        ),
      maxResults: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum number of results to return (1-10, default 10)'),
    }),

    execute: async ({
      query,
      maxResults = 10,
    }: {
      query: string;
      maxResults?: number;
    }) => {
      try {
        const normalizedQuery = query.trim();
        const normalizedMaxResults = Math.max(1, Math.min(maxResults, 10));

        if (!normalizedQuery) {
          return {
            success: false,
            error: 'Search query cannot be empty',
          };
        }

        const searchResult = await app.search(normalizedQuery, {
          limit: normalizedMaxResults,
        });

        if (!searchResult.success) {
          console.error(`[SEARCH] Failed: ${searchResult.error}`);
          return {
            success: false,
            error: `Search failed: ${searchResult.error}`,
          };
        }

        console.log("*** result");
        console.log(searchResult);

        // Consistent processing for stable token usage
        const processedData = Array.isArray(searchResult.data)
          ? searchResult.data.slice(0, normalizedMaxResults).map((result) => ({
              title: (result as any).title?.slice(0, 180) || 'Untitled',
              url: (result as any).url || '',
              description:
                (result as any).description?.slice(0, 280) ||
                (result as any).snippet?.slice(0, 280) ||
                'No description available',
            }))
          : searchResult.data;

        return {
          data: processedData,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`[SEARCH] Error: ${errorMessage}`);

        return {
          success: false,
          error: `Search failed: ${errorMessage}`,
        };
      }
    },
  };
};
