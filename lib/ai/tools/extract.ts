import type { DataStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import type FirecrawlApp from '@/lib/firecrawl/firecrawl-client';

interface ExtractProps {
  session: Session;
  dataStream: DataStreamWriter;
  app: FirecrawlApp;
  onTokensUsed?: (tokens: number) => void;
}

export const extract = ({
  session,
  dataStream,
  app,
  onTokensUsed,
}: ExtractProps) => {
  return {
    description:
      'REQUIRED SECOND STEP: Extract structured data from web pages. You MUST use this after search.',
    parameters: z.object({
      urls: z.array(z.string()).describe('Array of URLs to extract data from'),
      prompt: z.string().describe('Description of what data to extract'),
    }),
    execute: async ({ urls, prompt }: any) => {
      // Log that the extract tool is being called
      try {
        const scrapeResult = await app.extract(urls, {
          prompt,
        });

        if (!scrapeResult.success) {
          return {
            error: `Failed to extract data: ${scrapeResult.error}`,
            success: false,
          };
        }

        // Track tokens used if callback provided
        if (onTokensUsed && scrapeResult.totalTokensUsed) {
          onTokensUsed(scrapeResult.totalTokensUsed);
        }

        return {
          data: scrapeResult.data,
          success: true,
        };
      } catch (error: any) {
        console.error('Extraction error:', error);
        return {
          error: `Extraction failed: ${error.message}`,
          success: false,
        };
      }
    },
  };
};
