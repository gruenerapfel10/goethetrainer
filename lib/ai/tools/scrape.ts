import { z } from 'zod';
import type { Session } from 'next-auth';
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';

interface ScrapeProps {
  // Props removed - will be provided at execution time
}

// Initialize FirecrawlApp instance
const getFirecrawlApp = () => {
  const firecrawlUrl = process.env.FIRECRAWL_URL || 'http://localhost:3002';
  return new FirecrawlApp(firecrawlUrl);
};

export const scrape = () => {
  const app = getFirecrawlApp();
  return {
    description: 'Scrape content from a specific URL.',
    inputSchema: z.object({
      url: z.string().describe('URL to scrape'),
    }),
    execute: async ({ url }: { url: string }) => {
      try {
        const scrapeResult: any = await app.scrapeUrl(url);

        if (!scrapeResult.success) {
          return {
            error: `Failed to scrape: ${scrapeResult.error}`,
            success: false,
          };
        };

        console.log("from scraping")
        console.log(scrapeResult);

        return {
          data:
            scrapeResult.markdown ??
            'Could not get the page content, try using search or extract',
          success: true,
        };
      } catch (error: any) {
        console.error('Scrape error:', error);
        return {
          error: `Scraping failed: ${error.message}`,
          success: false,
        };
      }
    },
  };
};
