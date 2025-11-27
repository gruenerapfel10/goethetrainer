'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useRightSidebar } from '@/lib/right-sidebar-context';
import { Chat } from './chat';
import { Sidebar } from '@/components/ui/sidebar';
import { generateUUID, fetcher } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AgentType } from '@/lib/ai/agents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReadingListPanel } from '@/components/reading-list/ReadingListPanel';
import { REQUEST_CHAT_PROMPT_EVENT, type ChatPromptEventDetail } from '@/lib/chat/events';

export function AppRightbar() {
  const { isOpen, setOpen } = useRightSidebar();
  const [chatId, setChatId] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'reading'>('chat');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    // Only generate a new chat ID when the sidebar opens
    if (isOpen && activeTab === 'chat' && !chatId) {
      setChatId(generateUUID());
    }
  }, [isOpen, chatId, activeTab]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ChatPromptEventDetail>;
      const text = custom.detail?.text;
      if (!text) {
        return;
      }
      setOpen(true);
      setActiveTab('chat');
      setPendingPrompt(text);
    };

    window.addEventListener(REQUEST_CHAT_PROMPT_EVENT, handler as EventListener);
    return () => window.removeEventListener(REQUEST_CHAT_PROMPT_EVENT, handler as EventListener);
  }, [setOpen]);

  const shouldLoadChat = Boolean(isOpen && activeTab === 'chat' && chatId);
  const { data: chatData, error } = useSWR<{ messages: any[]; title?: string }>(
    shouldLoadChat ? `/api/chat/${chatId}` : null,
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

  return (
    <Sidebar
      side="right"
      resizable={true}
      collapsible="none"
      open={isOpen}
      onOpenChange={setOpen}
      className={cn(
        "flex-shrink-0 bg-[hsl(var(--content-color))] text-foreground"
      )}
    >
      {isOpen && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'chat' | 'reading')}
          className="flex h-full flex-col overflow-hidden"
        >
          <div className="px-4 py-2">
            <TabsList className="grid grid-cols-2 bg-transparent p-0 border-0">
              <TabsTrigger
                value="chat"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground px-0 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="reading"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground px-0 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent"
              >
                Reading List
              </TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="chat" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
          {chatId ? (
            <div className="h-full">
              <Chat
                key={chatId}
                id={chatId}
                initialMessages={chatData?.messages || []}
                selectedChatModel={AgentType.GOETHE_AGENT}
                isReadonly={false}
                isAdmin={false}
                selectedVisibilityType="private"
                onChatChange={setChatId}
                chat={chatData?.title ? { title: chatData.title } : undefined}
                pendingPrompt={pendingPrompt}
                onPromptConsumed={() => setPendingPrompt(null)}
                variant="sidebar"
                shouldUpdateUrl={false}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Chat is unavailable. Close and reopen the sidebar to start a new conversation.
            </div>
            )}
          </TabsContent>

          <TabsContent
            value="reading"
            className="flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
            <ReadingListPanel />
          </TabsContent>
        </Tabs>
      )}
    </Sidebar>
  );
}
