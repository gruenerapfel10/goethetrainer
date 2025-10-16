import type { FirecrawlDocument } from '@mendable/firecrawl-js';

export interface SearchDocument {
  url: string;
  title: string;
  description: string;
}

export interface SearchResponse {
  success: boolean;
  data: FirecrawlDocument<undefined>[];
  warning?: string;
  error?: string;
  tokensUsed?: number;
  totalTokensUsed?: number;
  creditsUsed?: number;
}

export interface ScrapeResponse {
  success: boolean;
  markdown: string;
  error?: string;
  tokensUsed?: number;
  totalTokensUsed?: number;
  creditsUsed?: number;
}

export interface ExtractionResponse {
  success: boolean;
  data: {
    summary: string;
  };
  totalTokensUsed?: number;
  tokensUsed?: number;
  creditsUsed?: number;
  error?: string;
}
