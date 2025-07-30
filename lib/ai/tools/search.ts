import { DataStreamWriter } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';

interface SearchProps {
  session: Session;
  dataStream: DataStreamWriter;
  app: FirecrawlApp;
  onTokensUsed?: (tokens: number) => void;
}

export const search = ({
  session,
  dataStream,
  app,
  onTokensUsed,
}: SearchProps) => {
  return {
    description:
      "REQUIRED FIRST STEP: Search for web pages related to the user's query. You MUST use this tool first unless the user provides a URL.",
    parameters: z.object({
      query: z.string().describe('Search query to find relevant web pages'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 10)'),
    }),
    execute: async ({ query, maxResults = 10 }: any) => {
      // Log that the search tool is being called
      try {
        const searchResult = await app.search(query, {
          limit: 10,
        });

        if (!searchResult.success) {
          return {
            error: `Search failed: ${searchResult.error}`,
            success: false,
          };
        }

        return {
          data: searchResult.data,
          success: true,
        };
      } catch (error: any) {
        return {
          error: `Search failed: ${error.message}`,
          success: false,
        };
      }
    },
  };
};
