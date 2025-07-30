'use client';

import { useMemo, useState, useEffect } from 'react';

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
  const [startTime] = useState<number>(Date.now());
  const maxDuration = 1 * 60 * 1000; // 1 minutes in milliseconds
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activity && activity.length > 0) {
      const lastItem = activity[activity.length - 1];
      setLastActivity(lastItem.message);

      if (
        lastItem.completedSteps !== undefined &&
        lastItem.totalSteps !== undefined
      ) {
        deepResearchState.completedSteps = lastItem.completedSteps;
        deepResearchState.totalExpectedSteps = lastItem.totalSteps;
      }
    }
  }, [activity, deepResearchState]);

  // Calculate overall progress
  const progress = useMemo(() => {
    if (deepResearchState.totalExpectedSteps === 0) return 0;
    return Math.min(
      (deepResearchState.completedSteps /
        deepResearchState.totalExpectedSteps) *
        100,
      100,
    );
  }, [deepResearchState.completedSteps, deepResearchState.totalExpectedSteps]);

  // Calculate time progress
  const timeProgress = useMemo(() => {
    const elapsed = currentTime - startTime;
    return Math.min((elapsed / maxDuration) * 100, 100);
  }, [currentTime, startTime]);

  // Get current phase
  const currentPhase = useMemo(() => {
    if (!activity.length) return '';
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
      default:
        return 'Researching';
    }
  }, [activity]);

  // Format time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const timeUntilTimeout = Math.max(maxDuration - (currentTime - startTime), 0);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span>Research in progress...</span>
          {/* Depth: {deepResearchState.currentDepth}/{deepResearchState.maxDepth} */}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span>{Math.round(progress)}%</span>
          <span className="text-xs">
            Step {deepResearchState.completedSteps}/
            {deepResearchState.totalExpectedSteps}
          </span>
        </div>
      </div>
      <Progress value={progress} className="w-full" />
      <div className="flex items-center justify-end text-xs text-muted-foreground mt-2">
        {/* <span>Time until timeout: {formatTime(timeUntilTimeout)}</span> */}
        {/* <span>{Math.round(timeProgress)}% of max time used</span> */}
      </div>
      {/* <Progress value={timeProgress} className="w-full" /> */}
      <div className="text-xs text-muted-foreground">{lastActivity}</div>
    </div>
  );
};

export default DeepResearchProgress;
