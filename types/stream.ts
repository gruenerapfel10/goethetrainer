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
  
  export interface StreamUpdate {
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
  
  // Helper type for timeline items in tool results
  export interface TimelineItem {
    id: string;
    title: string;
    message?: string;
    status?: 'completed' | 'running' | 'error' | 'pending' | 'skipped';
    icon?: string;
    metadata?: Record<string, any>;
    url?: string;
    score?: number;
  }
  
  // Helper type for standardized tool results
  export interface StandardizedToolResult {
    timelineItems?: TimelineItem[];
    summary?: {
      message: string;
      metadata?: Record<string, any>;
    };
  } 