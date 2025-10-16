'use client';

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  query?: string;
  isArtifactVisible?: boolean;
}

const SkeletonCard = ({ delay = 0 }: { delay?: number }) => (
  <article
    className={cn(
      "relative flex flex-col min-h-0",
      "bg-card",
      "border border-border/50",
      "rounded-lg overflow-hidden",
      "animate-pulse",
      "h-auto"
    )}
    style={{
      animationDelay: `${delay}ms`
    }}
  >
    {/* Card Content - matching padding from Loaded.tsx */}
    <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">
      {/* Header with favicon and title */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-muted animate-pulse flex items-center justify-center">
          <FileText className="w-4 h-4 text-muted-foreground/30" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>
      </div>
      
      {/* Description skeleton */}
      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded w-full animate-pulse" />
        <div className="h-3 bg-muted rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
      </div>
    </div>
  </article>
);

const SkeletonMoreCard = ({ delay = 0 }: { delay?: number }) => (
  <div
    className={cn(
      "relative flex flex-col min-h-0",
      "bg-gradient-to-b from-secondary/30 to-secondary/50",
      "border border-dashed border-border/60",
      "rounded-lg overflow-hidden",
      "animate-pulse",
      "h-auto items-center justify-center py-4 px-2"
    )}
    style={{
      animationDelay: `${delay}ms`
    }}
  >
    {/* Overlapping source icons skeleton */}
    <div className="flex items-center justify-center mb-1.5">
      <div className="flex -space-x-3">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-muted border border-border animate-pulse"
            style={{ zIndex: 3 - idx }}
          />
        ))}
      </div>
    </div>
    
    {/* Text skeleton */}
    <div className="text-center">
      <div className="h-4 bg-muted rounded w-16 mx-auto animate-pulse mb-1" />
      <div className="h-3 bg-muted rounded w-12 mx-auto animate-pulse" />
    </div>
  </div>
);

export function Loading({ query, isArtifactVisible }: LoadingProps) {
  return (
    <div className="w-full space-y-3">
      {/* Results Container */}
      <div className="w-full">
        {/* Results Grid - matching Loaded.tsx grid structure */}
        <div className={cn(
          "grid gap-2 sm:gap-3 transition-all duration-300",
          isArtifactVisible 
            ? "grid-cols-1 max-w-full" 
            : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4" // 2x2 on mobile, 4 across on desktop
        )}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={30} />
          <SkeletonCard delay={60} />
          <SkeletonMoreCard delay={90} />
        </div>
      </div>
      
      {/* Results summary skeleton */}
      <div className="text-center">
        <div className="h-3 bg-muted rounded w-32 mx-auto animate-pulse" />
      </div>
    </div>
  );
}