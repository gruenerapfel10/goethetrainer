'use client';

import React, { useEffect, } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UseCase, Message } from '../common/types'; // Adjusted import path
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUseCaseMessages } from '@/lib/use-cases/hooks/useUseCaseMessages';
import { useTranslations } from 'next-intl';

const MESSAGES_API_URL_BASE = '/api/messages'; // /api/messages/[useCaseId]

// Custom scroll indicator component
const ScrollIndicator = ({
  messages,
  useCaseMessageIds,
}: {
  messages: Message[];
  useCaseMessageIds: Set<string>;
}): JSX.Element | null => {
  const totalMessages = messages.length;
  if (totalMessages === 0) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-2 bg-muted">
      {messages.map((message: Message, index: number) => {
        const isUseCaseMessage = useCaseMessageIds.has(message.id);
        if (!isUseCaseMessage) return null;

        const position = (index / totalMessages) * 100;
        return (
          <div
            key={message.id}
            className="absolute w-full h-1 bg-primary"
            style={{ top: `${position}%` }}
          />
        );
      })}
    </div>
  );
};

interface UseCaseModalProps {
  useCase: UseCase | null;
  isOpen: boolean;
  onClose: () => void;
  onShowFullChat: (useCase: UseCase) => void;
}

export function UseCaseModal({
  useCase,
  isOpen,
  onClose,
  onShowFullChat,
}: UseCaseModalProps): JSX.Element | null {
  const {
    messages,
    fullChatMessages,
    isLoading,
    error,
    showFullChat,
    fetchUseCaseMessages,
    fetchFullChatMessages,
    toggleFullChat,
    resetState,
    clearCache,
  } = useUseCaseMessages();

  const t = useTranslations('dashboard.topUseCases.modal.useCase');

  useEffect((): void => {
    console.log('[UseCaseModal] Effect triggered:', {
      isOpen,
      useCase,
      showFullChat,
    });
    if (isOpen && useCase) {
      console.log(`[UseCaseModal] UseCase details:`, {
        id: useCase.id,
        chatId: useCase.chatId,
        title: useCase.title,
      });

      // Fetch use case messages when opening
      fetchUseCaseMessages(useCase.id);

      // Fetch full chat if showing full chat and we have a chat ID
      if (showFullChat && useCase.chatId) {
        fetchFullChatMessages(useCase.chatId, useCase.id);
      }
    }

    // Reset state when modal closes
    if (!isOpen) {
      console.log('[UseCaseModal] Modal closed, resetting state');
      resetState();
    }
  }, [
    isOpen,
    useCase,
    showFullChat,
    fetchUseCaseMessages,
    fetchFullChatMessages,
    resetState,
  ]);

  const handleShowFullChat = (): void => {
    console.log('[UseCaseModal] Show full chat clicked:', {
      chatId: useCase?.chatId,
      currentShowFullChat: showFullChat,
    });
    if (useCase?.chatId) {
      onShowFullChat(useCase);
      toggleFullChat(useCase);
    }
  };

  const renderMessageContent = (content: any): JSX.Element => {
    console.log('content', content);
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((item, index) => (
            <div key={index} className="border-l-2 pl-2">
              {renderMessageContent(item)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof content !== 'object' || content === null) {
      return (
        <p className="text-sm break-words whitespace-pre-wrap">
          {String(content)}
        </p>
      );
    }

    // Handle the text before any tool calls
    if (content.text) {
      return (
        <p className="text-sm whitespace-pre-wrap break-words mb-2">
          {content.text}
        </p>
      );
    }

    // Handle tool calls
    if (content.type === 'tool-call' || content.type === 'tool_call') {
      const toolName = content.toolName || content.tool_name || '';
      const args = content.args || {};

      // Special handling for search results
      if (toolName === 'search' && args.query) {
        return (
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="p-1.5 rounded-md bg-primary/10">
                <svg
                  className="w-4 h-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="font-medium text-primary">Search Results</span>
              <span className="text-sm text-muted-foreground">
                for &quot;{args.query}&quot;
              </span>
            </div>
            {content.result?.data?.map((result: any, index: number) => (
              <div
                key={index}
                className="p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors"
              >
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block space-y-1.5"
                >
                  <h4 className="font-medium text-primary hover:underline">
                    {result.title}
                  </h4>
                  {result.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.description}
                    </p>
                  )}
                  <div className="w-full overflow-hidden">
                    <p className="text-xs text-muted-foreground break-all whitespace-normal line-clamp-1">
                      {result.url}
                    </p>
                  </div>
                </a>
              </div>
            ))}
          </div>
        );
      }

      // Special handling for updateDocument tool
      if (toolName === 'updateDocument') {
        return (
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="p-1.5 rounded-md bg-primary/10">
                <svg
                  className="w-4 h-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span className="font-medium text-primary">Document Update</span>
            </div>
            {args.description && (
              <div className="pl-4 pt-2">
                <p className="whitespace-pre-wrap break-words text-sm">
                  {args.description}
                </p>
              </div>
            )}
          </div>
        );
      }

      // Default tool call rendering
      return (
        <div className="text-sm p-1.5 sm:p-2 rounded-lg bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <svg
                className="w-4 h-4 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <span className="font-medium text-primary">{toolName}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {Object.entries(args).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="font-medium text-muted-foreground">
                  {key}:
                </span>
                {typeof value === 'string' ? (
                  <span className="ml-2 text-sm break-words whitespace-pre-wrap">
                    {value}
                  </span>
                ) : (
                  <pre className="mt-1 p-2 rounded bg-black/5 dark:bg-white/5 overflow-x-auto break-words whitespace-pre-wrap">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Handle tool results
    if (content.type === 'tool-result' || content.type === 'tool_result') {
      // Special handling for search results
      if (content.result?.data && Array.isArray(content.result.data)) {
        return (
          <div className="text-sm space-y-2">
            <details className="group">
              <summary className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <svg
                    className="w-4 h-4 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="font-medium text-primary">Search Results</span>
                <span className="text-sm text-muted-foreground">
                  ({content.result.data.length} results)
                </span>
                <svg
                  className="w-4 h-4 ml-auto text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 space-y-2 pl-4 max-w-full">
                {content.result.data.map((result: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors max-w-full"
                  >
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block space-y-1.5 max-w-full"
                    >
                      <h4 className="font-medium text-primary hover:underline truncate">
                        {result.title}
                      </h4>
                      {result.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                          {result.description}
                        </p>
                      )}
                      <div className="w-full overflow-hidden">
                        <p className="text-xs text-muted-foreground break-all whitespace-normal line-clamp-1">
                          {result.url}
                        </p>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      }

      // Special handling for speaker data
      if (
        content.result?.data?.speakers &&
        Array.isArray(content.result.data.speakers)
      ) {
        return (
          <div className="text-sm space-y-2">
            <details className="group">
              <summary className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <svg
                    className="w-4 h-4 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="font-medium text-primary">Speakers</span>
                <span className="text-sm text-muted-foreground">
                  ({content.result.data.speakers.length} speakers)
                </span>
                <svg
                  className="w-4 h-4 ml-auto text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 space-y-3 pl-4">
                {content.result.data.speakers.map(
                  (speaker: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-card/80 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {speaker.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-primary">
                              {speaker.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {speaker.position}
                            </p>
                          </div>
                        </div>
                        {speaker.views_on_defense_strategy && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Defense Strategy Views
                            </p>
                            <p className="text-sm mt-1">
                              {speaker.views_on_defense_strategy}
                            </p>
                          </div>
                        )}
                        {speaker.current_defense_priorities && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Current Priorities
                            </p>
                            <p className="text-sm mt-1">
                              {speaker.current_defense_priorities}
                            </p>
                          </div>
                        )}
                        {speaker.views_on_riflemen_union && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Views on Riflemen Union
                            </p>
                            <p className="text-sm mt-1">
                              {speaker.views_on_riflemen_union}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </details>
          </div>
        );
      }

      return (
        <div className="text-sm p-1.5 sm:p-2 rounded-lg bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-green-500/10">
              <svg
                className="w-4 h-4 text-green-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium text-green-500">Result</span>
          </div>
          {typeof content.result === 'object' ? (
            <pre className="mt-2 p-2 rounded bg-black/5 dark:bg-white/5 overflow-x-auto text-xs break-words whitespace-pre-wrap">
              {JSON.stringify(content.result, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 text-sm whitespace-pre-wrap break-words">
              {String(content.result)}
            </p>
          )}
        </div>
      );
    }

    // Fallback for unknown content types
    return (
      <div className="text-sm space-y-2">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <span className="font-medium text-muted-foreground">{key}:</span>
            {typeof value === 'string' ? (
              <span className="ml-2 break-words whitespace-pre-wrap">
                {value}
              </span>
            ) : (
              <pre className="mt-1 p-2 rounded bg-black/5 dark:bg-white/5 overflow-x-auto text-xs break-words whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!useCase) {
    console.log('[UseCaseModal] No use case provided');
    return null;
  }

  const displayMessages = showFullChat ? fullChatMessages : messages;
  const useCaseMessageIds = new Set<string>(messages.map((m: Message) => m.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[80vw] !max-w-none h-[80vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-3 py-3 sm:px-4 sm:py-4 border-b flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg font-semibold line-clamp-1">
            {useCase.title}
          </DialogTitle>
          {useCase.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {useCase.description}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-col flex-grow min-h-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 py-2 sm:px-4 border-b bg-muted/50 gap-2 flex-shrink-0">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              {showFullChat ? t('fullChat') : t('useCaseMessages')}
            </h3>
            {useCase.chatId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowFullChat}
                className="gap-1.5 sm:gap-2 w-full sm:w-auto h-8 sm:h-auto px-2 sm:px-3 text-xs sm:text-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:w-4" />
                {showFullChat ? t('showUseCaseOnly') : t('showFullChat')}
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 relative overflow-y-auto min-h-0">
            {showFullChat && (
              <ScrollIndicator
                messages={fullChatMessages}
                useCaseMessageIds={useCaseMessageIds}
              />
            )}
            <div className="px-3 py-3 sm:px-4 sm:py-4 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  <Skeleton className="h-12 sm:h-16 w-3/4" />
                  <Skeleton className="h-12 sm:h-16 w-full" />
                  <Skeleton className="h-12 sm:h-16 w-1/2" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-red-500 text-center p-4">
                    {t('errorLoading', { error: error.message })}
                  </p>
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-center p-4">
                    {showFullChat ? t('noMessages') : t('noUseCaseMessages')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-4">
                  {displayMessages.map((message: Message) => {
                    const isUseCaseMessage = useCaseMessageIds.has(message.id);

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start',
                          !isUseCaseMessage &&
                            showFullChat &&
                            'opacity-50 hover:opacity-100 transition-opacity',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 break-words overflow-x-auto shadow-sm',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted',
                            isUseCaseMessage &&
                              showFullChat &&
                              'ring-2 ring-primary/80 ring-offset-1 ring-offset-background',
                          )}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-2 mb-1 sm:mb-1.5">
                            <span className="text-xs font-medium">
                              {message.role === 'user'
                                ? message.userEmail || t('you')
                                : t('assistant')}
                            </span>
                            <span className="text-[11px] sm:text-xs opacity-70">
                              {new Date(message.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                            {isUseCaseMessage && (
                              <Badge
                                variant="secondary"
                                className="ml-auto sm:ml-2 text-[10px] sm:text-xs px-1.5 h-4 sm:h-5"
                              >
                                {t('useCase')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm break-words whitespace-pre-wrap overflow-x-auto">
                            {renderMessageContent(message.parts)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
