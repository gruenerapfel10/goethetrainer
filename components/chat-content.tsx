'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { cn, fetcher } from '@/lib/utils';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/queries';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactInset } from './artifact-inset';
import { useChat } from '@/contexts/chat-context';
import { ArtifactsProvider, useArtifactsContext } from '@/contexts/artifacts-context';
import { ChatSelector } from './chat-selector';
import { emitApplyChatInput } from '@/lib/chat/events';

function ChatContentInner({
  selectedVisibilityType,
  isAdmin,
  chat,
  variant = 'default',
  onChatChange,
  pendingPrompt,
  onPromptConsumed,
}: {
  selectedVisibilityType: VisibilityType;
  isAdmin: boolean;
  chat?: {
    title: string;
    customTitle?: string | null;
  };
  variant?: 'default' | 'sidebar';
  onChatChange?: (chatId: string) => void;
  pendingPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  const {
    id,
    messages,
    agentTools,
    setAgentTools,
    isReadonly,
    setInput,
  } = useChat();
  
  const { artifactsState, setArtifactsVisible } = useArtifactsContext();
  const router = useRouter();
  
  
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isNarrowContent, setIsNarrowContent] = useState(false);
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIsNarrowContent(width < 600);
      }
    });
    
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  const handleHeaderHeightChange = useCallback((height: number) => {
    setHeaderHeight(height);
  }, []);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  useEffect(() => {
    if (!pendingPrompt) {
      return;
    }
    const quoted = `"${pendingPrompt}"`;
    setInput(quoted);
    emitApplyChatInput(quoted);
    onPromptConsumed?.();
  }, [pendingPrompt, setInput, onPromptConsumed]);

  const isSidebar = variant === 'sidebar';

  return (
    <div className={cn('flex h-full w-full overflow-hidden', isSidebar && 'bg-transparent relative')}>
      <ArtifactInset>
        <div
          ref={contentRef}
          className={cn(
            'flex flex-col h-full w-full relative overflow-hidden min-w-0',
            isSidebar ? 'bg-transparent' : 'bg-background',
          )}
          data-narrow={isNarrowContent}
        >
          {isSidebar ? (
            <div className="px-2 py-2 flex-shrink-0">
              <ChatSelector
                currentChatId={id}
                onChatSelect={(chatId) => {
                  if (onChatChange) {
                    onChatChange(chatId);
                    return;
                  }
                  router.push(`/chat/${chatId}`);
                }}
                chevronDirection="down"
                buttonClassName="h-8 px-2 gap-2 text-sm font-normal hover:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                onExport={() => {
                  router.push(`/chat/${id}`);
                }}
              />
            </div>
          ) : (
            <ChatHeader
              chatId={id}
              selectedVisibilityType={selectedVisibilityType}
              isReadonly={isReadonly}
              isAdmin={isAdmin}
              isDeepResearchEnabled={agentTools.deepResearch?.active || false}
              onDeepResearchChange={(enabled) => setAgentTools('deepResearch', enabled)}
              chatTitle={chat?.customTitle || chat?.title}
              onHeightChange={handleHeaderHeightChange}
              artifactIsVisible={artifactsState.isVisible}
              onArtifactToggle={() => setArtifactsVisible(!artifactsState.isVisible)}
            />
          )}

          <div className="flex-1 relative overflow-hidden scrollable-y">
            <Messages
              bottomPadding={100}
              topPadding={isMobile && !isSidebar ? headerHeight : 0}
              votes={votes}
              isArtifactVisible={artifactsState.isVisible}
            />

            {!isReadonly && (
              isSidebar ? (
                <div className="pb-8">
                  <MultimodalInput disableCenter disableMargin hideModelSelector />
                </div>
              ) : (
                <MultimodalInput />
              )
            )}
          </div>
        </div>
      </ArtifactInset>
      <ArtifactPanel />
    </div>
  );
}

export function ChatContent({
  selectedVisibilityType,
  isAdmin,
  chat,
  initialArtifacts,
  variant = 'default',
  onChatChange,
  pendingPrompt,
  onPromptConsumed,
}: {
  selectedVisibilityType: VisibilityType;
  isAdmin: boolean;
  chat?: {
    title: string;
    customTitle?: string | null;
  };
  initialArtifacts?: Record<string, any>;
  variant?: 'default' | 'sidebar';
  onChatChange?: (chatId: string) => void;
  pendingPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  return (
    <ArtifactsProvider initialArtifacts={initialArtifacts}>
      <ChatContentInner
        selectedVisibilityType={selectedVisibilityType}
        isAdmin={isAdmin}
        chat={chat}
        variant={variant}
        onChatChange={onChatChange}
        pendingPrompt={pendingPrompt}
        onPromptConsumed={onPromptConsumed}
      />
    </ArtifactsProvider>
  );
}
