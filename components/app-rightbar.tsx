'use client';

import { useEffect, useState } from 'react';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { SidebarChat } from './sidebar-chat';
import { generateUUID } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_BASE_CLASSES, SIDEBAR_TRANSITION } from '@/lib/sidebar-constants';

export function AppRightbar() {
  const { isOpen } = useRightSidebar();
  const [chatId, setChatId] = useState('');

  useEffect(() => setChatId(generateUUID()), []);

  if (!chatId) return null;

  return (
    <aside 
      className={cn(
        SIDEBAR_BASE_CLASSES,
        SIDEBAR_TRANSITION,
        "flex-shrink-0",
        isOpen ? "w-[30rem]" : "w-0"
      )}
      data-state={isOpen ? 'expanded' : 'collapsed'}
      data-side="right"
    >
      <div className="p-0 flex flex-col h-full overflow-hidden">
        <SidebarChat id={chatId} initialMessages={[]} selectedChatModel="gpt-4" isReadonly={false} isAdmin={false} selectedVisibilityType="private" onChatChange={setChatId} />
      </div>
    </aside>
  );
}
