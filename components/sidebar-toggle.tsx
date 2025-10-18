'use client';

import { PanelLeft, PanelRight } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { Button } from '@/components/ui/button';

const BUTTON_CLASS = 'h-10 w-10 gap-2 text-sm font-normal hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0';

export function SidebarToggle() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button type="button" onClick={toggleSidebar} variant="ghost" size="icon" className={BUTTON_CLASS} title="Toggle sidebar">
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

export function RightSidebarToggle() {
  const { toggle } = useRightSidebar();
  return (
    <Button type="button" onClick={toggle} variant="ghost" size="icon" className={BUTTON_CLASS} title="Toggle sidebar">
      <PanelRight className="h-4 w-4" />
    </Button>
  );
}
