'use client';

import { useState, useEffect } from 'react';
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
    sessionQuestions,
    startSession,
    endSession
  } = useLearningSession();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  const isActiveForType = activeSession && activeSession.type === type;

  // Navigate as soon as session is created
  useEffect(() => {
    if (!hasNavigated && activeSession) {
      setHasNavigated(true);
      router.push(`/${activeSession.type}/session/${activeSession.id}`);
      if (onSessionStart) {
        onSessionStart(activeSession.id);
      }
    }
  }, [activeSession, hasNavigated, router, onSessionStart]);

  const handleStart = async () => {
    setHasNavigated(false);
    await startSession(type, metadata);
  };

  const handleEnd = async () => {
    if (!showEndConfirm) {
      setShowEndConfirm(true);
      setTimeout(() => setShowEndConfirm(false), 3000); // Auto reset after 3 seconds
      return;
    }
    
    await endSession('completed');
    setShowEndConfirm(false);
    if (onSessionEnd) {
      onSessionEnd();
    }
  };

  // If there's a different type of session active, show disabled state
  if (activeSession && !isActiveForType) {
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