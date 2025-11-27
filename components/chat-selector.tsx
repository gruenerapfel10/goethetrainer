'use client';

import { startTransition, useEffect, useMemo, useOptimistic, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import {
  CheckCircleFillIcon,
  ChevronDownIcon,
} from './icons';

export interface ChatItem {
  id: string;
  title: string;
}

export function ChatSelector({
  currentChatId,
  onChatSelect,
  className,
  buttonVariant = "ghost",
  buttonClassName,
  chevronDirection = "up",
  isLoading,
  chatTitle,
  isTitleGenerating,
  onExport,
}: {
  currentChatId: string;
  onChatSelect: (chatId: string) => void;
  className?: string;
  buttonVariant?: "ghost" | "outline";
  buttonClassName?: string;
  chevronDirection?: "up" | "down";
  isLoading?: boolean;
  chatTitle?: string;
  isTitleGenerating?: boolean;
  onExport?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: chats = [] } = useSWR<ChatItem[]>(
    '/api/chats',
    fetcher,
    { revalidateOnFocus: false }
  );

  const [optimisticChatId, setOptimisticChatId] = useOptimistic(currentChatId);

  const chatsWithCurrent = useMemo(() => {
    const exists = chats.some((chat) => chat.id === optimisticChatId);
    if (exists || (!chatTitle && !isTitleGenerating)) return chats;
    return [
      { id: optimisticChatId, title: chatTitle || 'New Chat' },
      ...chats,
    ];
  }, [chats, optimisticChatId, chatTitle, isTitleGenerating]);

  const selectedChat = useMemo(
    () => chatsWithCurrent.find((chat) => chat.id === optimisticChatId),
    [optimisticChatId, chatsWithCurrent],
  );

  useEffect(() => {
    if (currentChatId && currentChatId !== optimisticChatId) {
      startTransition(() => {
        setOptimisticChatId(currentChatId);
      });
    }
  }, [currentChatId, optimisticChatId, setOptimisticChatId]);

  const handleSelect = (chatId: string) => {
    setOpen(false);
    startTransition(() => {
      setOptimisticChatId(chatId);
      onChatSelect(chatId);
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'inline-flex data-[state=open]:bg-transparent data-[state=open]:text-foreground shrink-0',
          className,
        )}
      >
        <Button
          variant={buttonVariant}
          className={buttonClassName || "h-8 px-2 gap-2 text-sm font-normal bg-transparent hover:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 justify-between w-auto"}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isLoading && (
              <span className="h-3 w-3 animate-pulse rounded-full bg-white/70" />
            )}
            {isTitleGenerating ? (
              <span className="hidden sm:inline h-3 w-20 rounded-full bg-muted animate-pulse" />
            ) : (
              <span className="hidden sm:inline block truncate max-w-[180px] md:max-w-[260px]">
                {selectedChat?.title || chatTitle || 'New Chat'}
              </span>
            )}
          </div>
          <ChevronDownIcon className={cn("h-4 w-4 flex-shrink-0", chevronDirection === "up" && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isMobile ? "center" : "start"} 
        side="top" 
        className={cn(
          "border-border/30 rounded-xl bg-muted",
          isMobile 
            ? "w-[calc(100vw-2rem)] max-w-[300px] min-w-[250px]" 
            : "w-[400px]"
        )}
        sideOffset={4}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={16}
      >
        {chatsWithCurrent.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No chats yet
          </div>
        ) : (
          chatsWithCurrent.map((chat) => (
            <DropdownMenuItem
              key={chat.id}
              onSelect={(e) => {
                e.preventDefault();
                handleSelect(chat.id);
              }}
              onClick={(e) => {
                e.preventDefault();
                handleSelect(chat.id);
              }}
              className="gap-2 md:gap-4 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
              data-active={chat.id === optimisticChatId}
            >
              <div className="flex flex-col gap-1 items-start min-w-0">
                <div className="truncate">{chat.title}</div>
              </div>

              <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100 flex-shrink-0">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
