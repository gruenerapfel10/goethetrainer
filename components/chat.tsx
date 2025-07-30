'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import useSWR, { unstable_serialize, useSWRConfig } from 'swr';

import { ChatHeader, type FileSearchResult } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';

import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { ArtifactPanel } from './artifact-panel';
import { ArtifactInset } from './artifact-inset';
import { useArtifactSelector } from '../hooks/use-artifact';
import { toast } from 'sonner';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { motion } from 'framer-motion';
import { getCapabilitiesToDisable, getExclusionMessage } from '@/lib/ai/capability-exclusions';
import { ConversationBranch } from './conversation-branch';
import { SmartNotificationAnalyzer } from '@/lib/notifications/smart-analyzer';
import { NotificationService } from '@/lib/notifications/notification-service';

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
  
  // Check if we're loading a branch
  const [branchMessages, setBranchMessages] = useState<Array<UIMessage> | null>(null);
  
  useEffect(() => {
    const branchId = sessionStorage.getItem('branch-id');
    const savedBranchMessages = sessionStorage.getItem('branch-messages');
    
    if (branchId === id && savedBranchMessages) {
      try {
        const parsedMessages = JSON.parse(savedBranchMessages);
        setBranchMessages(parsedMessages);
        // Clean up
        sessionStorage.removeItem('branch-id');
        sessionStorage.removeItem('branch-messages');
      } catch (e) {
        console.error('Failed to parse branch messages:', e);
      }
    }
  }, [id]);
  const [isDeepResearchEnabled, setIsDeepResearchEnabled] = useState(false);
  const [isFileSearchEnabled, setIsFileSearchEnabled] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true); // Web search enabled by default
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(false);
  
  // Handle capability changes with exclusivity rules
  const handleCapabilityChange = useCallback((capability: string, enabled: boolean) => {
    if (!enabled) {
      // If disabling, just disable it
      switch (capability) {
        case 'deepSearch':
          setIsDeepResearchEnabled(false);
          break;
        case 'imageGeneration':
          setIsImageGenerationEnabled(false);
          break;
        case 'webSearch':
          setIsWebSearchEnabled(false);
          break;
        case 'fileSearch':
          setIsFileSearchEnabled(false);
          break;
      }
      return;
    }
    
    // If enabling, check for conflicts
    const currentState = {
      deepSearch: isDeepResearchEnabled,
      imageGeneration: isImageGenerationEnabled,
      webSearch: isWebSearchEnabled,
      fileSearch: isFileSearchEnabled,
    };
    
    const toDisable = getCapabilitiesToDisable(capability, currentState);
    const exclusionMessage = getExclusionMessage(capability, currentState);
    
    if (exclusionMessage) {
      // Show warning but still allow the change
      toast.info(exclusionMessage);
    }
    
    // Disable conflicting capabilities
    toDisable.forEach(cap => {
      switch (cap) {
        case 'deepSearch':
          setIsDeepResearchEnabled(false);
          break;
        case 'imageGeneration':
          setIsImageGenerationEnabled(false);
          break;
      }
    });
    
    // Enable the requested capability
    switch (capability) {
      case 'deepSearch':
        setIsDeepResearchEnabled(true);
        break;
      case 'imageGeneration':
        setIsImageGenerationEnabled(true);
        break;
      case 'webSearch':
        setIsWebSearchEnabled(true);
        break;
      case 'fileSearch':
        setIsFileSearchEnabled(true);
        break;
    }
  }, [isDeepResearchEnabled, isImageGenerationEnabled, isWebSearchEnabled, isFileSearchEnabled]);
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
      webSearch: isWebSearchEnabled,
      imageGeneration: isImageGenerationEnabled,
      selectedFiles: selectedFiles,
    },
    initialMessages: branchMessages || initialMessages,
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

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`messages-${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  // Smart notification analysis
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const analyzer = SmartNotificationAnalyzer.getInstance();
    const notificationService = NotificationService.getInstance();
    
    // Analyze the last message for notifications
    const result = analyzer.analyzeMessage(lastMessage, id, {
      userName: 'User', // Could be dynamic
      previousMessages: messages.slice(-5), // Last 5 messages for context
    });
    
    // Send notifications
    if (result.shouldNotify) {
      result.notifications.forEach(async (notification) => {
        await notificationService.notify(notification);
      });
    }

    // Analyze chat session periodically (every 10 messages)
    if (messages.length % 10 === 0) {
      const sessionResult = analyzer.analyzeChatSession(messages, id);
      if (sessionResult.shouldNotify) {
        sessionResult.notifications.forEach(async (notification) => {
          await notificationService.notify(notification);
        });
      }
    }
  }, [messages, id]);

  return (
    <div className="flex h-dvh w-full">
      <ArtifactInset>
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
        >
          <ConversationBranch 
            currentChatId={id}
            messages={messages}
            className="ml-2"
          />
        </ChatHeader>

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
          <motion.div 
            className="absolute z-[5] w-full"
            initial={false}
            animate={{
              bottom: messages.length > 0 ? "0%" : "50%",
              transform: messages.length > 0 ? "translateY(0%)" : "translateY(50%)",
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.6
            }}
          >
            <form 
              ref={inputContainerRef}
              className="flex mx-auto px-4 py-4 md:py-6 gap-2 w-full max-w-3xl items-center justify-center min-h-[calc(100vh-80px)] md:min-h-0"
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
                onDeepResearchChange={(enabled) => handleCapabilityChange('deepSearch', enabled)}
                isFileSearchEnabled={isFileSearchEnabled}
                onFileSearchChange={setIsFileSearchEnabled}
                isWebSearchEnabled={isWebSearchEnabled}
                onWebSearchChange={setIsWebSearchEnabled}
                isImageGenerationEnabled={isImageGenerationEnabled}
                onImageGenerationChange={(enabled) => handleCapabilityChange('imageGeneration', enabled)}
                onHeightChange={handleInputHeightChange}
              />
            </form>
          </motion.div>
        )}
        </div>
      </ArtifactInset>

      <ArtifactPanel
        selectedModelId={selectedChatModel}
        chatId={id}
        status={status}
        stop={stop}
        messages={messages}
        setMessages={setMessages}
        votes={votes}
        append={append}
        reload={reload}
        isReadonly={isReadonly}
      />
    </div>
  );
}