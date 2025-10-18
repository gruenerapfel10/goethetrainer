import type { UIMessage } from 'ai';
import { memo, useMemo, useState, } from 'react';
import { motion } from 'framer-motion';
import { AlertCircleIcon } from 'lucide-react';
import type { Vote } from '@/lib/db/queries';

import {
  PreviewMessage,
  ProcessingMessage,
  toExtendedMessage,
} from './message';
import { useScrollToBottom } from '../hooks/use-scroll-to-bottom';
import { useEffect, useRef } from 'react';
import { useChat, AttachmentType } from '@/contexts/chat-context';

interface MessagesProps {
  bottomPadding?: number;
  topPadding?: number;
  votes: Array<Vote> | undefined;
  isArtifactVisible: boolean;
}

// Optimized animation variants with as const
const ERROR_VARIANTS = {
  initial: { y: 8, opacity: 0, scale: 0.98 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      delay: 0.3,
    },
  },
} as const;

// Error message component with modern styling
const ErrorMessage = memo(() => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-4 group/message"
    variants={ERROR_VARIANTS}
    initial="initial"
    animate="animate"
    data-role="assistant"
    data-testid="message-error"
  >
    <div className="flex gap-4 w-full">
      <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50">
        <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="inline-block rounded-full border border-border/50 bg-gradient-to-r from-neutral-50 via-background to-neutral-50 dark:from-neutral-900 dark:via-background dark:to-neutral-900 px-5 py-2.5 my-4">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
));

ErrorMessage.displayName = 'ErrorMessage';

// Helper function to check if message has content - works with both UIMessage and ExtendedUIMessage
const hasMessageContent = (message: UIMessage | { parts?: any[]; content?: any }): boolean => {
  // v5 uses content field, check both for compatibility
  return Boolean(((message as any).content && (message as any).content.length > 0) || ((message as any).parts && (message as any).parts.length > 0));
};

// Loading state renderer with simplified logic
const LoadingStateRenderer = memo(
  ({
    status,
    messages,
  }: {
    status: 'ready' | 'submitted' | 'streaming' | 'error';
    messages: Array<UIMessage>;
  }) => {
    if (messages.length === 0) return null;

    const lastMessage = messages[messages.length - 1];

    // Show processing for submitted user messages or empty streaming assistant messages
    if (
      (status === 'submitted' && lastMessage?.role === 'user') ||
      (status === 'streaming' &&
        lastMessage?.role === 'assistant' &&
        !hasMessageContent(lastMessage))
    ) {
      return <ProcessingMessage />;
    }

    // Show processing when streaming with empty assistant message
    if (status === 'streaming' && lastMessage?.role === 'assistant') {
      // Check if the message has ANY content (v5) or parts (legacy)
      const hasContent = ((lastMessage as any).content && (lastMessage as any).content.length > 0) || ((lastMessage as any).parts && (lastMessage as any).parts.length > 0);

      if (!hasContent) {
        return <ProcessingMessage />;
      }
    }

    return null;
  }
);

LoadingStateRenderer.displayName = 'LoadingStateRenderer';

