'use client';

import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
} from '@/components/ui/sidebar';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { SidebarChat } from './sidebar-chat';
import { generateUUID } from '@/lib/utils';

export function AppRightbar() {
  const { isOpen } = useRightSidebar();
  const [chatId, setChatId] = useState<string>('');

  useEffect(() => {
    setChatId(generateUUID());
  }, []);

  if (!isOpen) return null;

  if (!chatId) return null;

  return (
    <Sidebar side="right" variant="sidebar" collapsible="none">
      <SidebarContent className="p-0 flex flex-col">
        <SidebarChat 
          id={chatId}
          initialMessages={[]}
          selectedChatModel="gpt-4"
          isReadonly={false}
          isAdmin={false}
          selectedVisibilityType="private"
        />
      </SidebarContent>
    </Sidebar>
  );
}
