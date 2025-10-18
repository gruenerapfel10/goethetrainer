'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import type { Vote } from '@/lib/db/queries';
import { fetcher } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactInset } from './artifact-inset';
import { useChat } from '@/contexts/chat-context';
import { ArtifactsProvider, useArtifactsContext } from '@/contexts/artifacts-context';
import { ChatSelector } from './chat-selector';

function SidebarChatContentInner({
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
  
  const { artifactsState } = useArtifactsContext();
  
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
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
    <div className="flex h-full w-full overflow-hidden bg-transparent relative">
      <ArtifactInset>
        <div ref={contentRef} className="flex flex-col h-full bg-transparent w-full relative overflow-hidden min-w-0">
          {/* Chat selector header */}
          <div className="px-2 py-2 border-b border-border/20 flex-shrink-0">
            <ChatSelector 
              currentChatId={id}
              onChatSelect={(chatId) => {
                window.location.href = `/chat/${chatId}`;
              }}
              chevronDirection="down"
              buttonClassName="w-full h-8 px-2 gap-2 text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 justify-start"
            />
          </div>
          
          <div className="flex-1 relative overflow-hidden scrollable-y">
            <Messages
              bottomPadding={100}
              topPadding={0}
              votes={votes}
              isArtifactVisible={artifactsState.isVisible}
            />
          </div>

          {/* Input stays at bottom always */}
          {!isReadonly && <MultimodalInput disableCenter={true} disableMargin={true} hideModelSelector={true} />}
        </div>
      </ArtifactInset>
      <ArtifactPanel />
    </div>
  );
}

export function SidebarChatContent({
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
      <SidebarChatContentInner
        selectedVisibilityType={selectedVisibilityType}
        isAdmin={isAdmin}
        chat={chat}
      />
    </ArtifactsProvider>
  );
}
