'use client';

import type { Attachment } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MessageSquare, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

import { generateUUID } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { FileSearchResult } from '@/components/chat-header';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { DEFAULT_MODEL_NAME } from '@/lib/ai/models';
import { MapDataStreamHandler } from './map-data-stream-handler';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChatModel?: string;
  userId: string;
}

export function ChatModal({ 
  isOpen, 
  onClose, 
  selectedChatModel = DEFAULT_MODEL_NAME,
  userId 
}: ChatModalProps) {
  const chatId = useRef(generateUUID());
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileSearchResult[]>([]);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
  
  // Feature toggles
  const [isDeepResearchEnabled, setIsDeepResearchEnabled] = useState(false);
  const [isFileSearchEnabled, setIsFileSearchEnabled] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(false);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    data,
  } = useChat({
    id: chatId.current,
    body: {
      id: chatId.current,
      selectedChatModel: selectedChatModel,
      deepResearch: isDeepResearchEnabled,
      fileSearch: isFileSearchEnabled,
      webSearch: isWebSearchEnabled,
      imageGeneration: isImageGenerationEnabled,
      selectedFiles: selectedFiles,
    },
    generateId: generateUUID,
    onFinish: (message) => {
      if (message.id && message.role === 'assistant') {
        setTimeout(() => {
          setCompletedMessageIds(prev => new Set([...prev, message.id]));
        }, 1000);
      }
    },
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  // Reset chat when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset state after animation completes
      const timer = setTimeout(() => {
        setMessages([]);
        setInput('');
        setAttachments([]);
        setSelectedFiles([]);
        setCompletedMessageIds(new Set());
        chatId.current = generateUUID();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, setMessages, setInput]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

  return (
    <TooltipProvider>
      <MapDataStreamHandler dataStream={data || []} chatId={chatId.current} />
      <AnimatePresence>
        {isOpen && (
          <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-background border-l border-border shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Quick Chat</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto px-4"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Start a conversation with AI
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">⌘K</kbd> to toggle
                      </p>
                    </div>
                  </div>
                ) : (
                  <Messages
                    chatId={chatId.current}
                    status={status}
                    votes={undefined}
                    messages={messages}
                    setMessages={setMessages}
                    reload={reload}
                    isReadonly={false}
                    isArtifactVisible={false}
                    bottomPadding={20}
                    selectedFiles={selectedFiles}
                    selectedModelId={selectedChatModel}
                    completedMessageIds={completedMessageIds}
                  />
                )}
                <div ref={endRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border p-4">
                <form className="relative">
                  <MultimodalInput
                    selectedModelId={selectedChatModel}
                    chatId={chatId.current}
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleSubmit}
                    status={status}
                    stop={stop}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    messages={messages}
                    setMessages={setMessages}
                    append={append}
                    selectedFiles={selectedFiles}
                    onSelectedFilesChange={setSelectedFiles}
                    isDeepResearchEnabled={isDeepResearchEnabled}
                    onDeepResearchChange={setIsDeepResearchEnabled}
                    isFileSearchEnabled={isFileSearchEnabled}
                    onFileSearchChange={setIsFileSearchEnabled}
                    isWebSearchEnabled={isWebSearchEnabled}
                    onWebSearchChange={setIsWebSearchEnabled}
                    isImageGenerationEnabled={isImageGenerationEnabled}
                    onImageGenerationChange={setIsImageGenerationEnabled}
                    onHeightChange={() => {}}
                  />
                </form>
              </div>

              {/* Scroll to bottom button */}
              <AnimatePresence>
                {!isAtBottom && messages.length > 0 && (
                  <motion.div
                    className="absolute bottom-24 right-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <Button
                      onClick={() => scrollToBottom()}
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full shadow-md"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}