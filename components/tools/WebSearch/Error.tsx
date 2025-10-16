'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error?: string;
  query?: string;
}

export function Error({ error, query }: ErrorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        <div className="flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Search failed
          </p>
        </div>
      </div>
    </div>
  );
}