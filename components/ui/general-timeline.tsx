"use client"

import { useState, useEffect, type ReactNode, useMemo, } from "react"
import { Search, Database, FileText, ArrowRight, AlertCircle, ChevronRight, BarChart3, TrendingUp, PieChart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from "@/components/ui/timeline"
import { motion, AnimatePresence } from "framer-motion"
import React from "react"
import { ToolIcon } from "@/components/ui/tool-icon"
import { getToolDisplayName } from "@/lib/ai/tools"
import type { StreamUpdate } from "@/lib/types/stream"

// Beautiful chart loading animation component
const ChartLoadingAnimation: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated chart icons */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="absolute"
          >
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute -top-2 -right-2"
          >
            <TrendingUp className="w-4 h-4 text-green-500" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="absolute -bottom-2 -left-2"
          >
            <PieChart className="w-4 h-4 text-purple-500" />
          </motion.div>
        </div>
        
        {/* Pulsing dots */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 1.5,
                delay: i * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Processing text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center"
        >
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Creating Chart
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Analyzing data and generating visualization...
          </div>
        </motion.div>
        
        {/* Animated progress bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          style={{ width: "120px", maxWidth: "120px" }}
        />
      </div>
    </div>
  );
};

// Animation orchestration system
type AnimationTrigger = () => void;
type AnimationState = 'idle' | 'animating' | 'complete';

interface AnimationOrchestrator {
  registerVerticalConnector: (id: string, trigger: AnimationTrigger) => void;
  registerHorizontalConnector: (id: string, trigger: AnimationTrigger) => void;
  startAnimation: (parentId?: string) => void;
  onVerticalComplete: (id: string) => void;
  onHorizontalComplete: (id: string) => void;
  registerChildren: (parentId: string, childIds: string[]) => void;
}

const createAnimationOrchestrator = (): AnimationOrchestrator => {
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

// Standardized TimelineStep interface
export interface TimelineStep {
  id: string;
  title: string;
  message?: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  timestamp: number;
  icon?: ReactNode;
  badgeText?: string;
  data?: Record<string, any>;
  children?: TimelineStep[];
  type?: "unified" | "tool-result";
  small?: boolean;
}

interface GeneralTimelineProps {
  steps?: TimelineStep[];
  timelineId?: string;
  streamUpdates?: StreamUpdate[];
}

// Standardized state management hook
function useTimelineState(timelineId?: string) {
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

// Standardized tool result transformers
const toolTransformers = {
  csv_query: (result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] => {
    if (!result.success) {
      return [{
        id: `${updateId}-error`,
        title: 'CSV Query Error',
        message: result.error || 'Unknown error occurred',
        status: 'error' as const,
        timestamp,
        icon: <AlertCircle className="h-6 w-6" />
      }];
    }
    
    const naturalLanguageQuery = toolArgs?.query || 'Unknown query';
    const sqlQuery = result.query || 'Unknown SQL';
    const tableName = toolArgs?.tableName || 'Unknown table';
    const recordCount = Array.isArray(result.result) ? result.result.length : 0;
    
    // If no results, return an empty results indicator
    if (recordCount === 0) {
      return [{
        id: `${updateId}-no-results`,
        title: 'No Results Found',
        message: `No records found for query: "${naturalLanguageQuery}"`,
        status: 'completed' as const,
        timestamp,
        icon: <BarChart3 className="h-6 w-6" />
      }];
    }

    const timelineSteps: TimelineStep[] = [];
    
    // Add SQL query as first step
    timelineSteps.push({
      id: `${updateId}-sql-query`,
      title: 'Generated SQL Query',
      message: sqlQuery,
      status: 'completed' as const,
      timestamp: timestamp,
      icon: <Database className="h-6 w-6" />,
      badgeText: `Table: ${tableName}`,
      type: 'unified' as const
    });

    // Add sample results as individual steps
    if (Array.isArray(result.result) && result.result.length > 0) {
      const sampleResults = result.result.slice(0, 5).map((record: any, index: number) => ({
        id: `${updateId}-record-${index}`,
        title: `Record ${index + 1}`,
        message: typeof record === 'object' ? Object.keys(record).join(', ') : String(record),
        status: 'completed' as const,
        timestamp: timestamp + 1 + index,
        icon: <FileText className="h-6 w-6" />,
        children: typeof record === 'object' ? Object.entries(record).slice(0, 3).map(([key, value]) => ({
          id: `${updateId}-record-${index}-${key}`,
          title: key,
          message: String(value),
          status: 'completed' as const,
          timestamp: timestamp + 1 + index + 1,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        })) : []
      }));

      timelineSteps.push(...sampleResults);

      if (result.result.length > 5) {
        timelineSteps.push({
          id: `${updateId}-more-records`,
          title: `... ${result.result.length - 5} more records`,
          message: 'Additional records not shown',
          status: 'completed' as const,
          timestamp: timestamp + 10,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        });
      }
    }
    
    return timelineSteps;
  },

  sharepoint_retrieve: (result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] => {
      const documents = result.data || [];
      const error = result.error;
      const query = toolArgs?.query || 'Unknown query';
      
    if (error) {
      return [{
        id: `${updateId}-error`,
        title: 'SharePoint Retrieval Error',
        message: `Error searching for "${query}": ${error}`,
        status: 'error' as const,
        timestamp,
        icon: <AlertCircle className="h-6 w-6" />
      }];
    }
    
    if (!Array.isArray(documents) || documents.length === 0) {
      return [{
        id: `${updateId}-no-results`,
        title: 'No Documents Found',
        message: `No relevant documents found for search: "${query}"`,
        status: 'completed' as const,
        timestamp,
        icon: <Search className="h-6 w-6" />
      }];
    }
    
    // Return documents directly as individual timeline steps (no wrapper)
    return documents.map((doc, index) => ({
      id: `${updateId}-doc-${index}`,
      title: doc.title || 'Unknown Document',
      message: doc.content ? doc.content.slice(0, 150) + (doc.content.length > 150 ? '...' : '') : 'No content available',
      status: 'completed' as const,
      timestamp: timestamp + index,
      icon: <FileText className="h-6 w-6" />,
      badgeText: doc.score ? `Score: ${(doc.score * 100).toFixed(1)}%` : undefined,
      children: [
        {
          id: `${updateId}-doc-${index}-title`,
          title: 'Title',
          message: doc.title || 'No title',
          status: 'completed' as const,
          timestamp: timestamp + index + 1,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        },
        {
          id: `${updateId}-doc-${index}-content`,
          title: 'Content',
          message: doc.content || 'No content available',
          status: 'completed' as const,
          timestamp: timestamp + index + 2,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        },
        ...(doc.url ? [{
          id: `${updateId}-doc-${index}-url`,
          title: 'URL',
          message: doc.url,
          status: 'completed' as const,
          timestamp: timestamp + index + 3,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        }] : [])
      ]
    }));
  },

  sharepoint_list: (result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] => {
    const knowledgeBases = result.data || [];
    const error = result.error;
    
    if (error) {
      return [{
        id: `${updateId}-error`,
        title: 'Knowledge Base Listing Error',
        message: error,
        status: 'error' as const,
        timestamp,
        icon: <AlertCircle className="h-6 w-6" />
      }];
    }
    
    if (!Array.isArray(knowledgeBases) || knowledgeBases.length === 0) {
      return [{
        id: `${updateId}-no-results`,
        title: 'No Knowledge Bases Found',
        message: 'No active knowledge bases were found',
        status: 'completed' as const,
        timestamp,
        icon: <Database className="h-6 w-6" />
      }];
    }
    
    return knowledgeBases.map((kb, index) => ({
      id: `${updateId}-kb-${index}`,
          title: kb.name || 'Unknown Knowledge Base',
          message: kb.description || 'No description available',
          status: 'completed' as const,
      timestamp: timestamp + index,
          icon: <Database className="h-6 w-6" />,
          badgeText: kb.status || undefined,
      children: [
        {
          id: `${updateId}-kb-${index}-id`,
          title: 'ID',
          message: kb.id || 'No ID',
          status: 'completed' as const,
          timestamp: timestamp + index + 1,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        },
        {
          id: `${updateId}-kb-${index}-name`,
          title: 'Name',
          message: kb.name || 'No name',
          status: 'completed' as const,
          timestamp: timestamp + index + 2,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        },
        {
          id: `${updateId}-kb-${index}-description`,
          title: 'Description',
          message: kb.description || 'No description',
          status: 'completed' as const,
          timestamp: timestamp + index + 3,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        },
        ...(kb.status ? [{
          id: `${updateId}-kb-${index}-status`,
          title: 'Status',
          message: kb.status,
          status: 'completed' as const,
          timestamp: timestamp + index + 4,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        }] : [])
      ]
    }));
  },

  chart: (result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] => {
    if (!result.success) {
      return [{
        id: `${updateId}-error`,
        title: 'Chart Generation Error',
        message: result.error || 'Failed to generate chart',
        status: 'error' as const,
        timestamp,
        icon: <AlertCircle className="h-6 w-6" />
      }];
    }
    
    const chartConfig = result.chartConfig;
    const metadata = result.metadata;
    
    const chartStep: TimelineStep = {
      id: `${updateId}-chart`,
      title: `${chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1)} Chart Created`,
      message: result.message || `Generated ${chartConfig.type} chart`,
      status: 'completed' as const,
      timestamp,
      icon: <BarChart3 className="h-6 w-6" />,
      badgeText: `${chartConfig.data.length} data points`,
      children: []
    };

    // Add chart details as children
    if (chartConfig.title) {
      chartStep.children?.push({
        id: `${updateId}-chart-title`,
        title: 'Chart Title',
        message: chartConfig.title,
        status: 'completed' as const,
        timestamp: timestamp + 1,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      });
    }

    chartStep.children?.push({
      id: `${updateId}-chart-type`,
      title: 'Chart Type',
      message: chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1),
      status: 'completed' as const,
      timestamp: timestamp + 2,
      icon: <ArrowRight className="h-6 w-6" />,
      type: 'unified' as const
    });

    chartStep.children?.push({
      id: `${updateId}-chart-dimensions`,
      title: 'Dimensions',
      message: `${chartConfig.width}x${chartConfig.height}`,
      status: 'completed' as const,
      timestamp: timestamp + 3,
      icon: <ArrowRight className="h-6 w-6" />,
      type: 'unified' as const
    });

    // Add processing steps if available
    if (metadata?.processingSteps) {
      const processingStep: TimelineStep = {
        id: `${updateId}-processing`,
        title: 'Processing Steps',
        message: `Completed ${metadata.processingSteps.length} optimization steps`,
        status: 'completed' as const,
        timestamp: timestamp + 4,
        icon: <TrendingUp className="h-6 w-6" />,
        children: metadata.processingSteps.map((step: string, index: number) => ({
          id: `${updateId}-processing-${index}`,
          title: `Step ${index + 1}`,
          message: step,
          status: 'completed' as const,
          timestamp: timestamp + 5 + index,
          icon: <ArrowRight className="h-6 w-6" />,
          type: 'unified' as const
        }))
      };
      
      return [processingStep, chartStep];
    }
    
    return [chartStep];
  }
};

// Standardized stream update transformer
function transformStreamUpdate(update: StreamUpdate, existingStep?: TimelineStep): TimelineStep | undefined {
  if (update.type === 'cost_update') return undefined;

  const baseStep = {
    id: update.id,
          timestamp: update.timestamp,
    status: update.status === 'failed' ? 'error' as const : 
            update.status === 'running' ? 'running' as const : 'completed' as const
  };

  switch (update.type) {
    case 'text-delta':
      return {
        ...(existingStep || {}),
        ...baseStep,
        type: 'unified' as const,
        title: 'Agent Reasoning',
        message: (existingStep?.message || '') + update.message,
        icon: null,
        small: true
      };

    case 'tool-call': {
      const toolName = update.details?.toolName || 'unknown';
      // Store tool arguments for later use by tool-result
      return {
        ...baseStep,
        title: `Calling: ${getToolDisplayName(toolName)}`,
        message: update.message,
        icon: <ToolIcon toolName={toolName} className="h-6 w-6" />,
        status: 'running' as const,
        data: { 
          ...update.details || {},
          toolArgs: update.details?.args // Store args for tool-result processing
        }
      };
    }

    case 'tool-result': {
      const resultToolName = update.details?.toolName;
      const result = update.details?.result;
      
      // Use standardized transformers
      const normalizedToolName = resultToolName?.replace(/_(v1|v2)$/, '');
      const transformer = toolTransformers[normalizedToolName as keyof typeof toolTransformers];
      
      if (transformer && result) {
        // Try to get tool arguments from the corresponding tool-call
        const toolArgs = update.details?.toolArgs || existingStep?.data?.toolArgs;
        const children = transformer(result, update.id, update.timestamp, toolArgs);
        const hasError = children.some(child => child.status === 'error');
        
        // Create badge text based on tool type
        let badgeText = undefined;
        if (resultToolName === 'sharepoint_retrieve') {
          const documents = result?.data || [];
          if (Array.isArray(documents) && documents.length > 0) {
            badgeText = `${documents.length} documents`;
          }
        } else if (resultToolName === 'csv_query') {
          const records = result?.result || [];
          if (Array.isArray(records) && records.length > 0) {
            badgeText = `${records.length} records`;
          }
        }
      
      return {
          ...baseStep,
          title: `${getToolDisplayName(resultToolName)} Results`,
          // Use the detailed message from reason.ts if available, otherwise use transformer-generated message
          message: update.message || (hasError ? 'Operation failed' : 
                   children.length > 0 ? children[0].message || 'Operation completed successfully' : 'Operation completed successfully'),
          icon: <ToolIcon toolName={resultToolName} className="h-6 w-6" />,
          status: hasError ? 'error' as const : 'completed' as const,
          type: 'tool-result' as const,
          badgeText,
          children,
        data: { toolArgs }
        };
    }
    
      // Fallback for unknown tools - use the detailed message from reason.ts
    return {
        ...baseStep,
        title: resultToolName ? `${getToolDisplayName(resultToolName)} Results` : 'Tool Results',
        message: update.message || 'Operation completed successfully',
        icon: <ToolIcon toolName={resultToolName} className="h-6 w-6" />,
        type: 'tool-result' as const,
        data: update.details || {}
      };
    }

    case 'error':
    return {
      ...baseStep,
      title: `Error: ${update.details?.toolName ? getToolDisplayName(update.details.toolName) : 'Process Error'}`,
      message: update.message,
        status: 'error' as const,
        icon: <AlertCircle className="h-6 w-6" />,
      data: update.details || {}
      };

    default:
  return undefined;
  }
}

// Standardized stream processing
function processStreamUpdates(updates: StreamUpdate[]): TimelineStep[] {
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
    
    const newStep = transformStreamUpdate(update, existingStep);

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

// Utility functions
const formatDuration = (durationMs: number): string => {
  if (durationMs < 0) return "-";
  if (durationMs < 1000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.floor(durationMs / 1000)}s`;
};

const useElapsedTime = (isRunning: boolean, startTime: number) => {
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

const calculateDuration = (timestamp: number, index: number, steps: TimelineStep[], isRunning: boolean): string => {
  if (index === 0) return "0s";
  const prevTimestamp = steps[index - 1]?.timestamp;
  if (isRunning) {
    return formatDuration(Date.now() - timestamp);
  }
  return prevTimestamp ? formatDuration(timestamp - prevTimestamp) : "-";
};

// Standardized timeline step renderer
const TimelineStepRenderer: React.FC<{
  step: TimelineStep;
  index: number;
  steps: TimelineStep[];
  level: number;
  expandedSteps: Set<string>;
  onToggle: (id: string) => void;
  storageKey: string;
  parentIndex?: number;
  parentExpandedKey?: string;
}> = ({ step, index, steps, level, expandedSteps, onToggle, storageKey, parentIndex = 0, parentExpandedKey = "" }) => {
  const stepId = `${storageKey}-${step.id}`;
  const isExpanded = expandedSteps.has(stepId);
  const isLast = index === steps.length - 1;
  
  const statusFlags = {
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

  // Calculate proper delays based on nesting level and parent timing
  const getAnimationDelay = (type: 'horizontal' | 'vertical') => {
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
            React.cloneElement(step.icon as React.ReactElement, {
              className: cn(
                (step.icon as React.ReactElement).props.className,
                "h-4 w-4"
              )
            })
          ) : step.icon}
        </div>
      )}

      {/* Horizontal Connector for First Nested Item */}
      {level > 0 && index === 0 && (
        <motion.div 
          key={`horizontal-${forceRenderKey}`}
          initial={{ width: 0 }}
          animate={{ width: "1.5rem" }}
          transition={{ duration: 0.2, delay: getAnimationDelay('horizontal') }}
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
          transition={{ duration: 0.2, delay: getAnimationDelay('vertical') }}
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
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="mt-4 p-4 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800"
                            >
                              <div className="flex items-center space-x-3">
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.3, delay: 0.2 }}
                                  className="flex-shrink-0"
                                >
                                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: 0.3 }}
                                  className="flex-1"
                                >
                                  <div className="text-sm font-medium text-green-700 dark:text-green-300">
                                    Chart Ready!
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Your visualization has been generated and is ready to view.
                                  </div>
                                </motion.div>
                              </div>
                            </motion.div>
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

export function GeneralTimeline({ steps, timelineId, streamUpdates }: GeneralTimelineProps) {
  const { expandedSteps, setExpandedSteps, showAllItems, setShowAllItems } = useTimelineState(timelineId);
  const storageKey = timelineId || "generalTimeline";

  const processedSteps = useMemo(() => 
    steps || processStreamUpdates(streamUpdates || []), 
    [steps, streamUpdates]
  );

  const shouldCollapse = processedSteps.length > 3;
  const visibleSteps = shouldCollapse && !showAllItems 
    ? processedSteps.slice(-3) 
    : processedSteps;

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
      {shouldCollapse && (
        <div className="flex items-center justify-center mb-2">
          <Badge 
            variant="outline" 
            className="cursor-pointer"
            onClick={() => setShowAllItems(!showAllItems)}
          >
            {showAllItems 
              ? `Show Latest (${Math.min(3, processedSteps.length)} of ${processedSteps.length})` 
              : `Show All (${processedSteps.length} items)`
            }
          </Badge>
                </div>
      )}
      
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