'use client';

import type { UIMessage } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { FileSearchResult } from '@/components/chat-header';
import { useTranslations } from 'next-intl';

// Components
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { VoiceOutput } from './voice-output';
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

// Utils
import { cn, extractHostname, formatAIResponse, generateUUID } from '@/lib/utils';
import { AlertCircleIcon } from 'lucide-react';

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
    opacity: 1,
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

// Tool result handlers
const ToolResultHandler = ({
  toolName,
  toolCallId,
  state,
  result,
  args,
  isLoading,
}: any) => {
  const getHostname = (url: string) => {
    try {
      return url ? extractHostname(url) : 'unknown.source';
    } catch {
      return 'unknown.source';
    }
  };

  // Loading states
  if (state === 'call') {
    const loadingComponents = {
      getWeather: <Weather />,
      requestSuggestions: (
        <DocumentToolCall
          type="request-suggestions"
          args={args}
          isReadonly={false}
        />
      ),
      extract: <ExtractResults results={[]} isLoading={true} />,
      scrape: <ScrapeResults url={args.url} data="" isLoading={true} />,
      chart: (
        <motion.div
          className="mb-4 p-4 border rounded-xl bg-muted/30 backdrop-blur-sm"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground font-medium">
              Generating chart...
            </span>
          </div>
        </motion.div>
      ),
    };

    return (
      loadingComponents[toolName as keyof typeof loadingComponents] || null
    );
  }

  // Result states
  if (state === 'result' && result) {
    const resultComponents = {
      search: (
        <SearchResults
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
          results={
            Array.isArray(result?.data)
              ? result.data.map((item: any) => ({
                  url: item.url,
                  data: item.data,
                }))
              : [
                  {
                    url: Array.isArray(args?.urls) ? args.urls[0] : '',
                    data: result?.data || '',
                  },
                ]
          }
          isLoading={false}
        />
      ),
      scrape: (
        <ScrapeResults url={args.url} data={result.data} isLoading={false} />
      ),
      chart:
        result.success && result.chartConfig ? (
          <ChartRenderer config={result.chartConfig} />
        ) : result.error ? (
          <motion.div
            className="mb-4 p-4 border rounded-xl bg-destructive/5 border-destructive/10"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">
                Chart generation failed: {result.error}
              </span>
            </div>
          </motion.div>
        ) : null,
      getWeather: <Weather weatherAtLocation={result} />,
      createDocument: (
        <DocumentToolResult type="create" result={result} isReadonly={false} />
      ),
      updateDocument: (
        <DocumentToolResult type="update" result={result} isReadonly={false} />
      ),
      requestSuggestions: (
        <DocumentToolResult
          type="request-suggestions"
          result={result}
          isReadonly={false}
        />
      ),
    };

    return (
      resultComponents[toolName as keyof typeof resultComponents] || (
        <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
      )
    );
  }

  return null;
};

