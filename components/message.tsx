'use client';

import type { UIMessage, JSONValue } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { FileSearchResult } from '@/components/chat-header';
import { useTranslations } from 'next-intl';
// Note: renderTextWithMentions function not available in this project
// Using simple text rendering instead

// Components
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { SearchResults } from './search-results';
import { ExtractResults } from './extract-results';
import { ScrapeResults } from './scrape-results';
import { MessageReasoning } from './message-reasoning';
import ReasonSearch from './reason-search';
import ChartRenderer from './chart-renderer';
import { ReasonTimeline } from '@/components/timeline';
import { Text2sqlTimeline } from '@/components/timeline/components/text2sql-timeline';
import { RunSqlPreview } from '@/components/sql/run-sql-preview';
import { MessageCost } from './message-cost';

// Utils
import { cn, extractHostname, formatAIResponse } from '@/lib/utils';
import { AlertCircleIcon } from 'lucide-react';

// Type definitions
interface Attachment {
  url: string;
  name?: string;
  contentType?: string;
  size?: number;
}

// Type guard for structured annotations
const isStructuredAnnotation = (
  annotation: JSONValue
): annotation is { type: string; data: any } => {
  return (
    annotation !== null &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    'data' in annotation
  );
};

interface ExtendedUIMessage extends Omit<UIMessage, 'annotations' | 'parts'> {
  parts?: any[];
  experimental_attachments?: Attachment[];
  annotations?: Array<{
    type: string;
    data: any;
  }>;
}

// Utility function to safely convert UIMessage to ExtendedUIMessage
export const toExtendedMessage = (message: UIMessage): ExtendedUIMessage => {
  const structuredAnnotations = Array.isArray(message.annotations)
    ? message.annotations.filter(isStructuredAnnotation)
    : undefined;

  return {
    ...message,
    annotations: structuredAnnotations,
  } as ExtendedUIMessage;
};

interface PreviewMessageProps {
  chatId: string;
  message: ExtendedUIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  selectedFiles?: FileSearchResult[];
  selectedModelId?: string;
  completedMessageIds?: Set<string>;
  messages?: UIMessage[];
}

interface ToolResultHandlerProps {
  toolName: string;
  toolCallId: string;
  state: 'call' | 'result';
  result?: any;
  args?: any;
}

interface MessageContentProps {
  message: ExtendedUIMessage;
  mode: 'view' | 'edit';
  isReadonly: boolean;
  setMode: React.Dispatch<React.SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  messages?: UIMessage[];
  selectedFiles?: FileSearchResult[];
}

interface UnifiedProcessingMessageProps {
  isProcessing?: boolean;
  delay?: number;
}

