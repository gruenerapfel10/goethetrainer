"use client"

import { useState, useEffect } from "react";
import type { TimelineStep } from "./types";
import { processReasonStreamUpdates } from "./utils";

/**
 * Custom hook for managing timeline state with local storage persistence
 */
export function useTimelineState(timelineId?: string) {
  const storageKey = timelineId || "generalTimeline";
  
  function getStoredState<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined' || !timelineId) return defaultValue;
    try {
      const stored = localStorage.getItem(`${storageKey}_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  function setStoredState<T>(key: string, value: T): void {
    if (typeof window === 'undefined' || !timelineId) return;
    try {
      localStorage.setItem(`${storageKey}_${key}`, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  }

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    () => new Set(getStoredState<string[]>('expandedSteps', []))
  );
  
  const [showAllItems, setShowAllItems] = useState<boolean>(
    () => getStoredState<boolean>('showAllItems', false)
  );

  useEffect(() => {
    if (timelineId) setStoredState('expandedSteps', Array.from(expandedSteps));
  }, [expandedSteps, timelineId]);

  useEffect(() => {
    if (timelineId) setStoredState('showAllItems', showAllItems);
  }, [showAllItems, timelineId]);

  return {
    expandedSteps,
    setExpandedSteps,
    showAllItems,
    setShowAllItems
  };
}

/**
 * Custom hook for tracking elapsed time for running steps
 */
export const useElapsedTime = (isRunning: boolean, startTime: number) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  return elapsed;
};

/**
 * Custom hook for processing timeline steps from stream updates
 */
export function useProcessedSteps(steps?: TimelineStep[], streamUpdates?: any[]) {
  return useState(() => 
    steps || processReasonStreamUpdates(streamUpdates || [])
  )[0];
}