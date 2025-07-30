"use client"

import React, { useMemo, useEffect, useState } from "react";
import { GeneralTimeline } from "./general-timeline";
import { ResearchCompleteCard } from "./research-complete-card";
import { transformDeepResearchToTimeline } from "../transformers/deep-research-transformer";
import { Progress } from "@/components/ui/progress";
import { useDeepResearch } from "@/lib/deep-research-context";

interface DeepResearchTimelineProps {
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
  timelineId?: string;
  showProgress?: boolean;
}

export function DeepResearchTimeline({ 
  state, 
  activity, 
  timelineId,
  showProgress = true 
}: DeepResearchTimelineProps) {
  const { state: deepResearchState } = useDeepResearch();
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('');

  // Transform activity to timeline steps
  const timelineSteps = useMemo(() => 
    transformDeepResearchToTimeline(activity), 
    [activity]
  );

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
        
        // Set timeout to hide UI after showing completion
        const timeout = setTimeout(() => {
          setShouldHide(true);
        }, 3000);
        
        return () => clearTimeout(timeout);
      }
    }
  }, [activity, deepResearchState]);

  // Handle state changes from parent
  useEffect(() => {
    if (state === 'completed' || state === 'finished') {
      setIsCompleted(true);
      setLastActivity('Research completed successfully');
      
      const timeout = setTimeout(() => {
        setShouldHide(true);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [state]);

  // Calculate overall progress
  const progress = useMemo(() => {
    if (isCompleted) return 100;
    if (deepResearchState.totalExpectedSteps === 0) return 0;
    return Math.min(
      (deepResearchState.completedSteps / deepResearchState.totalExpectedSteps) * 100,
      100,
    );
  }, [deepResearchState.completedSteps, deepResearchState.totalExpectedSteps, isCompleted]);

  // Get current phase
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

  // Don't render if should hide
  if (shouldHide) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Progress bar section - replicating the original component's progress display */}
      {showProgress && (
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
      )}

      {/* Timeline section */}
      <GeneralTimeline timelineId={timelineId} steps={timelineSteps} />
      
      {/* Completion card */}
      {isCompleted && <ResearchCompleteCard updates={activity} />}
    </div>
  );
}