import { 
  Workflow, 
  WorkflowExecution, 
  WorkflowTrigger, 
  WorkflowAction, 
  WorkflowLog,
  WorkflowCondition,
  AutomationStats 
} from './types';
import { generateUUID } from '@/lib/utils';
import { NotificationService } from '@/lib/notifications/notification-service';
import { ConnectorRegistry } from '@/lib/connectors/connector-registry';

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, (data: any) => void> = new Map();
  private isRunning: boolean = false;

  private constructor() {
    this.loadWorkflows();
    this.setupEventListeners();
  }

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  private loadWorkflows() {
    const stored = localStorage.getItem('workflows');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.forEach((workflow: any) => {
        this.workflows.set(workflow.id, {
          ...workflow,
          createdAt: new Date(workflow.createdAt),
          updatedAt: new Date(workflow.updatedAt),
          lastRun: workflow.lastRun ? new Date(workflow.lastRun) : undefined,
        });
      });
    }

    // Load sample workflows
    this.createSampleWorkflows();
  }

  private saveWorkflows() {
    const workflows = Array.from(this.workflows.values());
    localStorage.setItem('workflows', JSON.stringify(workflows));
  }

  private createSampleWorkflows() {
    // Only create if no workflows exist
    if (this.workflows.size > 0) return;

    // Sample: Daily Email Summary
    const emailSummaryWorkflow: Workflow = {
      id: generateUUID(),
      name: 'Daily Email Summary',
      description: 'Send a daily summary of unread emails',
      triggers: [{
        id: generateUUID(),
        type: 'schedule',
        name: 'Daily at 9 AM',
        config: {
          cron: '0 9 * * *',
          timezone: 'UTC',
        },
        enabled: true,
      }],
      actions: [{
        id: generateUUID(),
        type: 'connector',
        name: 'Get Gmail Unread Count',
        config: {
          connectorId: 'gmail',
          method: 'getUnreadCount',
        },
        enabled: true,
      }, {
        id: generateUUID(),
        type: 'notification',
        name: 'Send Summary Notification',
        config: {
          notificationType: 'info',
          title: 'Daily Email Summary',
          message: 'You have {unreadCount} unread emails',
        },
        enabled: true,
      }],
      variables: {},
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
      tags: ['email', 'daily', 'summary'],
    };

    // Sample: Important Message Alert
    const importantMessageWorkflow: Workflow = {
      id: generateUUID(),
      name: 'Important Message Alert',
      description: 'Alert when urgent messages are received',
      triggers: [{
        id: generateUUID(),
        type: 'message',
        name: 'Urgent Message Pattern',
        config: {
          messagePattern: '(urgent|emergency|asap|critical)',
        },
        enabled: true,
      }],
      actions: [{
        id: generateUUID(),
        type: 'notification',
        name: 'High Priority Alert',
        config: {
          notificationType: 'warning',
          title: 'Urgent Message Received',
          message: 'A message with urgent keywords was detected',
        },
        enabled: true,
      }, {
        id: generateUUID(),
        type: 'ai',
        name: 'Analyze Message Urgency',
        config: {
          prompt: 'Analyze this message for urgency level and suggest next actions: {messageContent}',
          model: 'gpt-4',
        },
        enabled: true,
      }],
      variables: {},
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
      tags: ['message', 'urgent', 'alert'],
    };

    this.workflows.set(emailSummaryWorkflow.id, emailSummaryWorkflow);
    this.workflows.set(importantMessageWorkflow.id, importantMessageWorkflow);
    this.saveWorkflows();
  }

  private setupEventListeners() {
    // Listen for message events
    window.addEventListener('message', (event) => {
      if (event.data.type === 'workflow-trigger') {
        // Handle workflow trigger events
        const workflow = Array.from(this.workflows.values()).find(w => 
          w.triggers.some(t => t.id === event.data.triggerId)
        );
        if (workflow) {
          this.executeWorkflow(workflow.id, event.data.triggerId, event.data.data);
        }
      }
    });

    // Listen for connector events
    const connectorRegistry = ConnectorRegistry.getInstance();
    // This would be set up based on connector events
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Workflow Engine started');

    // Set up scheduled triggers
    this.workflows.forEach(workflow => {
      if (workflow.enabled) {
        this.setupWorkflowTriggers(workflow);
      }
    });
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('Workflow Engine stopped');

    // Clear all scheduled tasks
    this.scheduledTasks.forEach(task => clearTimeout(task));
    this.scheduledTasks.clear();
  }

  private setupWorkflowTriggers(workflow: Workflow) {
    workflow.triggers.forEach(trigger => {
      if (!trigger.enabled) return;

      switch (trigger.type) {
        case 'schedule':
          this.setupScheduleTrigger(workflow.id, trigger);
          break;
        case 'message':
          this.setupMessageTrigger(workflow.id, trigger);
          break;
        case 'connector':
          this.setupConnectorTrigger(workflow.id, trigger);
          break;
        case 'webhook':
          this.setupWebhookTrigger(workflow.id, trigger);
          break;
      }
    });
  }

  private setupScheduleTrigger(workflowId: string, trigger: WorkflowTrigger) {
    if (!trigger.config.cron) return;

    // Simple cron parser for basic schedules
    const cronParts = trigger.config.cron.split(' ');
    if (cronParts.length !== 5) return;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;
    
    // For demonstration, set up a simple daily trigger
    if (minute === '0' && hour !== '*') {
      const now = new Date();
      const targetHour = parseInt(hour);
      const nextRun = new Date();
      nextRun.setHours(targetHour, 0, 0, 0);
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      const delay = nextRun.getTime() - now.getTime();
      
      const taskId = `${workflowId}-${trigger.id}`;
      const task = setTimeout(() => {
        this.executeWorkflow(workflowId, trigger.id, {});
        // Reschedule for next day
        this.setupScheduleTrigger(workflowId, trigger);
      }, delay);
      
      this.scheduledTasks.set(taskId, task);
    }
  }

  private setupMessageTrigger(workflowId: string, trigger: WorkflowTrigger) {
    const listenerId = `message-${workflowId}-${trigger.id}`;
    
    const listener = (data: any) => {
      if (trigger.config.messagePattern) {
        const regex = new RegExp(trigger.config.messagePattern, 'gi');
        if (regex.test(data.message)) {
          this.executeWorkflow(workflowId, trigger.id, data);
        }
      }
    };

    this.eventListeners.set(listenerId, listener);
  }

  private setupConnectorTrigger(workflowId: string, trigger: WorkflowTrigger) {
    // Set up connector event listeners
    const listenerId = `connector-${workflowId}-${trigger.id}`;
    
    const listener = (data: any) => {
      if (trigger.config.connectorId === data.connectorId && 
          trigger.config.connectorEvent === data.event) {
        this.executeWorkflow(workflowId, trigger.id, data);
      }
    };

    this.eventListeners.set(listenerId, listener);
  }

  private setupWebhookTrigger(workflowId: string, trigger: WorkflowTrigger) {
    // In a real implementation, this would set up webhook endpoints
    console.log(`Webhook trigger setup for workflow ${workflowId}`);
  }

  private async executeWorkflow(workflowId: string, triggerId: string, triggerData: any) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) return;

    const executionId = generateUUID();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      triggerId,
      status: 'running',
      startTime: new Date(),
      logs: [],
      variables: { ...workflow.variables, ...triggerData },
    };

    this.executions.set(executionId, execution);
    this.addLog(execution, 'info', `Workflow execution started`);

    try {
      // Execute actions in sequence
      for (const action of workflow.actions) {
        if (!action.enabled) continue;

        this.addLog(execution, 'info', `Executing action: ${action.name}`);
        await this.executeAction(execution, action);
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      
      // Update workflow stats
      workflow.lastRun = new Date();
      workflow.runCount++;
      this.saveWorkflows();

      this.addLog(execution, 'info', `Workflow execution completed`);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.addLog(execution, 'error', `Workflow execution failed: ${execution.error}`);
    }

    // Store execution history (keep last 100)
    const executions = Array.from(this.executions.values());
    if (executions.length > 100) {
      const oldest = executions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
      this.executions.delete(oldest.id);
    }
  }

  private async executeAction(execution: WorkflowExecution, action: WorkflowAction) {
    switch (action.type) {
      case 'connector':
        await this.executeConnectorAction(execution, action);
        break;
      case 'notification':
        await this.executeNotificationAction(execution, action);
        break;
      case 'webhook':
        await this.executeWebhookAction(execution, action);
        break;
      case 'ai':
        await this.executeAIAction(execution, action);
        break;
      case 'delay':
        await this.executeDelayAction(execution, action);
        break;
      case 'condition':
        await this.executeConditionAction(execution, action);
        break;
    }
  }

  private async executeConnectorAction(execution: WorkflowExecution, action: WorkflowAction) {
    const { connectorId, method, params } = action.config;
    if (!connectorId || !method) return;

    try {
      const connectorRegistry = ConnectorRegistry.getInstance();
      const result = await connectorRegistry.executeConnectorMethod(connectorId, method, params || {});
      execution.variables[`${action.id}_result`] = result;
      this.addLog(execution, 'info', `Connector action completed`, result);
    } catch (error) {
      this.addLog(execution, 'error', `Connector action failed: ${error}`);
      throw error;
    }
  }

  private async executeNotificationAction(execution: WorkflowExecution, action: WorkflowAction) {
    const { notificationType, title, message } = action.config;
    if (!title || !message) return;

    try {
      const notificationService = NotificationService.getInstance();
      
      // Replace variables in title and message
      const processedTitle = this.replaceVariables(title, execution.variables);
      const processedMessage = this.replaceVariables(message, execution.variables);

      await notificationService.notify({
        type: notificationType as any || 'info',
        title: processedTitle,
        message: processedMessage,
        priority: 'medium',
        source: {
          type: 'system',
          name: 'Workflow Automation',
        },
      });

      this.addLog(execution, 'info', `Notification sent: ${processedTitle}`);
    } catch (error) {
      this.addLog(execution, 'error', `Notification action failed: ${error}`);
      throw error;
    }
  }

  private async executeWebhookAction(execution: WorkflowExecution, action: WorkflowAction) {
    const { url, httpMethod, headers, body } = action.config;
    if (!url) return;

    try {
      const response = await fetch(url, {
        method: httpMethod || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = await response.json();
      execution.variables[`${action.id}_result`] = result;
      
      this.addLog(execution, 'info', `Webhook called: ${response.status}`, result);
    } catch (error) {
      this.addLog(execution, 'error', `Webhook action failed: ${error}`);
      throw error;
    }
  }

  private async executeAIAction(execution: WorkflowExecution, action: WorkflowAction) {
    const { prompt } = action.config;
    if (!prompt) return;

    try {
      // Process prompt with variables
      const processedPrompt = this.replaceVariables(prompt, execution.variables);
      
      // In a real implementation, this would call the AI service
      const result = `AI response to: ${processedPrompt}`;
      execution.variables[`${action.id}_result`] = result;
      
      this.addLog(execution, 'info', `AI action completed`, { prompt: processedPrompt, result });
    } catch (error) {
      this.addLog(execution, 'error', `AI action failed: ${error}`);
      throw error;
    }
  }

  private async executeDelayAction(execution: WorkflowExecution, action: WorkflowAction) {
    const { delayMs } = action.config;
    if (!delayMs) return;

    this.addLog(execution, 'info', `Delaying for ${delayMs}ms`);
    
    return new Promise(resolve => {
      setTimeout(resolve, delayMs);
    });
  }

  private async executeConditionAction(execution: WorkflowExecution, action: WorkflowAction) {
    const { conditions, trueActions, falseActions } = action.config;
    if (!conditions) return;

    const conditionsMet = this.evaluateConditions(conditions, execution.variables);
    const actionsToExecute = conditionsMet ? trueActions : falseActions;
    
    this.addLog(execution, 'info', `Condition evaluated: ${conditionsMet}`);

    if (actionsToExecute) {
      const workflow = this.workflows.get(execution.workflowId);
      if (workflow) {
        for (const actionId of actionsToExecute) {
          const actionToExecute = workflow.actions.find(a => a.id === actionId);
          if (actionToExecute) {
            await this.executeAction(execution, actionToExecute);
          }
        }
      }
    }
  }

  private evaluateConditions(conditions: WorkflowCondition[], variables: Record<string, any>): boolean {
    return conditions.every(condition => {
      const value = this.getVariableValue(condition.field, variables);
      return this.evaluateCondition(value, condition);
    });
  }

  private evaluateCondition(value: any, condition: WorkflowCondition): boolean {
    const { operator, value: conditionValue, caseSensitive } = condition;
    
    let testValue = value;
    let testConditionValue = conditionValue;
    
    if (!caseSensitive && typeof value === 'string' && typeof conditionValue === 'string') {
      testValue = value.toLowerCase();
      testConditionValue = conditionValue.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return testValue === testConditionValue;
      case 'contains':
        return String(testValue).includes(String(testConditionValue));
      case 'startsWith':
        return String(testValue).startsWith(String(testConditionValue));
      case 'endsWith':
        return String(testValue).endsWith(String(testConditionValue));
      case 'regex':
        return new RegExp(testConditionValue).test(String(testValue));
      case 'greaterThan':
        return Number(testValue) > Number(testConditionValue);
      case 'lessThan':
        return Number(testValue) < Number(testConditionValue);
      case 'in':
        return Array.isArray(testConditionValue) && testConditionValue.includes(testValue);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private getVariableValue(field: string, variables: Record<string, any>): any {
    const parts = field.split('.');
    let value: any = variables;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{(\w+)\}/g, (match, varName) => {
      return variables[varName] || match;
    });
  }

  private addLog(execution: WorkflowExecution, level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      data,
    });
  }

  // Public API
  createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>): string {
    const id = generateUUID();
    const newWorkflow: Workflow = {
      ...workflow,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
    };

    this.workflows.set(id, newWorkflow);
    this.saveWorkflows();

    if (newWorkflow.enabled && this.isRunning) {
      this.setupWorkflowTriggers(newWorkflow);
    }

    return id;
  }

  updateWorkflow(id: string, updates: Partial<Workflow>) {
    const workflow = this.workflows.get(id);
    if (!workflow) return;

    const updated = {
      ...workflow,
      ...updates,
      updatedAt: new Date(),
    };

    this.workflows.set(id, updated);
    this.saveWorkflows();

    // Restart triggers if workflow is enabled
    if (updated.enabled && this.isRunning) {
      this.setupWorkflowTriggers(updated);
    }
  }

  deleteWorkflow(id: string) {
    // Clear scheduled tasks for this workflow
    this.scheduledTasks.forEach((task, taskId) => {
      if (taskId.startsWith(id)) {
        clearTimeout(task);
        this.scheduledTasks.delete(taskId);
      }
    });

    // Remove event listeners
    this.eventListeners.forEach((listener, listenerId) => {
      if (listenerId.includes(id)) {
        this.eventListeners.delete(listenerId);
      }
    });

    this.workflows.delete(id);
    this.saveWorkflows();
  }

  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  getExecutions(workflowId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    
    if (workflowId) {
      return executions.filter(e => e.workflowId === workflowId);
    }
    
    return executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  triggerWorkflow(workflowId: string, data?: any) {
    const workflow = this.workflows.get(workflowId);
    if (workflow && workflow.enabled) {
      const manualTrigger = workflow.triggers.find(t => t.type === 'manual');
      const triggerId = manualTrigger?.id || 'manual';
      this.executeWorkflow(workflowId, triggerId, data || {});
    }
  }

  getStats(): AutomationStats {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());

    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;

    const executionTimes = executions
      .filter(e => e.endTime)
      .map(e => e.endTime!.getTime() - e.startTime.getTime());

    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    // Count trigger types
    const triggerCounts = new Map<string, number>();
    workflows.forEach(w => {
      w.triggers.forEach(t => {
        triggerCounts.set(t.type, (triggerCounts.get(t.type) || 0) + 1);
      });
    });

    // Count action types
    const actionCounts = new Map<string, number>();
    workflows.forEach(w => {
      w.actions.forEach(a => {
        actionCounts.set(a.type, (actionCounts.get(a.type) || 0) + 1);
      });
    });

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.enabled).length,
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageExecutionTime,
      topTriggers: Array.from(triggerCounts.entries()).map(([type, count]) => ({ type, count })),
      topActions: Array.from(actionCounts.entries()).map(([type, count]) => ({ type, count })),
    };
  }

  // Trigger external events
  triggerMessageEvent(message: string, chatId?: string) {
    this.eventListeners.forEach(listener => {
      if (listener.toString().includes('message-')) {
        listener({ message, chatId });
      }
    });
  }

  triggerConnectorEvent(connectorId: string, event: string, data?: any) {
    this.eventListeners.forEach(listener => {
      if (listener.toString().includes('connector-')) {
        listener({ connectorId, event, data });
      }
    });
  }
}