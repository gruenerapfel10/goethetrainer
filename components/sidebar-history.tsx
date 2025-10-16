'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import useSWRInfinite from 'swr/infinite';
import { LoaderIcon, PinIcon } from './icons';
import { ChatItem } from './sidebar-history-item';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

type GroupedChats = {
  pinned: Chat[];
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export interface ChatHistory {
  chats: Array<Chat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);
  
  const groups: GroupedChats = {
    pinned: [],
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  };

  // Group chats by date
  chats.forEach((chat) => {
    const group = chat.isPinned
      ? 'pinned'
      : isToday(new Date(chat.updatedAt))
      ? 'today'
      : isYesterday(new Date(chat.updatedAt))
      ? 'yesterday'
      : new Date(chat.updatedAt) > oneWeekAgo
      ? 'lastWeek'
      : new Date(chat.updatedAt) > oneMonthAgo
      ? 'lastMonth'
      : 'older';

    groups[group].push(chat);
  });

  // Sort all groups by date
  Object.values(groups).forEach((group) =>
    group.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  );

  return groups;
};

const updateAndSortChats = (
  chatHistory: ChatHistory,
  chatId: string,
  isPinned: boolean,
): ChatHistory => {
  // Update pin status and resort in one pass
  const updatedChats = chatHistory.chats.map((chat) =>
    chat.id === chatId ? { ...chat, isPinned } : chat,
  );

  const { pinned, today, yesterday, lastWeek, lastMonth, older } =
    groupChatsByDate(updatedChats);

  return {
    ...chatHistory,
    chats: [
      ...pinned,
      ...today,
      ...yesterday,
      ...lastWeek,
      ...lastMonth,
      ...older,
    ],
  };
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) return null;

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({
  user,
  searchQuery = '',
  onSearchResultsChange,
}: {
  user: User | undefined;
  searchQuery?: string;
  onSearchResultsChange?: (count: number) => void;
}) {
  const { setOpenMobile } = useSidebar();
  const { id } = useParams();
  const t = useTranslations();
  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  // Calculate filtered chats for search results count
  React.useEffect(() => {
    if (!paginatedChatHistories || !onSearchResultsChange) return;

    let filteredChats = paginatedChatHistories.flatMap(
      (paginatedChatHistory) => paginatedChatHistory.chats,
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredChats = filteredChats.filter((chat) => {
        const title = (chat.customTitle || chat.title || '').toLowerCase();
        return title.includes(query);
      });
    }

    onSearchResultsChange(filteredChats.length);
  }, [paginatedChatHistories, searchQuery, onSearchResultsChange]);

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });

        return 'Chat deleted successfully';
      },
      error: 'Failed to delete chat',
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push('/');
    }
  };

  const handleRename = async (chatId: string, newTitle: string) => {
    const renamePromise = fetch(`/api/chat/rename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, customTitle: newTitle }),
    });

    toast.promise(renamePromise, {
      loading: 'Renaming chat...',
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.map((chat) =>
                chat.id === chatId ? { ...chat, customTitle: newTitle } : chat,
              ),
            }));
          }
        });

        return 'Chat renamed successfully';
      },
      error: 'Failed to rename chat',
    });
  };

  const handleTogglePin = async (chatId: string, isPinned: boolean) => {
    // Optimistically update
    mutate(
      (chatHistories) =>
        chatHistories?.map((history) =>
          updateAndSortChats(history, chatId, isPinned),
        ),
      false,
    );

    try {
      await fetch('/api/chat/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, isPinned }),
      });
      mutate(); // Revalidate on success
    } catch (error) {
      // Revert on error
      mutate(
        (chatHistories) =>
          chatHistories?.map((history) =>
            updateAndSortChats(history, chatId, !isPinned),
          ),
        false,
      );
      toast.error(isPinned ? 'Failed to pin chat' : 'Failed to unpin chat');
    }
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="pt-1 flex-1 min-h-0">
        <SidebarGroupContent 
          className="overflow-y-scroll mobile-scroll"
        >
          <SidebarMenu>
            {paginatedChatHistories &&
              (() => {
                let chatsFromHistory = paginatedChatHistories.flatMap(
                  (paginatedChatHistory) => paginatedChatHistory.chats,
                );

                // Deduplicate by ID (keep first occurrence)
                const seenIds = new Set<string>();
                chatsFromHistory = chatsFromHistory.filter((chat) => {
                  if (seenIds.has(chat.id)) return false;
                  seenIds.add(chat.id);
                  return true;
                });

                // Filter chats based on search query
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  chatsFromHistory = chatsFromHistory.filter((chat) => {
                    const title = (
                      chat.customTitle ||
                      chat.title ||
                      ''
                    ).toLowerCase();
                    return title.includes(query);
                  });
                }

                const groupedChats = groupChatsByDate(chatsFromHistory);
                const pinnedCount = groupedChats.pinned.length;

                // Show empty state if searching and no results
                if (searchQuery.trim() && chatsFromHistory.length === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center py-8 px-4 text-center"
                    >
                      <div className="rounded-full bg-sidebar-accent/30 p-3 mb-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('chat.noSearchResults')}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        &ldquo;{searchQuery}&rdquo;
                      </p>
                    </motion.div>
                  );
                }
                return (
                  <div className="flex flex-col gap-6">
                    {groupedChats.pinned.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 flex items-center gap-1.5">
                          <PinIcon className="h-3 w-3" />
                          {t('chat.pinnedChats')}
                        </div>
                        {groupedChats.pinned.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => {
                              setDeleteId(chatId);
                              setShowDeleteDialog(true);
                            }}
                            onRename={handleRename}
                            onTogglePin={handleTogglePin}
                            setOpenMobile={setOpenMobile}
                            pinnedCount={pinnedCount}
                          />
                        ))}
                      </div>
                    )}

                    {groupedChats.today.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                          {t('timeframes.today')}
                        </div>
                        {groupedChats.today.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => {
                              setDeleteId(chatId);
                              setShowDeleteDialog(true);
                            }}
                            onRename={handleRename}
                            onTogglePin={handleTogglePin}
                            setOpenMobile={setOpenMobile}
                            pinnedCount={pinnedCount}
                          />
                        ))}
                      </div>
                    )}

                    {groupedChats.yesterday.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                          {t('timeframes.yesterday')}
                        </div>
                        {groupedChats.yesterday.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => {
                              setDeleteId(chatId);
                              setShowDeleteDialog(true);
                            }}
                            onRename={handleRename}
                            onTogglePin={handleTogglePin}
                            setOpenMobile={setOpenMobile}
                            pinnedCount={pinnedCount}
                          />
                        ))}
                      </div>
                    )}

                    {groupedChats.lastWeek.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                          {t('timeframes.days7')}
                        </div>
                        {groupedChats.lastWeek.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => {
                              setDeleteId(chatId);
                              setShowDeleteDialog(true);
                            }}
                            onRename={handleRename}
                            onTogglePin={handleTogglePin}
                            setOpenMobile={setOpenMobile}
                            pinnedCount={pinnedCount}
                          />
                        ))}
                      </div>
                    )}

                    {groupedChats.lastMonth.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                          {t('timeframes.days30')}
                        </div>
                        {groupedChats.lastMonth.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => {
                              setDeleteId(chatId);
                              setShowDeleteDialog(true);
                            }}
                            onRename={handleRename}
                            onTogglePin={handleTogglePin}
                            setOpenMobile={setOpenMobile}
                            pinnedCount={pinnedCount}
                          />
                        ))}
                      </div>
                    )}

                    {groupedChats.older.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                          {t('timeframes.older')}
                        </div>
                        {groupedChats.older.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => {
                              setDeleteId(chatId);
                              setShowDeleteDialog(true);
                            }}
                            onRename={handleRename}
                            onTogglePin={handleTogglePin}
                            setOpenMobile={setOpenMobile}
                            pinnedCount={pinnedCount}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
          </SidebarMenu>

          <motion.div
            onViewportEnter={() => {
              if (!isValidating && !hasReachedEnd) {
                setSize((size) => size + 1);
              }
            }}
          />

          {hasReachedEnd ? (
            <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 mt-8">
              You have reached the end of your chat history.
            </div>
          ) : (
            <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center mt-8">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div>Loading Chats...</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('warnings.areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('warnings.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('actions.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
