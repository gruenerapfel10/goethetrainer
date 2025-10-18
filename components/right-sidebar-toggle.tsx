'use client';

import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RightSidebarToggle({ 
  isVisible, 
  onToggle 
}: { 
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-10 w-10 gap-2 text-sm font-normal hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
        isVisible ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
      }`}
      title={isVisible ? 'Close sidebar' : 'Open sidebar'}
      onClick={onToggle}
    >
      <PanelRight className="h-4 w-4" />
    </Button>
  );
}
