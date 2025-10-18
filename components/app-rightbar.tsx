'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar';

export function AppRightbar() {
  return (
    <Sidebar side="right" variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="space-y-2">
          <div className="text-sm font-semibold">Properties</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="text-sm text-muted-foreground p-2">
          Rightbar content goes here
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
