"use client"

import type { TimelineStep, ReasonStreamUpdate } from "./types";
import { transformReasonStreamUpdate } from './transformers/base-reason-transformer';

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
  const stepsMap = new Map<string, TimelineStep>();
  const toolCallArgsMap = new Map<string, any>(); // Store tool args by operation ID
  const chronologicalIds: string[] = [];

  updates.forEach(update => {
    const existingStep = stepsMap.get(update.id);

    // If this is a tool-call, store the args for later use
    if (update.type === 'tool-call' && update.details?.args) {
      toolCallArgsMap.set(update.id, update.details.args);
    }

    // If this is a tool-result, try to get the corresponding tool args
    if (update.type === 'tool-result') {
      const toolArgs = toolCallArgsMap.get(update.id);
      if (toolArgs && update.details) {
        update.details.toolArgs = toolArgs;
      }
    }

    const newStep = transformReasonStreamUpdate(update, existingStep);

    if (newStep) {
      stepsMap.set(update.id, newStep);
      if (!chronologicalIds.includes(update.id)) {
        chronologicalIds.push(update.id);
      }
    }
  });

  return chronologicalIds
    .map(id => stepsMap.get(id)!)
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

