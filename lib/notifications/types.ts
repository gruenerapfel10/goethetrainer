export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'mention' | 'task' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: {
    type: 'chat' | 'connector' | 'system' | 'user';
    id?: string;
    name?: string;
  };
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
  data?: any;
}

export interface NotificationFilter {
  types?: AppNotification['type'][];
  priorities?: AppNotification['priority'][];
  sources?: string[];
  read?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  filters: {
    types: Record<AppNotification['type'], boolean>;
    priorities: Record<AppNotification['priority'], boolean>;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
}

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: NotificationCondition[];
  actions: NotificationRuleAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'in' | 'notIn';
  value: any;
  caseSensitive?: boolean;
}

export interface NotificationRuleAction {
  type: 'notify' | 'email' | 'webhook' | 'log' | 'custom';
  config: Record<string, any>;
}

export interface NotificationChannel {
  id: string;
  type: 'browser' | 'email' | 'sms' | 'slack' | 'webhook';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}