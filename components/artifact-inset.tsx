'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const ArtifactInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex-1 min-w-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

ArtifactInset.displayName = 'ArtifactInset';