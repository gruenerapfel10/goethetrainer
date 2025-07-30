"use client"

import type { AnimationTrigger, AnimationState } from "./types";

/**
 * Animation orchestration system for timeline animations
 * Manages the timing and sequencing of animations for timeline connectors
 */
export const createAnimationOrchestrator = () => {
  const verticalTriggers = new Map<string, AnimationTrigger>();
  const horizontalTriggers = new Map<string, AnimationTrigger>();
  const verticalStates = new Map<string, AnimationState>();
  const horizontalStates = new Map<string, AnimationState>();
  const childrenMap = new Map<string, string[]>();
  
  const registerVerticalConnector = (id: string, trigger: AnimationTrigger) => {
    verticalTriggers.set(id, trigger);
    verticalStates.set(id, 'idle');
  };
  
  const registerHorizontalConnector = (id: string, trigger: AnimationTrigger) => {
    horizontalTriggers.set(id, trigger);
    horizontalStates.set(id, 'idle');
  };
  
  const startAnimation = (parentId?: string) => {
    if (!parentId) {
      // Start all root level vertical connectors immediately
      verticalTriggers.forEach((trigger, id) => {
        if (!id.includes('-')) { // Root level items have no parent prefix
          setTimeout(() => {
            verticalStates.set(id, 'animating');
            trigger();
          }, 0);
        }
      });
    } else {
      // Start children animations
      const children = childrenMap.get(parentId) || [];
      if (children.length > 0) {
        // Start horizontal connector of first child
        const firstChildId = children[0];
        const horizontalTrigger = horizontalTriggers.get(firstChildId);
        if (horizontalTrigger) {
          setTimeout(() => {
            horizontalStates.set(firstChildId, 'animating');
            horizontalTrigger();
          }, 50);
        }
      }
    }
  };
  
  const onVerticalComplete = (id: string) => {
    verticalStates.set(id, 'complete');
    // Trigger children's animations
    startAnimation(id);
  };
  
  const onHorizontalComplete = (id: string) => {
    horizontalStates.set(id, 'complete');
    // Find parent and trigger all children's vertical connectors
    const parentId = id.split('-').slice(0, -1).join('-');
    const children = childrenMap.get(parentId) || [];
    children.forEach((childId, index) => {
      const verticalTrigger = verticalTriggers.get(childId);
      if (verticalTrigger) {
        setTimeout(() => {
          verticalStates.set(childId, 'animating');
          verticalTrigger();
        }, index * 100); // Stagger vertical connectors
      }
    });
  };
  
  const registerChildren = (parentId: string, childIds: string[]) => {
    childrenMap.set(parentId, childIds);
  };
  
  return {
    registerVerticalConnector,
    registerHorizontalConnector,
    startAnimation,
    onVerticalComplete,
    onHorizontalComplete,
    registerChildren
  };
};

/**
 * Calculate animation delay based on nesting level and animation type
 */
export const getAnimationDelay = (
  type: 'horizontal' | 'vertical',
  level: number,
  index = 0
): number => {
  if (type === 'horizontal') {
    // Horizontal connectors wait for parent's vertical connector to finish
    // Each level adds 0.2s (animation duration) + 0.1s buffer
    return level * 0.3;
  } else {
    // Vertical connectors wait for horizontal connector + stagger by index
    const baseDelay = level * 0.3 + 0.2; // Wait for horizontal to finish
    return baseDelay + (index * 0.1); // Stagger siblings
  }
};