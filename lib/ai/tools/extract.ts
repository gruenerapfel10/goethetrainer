
import { z } from 'zod';
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';

type ExtractProps = {}

// Initialize FirecrawlApp instance
const getFirecrawlApp = () => {
  const firecrawlUrl = process.env.FIRECRAWL_URL || 'http://localhost:3002';
  return new FirecrawlApp(firecrawlUrl);
};

interface ExtractedResult {
  url: string;
  data: any;
  success: boolean;
  error: string | null;
}

interface ExtractResponse {
  data: ExtractedResult[];
  success: boolean;
  summary?: {
    total: number;
    successful: number;
    failed: number;
    totalTokens: number;
  };
  error?: string;
  stopSignal?: boolean;
}

// Process raw data into structured results for all URLs
const processExtractedData = (
  rawData: any,
  urls: string[],
): ExtractedResult[] => {
  if (Array.isArray(rawData)) {
    return urls.map((url, index) => {
      const data = rawData[index];
      return createResultForUrl(url, data);
    });
  }

  if (rawData?.results && Array.isArray(rawData.results)) {
    return urls.map((url, index) => {
      const data = rawData.results[index];
      return createResultForUrl(url, data);
    });
  }

  if (rawData?.data && Array.isArray(rawData.data)) {
    return urls.map((url, index) => {
      const data = rawData.data[index];
      return createResultForUrl(url, data);
    });
  }

  if (rawData) {
    return urls.map((url) => ({
      url,
      data: rawData,
      success: true,
      error: null,
    }));
  }

  return urls.map((url) => ({
    url,
    data: null,
    success: false,
    error: 'No data extracted from this URL',
  }));
};

// Create result object for individual URL
const createResultForUrl = (url: string, data: any): ExtractedResult => {
  if (!data) {
    return {
      url,
      data: null,
      success: false,
      error: 'No data extracted from this URL',
    };
  }

  let extractedData = null;
  let hasValidData = false;

  // Check direct object
  if (
    typeof data === 'object' &&
    data !== null &&
    Object.keys(data).length > 0
  ) {
    extractedData = data;
    hasValidData = true;
  }
  // Check nested content/extract/data
  else if (data.content || data.extract || data.data) {
    const nestedData = data.content || data.extract || data.data;

    if (
      typeof nestedData === 'object' &&
      nestedData !== null &&
      Object.keys(nestedData).length > 0
    ) {
      extractedData = nestedData;
      hasValidData = true;
    } else if (typeof nestedData === 'string' && nestedData.trim().length > 0) {
      extractedData = { content: nestedData };
      hasValidData = true;
    }
  }
  // Check string data
  else if (typeof data === 'string' && data.trim().length > 0) {
    try {
      extractedData = JSON.parse(data);
      hasValidData = true;
    } catch {
      extractedData = { content: data };
      hasValidData = true;
    }
  }

  const result = {
    url,
    data: extractedData,
    success: hasValidData,
    error: hasValidData ? null : 'No valid data extracted from this URL',
  };

  return result;
};

export const extract = () => {
  const app = getFirecrawlApp();
  return {
    description: 'Extract data from web pages.',
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .max(10)
        .describe(
          'Array of 10 most relevant URLs to extract data from. LIMIT: Maximum 10 URLs per extraction.',
        ),
      prompt: z
        .string()
        .describe('Description of what specific data to extract'),
    }),
    execute: async ({
      urls,
      prompt,
    }: {
      urls: string[];
      prompt: string;
    }): Promise<ExtractResponse> => {
      if (!urls?.length) {
        return {
          error: 'No URLs provided for extraction',
          success: false,
          data: [],
        };
      }
      const limitedUrls = urls.slice(0, 10);

      if (urls.length > 10) {
        console.warn(`Extract tool: Limited from ${urls.length} to 10 URLs`);
      }

      try {
        const extractResult = await app.extract(limitedUrls, { prompt });

        if (!extractResult.success) {
          return {
            error: `Failed to extract data: ${extractResult.error}`,
            success: false,
            data: [],
          };
        }

        const results = processExtractedData(extractResult.data, limitedUrls);
        const successfulResults = results.filter((r) => r.success && r.data);
        
        const response = {
          data: results,
          success: successfulResults.length > 0,
          summary: {
            total: limitedUrls.length,
            successful: successfulResults.length,
            failed: limitedUrls.length - successfulResults.length,
            totalTokens: 0,
          },
          stopSignal: true,
        };

        return response;
      } catch (error: any) {
        console.error('Extraction error:', error);
        return {
          error: `Extraction failed: ${error.message}`,
          success: false,
          data: [],
        };
      }
    },
  };
};
