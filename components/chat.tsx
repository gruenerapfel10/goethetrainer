'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useCallback } from 'react';
import useSWR, { unstable_serialize, useSWRConfig } from 'swr';

import { ChatHeader, type FileSearchResult } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';

import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { Artifact } from './artifact';
import { useArtifactSelector } from '../hooks/use-artifact';
import { toast } from 'sonner';
import { getChatHistoryPaginationKey } from './sidebar-history';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  isAdmin,
  chat,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isAdmin: boolean;
  chat?: {
    title: string;
    customTitle?: string | null;
  };
}) {
  const { mutate } = useSWRConfig();
  const [isDeepResearchEnabled, setIsDeepResearchEnabled] = useState(false);
  const [isFileSearchEnabled, setIsFileSearchEnabled] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [inputHeight, setInputHeight] = useState(80); // Default height
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
  const inputContainerRef = useRef<HTMLFormElement>(null);

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
    id,
    body: {
      id,
      selectedChatModel: selectedChatModel,
      deepResearch: isDeepResearchEnabled,
      fileSearch: isFileSearchEnabled,
      selectedFiles: selectedFiles,
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: (message) => {
      console.log('message', messages[messages.length - 1]);
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      
      if (message.id && message.role === 'assistant') {
        // Add a small delay to ensure the message is saved
        setTimeout(() => {
          setCompletedMessageIds(prev => new Set([...prev, message.id]));
        }, 1000);
      }
    },
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background self-center w-full">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
          isAdmin={isAdmin}
          isDeepResearchEnabled={isDeepResearchEnabled}
          onDeepResearchChange={setIsDeepResearchEnabled}
          selectedFiles={selectedFiles}
          onSelectedFilesChange={setSelectedFiles}
          chatTitle={chat?.customTitle || chat?.title}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          bottomPadding={inputHeight - 40}
          selectedFiles={selectedFiles}
          selectedModelId={selectedChatModel}
          completedMessageIds={completedMessageIds}
        />

        {!isReadonly && (
          <div className="absolute bottom-0 z-[10] w-full">
            <form 
              ref={inputContainerRef}
              className="flex mx-auto px-4 py-4 md:py-6 gap-2 w-full max-w-3xl items-center justify-center"
            >
              <MultimodalInput
                selectedModelId={selectedChatModel}
                chatId={id}
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
                onHeightChange={handleInputHeightChange}
              />
            </form>
          </div>
        )}
      </div>

      <Artifact
        selectedModelId={selectedChatModel}
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
