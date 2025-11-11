'use client';

import React from 'react';
import { Loader2, } from 'lucide-react';

interface LoadingProps {
  urls?: string[];
  prompt?: string;
}

export function Loading({ urls, prompt }: LoadingProps) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
        <div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Extracting from {urls?.length || 0} {urls?.length === 1 ? 'URL' : 'URLs'}
          </p>
          {prompt && (
            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
              {prompt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}