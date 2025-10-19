'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { SidebarChat } from './sidebar-chat';
import { Sidebar } from '@/components/ui/sidebar';
import { generateUUID, fetcher } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function AppRightbar() {
  const { isOpen } = useRightSidebar();
  const [chatId, setChatId] = useState('');

  useEffect(() => {
    // Only generate a new chat ID when the sidebar opens
    if (isOpen && !chatId) {
      setChatId(generateUUID());
    }
  }, [isOpen, chatId]);

  const { data: chatData, error } = useSWR<{ messages: any[]; title?: string }>(
    chatId && isOpen ? `/api/chat/${chatId}` : null,
    fetcher,
    { 
      revalidateOnFocus: false,
      // Don't retry on 404 errors
      shouldRetryOnError: (error) => {
        if (error?.status === 404) return false;
        return true;
      }
    }
  );

  // Don't render the sidebar at all if it's not open
  if (!isOpen) {
    return (
      <Sidebar
        side="right"
        resizable={true}
        collapsible="none"
        className="w-0 overflow-hidden"
      />
    );
  }

  if (!chatId) return null;

  // Use custom styles for right sidebar width
  return (
    <Sidebar
      side="right"
      resizable={true}
      collapsible="none"
      className={cn(
        "flex-shrink-0",
        "w-[30rem]"
      )}
    >
      <div className="p-0 flex flex-col h-full overflow-hidden">
        <SidebarChat 
          key={chatId}
          id={chatId} 
          initialMessages={chatData?.messages || []} 
          selectedChatModel="gpt-4" 
          isReadonly={false} 
          isAdmin={false} 
          selectedVisibilityType="private" 
          onChatChange={setChatId}
          chat={chatData?.title ? { title: chatData.title } : undefined}
        />
      </div>
    </Sidebar>
  );
}
