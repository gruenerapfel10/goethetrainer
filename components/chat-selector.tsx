'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
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
  MessageIcon,
  ArrowUpIcon,
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
  onExport,
}: {
  currentChatId: string;
  onChatSelect: (chatId: string) => void;
  className?: string;
  buttonVariant?: "ghost" | "outline";
  buttonClassName?: string;
  chevronDirection?: "up" | "down";
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

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === optimisticChatId),
    [optimisticChatId, chats],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 w-full">
        <DropdownMenuTrigger
          asChild
          className={cn(
            'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground shrink-0 flex-1',
            className,
          )}
        >
          <Button 
            variant={buttonVariant} 
            className={buttonClassName || "h-8 px-3 gap-2 text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full justify-between"}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MessageIcon size={14} />
              <span className="hidden sm:inline truncate max-w-[100px]">{selectedChat?.title || 'Chat'}</span>
            </div>
            <ChevronDownIcon className={cn("h-4 w-4 flex-shrink-0", chevronDirection === "up" && "rotate-180")} />
          </Button>
        </DropdownMenuTrigger>
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={onExport}
            title="Open in full view"
          >
            <ArrowUpIcon size={14} />
          </Button>
        )}
      </div>
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
        {chats.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No chats yet
          </div>
        ) : (
          chats.map((chat) => (
            <DropdownMenuItem
              key={chat.id}
              onSelect={() => {
                setOpen(false);
                startTransition(() => {
                  setOptimisticChatId(chat.id);
                  onChatSelect(chat.id);
                });
              }}
              className="gap-2 md:gap-4 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
              data-active={chat.id === optimisticChatId}
            >
              <div className="flex flex-row gap-3 items-start min-w-0">
                <MessageIcon 
                  size={16} 
                  className={cn(
                    "mt-0.5 flex-shrink-0",
                    chat.id === optimisticChatId ? "text-foreground" : "text-muted-foreground"
                  )} 
                />
                <div className="flex flex-col gap-1 items-start min-w-0">
                  <div className="truncate">{chat.title}</div>
                </div>
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
