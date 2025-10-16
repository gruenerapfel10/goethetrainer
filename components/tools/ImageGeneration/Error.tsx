'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error?: string;
  prompt?: string;
}

export function Error({ error, prompt }: ErrorProps) {
  return (
    <div className="inline-block rounded-full border border-border/50 bg-gradient-to-r from-neutral-50 via-background to-neutral-50 dark:from-neutral-900 dark:via-background dark:to-neutral-900 px-3 sm:px-5 py-2 sm:py-2.5 my-2 sm:my-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs sm:text-sm text-muted-foreground">Generation failed</p>
      </div>
    </div>
  );
}