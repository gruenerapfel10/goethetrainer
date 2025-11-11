'use client';

import React from 'react';
import { TimelineStep } from '@/components/timeline/components/timeline-step';

export interface ReasoningData {
  content: string;
  isComplete: boolean;
}

export class ReasoningHandler {
  static extract(content: string): ReasoningData | null {
    // Check for complete reasoning tags
    const reasoningMatch = content.match(/<reasoning>(.*?)<\/reasoning>/gs);
    if (reasoningMatch) {
      return {
        content: reasoningMatch[0].replace(/<reasoning>(.*?)<\/reasoning>/gs, '$1'),
        isComplete: true
      };
    }

    // Check for complete reason tags (alternative)
    const reasonMatch = content.match(/<reason>(.*?)<\/reason>/gs);
    if (reasonMatch) {
      return {
        content: reasonMatch[0].replace(/<reason>(.*?)<\/reason>/gs, '$1'),
        isComplete: true
      };
    }

    // Check for incomplete reasoning tag (optimistic)
    const openReasoningMatch = content.match(/<reasoning>\s*(.*)$/gs);
    if (openReasoningMatch) {
      return {
        content: openReasoningMatch[0].replace(/<reasoning>\s*(.*)$/gs, '$1'),
        isComplete: false
      };
    }

    // Check for incomplete reason tag (optimistic)
    const openReasonMatch = content.match(/<reason>\s*(.*)$/gs);
    if (openReasonMatch) {
      return {
        content: openReasonMatch[0].replace(/<reason>\s*(.*)$/gs, '$1'),
        isComplete: false
      };
    }

    return null;
  }

  static removeFromContent(content: string): string {
    return content
      .replace(/<reasoning>.*?<\/reasoning>/gs, '')
      .replace(/<reason>.*?<\/reason>/gs, '')
      .replace(/<reasoning>.*$/gs, '')
      .replace(/<reason>.*$/gs, '');
  }

  static renderComponent(data: ReasoningData, isStreaming: boolean, index: number, position?: "first" | "middle" | "last" | "only"): React.ReactNode {
    if (!data.content.trim()) return null;

    return (
      <TimelineStep
        key={`reasoning-${index}`}
        id={`reasoning-${index}`}
        title=""
        description={data.content.trim()}
        status={isStreaming && !data.isComplete ? "running" : "completed"}
        timestamp={Date.now()}
        iconParams={{
          src: null,
          alt: "Reasoning",
          width: 4,
          height: 4,
          className: "h-4 w-4"
        }}
        type="unified"
        position={position}
        storageKey="reasoning"
      />
    );
  }
}