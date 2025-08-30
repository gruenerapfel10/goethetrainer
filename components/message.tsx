import type { UIMessage, Attachment } from 'ai';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';

interface PreviewMessageProps {
  chatId: string;
  message: UIMessage;
  messageIndex: number;
  isLoading?: boolean;
  vote?: Vote;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  requiresScrollPadding?: boolean;
  selectedFiles?: any[];
  selectedModelId?: string;
  completedMessageIds?: Set<string>;
}

export const PreviewMessage = memo(({
  message,
  isLoading = false,
}: PreviewMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex gap-4 w-full">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          {isUser ? (
            <User size={14} className="text-muted-foreground" />
          ) : (
            <Bot size={14} className="text-primary" />
          )}
        </div>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            {typeof message.content === 'string' ? (
              <ReactMarkdown className="prose prose-sm max-w-none">
                {message.content}
              </ReactMarkdown>
            ) : (
              message.parts?.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <ReactMarkdown key={index} className="prose prose-sm max-w-none">
                      {part.text}
                    </ReactMarkdown>
                  );
                }
                return null;
              })
            )}
            {isLoading && (
              <motion.div
                className="flex items-center gap-2 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

PreviewMessage.displayName = 'PreviewMessage';

export const ProcessingMessage = memo(() => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-4 group/message"
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex gap-4 w-full">
      <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
        <Bot size={14} className="text-primary" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-4 text-muted-foreground">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            <span className="text-sm">Thinking...</span>
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
));

ProcessingMessage.displayName = 'ProcessingMessage';