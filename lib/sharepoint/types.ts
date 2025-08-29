export interface SharepointKnowledgeBaseSummary {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

export interface SharepointRetrievalResultItem {
  title: string;
  url: string;
  score?: number;
  content: string;
  // location and other fields might exist, SimplifiedTimeline for query results shows JSON string
}

export interface SharepointStreamUpdate {
  id: string; // Unique ID for this specific update part/event from the stream
  type: 'tool-call' | 'tool-result' | 'text-delta' | 'error' | 'analysis' | 'plan' | 'query' | 'sharepoint_update' | 'progress' | 'cost_update'; // The type of this specific event
  status: 'running' | 'completed' | 'failed';
  message: string; // Human-readable message for this event
  timestamp: number;
  toolCallId: string; // ID of the orchestrating tool call (e.g., the 'sharepoint_reason' tool call ID from the message part)
  analysisType?: 'context' | string; // For analysis type updates
  findings?: Array<{ evidence?: string[] }>; // For context analysis results
  tables?: SharepointDataTable[]; // For table data
  completedSteps?: number; // For progress updates
  totalSteps?: number; // For progress updates
  isComplete?: boolean; // For progress updates
  details?: {
    toolName?: 'sharepoint_list' | 'sharepoint_retrieve' | string; // Specific sub-tool if applicable
    args?: any; // Arguments if it's a tool-call or for context
    result?: SharepointKnowledgeBaseSummary[] | SharepointRetrievalResultItem[] | any; // Structured result
    error?: any; // Error details if type is 'error'
  };
}

export interface SharepointTableColumn {
  name: string;
  type: string;
  description?: string;
  hasMissingValues?: boolean;
  missingCount?: number;
}

export interface SharepointDataTable {
  tableName: string;
  displayName: string;
  rowCount: number;
  columns: SharepointTableColumn[];
} 