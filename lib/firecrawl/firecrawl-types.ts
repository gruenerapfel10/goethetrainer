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
}

export interface ScrapeResponse {
  success: boolean;
  markdown: string;
  error?: string;
}

export interface ExtractionResponse {
  success: boolean;
  data: {
    summary: string;
  };
  totalTokensUsed?: number;
  error?: string;
}