// Animation variants
const messageVariants = {
  initial: { y: 8, opacity: 0, scale: 0.98 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
  exit: {
    y: -4,
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

const avatarVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { delay: 0.1, duration: 0.2 },
  },
};

// Utility functions
const getHostname = (url?: string | null): string => {
  try {
    if (!url) return 'unknown.source';
    const host = extractHostname(url);
    return host || 'unknown.source';
  } catch {
    return 'unknown.source';
  }
};

// Stable key generation based on content instead of random values
const generateStableKey = (
  messageId: string,
  partType: string,
  index: number
): string => {
  return `${messageId}-${partType}-${index}`;
};

// Tool result handler component
const ToolResultHandler = memo<ToolResultHandlerProps>(
  ({ toolName, toolCallId, state, result, args }) => {
    const loadingComponents = useMemo(
      () => ({
        getWeather: <Weather key={`weather-loading-${toolCallId}`} />,
        requestSuggestions: (
          <DocumentToolCall
            key={`doc-call-${toolCallId}`}
            type="request-suggestions"
            args={args}
            isReadonly={false}
          />
        ),
        extract: (
          <ExtractResults
            key={`extract-loading-${toolCallId}`}
            results={[]}
            isLoading={true}
            totalSources={args?.urls?.length || 0}
          />
        ),
        scrape: (
          <ScrapeResults
            key={`scrape-loading-${toolCallId}`}
            url={args?.url || ''}
            data=""
            isLoading={true}
          />
        ),
        chart: (
          <div
            key={`chart-loading-${toolCallId}`}
            className="flex items-center gap-2 p-2 text-sm text-muted-foreground"
          >
            <div className="animate-spin rounded-full h-3 w-3 border border-muted-foreground border-t-transparent" />
            <span>Generating chart...</span>
          </div>
        ),
      }),
      [args, toolCallId]
    );

    const resultComponents = useMemo(
      () => ({
        search: (
          <SearchResults
            key={`search-result-${toolCallId}`}
            results={
              Array.isArray(result?.data)
                ? result.data.map((item: any) => ({
                    title: item.title || '',
                    url: item.url || '',
                    description: item.description || '',
                    source: getHostname(item.url || ''),
                  }))
                : []
            }
          />
        ),
        extract: (
          <ExtractResults
            key={`extract-result-${toolCallId}`}
            results={
              Array.isArray(result?.data)
                ? result.data.map((item: any) => ({
                    url: item.url,
                    data: item.data,
                    success: item.success,
                    error: item.error,
                  }))
                : result?.data
                ? [
                    {
                      url: Array.isArray(args?.urls)
                        ? args.urls[0]
                        : args?.url || '',
                      data: result.data,
                      success: true,
                    },
                  ]
                : []
            }
            isLoading={false}
            title="Extracted Data"
          />
        ),
        scrape: (
          <ScrapeResults
            key={`scrape-result-${toolCallId}`}
            url={args?.url || ''}
            data={result?.data}
            isLoading={false}
          />
        ),
        chart:
          result?.success && result?.chartConfig ? (
            <ChartRenderer
              key={`chart-success-${toolCallId}`}
              config={result.chartConfig}
            />
          ) : result?.error ? (
            <div
              key={`chart-error-${toolCallId}`}
              className="flex items-center gap-2 p-2 text-sm text-destructive bg-destructive/5 rounded"
            >
              <AlertCircleIcon className="h-3 w-3" />
              <span>Chart generation failed: {result.error}</span>
            </div>
          ) : null,
        getWeather: (
          <Weather
            key={`weather-result-${toolCallId}`}
            weatherAtLocation={result}
          />
        ),
        createDocument: (
          <DocumentToolResult
            key={`doc-create-${toolCallId}`}
            type="create"
            result={result}
            isReadonly={false}
          />
        ),
        updateDocument: (
          <DocumentToolResult
            key={`doc-update-${toolCallId}`}
            type="update"
            result={result}
            isReadonly={false}
          />
        ),
        requestSuggestions: (
          <DocumentToolResult
            key={`doc-suggestions-${toolCallId}`}
            type="request-suggestions"
            result={result}
            isReadonly={false}
          />
        ),
      }),
      [result, args, toolCallId]
    );

    if (state === 'call') {
      return (
        loadingComponents[toolName as keyof typeof loadingComponents] || null
      );
    }

    if (state === 'result' && result) {
      return (
        resultComponents[toolName as keyof typeof resultComponents] || null
      );
    }

    return null;
  }
);

ToolResultHandler.displayName = 'ToolResultHandler';

// Component to render text with mentions - simplified version
const TextWithMentions = ({
  text,
  fileMap,
}: {
  text: string;
  fileMap: Map<string, { url: string }>;
}) => {
  // Simple text rendering without mention processing
  return <>{text}</>;
};

// Message content component
const MessageContent = memo<MessageContentProps>(
  ({
    message,
    mode,
    isReadonly,
    setMode,
    setMessages,
    reload,
    messages,
    selectedFiles,
  }) => {
    // Note: extractSourcesFromMessage not available, using empty sources
    const sources = useMemo(() => [], []);

    const handleEditClick = useCallback(() => {
      setMode('edit');
    }, [setMode]);

    // Build file map from all messages' experimental_attachments
    const fileMap = useMemo(() => {
      const map = new Map<string, { url: string }>();

      // Add files from all messages
      if (messages) {
        messages.forEach((msg: UIMessage) => {
          if (msg.experimental_attachments) {
            msg.experimental_attachments.forEach((attachment: Attachment) => {
              if (attachment.name) {
                map.set(attachment.name, { url: attachment.url || '' });
              }
            });
          }
        });
      }

      // Add selected files
      if (selectedFiles) {
        selectedFiles.forEach((file: any) => {
          if (file.name) {
            map.set(file.name, { url: file.url || '' });
          }
        });
      }

      return map;
    }, [messages, selectedFiles, message]);

    if (!message.parts) return null;

    return (
      <>
        {message.parts.map((part: any, index: number) => {
          const key = generateStableKey(
            message.id,
            part.type || 'unknown',
            index
          );

          if (part.type === 'reasoning') {
            return (
              <MessageReasoning
                key={key}
                isLoading={false}
                reasoning={part.reasoning || ''}
              />
            );
          }

          if (
            part.type === 'text' &&
            part.text &&
            typeof part.text === 'string' &&
            part.text.length > 0
          ) {
            if (mode === 'edit') {
              return (
                <div key={key} className="flex flex-row gap-3 items-start">
                  <div className="size-8" />
                  <MessageEditor
                    message={message as any}
                    setMode={setMode}
                    setMessages={setMessages}
                    reload={reload}
                  />
                </div>
              );
            }

            return (
              <div
                key={key}
                className="flex flex-row gap-3 items-start group/content"
              >
                {message.role === 'user' && !isReadonly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full opacity-0 group-hover/content:opacity-100 transition-opacity duration-200"
                        onClick={handleEditClick}
                      >
                        <PencilEditIcon className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit message</TooltipContent>
                  </Tooltip>
                )}

                <div
                  className={cn('flex flex-col gap-4 min-w-0 flex-1', {
                    'bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-sm':
                      message.role === 'user',
                  })}
                >
                  {message.role === 'user' ? (
                    <div className="text-sm">
                      <TextWithMentions text={part.text} fileMap={fileMap} />
                    </div>
                  ) : (
                    <Markdown sources={sources}>
                      {formatAIResponse(part.text)}
                    </Markdown>
                  )}
                </div>
              </div>
            );
          }

          if (part.type === 'tool-invocation' && part.toolInvocation) {
            const { toolName, toolCallId, state, result, args } =
              part.toolInvocation;

            if (
              toolName === 'reason_search' &&
              (state === 'call' || state === 'result')
            ) {
              return (
                <ReasonSearch
                  key={key}
                  updates={
                    message.annotations
                      ?.filter((a: any) => a.type === 'research_update')
                      .map((a: any) => a.data) || []
                  }
                />
              );
            }

            if (toolName === 'reason') {
              const agentUpdates =
                message.annotations
                  ?.filter((a: any) => a.type === 'agent_update')
                  .map((a: any) => a.data) || [];

              return (
                <ReasonTimeline
                  key={key}
                  streamUpdates={
                    agentUpdates.length > 0 ? agentUpdates : result
                  }
                  timelineId={toolCallId}
                />
              );
            }

            if (toolName === 'text2sql') {
              const agentUpdates =
                message.annotations
                  ?.filter(
                    (a: any) =>
                      a.type === 'wren_update' && a.toolCallId === toolCallId
                  )
                  .map((a: any) => a.data) || [];

              return (
                <Text2sqlTimeline
                  streamUpdates={
                    (agentUpdates.length > 0
                      ? agentUpdates
                      : result?.stateUpdates) || []
                  }
                  key={key}
                  timelineId={toolCallId}
                />
              );
            }

            if (state === 'result' && toolName === 'run_sql') {
              return <RunSqlPreview key={key} result={result} />;
            }
            if (toolName === 'extract' && state === 'result') {
              return null;
            }
            // Handle all tool invocations through ToolResultHandler
            return (
              <div key={key} className="mb-4">
                <ToolResultHandler
                  toolName={toolName}
                  toolCallId={toolCallId}
                  state={state}
                  result={result}
                  args={args}
                />
              </div>
            );
          }
          return null;
        })}
      </>
    );
  }
);

