import type { DataStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from '@/types/next-auth';
import type FirecrawlApp from '@/lib/firecrawl/firecrawl-client';

interface ScrapeProps {
  session: Session;
  dataStream: DataStreamWriter;
  app: FirecrawlApp;
  onTokensUsed?: (tokens: number) => void;
}

export const scrape = ({
  session,
  dataStream,
  app,
  onTokensUsed,
}: ScrapeProps) => {
  return {
    description:
      'ONLY FOR URLs: Scrape web pages. ONLY use this when the user provides a specific URL.',
    parameters: z.object({
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
        }

        // Track tokens used if callback provided
        if (onTokensUsed && scrapeResult.totalTokensUsed) {
          onTokensUsed(scrapeResult.totalTokensUsed);
        }

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
