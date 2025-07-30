'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn, extractHostname } from '@/lib/utils';
import { Globe, X, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { extract } from '../lib/ai/tools/extract';

interface SearchResult {
  title: string;
  url: string;
  description?: string;
  source?: string;
  icon?: string;
}

interface SearchResultsProps {
  results?: SearchResult[];
  title?: string;
}

export function SearchResults({
  results = [],
  title = 'Search Results...',
}: SearchResultsProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [hoveredResult, setHoveredResult] = useState<number | null>(null);

  const t = useTranslations('errors');

  const searchResults = [...results];

  const displayedResults = searchResults?.slice(0, 3) || [];
  const hiddenResults = searchResults?.length > 3 ? searchResults.slice(3) : [];

  if (!searchResults || searchResults.length === 0) return null;

  const getHostname = (url: string) => {
    try {
      return extractHostname(url);
    } catch {
      return t('unknown');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {displayedResults.map((result, i) => (
          <div
            key={i}
            className="relative"
            onMouseEnter={() => setHoveredResult(i)}
            onMouseLeave={() => setHoveredResult(null)}
          >
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex flex-col h-full p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors',
                'group cursor-pointer',
              )}
            >
              <div className="flex-1">
                <span className="text-sm font-medium line-clamp-1">
                  {result.title}
                </span>
                {result.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {result.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-center size-4 shrink-0 rounded-sm bg-background ring-1 ring-border text-xs font-medium">
                  {result.icon ? (
                    <div className="relative size-3">
                      <Image
                        src={result.icon}
                        alt={result.source || ''}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : result.url ? (
                    <div className="relative size-3">
                      <Image
                        src={`https://www.google.com/s2/favicons?sz=128&domain=${result.url}`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <Globe size={10} />
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {result.source ||
                    (result.url ? getHostname(result.url) : t('unknown'))}
                </span>
              </div>
            </a>

            {hoveredResult === i && result.description && (
              <div className="absolute z-50 w-64 p-3 bg-background shadow-lg rounded-lg border border-border top-full left-0 mt-1">
                <h4 className="font-medium mb-1">{result.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {result.description}
                </p>
                <div className="flex justify-end mt-2">
                  <ExternalLink size={14} className="text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        ))}

        {hiddenResults.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="flex items-center justify-center h-full p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors flex-col gap-5"
            >
              <div className="flex -space-x-2 mr-2">
                {hiddenResults.slice(0, 3).map((result, i) => (
                  <div
                    key={i}
                    className="relative size-5 rounded-full bg-background border border-border overflow-hidden"
                  >
                    {result.icon ? (
                      <Image
                        src={result.icon}
                        alt={result.source || ''}
                        fill
                        className="object-contain"
                      />
                    ) : result.url ? (
                      <Image
                        src={`https://www.google.com/s2/favicons?sz=128&domain=${result.url}`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <Globe size={10} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs font-medium">
                +{hiddenResults.length} sources
              </span>
            </button>

            {showAllSources && (
              <div className="absolute z-50 w-72 p-4 bg-background shadow-lg rounded-lg border border-border top-full right-0 mt-1">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">All Sources</h4>
                  <button
                    onClick={() => setShowAllSources(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {hiddenResults.map((result, i) => (
                    <a
                      key={i}
                      href={result.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 mb-2">
                        <span className="text-sm font-medium line-clamp-1">
                          {result.title || t('untitled')}
                        </span>
                        {result.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {result.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-center size-4 shrink-0 rounded-sm bg-background ring-1 ring-border text-xs font-medium">
                          {result.url ? (
                            <div className="relative size-3">
                              <Image
                                src={`https://www.google.com/s2/favicons?sz=128&domain=${result.url}`}
                                alt=""
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <Globe size={10} />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {result.source ||
                            (result.url
                              ? getHostname(result.url)
                              : t('unknown.source'))}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;
