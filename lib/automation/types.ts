export interface WorkflowTrigger {
  id: string;
  type: 'schedule' | 'event' | 'webhook' | 'message' | 'connector' | 'manual';
  name: string;
  config: {
    // Schedule trigger
    cron?: string;
    timezone?: string;
    
    // Event trigger  
    eventType?: string;
    conditions?: WorkflowCondition[];
    
    // Webhook trigger
    webhookUrl?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    
    // Message trigger
    messagePattern?: string;
    chatId?: string;
    
    // Connector trigger
    connectorId?: string;
    connectorEvent?: string;
  };
  enabled: boolean;
}

export interface WorkflowAction {
  id: string;
  type: 'connector' | 'notification' | 'webhook' | 'email' | 'ai' | 'delay' | 'condition';
  name: string;
  config: {
    // Connector action
    connectorId?: string;
    method?: string;
    params?: Record<string, any>;
    
    // Notification action
    notificationType?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message?: string;
    
    // Webhook action
    url?: string;
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    
    // AI action
    prompt?: string;
    model?: string;
    
    // Delay action
    delayMs?: number;
    
    // Condition action
    conditions?: WorkflowCondition[];
    trueActions?: string[]; // Action IDs
    falseActions?: string[]; // Action IDs
  };
  enabled: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan' | 'in' | 'exists';
  value: any;
  caseSensitive?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  variables: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  runCount: number;
  tags: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggerId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  logs: WorkflowLog[];
  variables: Record<string, any>;
  error?: string;
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  actionId?: string;
  data?: any;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: Omit<WorkflowTrigger, 'id'>[];
  actions: Omit<WorkflowAction, 'id'>[];
  variables: Record<string, any>;
  tags: string[];
  popularity: number;
  createdBy: string;
}

export interface AutomationStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  topTriggers: { type: string; count: number }[];
  topActions: { type: string; count: number }[];
}