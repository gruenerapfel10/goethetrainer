'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { SidebarChat } from './sidebar-chat';
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

  // Simple div with direct width control - no complex sidebar component
  return (
    <div
      className={cn(
        "bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out overflow-hidden flex-shrink-0",
        !isOpen && "w-0"
      )}
      style={{ width: isOpen ? '480px' : '0px' }}
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
    </div>
  );
}