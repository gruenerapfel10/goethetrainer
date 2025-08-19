import type {
  SearchResponse,
  ScrapeResponse,
  ExtractionResponse,
} from './firecrawl-types';

export default class FirecrawlApp {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey?: string) {
    if (!baseUrl) {
      console.warn('Firecrawl baseUrl is required');
    }
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: options.body,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl API error:', errorText);
      throw new Error(`Firecrawl request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async search(
    query: string,
    options: { limit: number },
  ): Promise<SearchResponse> {
    return this.makeRequest('/v1/search', {
      method: 'POST',
      body: JSON.stringify({ query: query, limit: options?.limit ?? 10 }),
    });
  }

  async extract(
    urls: string[],
    options: { prompt: string },
  ): Promise<ExtractionResponse> {
    return await this.makeRequest('/v1/extract', {
      method: 'POST',
      body: JSON.stringify({ urls, prompt: options.prompt }),
    });
  }

  async scrapeUrl(url: string): Promise<ScrapeResponse> {
    const response = await this.makeRequest('/v1/scrape', {
      method: 'POST',
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        timeout: 20000,
      }),
    });

    return {
      success: response.success,
      markdown: response.data.markdown,
      error: response.error,
    };
  }
}
