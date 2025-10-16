'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface NoResultsProps {
  prompt?: string;
  urls?: string[];
}

export function NoResults({ prompt, urls }: NoResultsProps) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
      <div className="flex flex-col items-center justify-center py-4 space-y-3">
        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <Globe className="h-6 w-6 text-neutral-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            No data extracted
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {urls && urls.length > 0 
              ? `Unable to extract data from ${urls.length} URL${urls.length > 1 ? 's' : ''}`
              : 'No URLs provided for extraction'
            }
          </p>
          {prompt && (
            <p className="text-xs text-neutral-400 mt-2 max-w-sm mx-auto line-clamp-2">
              Prompt: "{prompt}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}