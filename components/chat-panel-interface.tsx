'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';

import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '../hooks/use-artifact';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { getCapabilitiesToDisable, getExclusionMessage } from '@/lib/ai/capability-exclusions';
import { SmartNotificationAnalyzer } from '@/lib/notifications/smart-analyzer';
import { NotificationService } from '@/lib/notifications/notification-service';
import { WorkflowEngine } from '@/lib/automation/workflow-engine';
import { AIMemorySystem } from '@/lib/ai-memory/memory-system';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { useChatPanel } from './chat-panel';
import type { FileSearchResult } from './chat-header';
import { KingfisherLogo } from './kingfisher-logo';

export function ChatPanelInterface({
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
  const { toggleChatPanel } = useChatPanel();
  
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
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(false);
  
  // Handle capability changes with exclusivity rules
  const handleCapabilityChange = useCallback((capability: string, enabled: boolean) => {
    if (!enabled) {
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
    
    const currentState = {
      deepSearch: isDeepResearchEnabled,
      imageGeneration: isImageGenerationEnabled,
      webSearch: isWebSearchEnabled,
      fileSearch: isFileSearchEnabled,
    };
    
    const toDisable = getCapabilitiesToDisable(capability, currentState);
    const exclusionMessage = getExclusionMessage(capability, currentState);
    
    if (exclusionMessage) {
      toast.info(exclusionMessage);
    }
    
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
  const [inputHeight, setInputHeight] = useState(80);
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

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Workflow engine disabled - no automated workflows
  // useEffect(() => {
  //   const workflowEngine = WorkflowEngine.getInstance();
  //   workflowEngine.start();
  //   
  //   return () => {
  //     workflowEngine.stop();
  //   };
  // }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`messages-${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  // Notification analysis disabled - no more toasts on AI replies
  // useEffect(() => {
  //   if (messages.length === 0) return;
  //   
  //   const lastMessage = messages[messages.length - 1];
  //   const analyzer = SmartNotificationAnalyzer.getInstance();
  //   const notificationService = NotificationService.getInstance();
  //   const workflowEngine = WorkflowEngine.getInstance();
  //   const memorySystem = AIMemorySystem.getInstance();
  //   
  //   const textContent = lastMessage.parts && Array.isArray(lastMessage.parts)
  //     ? lastMessage.parts
  //         .filter((part: any) => part.type === 'text' && part.text)
  //         .map((part: any) => part.text)
  //         .join('\n\n')
  //     : typeof lastMessage.content === 'string' ? lastMessage.content : '';
  //   
  //   if (textContent) {
  //     const memoryAnalysis = memorySystem.analyzeMessage(textContent, id);
  //     
  //     memoryAnalysis.newMemories.forEach(memory => {
  //       memorySystem.addMemory(memory);
  //     });
  //     
  //     workflowEngine.triggerMessageEvent(textContent, id);
  //   }
  //   
  //   const result = analyzer.analyzeMessage(lastMessage, id, {
  //     userName: 'User',
  //     previousMessages: messages.slice(-5),
  //   });
  //   
  //   if (result.shouldNotify) {
  //     result.notifications.forEach(async (notification) => {
  //       await notificationService.notify(notification);
  //     });
  //   }

  //   if (messages.length % 10 === 0) {
  //     const sessionResult = analyzer.analyzeChatSession(messages, id);
  //     if (sessionResult.shouldNotify) {
  //       sessionResult.notifications.forEach(async (notification) => {
  //         await notificationService.notify(notification);
  //       });
  //     }
  //   }
  // }, [messages, id]);

  return (
    <div 
      className="flex flex-col h-full w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl"
      onWheel={(e) => {
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Chat Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/10 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-xl shadow-blue">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary dark:bg-blue-600 rounded-full flex items-center justify-center p-1.5">
            <KingfisherLogo className="w-full h-full text-white" />
          </div>
          <h2 className="text-sm font-medium text-foreground">Kingfisher Assistant</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChatPanel}
          className="h-6 w-6 text-muted-foreground hover:text-primary dark:hover:text-blue-400"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 relative overflow-hidden"
        onWheel={(e) => {
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
      >
        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={false} // Disable artifacts in panel
          bottomPadding={inputHeight + 20}
          selectedFiles={selectedFiles}
          selectedModelId={selectedChatModel}
          completedMessageIds={completedMessageIds}
        />
      </div>

      {/* Input Area */}
      {!isReadonly && (
        <div className="border-t border-border bg-background/95 backdrop-blur-sm">
          <form 
            ref={inputContainerRef}
            className="p-4"
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
        </div>
      )}
    </div>
  );
}