// Main messages component
function PureMessages({
  bottomPadding = 8,
  topPadding = 0,
  votes,
  isArtifactVisible,
}: MessagesProps) {
  const {
    id: chatId,
    messages,
    setMessages,
    status,
    regenerate,
    selectedModel,
    completedMessageIds,
    isReadonly,
    attachments,
  } = useChat();
  
  // Convert KB_FILE attachments to selectedFiles format for backward compatibility
  const selectedFiles = attachments
    .filter(a => a.type === AttachmentType.KB_FILE)
    .map(a => ({
      title: a.name || '',
      url: a.url || '',
      content: a.content,
      thumbnailUrl: a.thumbnailUrl,
      metadata: a.metadata
    }));
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();
  
  const isLockedRef = useRef(true);
  const lastScrollTop = useRef(0);
  
  // Handle scroll to detect user intent
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      const scrollPosition = maxScrollTop > 0 ? currentScrollTop / maxScrollTop : 0;
      const isScrollingUp = currentScrollTop < lastScrollTop.current - 1;
      const isScrollingDown = currentScrollTop > lastScrollTop.current + 1;
      
      if (isScrollingUp) {
        // ANY upward scroll unlocks, regardless of position
        if (isLockedRef.current) {
          console.log('🔓 Autoscroll UNLOCKED - user scrolled up');
          isLockedRef.current = false;
        }
      } else if (isScrollingDown && scrollPosition >= 0.97) {
        // Downward scroll only relocks if at 97%+ 
        if (!isLockedRef.current) {
          console.log('🔒 Autoscroll RELOCKED - user scrolled down to 97%+');
          isLockedRef.current = true;
        }
      }
      
      lastScrollTop.current = currentScrollTop;
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messagesContainerRef, isAtBottom]);
  
  // Scroll on new chat
  useEffect(() => {
    if (chatId) {
      // Force scroll to bottom on chat load
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [chatId, messagesContainerRef]);
  
  // Scroll when message is sent
  useEffect(() => {
    if (status === 'submitted') {
      isLockedRef.current = true;
      // Force scroll using direct method
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      // Also use the hook method as backup
      scrollToBottom('instant');
    }
  }, [status, scrollToBottom, messagesContainerRef]);
  
  // Auto-scroll during streaming if locked
  useEffect(() => {
    if (status === 'streaming' && isLockedRef.current) {
      const interval = setInterval(() => {
        const container = messagesContainerRef.current;
        if (container && isLockedRef.current) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, messagesContainerRef]);

  // Auto-scroll when messages change if locked
  useEffect(() => {
    if (isLockedRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, messagesContainerRef]);

  // Convert and memoize messages
  const extendedMessages = useMemo(
    () => messages.map(toExtendedMessage),
    [messages]
  );

  // Build file map from all SENT attachments in context
  const allAttachmentsMap = useMemo(() => {
    const map = new Map<string, { url: string }>();
    attachments.forEach(attachment => {
      if (attachment.name && attachment.status === 'sent') {
        map.set(attachment.name, { url: attachment.url || '' });
      }
    });
    return map;
  }, [attachments]);
  
  // Debug mode - fetch context info from server
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const [contextInfo, setContextInfo] = useState<{
    messageIds: string[];
    totalTokens: number;
    maxTokens: number;
  } | null>(null);

  // Fetch context info when messages change
  useEffect(() => {
    if (!debugMode || !chatId) return;
    
    const fetchContextInfo = async () => {
      try {
        const response = await fetch(`/api/chat/context-info?chatId=${chatId}&contextWindow=150000`);
        if (response.ok) {
          const data = await response.json();
          setContextInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch context info:', error);
      }
    };
    
    fetchContextInfo();
  }, [chatId, messages.length, debugMode]);

  const { messageContextStatus, debugInfo } = useMemo(() => {
    if (!debugMode || !contextInfo) {
      return { 
        messageContextStatus: new Map<string, boolean>(), 
        debugInfo: null 
      };
    }
    
    const contextMap = new Map<string, boolean>();
    const contextIdSet = new Set(contextInfo.messageIds);
    
    // Mark messages as in or out of context based on server data
    for (const msg of messages) {
      contextMap.set(msg.id, contextIdSet.has(msg.id));
    }
    
    const inContextCount = contextInfo.messageIds.length;
    
    return {
      messageContextStatus: contextMap,
      debugInfo: {
        inContext: inContextCount,
        total: messages.length,
        tokens: contextInfo.totalTokens,
        maxTokens: contextInfo.maxTokens
      }
    };
  }, [messages, debugMode, contextInfo]);

  // Memoize vote lookup for O(1) access
  const voteMap = useMemo(
    () => new Map(votes?.map((vote) => [vote.messageId, vote]) || []),
    [votes]
  );

  // Filter out empty streaming assistant messages
  const visibleMessages = useMemo(
    () =>
      extendedMessages.filter((message, index) => {
        // Filter out empty assistant messages (no content/parts)
        if (message.role === 'assistant' && !hasMessageContent(message)) {
          // Only show if it's the last message and we're streaming
          const isLastMessage = index === extendedMessages.length - 1;
          return status === 'streaming' && isLastMessage;
        }

        return true;
      }),
    [extendedMessages, status]
  );

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 h-full overflow-y-scroll mobile-scroll max-w-[100vw] md:max-w-none relative pb-[var(--input-height,8px)]"
      style={{ 
        paddingTop: topPadding > 0 ? `${topPadding}px` : '16px',
      }}
    >
      {/* Debug info panel */}
      {debugMode && debugInfo && (
        <div className="fixed top-20 right-4 z-50 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <div className="text-xs font-mono space-y-1">
            <div className="font-semibold text-foreground">Context Window Debug</div>
            <div className="text-green-600">In Context: {debugInfo.inContext}/{debugInfo.total} messages</div>
            <div className="text-blue-600">Tokens: {debugInfo.tokens.toLocaleString()}/{debugInfo.maxTokens.toLocaleString()}</div>
            <div className="text-orange-600">Usage: {Math.round((debugInfo.tokens / debugInfo.maxTokens) * 100)}%</div>
          </div>
        </div>
      )}
      {/* Messages */}
      {visibleMessages.map((message, index) => {
        const originalIndex = extendedMessages.findIndex(
          (m) => m.id === message.id
        );
        const isLastMessage = originalIndex === extendedMessages.length - 1;
        const isStreaming = status === 'streaming' && isLastMessage;
        const vote = voteMap.get(message.id);

        return (
          <PreviewMessage
            key={message.id}
            chatId={chatId}
            message={message}
            isLoading={isStreaming}
            vote={vote}
            setMessages={setMessages}
            regenerate={regenerate}
            isReadonly={isReadonly}
            requiresScrollPadding={false}
            selectedFiles={selectedFiles}
            selectedModelId={selectedModel.agentType}
            completedMessageIds={completedMessageIds}
            messages={messages}
            isInContext={messageContextStatus.get(message.id)}
            allAttachments={attachments}
            allAttachmentsMap={allAttachmentsMap}
          />
        );
      })}

      {/* Loading states */}
      <LoadingStateRenderer status={status} messages={messages} />

      {/* Error state */}
      {status === 'error' && <ErrorMessage />}

      {/* Scroll anchor */}
      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[4px] min-h-[4px]"
        onViewportEnter={onViewportEnter}
        onViewportLeave={onViewportLeave}
      />
    </div>
  );
}

export const Messages = memo(PureMessages);