// Message content renderer
const MessageContent = ({
  message,
  mode,
  isReadonly,
  setMode,
  setMessages,
  reload,
}: any) => {
  if (!message.parts) return null;

  return (
    <>
      {message.parts.map((part: any, index: number) => {
        const key = `message-${message.id}-part-${index}`;

        if (part.type === 'reasoning') {
          return (
            <MessageReasoning
              key={key}
              isLoading={false}
              reasoning={part.reasoning}
            />
          );
        }

        if (part.type === 'text' && part.text.length > 0) {
          if (mode === 'edit') {
            return (
              <div key={key} className="flex flex-row gap-3 items-start">
                <div className="size-8" />
                <MessageEditor
                  message={message}
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
                      onClick={() => setMode('edit')}
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
                <Markdown>{message.role === 'assistant' ? formatAIResponse(part.text) : part.text}</Markdown>
              </div>
            </div>
          );
        }

        if (part.type === 'tool-invocation') {
          const { toolInvocation } = part;
          const { toolName, toolCallId, state, result, args } = toolInvocation;

          // Special handling for reason_search and reason
          // Keep ReasonSearch for complex research data display
          if (
            toolName === 'reason_search' &&
            (state === 'call' || state === 'result')
          ) {
            return (
              <ReasonSearch
                key={toolCallId}
                updates={
                  message?.annotations
                    ?.filter((a: any) => a.type === 'research_update')
                    .map((a: any) => a.data) || []
                }
              />
            );
          }

          // Use ReasonTimeline for regular reason tool calls
          if (toolName === 'reason') {
            const agentUpdates =
              message.annotations
                ?.filter((a: any) => a.type === 'agent_update')
                .map((a: any) => a.data) || [];

            return (
              <ReasonTimeline
                streamUpdates={agentUpdates.length > 0 ? agentUpdates : result}
                key={toolCallId}
                timelineId={toolCallId} // Use toolCallId for isolated UI state
              />
            );
          }

          if (toolName === 'text2sql') {
            const agentUpdates =
              message.annotations
                ?.filter(
                  (a: any) =>
                    a.type === 'wren_update' && a.toolCallId === toolCallId,
                )
                .map((a: any) => a.data) || [];

            return (
              <Text2sqlTimeline
                streamUpdates={
                  (agentUpdates.length > 0
                    ? agentUpdates
                    : result?.stateUpdates) || []
                }
                key={toolCallId}
                timelineId={toolCallId}
              />
            );
          }

          if (state === 'result' && toolName === 'run_sql') {
            return <RunSqlPreview key={toolCallId} result={result} />;
          }

          return (
            <div key={toolCallId} className="mb-4">
              <ToolResultHandler
                toolName={toolName}
                toolCallId={toolCallId}
                state={state}
                result={result}
                args={args}
                isLoading={false}
              />
            </div>
          );
        }

        return null;
      })}
    </>
  );
};

// Main message component
const PurePreviewMessage = ({
  chatId,
  message,
  messageIndex,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  requiresScrollPadding,
  selectedFiles = [],
  selectedModelId = '',
  completedMessageIds = new Set(),
}: {
  chatId: string;
  message: UIMessage;
  messageIndex?: number;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  selectedFiles?: FileSearchResult[];
  selectedModelId?: string;
  completedMessageIds?: Set<string>;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const handleBranch = () => {
    if (typeof messageIndex === 'number') {
      // Create a new branch from this message
      const branchId = generateUUID();
      const messages = JSON.parse(localStorage.getItem(`messages-${chatId}`) || '[]');
      const branchMessages = messages.slice(0, messageIndex + 1);
      
      // Save branch messages
      localStorage.setItem(`messages-${branchId}`, JSON.stringify(branchMessages));
      
      // Update branch list
      const branches = JSON.parse(localStorage.getItem(`branches-${chatId}`) || '[]');
      branches.push({
        id: branchId,
        name: `Branch ${branches.length + 1}`,
        parentId: chatId,
        messageCount: branchMessages.length,
        createdAt: new Date(),
        lastMessageAt: new Date()
      });
      localStorage.setItem(`branches-${chatId}`, JSON.stringify(branches));
      
      // Navigate to the new branch
      window.location.href = `/chat/${branchId}`;
    }
  };

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
        className={cn('flex gap-4 w-full relative', {
          'ml-auto max-w-2xl': message.role === 'user' && mode !== 'edit',
          'w-fit': message.role === 'user' && mode !== 'edit', // Added w-fit for user messages
          'w-full': mode === 'edit',
        })}
      >
        {/* Assistant avatar with cost */}
        {message.role === 'assistant' && (
          <div className="flex flex-row items-center justify-end gap-3 absolute w-[160px] left-[-180px] top-0">
            <motion.div
              className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-background to-muted/50 shadow-sm"
              variants={avatarVariants}
              initial="initial"
              animate="animate"
            >
              <SparklesIcon size={14} />
            </motion.div>
          </div>
        )}

        {/* Message content container */}
        <div
          className={cn('flex flex-col gap-4 w-full', {
            'min-h-96': message.role === 'assistant' && requiresScrollPadding,
          })}
        >
          {/* Attachments */}
          {message.experimental_attachments &&
            message.experimental_attachments.length > 0 && (
              <motion.div
                className="flex flex-row justify-end gap-2"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </motion.div>
            )}

          {/* Message content */}
          <MessageContent
            message={message}
            mode={mode}
            isReadonly={isReadonly}
            setMode={setMode}
            setMessages={setMessages}
            reload={reload}
          />

          {/* Actions */}
          {!isReadonly && (
            <div className="flex items-center justify-between">
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
                shouldCostFetch={completedMessageIds.has(message.id)}
                onBranch={handleBranch}
              />
              {message.role === 'assistant' && message.content && (
                <VoiceOutput
                  text={message.content}
                  className="ml-auto"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Loading message components
const LoadingMessage = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
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
          <span className="text-sm font-medium">{children}</span>
        </div>
      </div>
    </div>
  </motion.div>
);

export const PreviewMessage = memo(PurePreviewMessage);
// Unified processing message that handles both thinking and processing states
const UnifiedProcessingMessage = ({
  isProcessing = false,
  delay = 0,
}: {
  isProcessing?: boolean;
  delay?: number;
}) => {
  const t = useTranslations('chat');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'thinking' | 'processing'>(
    isProcessing ? 'processing' : 'thinking',
  );

  // Create combined message pool
  const thinkingMessages = Array.from({ length: 12 }, (_, i) =>
    t(`thinkingMessage${i + 1}` as any),
  );
  const processingMessages = Array.from({ length: 10 }, (_, i) =>
    t(`processingMessage${i + 1}` as any),
  );

  // Combine all messages into one continuous cycle
  const allMessages = [...thinkingMessages, ...processingMessages];

  useEffect(() => {
    // Update phase based on prop, but don't reset the cycle
    if (isProcessing && currentPhase === 'thinking') {
      setCurrentPhase('processing');
    } else if (!isProcessing && currentPhase === 'processing') {
      setCurrentPhase('thinking');
    }
  }, [isProcessing, currentPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % allMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, [allMessages.length]);

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
                {allMessages[currentMessageIndex].replace(/\.{3}$/, '')}
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
};

export const ThinkingMessage = () => (
  <UnifiedProcessingMessage isProcessing={false} />
);
export const ProcessingMessage = () => (
  <UnifiedProcessingMessage isProcessing={true} delay={0.2} />
);
