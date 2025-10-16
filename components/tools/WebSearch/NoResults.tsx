'use client';

interface NoResultsProps {
  query?: string;
  isArtifactVisible?: boolean;
}

const EmptySkeletonCard = ({ delay = 0 }: { delay?: number }) => (
  <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 aspect-[4/3] flex flex-col relative overflow-hidden">
    {/* Large faded backdrop question mark */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="text-[96px] text-neutral-200 dark:text-neutral-700 opacity-15 dark:opacity-20 font-bold">
        ?
      </span>
    </div>
    
    {/* Content over backdrop */}
    <div className="relative z-10 flex items-start gap-2">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
          <span className="text-neutral-400 text-lg font-bold">?</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
      </div>
    </div>
    <div className="space-y-1.5 mt-3 flex-1 relative z-10">
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-4/5" />
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
    </div>
  </div>
);

export function NoResults({ query, isArtifactVisible }: NoResultsProps) {
  return (
    <div className="space-y-3">
      <div
        className={`grid ${
          isArtifactVisible
            ? 'grid-cols-1 gap-2'
            : 'grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-2'
        }`}
      >
        <EmptySkeletonCard delay={0} />
        <EmptySkeletonCard delay={200} />
        <EmptySkeletonCard delay={400} />
      </div>
      <div className="text-center py-4">
        <p className="text-sm text-neutral-500">
          No results found for &quot;{query}&quot;
        </p>
      </div>
    </div>
  );
}