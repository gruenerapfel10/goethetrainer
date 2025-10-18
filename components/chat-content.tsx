'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/queries';
import { fetcher } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactInset } from './artifact-inset';
import { useChat } from '@/contexts/chat-context';
import { ArtifactsProvider, useArtifactsContext } from '@/contexts/artifacts-context';

function ChatContentInner({
  selectedVisibilityType,
  isAdmin,
  chat,
}: {
  selectedVisibilityType: VisibilityType;
  isAdmin: boolean;
  chat?: {
    title: string;
    customTitle?: string | null;
  };
}) {
  const {
    id,
    messages,
    agentTools,
    setAgentTools,
    isReadonly,
  } = useChat();
  
  const { artifactsState, setArtifactsVisible } = useArtifactsContext();
  
  
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

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <ArtifactInset>
        <div ref={contentRef} className="flex flex-col h-[100dvh] bg-background w-full relative overflow-hidden min-w-0" data-narrow={isNarrowContent}>
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

          <div className="flex-1 relative overflow-hidden scrollable-y">
            <Messages
              bottomPadding={100}
              topPadding={isMobile ? headerHeight : 0}
              votes={votes}
              isArtifactVisible={artifactsState.isVisible}
            />

            {!isReadonly && <MultimodalInput />}
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
}: {
  selectedVisibilityType: VisibilityType;
  isAdmin: boolean;
  chat?: {
    title: string;
    customTitle?: string | null;
  };
  initialArtifacts?: Record<string, any>;
}) {
  return (
    <ArtifactsProvider initialArtifacts={initialArtifacts}>
      <ChatContentInner
        selectedVisibilityType={selectedVisibilityType}
        isAdmin={isAdmin}
        chat={chat}
      />
    </ArtifactsProvider>
  );
}