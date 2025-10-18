'use client';

import {
  Sidebar,
  SidebarContent,
} from '@/components/ui/sidebar';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { Chat } from './chat';

export function AppRightbar() {
  const { isOpen } = useRightSidebar();

  if (!isOpen) return null;

  return (
    <Sidebar side="right" variant="sidebar" collapsible="none">
      <SidebarContent className="p-0 flex flex-col">
        <Chat 
          id="right-sidebar-chat"
          initialMessages={[]}
          selectedChatModel="gpt-4"
          isReadonly={false}
          isAdmin={false}
          selectedVisibilityType="private"
          shouldUpdateUrl={false}
        />
      </SidebarContent>
    </Sidebar>
  );
}
