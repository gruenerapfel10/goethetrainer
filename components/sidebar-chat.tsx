'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useCallback, useEffect } from 'react';
import { generateUUID } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SparklesIcon } from './icons';

export function SidebarChat() {
  const chatId = 'sidebar-chat';
  const [inputHeight, setInputHeight] = useState(80);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  
  // Simple capability states
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  const handleInputHeightChange = useCallback((height: number) => {
    setInputHeight(height);
  }, []);

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
  } = useChat({
    id: chatId,
    body: {
      id: chatId,
      selectedChatModel: 'job-assistant',
      webSearch: isWebSearchEnabled,
      selectedFiles: selectedFiles,
    },
    initialMessages: [],
    experimental_throttle: 100,
    sendExtraMessageFields: true,
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

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`messages-${chatId}`, JSON.stringify(messages));
    }
  }, [messages]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 flex-shrink-0 border-b">
          <h2 className="text-sm font-semibold">Job Assistant</h2>
          <p className="text-xs text-muted-foreground mt-1">Ask me anything about careers and jobs</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <Messages
            chatId={chatId}
            status={status}
            votes={undefined}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={false}
            isArtifactVisible={false}
            bottomPadding={20}
            selectedFiles={selectedFiles}
            selectedModelId="gemini-2.5-flash"
            completedMessageIds={completedMessageIds}
          />
        </div>

        {/* Input */}
        <div className="p-4 flex-shrink-0 border-t">
          <form onSubmit={handleSubmit}>
            <MultimodalInput
              selectedModelId="gemini-2.5-flash"
              chatId={chatId}
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
              isDeepResearchEnabled={false}
              onDeepResearchChange={() => {}}
              isFileSearchEnabled={false}
              onFileSearchChange={() => {}}
              isWebSearchEnabled={isWebSearchEnabled}
              onWebSearchChange={setIsWebSearchEnabled}
              isImageGenerationEnabled={false}
              onImageGenerationChange={() => {}}
              onHeightChange={handleInputHeightChange}
            />
          </form>
        </div>
      </div>
    </TooltipProvider>
  );
}