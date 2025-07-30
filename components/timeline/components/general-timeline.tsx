"use client"

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import type { GeneralTimelineProps } from "../types";
import { useTimelineState } from "../hooks";
import { TimelineStepRenderer } from "./timeline-step";

/**
 * GeneralTimeline component
 * Renders a timeline of steps with proper styling and animations
 */
export function GeneralTimeline({ steps, timelineId }: GeneralTimelineProps) {
  const { expandedSteps, setExpandedSteps, showAllItems, setShowAllItems } = useTimelineState(timelineId);
  const storageKey = timelineId || "generalTimeline";

  // Determine if we should collapse the timeline
  const shouldCollapse = steps.length > 3;
  
  // Show only the last 3 steps if collapsed
  const visibleSteps = shouldCollapse && !showAllItems 
    ? steps.slice(-3)
    : steps;

  // Toggle step expansion
  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="pr-2">
      {/* Show/Hide All Toggle */}
      {shouldCollapse && (
        <div className="flex items-center justify-center mb-2">
          <Badge 
            variant="outline" 
            className="cursor-pointer"
            onClick={() => setShowAllItems(!showAllItems)}
          >
            {showAllItems 
              ? `Show Latest (${Math.min(3, steps.length)} of ${steps.length})`
              : `Show All (${steps.length} items)`
            }
          </Badge>
        </div>
      )}
      
      {/* Timeline */}
      <Timeline className="pb-4">
        <AnimatePresence mode="popLayout">
          {visibleSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TimelineStepRenderer
                step={step}
                index={index}
                steps={visibleSteps}
                level={0}
                expandedSteps={expandedSteps}
                onToggle={toggleStep}
                storageKey={storageKey}
                parentIndex={0}
                parentExpandedKey=""
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </Timeline>
    </div>
  );
}