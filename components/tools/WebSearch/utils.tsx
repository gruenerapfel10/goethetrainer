'use client';

import { isValidUrl } from '@/lib/utils';

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

export const getUrlSrc = (url: string) => {
  if (isValidUrl(url)) {
    return `https://www.google.com/s2/favicons?domain=${
      new URL(url).hostname
    }&sz=128`;
  }
  return '/public/icons/file.svg';
};