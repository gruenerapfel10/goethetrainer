'use client';

import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRightSidebar } from '@/lib/right-sidebar-context';

export function RightSidebarToggle() {
  const { toggle, isOpen } = useRightSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 gap-2 text-sm font-normal hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      onClick={toggle}
    >
      <PanelRight className="h-4 w-4" />
    </Button>
  );
}
