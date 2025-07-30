'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useArtifactPanel } from './artifact-provider';

export const ArtifactInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, children, ...props }, ref) => {
  const { isOpen, width } = useArtifactPanel();

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex-1 transition-all duration-300 ease-in-out',
        className
      )}
      style={{
        marginRight: isOpen ? `${width}%` : '0',
      }}
      {...props}
    >
      {children}
    </div>
  );
});

ArtifactInset.displayName = 'ArtifactInset';