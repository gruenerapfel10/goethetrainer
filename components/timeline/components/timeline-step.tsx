"use client"

import React, { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from "@/components/ui/timeline";
import type { TimelineStepRendererProps, StatusFlags } from "../types";
import { useElapsedTime, useTimelineState } from "../hooks";
import { ChartLoadingAnimation, ChartCompletionAnimation } from "./chart-loading-animation";
import "./timeline-connectors.css";

// New declarative interface
export interface IconParams {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export interface TimelineStepProps {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "running" | "completed" | "error" | "skipped";
  timestamp?: number;
  icon?: ReactNode;
  iconParams?: IconParams;
  badgeText?: string;
  data?: Record<string, any>;
  children?: ReactNode[];
  type?: "unified" | "tool-result";
  small?: boolean;
  position?: "first" | "middle" | "last" | "only";
  expandedSteps?: Set<string>;
  onToggle?: (id: string) => void;
  onClick?: (data?: Record<string, any>) => void;
  storageKey?: string;
  parentIndex?: number;
}

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
  parentIndex = 0
}) => {
  const stepId = `${storageKey}-${step.id}`;
  const isExpanded = expandedSteps.has(stepId);

  const statusFlags: StatusFlags = {
    isCompleted: step.status === "completed",
    isRunning: step.status === "running",
    isError: step.status === "error",
    isSkipped: step.status === "skipped",
    isPending: step.status === "pending"
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    console.log('TimelineStep clicked:', {
      stepId,
      type: step.type,
      hasChildren: step.children && step.children.length > 0,
      childrenLength: step.children?.length,
      onToggleExists: !!onToggle,
      hasCustomClick: !!(step as any).onClick
    });
    
    // If custom onClick is provided, call it
    if ((step as any).onClick) {
      (step as any).onClick(step.data);
    }
    
    // Handle expand/collapse for items with children
    if (step.children && step.children.length > 0) {
      onToggle?.(stepId);
    }
  };

  const elapsed = useElapsedTime(step.status === "running", step.timestamp);
  const hasChildren = step.children && step.children.length > 0;

  // Pure CSS class-based approach for connectors
  const isLastStep = (step as any).position === "last" || (step as any).position === "only";
  const timelineItemClasses = cn(
    "timeline-item",
    "flex flex-row relative pl-0",
    !isLastStep && "pb-3",
    isLastStep && level === 0 && "mb-2",
    isExpanded && "timeline-item--expanded",
    `timeline-item--${step.status}`,
    (step as any).position && `timeline-item--${(step as any).position}`,
    // Icon size classes for connector positioning
    (step as any).iconParams?.width <= 4 && "timeline-item--icon-small",
    (step as any).iconParams?.width >= 8 && "timeline-item--icon-large"
  );

  // Remove hardcoded positioning - let CSS handle it dynamically
  const customStyles = {} as React.CSSProperties;

  return (
    <TimelineItem className={timelineItemClasses} style={customStyles}>
      {/* Timeline Icon Container - connectors now handled by CSS */}
      {(step.icon !== undefined || (step as any).iconParams) && (
        <div
          className={cn(
            "timeline-icon",
            hasChildren && "cursor-pointer"
          )}
          onClick={handleClick}
        >
          <div className="relative w-6 inline-flex items-center justify-center">
            {statusFlags.isError ? (
              <div className="w-6 h-6 rounded bg-primary inline-flex items-center justify-center relative">
                <AlertCircle className="h-4 w-4 text-primary-foreground" />
              </div>
            ) : (step as any).iconParams ? (
              <div className={cn(
                "rounded inline-flex items-center justify-center relative",
                statusFlags.isRunning 
                  ? "bg-transparent border border-primary/30" 
                  : "bg-primary",
                (step as any).iconParams.className || "w-6 h-6"
              )}>
                {statusFlags.isRunning ? (
                  <div className={cn(
                    "animate-spin rounded-full border-2 border-primary border-t-transparent",
                    (step as any).iconParams?.width <= 4 ? "h-2 w-2" : "h-3 w-3"
                  )} />
                ) : (step as any).iconParams.src ? (
                  <Image
                    src={(step as any).iconParams.src}
                    alt={(step as any).iconParams.alt}
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                ) : step.icon ? (
                  step.icon
                ) : null}
              </div>
            ) : React.isValidElement(step.icon) ? (
              <div className="w-6 h-6 rounded bg-primary inline-flex items-center justify-center relative">
                {(step.icon as React.ReactElement).type === 'img' ? (
                  React.cloneElement(step.icon as React.ReactElement, { className: "w-4 h-4" })
                ) : (
                  step.icon
                )}
              </div>
            ) : typeof step.icon === 'function' ? (
              <div className="w-6 h-6 rounded bg-primary inline-flex items-center justify-center relative">
                {React.createElement(step.icon as React.ComponentType<{ className?: string }>, {
                  className: "h-4 w-4 text-primary-foreground"
                })}
              </div>
            ) : step.icon ? (
              <div className="w-6 h-6 rounded bg-primary inline-flex items-center justify-center relative">
                {step.icon}
              </div>
            ) : null}
          </div>
        </div>
      )}


      <TimelineContent className={cn((step.icon === undefined && !(step as any).iconParams) && "ml-0", "flex-1 pt-0")}>
        {step.type === "unified" ? (
          <div className="min-h-[1.25rem] flex items-center pl-2">
            <TimelineDescription className={cn(
              "text-xs",
              statusFlags.isRunning && "animate-pulse",
              (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground/80",
              "break-words max-w-[100vw] md:max-w-none overflow-wrap-anywhere"
            )}>
              {step.message && step.message.length > 256 ? `${step.message.substring(0, 256)}...` : step.message}
            </TimelineDescription>
          </div>
        ) : (
          <div
            onClick={handleClick}
            className={cn(
              "min-h-[2rem] rounded-md transition-colors px-2",
              (statusFlags.isPending || statusFlags.isSkipped) && "opacity-60",
              (hasChildren || (step as any).onClick) && "cursor-pointer"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-2">
                <TimelineTitle className={cn(
                  "text-sm",
                  (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground",
                  statusFlags.isRunning && "animate-pulse",
                  "break-words max-w-[100vw] md:max-w-none overflow-wrap-anywhere"
                )}>
                  {statusFlags.isError ? `Failed: ${step.title}` : step.title}
                </TimelineTitle>

                {step.badgeText && (
                  <span className="inline-flex items-center px-3 py-0.5 text-xs font-medium rounded-full border border-foreground/20 bg-foreground/5 text-foreground">
                    {step.badgeText}
                  </span>
                )}

                {/* {level === 0 && (
                  <span className={cn(
                    "text-xs font-medium",
                    statusFlags.isRunning ? "text-primary animate-pulse" : "text-muted-foreground"
                  )}>
                    {calculateDuration(step.timestamp, index, steps, statusFlags.isRunning)}
                  </span>
                )} */}
              </div>

              {hasChildren && (
                <ChevronRight className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
              )}
            </div>
            <TimelineDescription className={cn(
              "text-xs",
              statusFlags.isRunning && "animate-pulse",
              statusFlags.isError && "text-destructive/80",
              (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground/80",
              "break-words max-w-[100vw] md:max-w-none overflow-wrap-anywhere"
            )}>
              {step.message && step.message.length > 256 ? `${step.message.substring(0, 256)}...` : step.message}
            </TimelineDescription>
            {/* 
            {step.message && (
              <TimelineDescription className={cn(
                level > 0 ? "text-xs" : "text-sm",
                statusFlags.isRunning && "animate-pulse",
                statusFlags.isError && "text-destructive/80",
                (statusFlags.isPending || statusFlags.isSkipped) && "text-muted-foreground/80",
                "break-words max-w-[100vw] md:max-w-none overflow-wrap-anywhere"
              )}>
                {step.message}
              </TimelineDescription>
            )} */}

            {/* Chart Loading Animation */}
            <AnimatePresence mode="wait">
              {statusFlags.isRunning &&
                (step.data?.toolName === 'chart' || step.title.toLowerCase().includes('chart')) && (
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
                  className="overflow-visible"
                >
                  {/* Chart Completion Animation */}
                  {(step.data?.toolName === 'chart' || step.title.toLowerCase().includes('chart')) &&
                    statusFlags.isCompleted && (
                      <ChartCompletionAnimation />
                    )}

                  {step.children && step.children.length > 0 && (
                    <Timeline className="pt-2">
                      {step.children.map((child, childIndex) => (
                        <TimelineStepRenderer
                          key={child.id}
                          step={child}
                          index={childIndex}
                          steps={step.children!}
                          level={0}
                          expandedSteps={expandedSteps}
                          onToggle={onToggle}
                          storageKey={storageKey}
                          parentIndex={0}
                          parentExpandedKey=""
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

/**
 * Declarative TimelineStep component for JSX usage
 */
export const TimelineStep: React.FC<TimelineStepProps> = ({
  id,
  title,
  description,
  status = "completed",
  timestamp = Date.now(),
  icon,
  iconParams,
  badgeText,
  data,
  children = [],
  type = "tool-result",
  position,
  expandedSteps: propExpandedSteps,
  onToggle: propOnToggle,
  storageKey = "timeline",
  parentIndex = 0
}) => {
  // Use internal state management when no external state is provided
  const internalState = useTimelineState(storageKey);
  const { expandedSteps, setExpandedSteps } = propExpandedSteps && propOnToggle 
    ? { expandedSteps: propExpandedSteps, setExpandedSteps: null }
    : internalState;
  
  const onToggle = propOnToggle || ((id: string) => {
    setExpandedSteps?.(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  });
  // Create a step object for the current component
  const step = {
    id,
    title,
    message: description,
    status,
    timestamp,
    icon,
    iconParams,
    badgeText,
    data,
    type,
    position,
    children: children?.length > 0 ? (React.Children.map(children, (child, childIndex) => {
      if (React.isValidElement<TimelineStepProps>(child)) {
        // Calculate position for each child
        const childPosition = React.Children.count(children) === 1 
          ? "only" 
          : childIndex === 0 
          ? "first" 
          : childIndex === React.Children.count(children) - 1 
          ? "last" 
          : "middle";
        
        return {
          id: child.props.id || `child-${childIndex}`,
          title: child.props.title || 'Unnamed Step',
          message: child.props.description,
          status: child.props.status || "completed",
          timestamp: child.props.timestamp || Date.now(),
          icon: child.props.icon,
          iconParams: child.props.iconParams,
          badgeText: child.props.badgeText,
          data: child.props.data,
          onClick: child.props.onClick,
          type: child.props.type || "tool-result",
          position: child.props.position || childPosition,
        };
      }
      // Convert non-React elements to basic TimelineStep objects
      return {
        id: `child-${childIndex}`,
        title: 'Unnamed Step',
        status: "completed" as const,
        timestamp: Date.now(),
      };
    }) || []) : undefined,
  };

  // Create a minimal steps array for the renderer
  const steps = [step];

  return (
    <TimelineStepRenderer
      step={step}
      index={0}
      steps={steps}
      level={0}
      expandedSteps={expandedSteps}
      onToggle={onToggle}
      storageKey={storageKey}
      parentIndex={parentIndex}
      parentExpandedKey=""
    />
  );
};