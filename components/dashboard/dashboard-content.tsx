'use client';

import { MapboxMap, mapController } from '@/components/mapbox';
import { ChatModal } from '@/components/chat-modal';
import { useChatModal } from '@/hooks/use-chat-modal';
import type { DashboardStats, UserUsage, FlaggedMessage } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { MessageSquare, Navigation } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import type { MapStyle } from '@/components/ui/map-style-selector';

interface DashboardContentProps {
  stats: DashboardStats | null;
  userUsage: UserUsage[];
  flaggedMessages: FlaggedMessage[];
  isLoading: boolean;
  agentTypeUsageData: any;
  modelUsageData: any;
  userId: string;
}

export default function DashboardContent({
  stats,
  userUsage,
  flaggedMessages,
  modelUsageData,
  isLoading,
  agentTypeUsageData,
  userId,
}: DashboardContentProps) {
  const { isOpen, openModal, closeModal } = useChatModal();
  const [currentCoordinates, setCurrentCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Add keyboard shortcut handling for this component only
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        openModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      <MapboxMap className="w-full h-full" />
      
      {/* Floating button for mobile/tablet */}
      <Button
        onClick={openModal}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-10 md:hidden"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Keyboard shortcut hint */}
      <div className="absolute bottom-6 left-6 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md border border-border shadow-sm z-10 hidden md:block">
        <p className="text-sm text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border">⌘K</kbd> to open chat
        </p>
      </div>

      <ChatModal
        isOpen={isOpen}
        onClose={closeModal}
        userId={userId}
      />
    </div>
  );
}
