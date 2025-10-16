'use client';

import { FileText, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  type: 'web' | 'analysis';
}

export function EmptyState({ type }: EmptyStateProps) {
  const icons = {
    web: FileText,
    analysis: Sparkles,
  } as const;
  const Icon = icons[type];

  const messages = {
    web: 'Web sources will appear here once found',
    analysis: 'Analysis results will appear here once complete',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-800">
      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-neutral-400" />
      </div>
      <p className="text-sm text-neutral-500 text-center">{messages[type]}</p>
    </div>
  );
}