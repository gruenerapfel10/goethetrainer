"use client"

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from "@/components/ui/timeline";
import type { TimelineStepRendererProps, StatusFlags } from "../types";
import { calculateDuration } from "../utils";
import { useElapsedTime } from "../hooks";
import { getAnimationDelay } from "../animations";
import { ChartLoadingAnimation, ChartCompletionAnimation } from "./chart-loading-animation";

/**
 * Renders an individual timeline step with proper styling and animations
 */
export const TimelineStepRenderer: React.FC<TimelineStepRendererProps> = ({ 
  step, 
  index, 
  steps, 
  level, 
  expandedSteps, 
  onToggle, 
  storageKey, 
  parentIndex = 0, 
  parentExpandedKey = "" 
}) => {
  const stepId = `${storageKey}-${step.id}`;
  const isExpanded = expandedSteps.has(stepId);
  const isLast = index === steps.length - 1;
  
  const statusFlags: StatusFlags = {
    isCompleted: step.status === "completed",
    isRunning: step.status === "running",
    isError: step.status === "error",
    isSkipped: step.status === "skipped",
    isPending: step.status === "pending"
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();  // Always stop propagation
    if (step.type !== "unified" && step.children && step.children.length > 0) {
      onToggle(stepId);
    }
  };

  const elapsed = useElapsedTime(step.status === "running", step.timestamp);
  const hasChildren = step.children && step.children.length > 0;

  // Use a timestamp-based key to force re-render when parent expands
  const [forceRenderKey, setForceRenderKey] = useState(Date.now());
  
  useEffect(() => {
    // Force re-render when parent's animation key changes
    setForceRenderKey(Date.now());
  }, [parentExpandedKey]);

  // Create expanded key for children
  const childExpandedKey = `${parentExpandedKey}-${stepId}-${forceRenderKey}`;

  return (
    <TimelineItem className={cn(level > 0 && "pl-0")}>
      {/* Timeline Icon */}
      {step.icon !== undefined && (
        <div className={cn(
          "absolute flex items-center justify-center rounded border transition-colors z-[1]",
          (step.type === "unified" && level > 0) ? "h-6 w-6 left-[-0.35rem] top-1" :
          step.type === "unified" ? "h-4 w-4 left-[0.4rem] top-1" :
          level > 0 ? "h-6 w-6 left-[-0.35rem] top-1" :
          "h-6 w-6 left-[0.2rem] top-4",
          statusFlags.isCompleted ? "border-primary bg-primary text-primary-foreground" :
          statusFlags.isRunning ? "border-primary bg-background text-primary animate-pulse" :
          statusFlags.isError ? "border-destructive bg-destructive text-destructive-foreground" :
          statusFlags.isSkipped ? "border-muted-foreground/50 bg-muted/20 text-muted-foreground/70" :
          "border-primary/30 bg-transparent text-primary/60",
          hasChildren && "cursor-pointer"
        )} onClick={handleClick}>
          {statusFlags.isError ? (
            <AlertCircle className="h-4 w-4" />
          ) : React.isValidElement(step.icon) ? (
            // Check if it's an img element
            (step.icon as React.ReactElement).type === 'img' ? (
              step.icon
            ) : (
              React.cloneElement(step.icon as React.ReactElement, {
                className: cn(
                  (step.icon as React.ReactElement).props.className,
                  "h-4 w-4"
                )
              })
            )
          ) : step.icon}
        </div>
      )}

      {/* Horizontal Connector for First Nested Item */}
      {level > 0 && index === 0 && (
        <motion.div 
          key={`horizontal-${forceRenderKey}`}
          initial={{ width: 0 }}
          animate={{ width: "1.5rem" }}
          transition={{ duration: 0.2, delay: getAnimationDelay('horizontal', level) }}
          className={cn(
            "absolute h-px top-[0.9rem] left-[-1.6rem]",
            statusFlags.isError ? "bg-destructive" :
            statusFlags.isCompleted ? "bg-primary" :
            statusFlags.isRunning ? "bg-primary/50" :
            "bg-muted-foreground/40"
          )} 
          onClick={handleClick} 
        />
      )}

      {/* Timeline Connector */}
      {(!isLast || (isLast && isExpanded && step.children?.length)) && (
        <motion.div 
          key={`vertical-${forceRenderKey}`}
          initial={{ height: 0 }}
          animate={{ height: "100%" }}
          transition={{ duration: 0.2, delay: getAnimationDelay('vertical', level, index) }}
          className={cn(
            "absolute w-px cursor-pointer",
            level > 0 ? "left-[0.4rem] top-1" : "left-[0.875rem] top-4",
            "-translate-x-1/2",
            statusFlags.isError ? "bg-destructive" :
            statusFlags.isCompleted ? "bg-primary" :
            statusFlags.isRunning ? "bg-primary/50" :
            "bg-muted-foreground/40"
          )} 
          onClick={handleClick} 
        />
      )}

      <TimelineContent className={cn(level > 0 && "pl-7", step.icon === undefined && "ml-0")}>
        {step.type === "unified" ? (
          <div className="min-h-[2rem] flex items-center py-1 -mt-1">
            <TimelineDescription className={cn(
              level > 0 ? "text-xs" : "text-sm",
              statusFlags.isRunning && "animate-pulse",
              (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground/80"
            )}>
              {step.message}
            </TimelineDescription>
          </div>
        ) : (
          <div
            onClick={handleClick}  // Always attach click handler to prevent propagation
            className={cn(
              "min-h-[2rem] rounded-md p-3 -ml-1 transition-colors",
              (statusFlags.isPending || statusFlags.isSkipped) && "opacity-60",
              level > 0 && "py-1 px-2",
              hasChildren && "cursor-pointer"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <TimelineTitle className={cn(
                  level > 0 ? "text-sm" : "text-base",
                  (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground",
                  statusFlags.isRunning && "animate-pulse"
                )}>
                  {statusFlags.isError ? `Failed: ${step.title}` : step.title}
                </TimelineTitle>

                {step.badgeText && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    {step.badgeText}
                  </span>
                )}

                {level === 0 && (
                  <span className={cn(
                    "text-xs font-medium",
                    statusFlags.isRunning ? "text-primary animate-pulse" : "text-muted-foreground"
                  )}>
                    {calculateDuration(step.timestamp, index, steps, statusFlags.isRunning)}
                  </span>
                )}
              </div>

              {hasChildren && (
                <ChevronRight className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
              )}
            </div>

            {step.message && (
              <TimelineDescription className={cn(
                level > 0 ? "text-xs" : "text-sm",
                statusFlags.isRunning && "animate-pulse",
                statusFlags.isError && "text-destructive/80",
                (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground/80"
              )}>
                {step.message}
              </TimelineDescription>
            )}

            {/* Chart Loading Animation */}
            <AnimatePresence mode="wait">
              {statusFlags.isRunning && 
               (step.data?.toolName === 'chart' || step.title.toLowerCase().includes('chart')) && 
               level === 0 && (
                <motion.div
                  key="chart-loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <ChartLoadingAnimation />
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="overflow-visible mt-3 space-y-3"
                >
                  {/* Chart Completion Animation */}
                  {(step.data?.toolName === 'chart' || step.title.toLowerCase().includes('chart')) && 
                   statusFlags.isCompleted && 
                   level === 0 && (
                    <ChartCompletionAnimation />
                  )}

                  {step.children && step.children.length > 0 && (
                    <Timeline className="py-2">
                      {step.children.map((child, childIndex) => (
                        <TimelineStepRenderer
                          key={child.id}
                          step={child}
                          index={childIndex}
                          steps={step.children!}
                          level={level + 1}
                          expandedSteps={expandedSteps}
                          onToggle={onToggle}
                          storageKey={storageKey}
                          parentIndex={index}
                          parentExpandedKey={childExpandedKey}
                        />
                      ))}
                    </Timeline>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </TimelineContent>
    </TimelineItem>
  );
};