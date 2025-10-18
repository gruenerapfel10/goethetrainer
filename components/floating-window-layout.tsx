'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FloatingWindowLayoutProps {
  children: ReactNode;
  className?: string;
}

export function FloatingWindowLayout({ 
  children, 
  className 
}: FloatingWindowLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row p-3 md:p-4 gap-3 md:gap-4">
      {/* This wrapper creates the "toad in the hole" effect with padding/gap around content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className={cn(
          "flex-1 flex flex-col rounded-lg border border-border/50 bg-background overflow-hidden",
          "shadow-sm",
          className
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}
