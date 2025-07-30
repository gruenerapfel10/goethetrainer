'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Progress } from './ui/progress';
import { useDeepResearch } from '@/lib/deep-research-context';

const DeepResearchProgress = ({
  state,
  activity,
}: {
  state: string;
  activity: Array<{
    type: string;
    status: string;
    message: string;
    timestamp: string;
    depth?: number;
    completedSteps?: number;
    totalSteps?: number;
  }>;
}) => {
  const { state: deepResearchState } = useDeepResearch();
  const [lastActivity, setLastActivity] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  
  const completionTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle activity updates and completion detection
  useEffect(() => {
    if (activity && activity.length > 0) {
      const lastItem = activity[activity.length - 1];
      setLastActivity(lastItem.message);

      // Update step progress
      if (
        lastItem.completedSteps !== undefined &&
        lastItem.totalSteps !== undefined
      ) {
        deepResearchState.completedSteps = lastItem.completedSteps;
        deepResearchState.totalExpectedSteps = lastItem.totalSteps;
      }

      // Check for completion signals
      if (
        lastItem.status === 'completed' || 
        lastItem.message.includes('research complete') ||
        (lastItem.completedSteps !== undefined && 
         lastItem.totalSteps !== undefined && 
         lastItem.completedSteps === lastItem.totalSteps && 
         lastItem.totalSteps > 0)
      ) {
        setIsCompleted(true);
        
        // Clear any existing timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
        }
        
        // Set timeout to hide UI after showing completion
        completionTimeoutRef.current = setTimeout(() => {
          setShouldHide(true);
        }, 3000); // Keep visible for 3 seconds after completion
      }
    }
  }, [activity, deepResearchState]);

  // Handle state changes from parent
  useEffect(() => {
    if (state === 'completed' || state === 'finished') {
      setIsCompleted(true);
      setLastActivity('Research completed successfully');
      
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
      
      completionTimeoutRef.current = setTimeout(() => {
        setShouldHide(true);
      }, 3000);
    }
  }, [state]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  // Calculate overall progress (must be before conditional returns)
  const progress = useMemo(() => {
    if (isCompleted) return 100;
    if (deepResearchState.totalExpectedSteps === 0) return 0;
    return Math.min(
      (deepResearchState.completedSteps / deepResearchState.totalExpectedSteps) * 100,
      100,
    );
  }, [deepResearchState.completedSteps, deepResearchState.totalExpectedSteps, isCompleted]);

  // Calculate time progress - removed (no max duration limit)
  // const timeProgress = useMemo(() => { ... }, [...]);

  // Get current phase (must be before conditional returns)
  const currentPhase = useMemo(() => {
    if (isCompleted) return 'Completed';
    if (!activity.length) return 'Initializing';
    
    const current = activity[activity.length - 1];
    switch (current.type) {
      case 'search':
        return 'Searching';
      case 'extract':
        return 'Extracting';
      case 'analyze':
        return 'Analyzing';
      case 'synthesis':
        return 'Synthesizing';
      case 'saving':
        return 'Saving results';
      default:
        return 'Researching';
    }
  }, [activity, isCompleted]);

  // Don't render if should hide (conditional return must be after all hooks)
  if (shouldHide) {
    return null;
  }

  // Format time helper (kept for potential future use)
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full space-y-2 transition-all duration-500 ${
      isCompleted ? 'opacity-90' : 'opacity-100'
    }`}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span>{isCompleted ? 'Research completed!' : 'Research in progress...'}</span>
          <span className="text-xs text-blue-600">{currentPhase}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
            {Math.round(progress)}%
          </span>
          <span className="text-xs">
            Step {deepResearchState.completedSteps}/
            {deepResearchState.totalExpectedSteps || '?'}
          </span>
        </div>
      </div>
      
      <Progress 
        value={progress} 
        className={`w-full transition-all duration-300 ${
          isCompleted ? 'progress-completed' : ''
        }`} 
      />
      
      <div className={`text-xs transition-colors duration-300 ${
        isCompleted ? 'text-green-600' : 'text-muted-foreground'
      }`}>
        {lastActivity || 'Initializing research...'}
      </div>
    </div>
  );
};

export default DeepResearchProgress;