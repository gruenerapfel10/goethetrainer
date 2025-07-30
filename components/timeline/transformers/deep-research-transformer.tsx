import type { TimelineStep } from "../types";

export function transformDeepResearchToTimeline(steps: any[]): TimelineStep[] {
  return steps.map((step, index) => ({
    id: `step-${index}`,
    title: step.label || step.title || `Step ${index + 1}`,
    message: step.description || step.message,
    status: step.status || "pending",
    timestamp: step.completed_at || step.timestamp || Date.now(),
    data: {
      error: step.error,
      completed_at: step.completed_at,
    },
  }));
}