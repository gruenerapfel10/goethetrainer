import { isValidUrl } from '@/lib/utils';

export interface ExtractedResult {
  url: string;
  data: any;
  success: boolean;
  error: string | null;
}

export interface ExtractSummary {
  total: number;
  successful: number;
  failed: number;
  totalTokens: number;
}

export const getUrlSrc = (url: string) => {
  if (isValidUrl(url)) {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`;
  }
  return null;
};

export const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const formatDisplayData = (data: any): string | null => {
  if (!data) return null;
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (data.content) {
    return data.content;
  }
  
  return JSON.stringify(data, null, 2);
};