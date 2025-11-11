'use client';

import { FileText } from 'lucide-react';
import { type SearchResult, getUrlSrc } from './utils';

interface SourcesListProps {
  sources: SearchResult[];
}

export function SourcesList({ sources }: SourcesListProps) {
  return (
    <div className="space-y-2">
      {sources?.map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <img
                src={getUrlSrc(source.url)}
                alt=""
                className="w-4 h-4"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden">
                <FileText className="h-4 w-4 text-neutral-500" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium leading-tight">
                {source.title}
              </h4>
              {source.description && (
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                  {source.description}
                </p>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}