MessageContent.displayName = 'MessageContent';

// Loading message components
const LoadingMessage = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-2 md:px-4 group/message"
    initial={{ y: 8, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, type: 'spring', stiffness: 400, damping: 25 }}
    data-role="assistant"
    data-testid="message-assistant-loading"
  >
    <div className="flex gap-4 w-full">
      <motion.div
        className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-background to-muted/50 shadow-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.2 }}
      >
        <SparklesIcon size={14} />
      </motion.div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  </motion.div>
);

// Main preview message component
const PurePreviewMessage = memo<PreviewMessageProps>(
  ({
    chatId,
    message,
    vote,
    isLoading,
    setMessages,
    reload,
    isReadonly,
    requiresScrollPadding,
    completedMessageIds = new Set(),
    messages = [],
    selectedFiles = [],
  }) => {
    const [mode, setMode] = useState<'view' | 'edit'>('view');

    const messageActionsKey = useMemo(
      () => `actions-${chatId}-${message.id}`,
      [chatId, message.id]
    );

    return (
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-role={message.role}
        data-testid={`message-${message.role}`}
      >
        <div
          className={cn('w-full relative', {
            'ml-auto max-w-2xl': message.role === 'user' && mode !== 'edit',
            'w-fit': message.role === 'user' && mode !== 'edit',
            'w-full': mode === 'edit',
          })}
        >
          {message.role === 'assistant' && (
            <motion.div
              className="absolute -left-12 top-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-background to-muted/50 shadow-sm"
              variants={avatarVariants}
              initial="initial"
              animate="animate"
            >
              <SparklesIcon size={14} />
            </motion.div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {message.experimental_attachments &&
              message.experimental_attachments.length > 0 && (
                <motion.div
                  className="flex flex-row justify-end gap-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {message.experimental_attachments.map(
                    (attachment: Attachment, index: number) => {
                      const attachmentKey = `attachment-${message.id}-${index}`;

                      return (
                        <PreviewAttachment
                          key={attachmentKey}
                          attachment={attachment}
                        />
                      );
                    }
                  )}
                </motion.div>
              )}

            <MessageContent
              message={message}
              mode={mode}
              isReadonly={isReadonly}
              setMode={setMode}
              setMessages={setMessages}
              reload={reload}
              messages={messages}
              selectedFiles={selectedFiles}
            />

            {!isReadonly && (
              <MessageActions
                key={messageActionsKey}
                chatId={chatId}
                message={message as any}
                vote={vote}
                isLoading={isLoading}
                shouldFetchCost={completedMessageIds.has(message.id)}
              />
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

PurePreviewMessage.displayName = 'PurePreviewMessage';

// Processing message component for loading states
const UnifiedProcessingMessage = memo<UnifiedProcessingMessageProps>(
  ({ isProcessing = false, delay = 0 }) => {
    const t = useTranslations('chat');
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<'thinking' | 'processing'>(
      isProcessing ? 'processing' : 'thinking'
    );

    const messages = useMemo(() => {
      const thinkingMessages = Array.from({ length: 12 }, (_, i) =>
        t(`thinkingMessage${i + 1}` as any)
      );
      const processingMessages = Array.from({ length: 10 }, (_, i) =>
        t(`processingMessage${i + 1}` as any)
      );
      return [...thinkingMessages, ...processingMessages];
    }, [t]);

    useEffect(() => {
      if (isProcessing && currentPhase === 'thinking') {
        setCurrentPhase('processing');
      } else if (!isProcessing && currentPhase === 'processing') {
        setCurrentPhase('thinking');
      }
    }, [isProcessing, currentPhase]);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2500);

      return () => clearInterval(interval);
    }, [messages.length]);

    return (
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, type: 'spring', stiffness: 400, damping: 25 }}
        data-role="assistant"
        data-testid="message-assistant-loading"
      >
        <div className="flex gap-4 w-full">
          <motion.div
            className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-background to-muted/50 shadow-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.1, duration: 0.2 }}
          >
            <SparklesIcon size={14} />
          </motion.div>
          <div className="flex items-center w-full">
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentMessageIndex}
                  className="text-[15px] font-medium text-muted-foreground/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeInOut',
                  }}
                >
                  {messages[currentMessageIndex].replace(/\.{3}$/, '')}
                </motion.span>
              </AnimatePresence>
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-muted-foreground/60 rounded-full"
                    animate={{
                      opacity: [0.4, 1, 0.4],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

UnifiedProcessingMessage.displayName = 'UnifiedProcessingMessage';

export const PreviewMessage = memo(PurePreviewMessage);
export const ThinkingMessage = () => (
  <UnifiedProcessingMessage isProcessing={false} />
);
export const ProcessingMessage = () => (
  <UnifiedProcessingMessage isProcessing={true} delay={0.2} />
);