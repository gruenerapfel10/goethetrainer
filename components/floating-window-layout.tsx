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
    <div className="min-h-screen bg-background p-3 md:p-4">
      {/* Floating window container */}
      <div className={cn(
        "w-full h-full flex flex-col rounded-xl bg-background border border-border/30 overflow-hidden shadow-lg",
        className
      )}>
        {children}
      </div>
    </div>
  );
}
