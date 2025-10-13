'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { generateUUID, cn } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SparklesIcon } from './icons';
import { useWindowSize } from 'usehooks-ts';
import { RightSidebarToggle } from '@/components/right-sidebar-toggle';
import { motion } from 'framer-motion';

interface SidebarChatProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarChat({ isOpen, onToggle }: SidebarChatProps) {
  const chatId = 'sidebar-chat';
  const [inputHeight, setInputHeight] = useState(80);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  
  // Capability states
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const [isDeepResearchEnabled, setIsDeepResearchEnabled] = useState(false);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  
  // Resize functionality
  const [panelWidth, setPanelWidth] = useState(25); // Default width as percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: windowWidth } = useWindowSize();
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);

  const handleInputHeightChange = useCallback((height: number) => {
    setInputHeight(height);
  }, []);
  
  // Resize handlers - capture initial position to prevent jump
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Store the initial mouse position and panel width
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
  }, [panelWidth]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate the delta from the initial drag position
      const deltaX = dragStartX.current - e.clientX;
      
      // Get parent container to calculate percentage
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      
      const parentWidth = parent.getBoundingClientRect().width;
      
      // Convert pixel delta to percentage of parent width
      const deltaPercentage = (deltaX / parentWidth) * 100;
      
      // Apply delta to initial width
      const newWidth = dragStartWidth.current + deltaPercentage;
      
      // Clamp between min and max
      const clampedWidth = Math.max(20, Math.min(50, newWidth));
      
      setPanelWidth(clampedWidth);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    
    // Ensure we're in the browser
    if (typeof window === 'undefined' || !window.document) return;
    
    const handleMouseMoveWrapper = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpWrapper = () => handleMouseUp();
    
    try {
      window.document.addEventListener('mousemove', handleMouseMoveWrapper);
      window.document.addEventListener('mouseup', handleMouseUpWrapper);
      
      if (window.document.body) {
        window.document.body.style.cursor = 'col-resize';
        window.document.body.style.userSelect = 'none';
      }
    } catch (error) {
      console.error('Error adding event listeners:', error);
      return;
    }

    return () => {
      try {
        window.document.removeEventListener('mousemove', handleMouseMoveWrapper);
        window.document.removeEventListener('mouseup', handleMouseUpWrapper);
        
        if (window.document.body) {
          window.document.body.style.cursor = '';
          window.document.body.style.userSelect = '';
        }
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
      selectedChatModel: 'grok-beta',
      isJobAssistant: true,
      webSearch: isWebSearchEnabled,
      deepResearch: isDeepResearchEnabled,
      imageGeneration: isImageGenerationEnabled,
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

  if (!isOpen) {
    return (
      <div className="w-8 flex flex-col transition-all duration-300 relative hidden lg:flex h-full">
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="flex relative hidden lg:flex h-full pr-4 pb-4"
      animate={{ width: `${panelWidth}%` }}
      transition={
        isDragging 
          ? { duration: 0 } 
          : {
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }
      }
    >
      {/* Resize Handle */}
      <div className="relative w-0 h-full">        
        {/* Invisible drag area */}
        <div 
          className="absolute left-[-4px] top-0 w-2 h-full cursor-col-resize z-50"
          onMouseDown={handleMouseDown}
        />
        
        {/* Apple-style pill handle */}
        <div
          className={cn(
            "absolute left-[-16px] top-1/2 -translate-y-1/2 z-50",
            "w-4 h-16 flex items-center justify-center",
            "cursor-col-resize",
            "transition-opacity duration-200",
            isDragging ? "opacity-100" : "opacity-60 hover:opacity-100",
            "group"
          )}
          onMouseDown={handleMouseDown}
        >
          <div
            className={cn(
              "w-1.5 h-12 rounded-full",
              "bg-zinc-400 dark:bg-zinc-600",
              "transition-all duration-200 ease-out",
              "group-hover:h-16 group-hover:w-2 group-hover:bg-zinc-500 dark:group-hover:bg-zinc-500",
              isDragging && "h-16 w-2 bg-zinc-500 dark:bg-zinc-500",
              "shadow-sm"
            )}
          />
        </div>
      </div>
      
      <TooltipProvider>
        <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0 pt-4">
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
            selectedModelId="grok-beta"
            completedMessageIds={completedMessageIds}
          />
        </div>

        {/* Input */}
        <div className="p-4 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <MultimodalInput
              selectedModelId="grok-beta"
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
              isDeepResearchEnabled={isDeepResearchEnabled}
              onDeepResearchChange={setIsDeepResearchEnabled}
              isFileSearchEnabled={false}
              onFileSearchChange={() => {}}
              isWebSearchEnabled={isWebSearchEnabled}
              onWebSearchChange={setIsWebSearchEnabled}
              isImageGenerationEnabled={isImageGenerationEnabled}
              onImageGenerationChange={setIsImageGenerationEnabled}
              onHeightChange={handleInputHeightChange}
            />
          </form>
        </div>
        </div>
      </TooltipProvider>
    </motion.div>
  );
}