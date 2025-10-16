'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error?: string;
  prompt?: string;
}

export function Error({ error, prompt }: ErrorProps) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 my-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-4 w-4 text-neutral-500" />
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Extraction failed
        </p>
      </div>
    </div>
  );
}