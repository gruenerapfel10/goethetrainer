'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';
import { useLearningSession } from '@/lib/sessions/learning-session-context';
import type { SessionType } from '@/lib/sessions/types';
import { cn } from '@/lib/utils';

interface StartSessionButtonProps {
  type: SessionType;
  metadata?: Record<string, any>;
  className?: string;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
}

export function StartSessionButton({
  type,
  metadata,
  className,
  onSessionStart,
  onSessionEnd
}: StartSessionButtonProps) {
  const router = useRouter();
  const {
    activeSession,
    isLoading,
    startSession,
    endSession,
    completeQuestions,
  } = useLearningSession();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const isBlockingSession =
    !!activeSession && (activeSession.status === 'active' || activeSession.status === 'paused');
  const isActiveForType =
    isBlockingSession && activeSession?.type === type;

  const handleStart = async () => {
    const session = await startSession(type, metadata);
    if (session && (session.status === 'active' || session.status === 'paused')) {
      router.push(`/${session.type}/session/${session.id}`);
      if (onSessionStart) {
        onSessionStart(session.id);
      }
    }
  };

  const handleEnd = async () => {
    if (!showEndConfirm) {
      setShowEndConfirm(true);
      setTimeout(() => setShowEndConfirm(false), 3000); // Auto reset after 3 seconds
      return;
    }

    await completeQuestions();
    await endSession('completed');
    setShowEndConfirm(false);
    if (onSessionEnd) {
      onSessionEnd();
    }
  };

  // If there's a different type of session active, show disabled state
  if (isBlockingSession && activeSession && !isActiveForType) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("gap-2", className)}
      >
        <Square className="h-4 w-4" />
        Session in progress
      </Button>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("gap-2", className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Active session for this type
  if (isActiveForType) {
    return (
      <Button
        variant={showEndConfirm ? "destructive" : "outline"}
        onClick={handleEnd}
        className={cn("gap-2", className)}
      >
        <Square className="h-4 w-4" />
        {showEndConfirm ? "Confirm End" : "End Session"}
      </Button>
    );
  }

  // No active session - show start button
  return (
    <Button
      variant="default"
      onClick={handleStart}
      className={cn("gap-2", className)}
    >
      <Play className="h-4 w-4" />
      Start Session
    </Button>
  );
}
