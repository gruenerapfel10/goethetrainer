import type { UIMessage, Attachment } from 'ai';
import { memo } from 'react';
import { motion, } from 'framer-motion';
import { AlertCircleIcon } from 'lucide-react';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';

import { PreviewMessage, ProcessingMessage } from './message';
import { useMessages } from '../hooks/use-messages';
import type { FileSearchResult } from '@/components/chat-header';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<Vote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  bottomPadding?: number;
  selectedFiles?: FileSearchResult[];
  selectedModelId?: string;
  completedMessageIds?: Set<string>;
  attachments?: Array<Attachment>; // Add attachments for file mapping
}

// Simplified animation variants - remove problematic transitions
const containerVariants = {
  initial: { opacity: 1 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0
    }
  }
};

const errorVariants = {
  initial: { y: 8, opacity: 0, scale: 0.98 },
  animate: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
      delay: 0.3
    }
  }
};

// Error message component
const ErrorMessage = memo(() => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-4 group/message"
    variants={errorVariants}
    initial="initial"
    animate="animate"
    data-role="assistant"
    data-testid="message-error"
  >
    <div className="flex gap-4 w-full">
      <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-red-50 to-red-100">
        <AlertCircleIcon size={14} className="text-red-600" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-4 text-muted-foreground">
          <p className="text-sm font-medium">Something went wrong. Please try again.</p>
        </div>
      </div>
    </div>
  </motion.div>
));

ErrorMessage.displayName = 'ErrorMessage';

// Loading state renderer
const LoadingStateRenderer = memo(({ status, messages }: { 
  status: UseChatHelpers['status']; 
  messages: Array<UIMessage>; 
}) => {
  if (messages.length === 0) return null;
  
  const lastMessage = messages[messages.length - 1];
  
  // Show thinking when submitted with user message
  if (status === 'submitted' && lastMessage?.role === 'user') {
    return <ProcessingMessage />;
  }
  
  // Show processing when streaming with empty assistant message
  if (status === 'streaming' && lastMessage?.role === 'assistant') {
    console.log('lastMessage', lastMessage);
    // Check if the message has ANY parts (tool invocations, steps, text, etc.)
    const hasContent = lastMessage.parts && lastMessage.parts.length > 0;
    
    if (!hasContent) {
      return <ProcessingMessage />;
    }
  }
  
  return null;
});

LoadingStateRenderer.displayName = 'LoadingStateRenderer';

// Main messages component
function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  bottomPadding = 112,
  selectedFiles = [],
  selectedModelId = '',
  completedMessageIds = new Set(),
  attachments = [],
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({ chatId, status });
  
  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 h-full overflow-y-auto pt-4 transition-all duration-300 ease-in-out"
      style={{ paddingBottom: `${bottomPadding + 16}px` }}
      onWheel={(e) => {
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
      }}
    >
      {/* REMOVED AnimatePresence mode="wait" - this was causing all messages to disappear */}
      {/* Messages */}
      {messages.map((message, index) => {
        // Skip rendering empty assistant messages during streaming - they'll be handled by LoadingStateRenderer
        if (message.role === 'assistant' && status === 'streaming' && index === messages.length - 1) {
          const hasContent = message.parts && message.parts.length > 0;
          if (!hasContent) {
            return null; // Skip rendering empty assistant messages
          }
        }

        return (
          <PreviewMessage
            key={message.id}
            chatId={chatId}
            message={message}
            messageIndex={index}
            isLoading={status === 'streaming' && index === messages.length - 1}
            vote={votes?.find((vote) => vote.messageId === message.id)}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            requiresScrollPadding={hasSentMessage && index === messages.length - 1}
            selectedFiles={selectedFiles}
            selectedModelId={selectedModelId}
            completedMessageIds={completedMessageIds}
          />
        );
      })}

      {/* Loading states */}
      <LoadingStateRenderer status={status} messages={messages} />

      {/* Error state */}
      {status === 'error' && <ErrorMessage />}

      {/* Scroll anchor - keep as motion.div for viewport events */}
      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />

      {/* Bottom spacer */}
      <div className="shrink-0 min-w-[24px] min-h-[24px]" />
    </div>
  );
}

// Optimized memo with comprehensive comparison
export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  // Quick artifact visibility check
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  // Status changes
  if (prevProps.status !== nextProps.status) return false;

  // Messages comparison
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;

  // Other props comparison
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (prevProps.bottomPadding !== nextProps.bottomPadding) return false;
  if (!equal(prevProps.selectedFiles, nextProps.selectedFiles)) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  if (!equal(prevProps.completedMessageIds, nextProps.completedMessageIds)) return false;

  return true;
});
