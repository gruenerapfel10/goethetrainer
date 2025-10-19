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

  // Use the improved Sidebar component with externalOpen prop
  return (
    <Sidebar
      side="right"
      resizable={true}
      collapsible="none"
      externalOpen={isOpen}
      className={cn(
        "flex-shrink-0"
      )}
    >
      {isOpen && chatId && (
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
      )}
    </Sidebar>
  );
}