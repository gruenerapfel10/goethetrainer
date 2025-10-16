"use client"

import type { TimelineStep, ReasonStreamUpdate } from "./types";
// import { transformReasonStreamUpdate } from './transformers'; // Removed unused transformer

/**
 * Format a duration in milliseconds to a human-readable string
 */
export const formatDuration = (durationMs: number): string => {
  if (durationMs < 0) return "-";
  if (durationMs < 1000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.floor(durationMs / 1000)}s`;
};

/**
 * Calculate the duration between timeline steps
 */
export const calculateDuration = (
  timestamp: number, 
  index: number, 
  steps: TimelineStep[], 
  isRunning: boolean
): string => {
  if (isRunning) {
    return formatDuration(Date.now() - timestamp);
  }
  const nextStep = steps[index + 1];
  if (nextStep?.timestamp) {
    return formatDuration(nextStep.timestamp - timestamp)
  }
  return "-";
};

/**
 * Process stream updates into timeline steps
 */
export function processReasonStreamUpdates(updates: ReasonStreamUpdate[]): TimelineStep[] {
  if (!updates || updates.length === 0) return [];

  // Filter and process updates
  const processedSteps: TimelineStep[] = [];
  const textDeltas = new Map<string, string>();

  updates.forEach(update => {
    // Skip initial status updates
    if (update.id.includes('-start')) {
      return;
    }

    // Accumulate text-delta messages
    if (update.type === 'text-delta') {
      const existing = textDeltas.get(update.id) || '';
      textDeltas.set(update.id, existing + update.message);
      return; // Don't add to steps yet
    }

    // Convert to timeline step
    let step: TimelineStep;
    
    if (update.type === 'tool-call') {
      step = {
        id: update.id,
        title: update.message || 'Tool Call',
        message: update.details?.args?.query || '',
        status: update.status === 'completed' ? 'completed' : 'running',
        timestamp: update.timestamp || Date.now(),
      };
    } else if (update.type === 'tool-result') {
      step = {
        id: update.id,
        title: update.message || 'Tool Result',
        message: '',
        status: update.status === 'failed' ? 'error' : 'completed',
        timestamp: update.timestamp || Date.now(),
      };
    } else if (update.type === 'error') {
      step = {
        id: update.id,
        title: 'Error',
        message: update.message || '',
        status: 'error',
        timestamp: update.timestamp || Date.now(),
      };
    } else {
      return; // Skip unknown types
    }

    processedSteps.push(step);
  });

  // Add consolidated text-delta updates
  textDeltas.forEach((message, id) => {
    if (message.trim()) {
      processedSteps.push({
        id,
        title: 'Processing',
        message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
        status: 'completed',
        timestamp: Date.now(),
      });
    }
  });

  // Sort by timestamp
  return processedSteps.sort((a, b) => a.timestamp - b.timestamp);
}

