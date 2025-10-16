"use client"

import React, { useState, useMemo, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Timeline } from "@/components/ui/timeline";
import { ArrowRight, ArrowUp } from "lucide-react";

interface TimelineCoverProps {
  children: ReactNode;
  showToggle?: boolean;
  defaultShowAll?: boolean;
  className?: string;
  maxItemsWhenCollapsed?: number;
}

/**
 * TimelineCover component
 * An optional container for timeline steps with show all/show latest toggle
 */
export function TimelineCover({
  children,
  showToggle = true,
  defaultShowAll = false,
  className = "",
  maxItemsWhenCollapsed = 3
}: TimelineCoverProps) {
  const [showAll, setShowAll] = useState(defaultShowAll);
  
  // Count direct children
  const childrenArray = React.Children.toArray(children);
  const totalSteps = childrenArray.length;
  
  // Determine which children to render (not just show/hide)
  const childrenToRender = useMemo(() => {
    // Always process all children, but mark which ones should be visible
    return React.Children.map(childrenArray, (child, index) => {
      if (!React.isValidElement(child)) return child;
      
      // Determine if this child should be shown
      const shouldShow = showAll || !showToggle || totalSteps <= maxItemsWhenCollapsed || 
                        index >= totalSteps - maxItemsWhenCollapsed; // Show last N items
      
      if (!shouldShow) {
        // Return null for items that shouldn't be shown (they'll animate out)
        return null;
      }
      
      // Calculate position based on visible items
      const visibleIndex = showAll ? index : index - (totalSteps - maxItemsWhenCollapsed);
      const visibleCount = showAll ? totalSteps : Math.min(totalSteps, maxItemsWhenCollapsed);
      
      const position = visibleCount === 1
        ? "only"
        : visibleIndex === 0
          ? "first"
          : visibleIndex === visibleCount - 1
            ? "last"
            : "middle";
      
      // Clone element with updated position
      const clonedChild = React.cloneElement(child as React.ReactElement<any>, {
        ...child.props,
        position
      });
      
      // Use the original index as key to maintain identity
      const uniqueKey = child.key || `timeline-item-${index}`;
      
      // Calculate animation delays
      const enterDelay = showAll ? index * 0.03 : visibleIndex * 0.05;
      const exitDelay = index * 0.02; // Items exit in order from top
      
      // Determine if this is a newly entering item (wasn't visible before)
      const isNewItem = showAll && index < totalSteps - maxItemsWhenCollapsed;
      
      return (
        <motion.div
          key={uniqueKey}
          initial={isNewItem ? { opacity: 0, y: -10, height: 0 } : false}
          animate={{ 
            opacity: 1, 
            y: 0,
            height: "auto",
            transition: {
              duration: 0.3,
              delay: isNewItem ? enterDelay : 0,
              ease: "easeOut"
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -10,
            height: 0,
            transition: {
              duration: 0.2,
              delay: exitDelay,
              ease: "easeIn"
            }
          }}
        >
          {clonedChild}
        </motion.div>
      );
    }).filter(Boolean); // Remove null items
  }, [showAll, showToggle, childrenArray, totalSteps, maxItemsWhenCollapsed]);
  
  const hiddenCount = totalSteps - (childrenToRender?.length || 0);
  
  return (
    <div className={className}>
      {showToggle && totalSteps > maxItemsWhenCollapsed && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
          >
            {showAll ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
                <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                  Show Latest {maxItemsWhenCollapsed}
                </span>
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-500 transition-colors rotate-90" />
                <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                  Show {hiddenCount} More Steps
                </span>
              </>
            )}
          </button>
        </div>
      )}
      
      <div className="pr-2 max-w-[100vw] md:max-w-none">
        <Timeline className="gap-2">
          <AnimatePresence initial={false}>
            {childrenToRender}
          </AnimatePresence>
        </Timeline>
      </div>
    </div>
  );
}