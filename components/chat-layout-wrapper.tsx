'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  
  return (
    <div className={cn(
      "w-full h-full",
      // When sidebar is expanded, add padding to accommodate it
      // Also add extra padding for the absolutely positioned elements (180px + some buffer)
      state === 'expanded' ? 'pl-0 md:pl-[calc(16rem+180px)]' : 'pl-0 md:pl-[180px]'
    )}>
      {children}
    </div>
  );
}