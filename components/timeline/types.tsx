"use client"

import type { ReactNode } from "react";

/**
 * Animation trigger function type
 */
export type AnimationTrigger = () => void;

/**
 * Animation state type
 */
export type AnimationState = 'idle' | 'animating' | 'complete';

/**
 * Animation orchestrator interface
 */
export interface AnimationOrchestrator {
  registerVerticalConnector: (id: string, trigger: AnimationTrigger) => void;
  registerHorizontalConnector: (id: string, trigger: AnimationTrigger) => void;
  startAnimation: (parentId?: string) => void;
  onVerticalComplete: (id: string) => void;
  onHorizontalComplete: (id: string) => void;
  registerChildren: (parentId: string, childIds: string[]) => void;
}

/**
 * Standardized TimelineStep interface
 */
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

// Common types for stream updates across different agents (SharePoint, CSV, etc.)
export interface StreamTable {
  tableName: string;
  displayName?: string;
  description?: string;
  rowCount?: number;
  columnCount?: number;
  columns?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  sample?: any[];
}

export interface ReasonStreamUpdate {
  id: string;
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'error' | 'analysis' | 'plan' | 'query' | 'progress' | 'cost_update';
  status: 'running' | 'completed' | 'failed';
  message: string;
  timestamp: number;
  details?: Record<string, any>;
  // Analysis-specific fields
  analysisType?: 'context' | 'data' | 'schema';
  findings?: Array<{
    type: string;
    message: string;
    evidence?: any;
  }>;
  // Progress-specific fields
  completedSteps?: number;
  totalSteps?: number;
  isComplete?: boolean;
  // Table-specific fields
  tables?: StreamTable[];
}

export enum Text2sqlStreamStateEnum {
  SQL_GENERATION_START = 'sql_generation_start', //1
  SQL_GENERATION_UNDERSTANDING = 'sql_generation_understanding',
  SQL_GENERATION_SEARCHING = 'sql_generation_searching',
  SQL_GENERATION_PLANNING = 'sql_generation_planning',
  SQL_GENERATION_GENERATING = 'sql_generation_generating',
  SQL_GENERATION_CORRECTING = 'sql_generation_correcting',
  SQL_GENERATION_FINISHED = 'sql_generation_finished',
  SQL_GENERATION_FAILED = 'sql_generation_failed', // 3
  SQL_GENERATION_SUCCESS = 'sql_generation_success', //2
  SQL_EXECUTION_START = 'sql_execution_start',
  SQL_EXECUTION_END = 'sql_execution_end',
  SQL_EXECUTION_ERROR = 'sql_execution_error',
  ERROR = 'error',
  RESPONSE = 'response',
  RESPONSE_DELTA = 'response_delta',
  RESPONSE_STOP = 'response_stop',
}

export type Text2SqlStreamUpdate = {
    id: string;
    timestamp: number;
} & ({
    state: Text2sqlStreamStateEnum.SQL_GENERATION_START;
    question: string
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_UNDERSTANDING;
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_SEARCHING;
    intentReasoning: string;
    rephrasedQuestion: string;
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_PLANNING;
    intentReasoning: string;
    rephrasedQuestion: string;
    sqlGenerationReasoning: string;
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_GENERATING;
    sqlGenerationReasoning: string;
    intentReasoning?: string;
    rephrasedQuestion: string;
    retrievedTables: string[];
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_CORRECTING;
    sqlGenerationReasoning: string;
    intentReasoning?: string;
    rephrasedQuestion: string;
    retrievedTables: string[];
}| {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_FINISHED;
    sqlGenerationReasoning: string;
    intentReasoning?: string;
    rephrasedQuestion: string;
    retrievedTables: string[];
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_SUCCESS;
    sql: string;
    result: any[];
} | {
    state: Text2sqlStreamStateEnum.SQL_GENERATION_FAILED;
    invalidSql: string;
} | {
    state: Text2sqlStreamStateEnum.SQL_EXECUTION_START;
    sql: string;
} | {
    state: Text2sqlStreamStateEnum.SQL_EXECUTION_END;
    result?: {
        records: Record<string, any>[];
        columns: string[];
        threadId: string;
        totalRows: number;
    }
} | {
    state: Text2sqlStreamStateEnum.SQL_EXECUTION_ERROR;
    error?: string;
} | {
    state: Text2sqlStreamStateEnum.RESPONSE_DELTA;
    responseChunk: string;
} | {
    state: Text2sqlStreamStateEnum.RESPONSE;
    response: string;
} | {
    state: Text2sqlStreamStateEnum.RESPONSE_STOP;
} | {
    state: Text2sqlStreamStateEnum.ERROR;
    error: string;
});

/**
 * Props for the GeneralTimeline component
 */
export interface GeneralTimelineProps {
  steps: TimelineStep[];
  timelineId?: string;
}


/**
 * Props for the ReasonTimeline component
 */
export interface ReasonTimelineProps {
  steps?: TimelineStep[];
  timelineId?: string;
  streamUpdates?: ReasonStreamUpdate[];
}

/**
 * Props for the Text2sqlTimeline component
 */
export interface Text2sqlTimelineProps {
  timelineId?: string;
  streamUpdates: Text2SqlStreamUpdate[];
}

/**
 * Props for the TimelineStepRenderer component
 */
export interface TimelineStepRendererProps {
  step: TimelineStep;
  index: number;
  steps: TimelineStep[];
  level: number;
  expandedSteps: Set<string>;
  onToggle: (id: string) => void;
  storageKey: string;
  parentIndex?: number;
  parentExpandedKey?: string;
}

/**
 * Status flags for timeline steps
 */
export interface StatusFlags {
  isCompleted: boolean;
  isRunning: boolean;
  isError: boolean;
  isSkipped: boolean;
  isPending: boolean;
}