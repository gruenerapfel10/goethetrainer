import { SessionTypeEnum } from './session-registry';
import type { Session } from './types';

/**
 * Centralized session event system
 * Single source of truth for all session-related events
 */

export enum SessionEventType {
  // Lifecycle events
  SESSION_STARTED = 'session.started',
  SESSION_PAUSED = 'session.paused',
  SESSION_RESUMED = 'session.resumed',
  SESSION_ENDED = 'session.ended',
  SESSION_ABANDONED = 'session.abandoned',
  
  // Progress events
  SESSION_UPDATED = 'session.updated',
  SESSION_MILESTONE = 'session.milestone',
  SESSION_TARGET_MET = 'session.target_met',
  
  // Error events
  SESSION_ERROR = 'session.error',
  SESSION_VALIDATION_ERROR = 'session.validation_error',
  
  // Analytics events
  SESSION_METRIC_CALCULATED = 'session.metric_calculated',
  SESSION_STATS_UPDATED = 'session.stats_updated',
}

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  sessionType: SessionTypeEnum;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SessionEventPayload<T = any> extends SessionEvent {
  payload: T;
}

/**
 * Session event emitter - centralized event handling
 */
class SessionEventEmitter {
  private listeners: Map<SessionEventType, Set<(event: SessionEvent) => void>> = new Map();
  private eventHistory: SessionEvent[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Register an event listener
   */
  on(eventType: SessionEventType, handler: (event: SessionEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    
    return () => this.off(eventType, handler);
  }

  /**
   * Remove an event listener
   */
  off(eventType: SessionEventType, handler: (event: SessionEvent) => void) {
    this.listeners.get(eventType)?.delete(handler);
  }

  /**
   * Emit an event
   */
  emit<T = any>(event: SessionEventPayload<T>) {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in session event handler for ${event.type}:`, error);
        }
      });
    }

    // Log important events
    this.logEvent(event);
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    sessionId?: string;
    type?: SessionEventType;
    userId?: string;
    since?: Date;
  }): SessionEvent[] {
    let history = [...this.eventHistory];
    
    if (filter) {
      if (filter.sessionId) {
        history = history.filter(e => e.sessionId === filter.sessionId);
      }
      if (filter.type) {
        history = history.filter(e => e.type === filter.type);
      }
      if (filter.userId) {
        history = history.filter(e => e.userId === filter.userId);
      }
      if (filter.since) {
        history = history.filter(e => e.timestamp >= filter.since);
      }
    }
    
    return history;
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Log important events
   */
  private logEvent(event: SessionEvent) {
    const importantEvents = [
      SessionEventType.SESSION_STARTED,
      SessionEventType.SESSION_ENDED,
      SessionEventType.SESSION_ERROR,
      SessionEventType.SESSION_ABANDONED,
    ];

    if (importantEvents.includes(event.type)) {
      console.log(`[Session Event] ${event.type}`, {
        sessionId: event.sessionId,
        userId: event.userId,
        metadata: event.metadata,
      });
    }
  }
}

// Global event emitter instance
export const sessionEvents = new SessionEventEmitter();

/**
 * Helper functions for common events
 */
export const emitSessionLifecycle = {
  started: (session: Session, userId: string) => {
    sessionEvents.emit({
      type: SessionEventType.SESSION_STARTED,
      sessionId: session.id,
      sessionType: session.type as SessionTypeEnum,
      userId,
      timestamp: new Date(),
      payload: session,
      metadata: {
        targetDuration: session.metadata?.targetDuration,
        targetMetrics: session.metadata?.targetMetrics,
      },
    });
  },

  paused: (session: Session, userId: string) => {
    sessionEvents.emit({
      type: SessionEventType.SESSION_PAUSED,
      sessionId: session.id,
      sessionType: session.type as SessionTypeEnum,
      userId,
      timestamp: new Date(),
      payload: session,
      metadata: {
        duration: session.duration,
      },
    });
  },

  resumed: (session: Session, userId: string) => {
    sessionEvents.emit({
      type: SessionEventType.SESSION_RESUMED,
      sessionId: session.id,
      sessionType: session.type as SessionTypeEnum,
      userId,
      timestamp: new Date(),
      payload: session,
    });
  },

  ended: (session: Session, userId: string, status: 'completed' | 'abandoned') => {
    const eventType = status === 'completed' 
      ? SessionEventType.SESSION_ENDED 
      : SessionEventType.SESSION_ABANDONED;
      
    sessionEvents.emit({
      type: eventType,
      sessionId: session.id,
      sessionType: session.type as SessionTypeEnum,
      userId,
      timestamp: new Date(),
      payload: session,
      metadata: {
        duration: session.duration,
        metrics: session.metadata?.metrics,
        targetsAchieved: session.metadata?.targetsAchieved,
      },
    });
  },

  updated: (session: Session, userId: string, changes: Record<string, any>) => {
    sessionEvents.emit({
      type: SessionEventType.SESSION_UPDATED,
      sessionId: session.id,
      sessionType: session.type as SessionTypeEnum,
      userId,
      timestamp: new Date(),
      payload: { session, changes },
      metadata: {
        changedFields: Object.keys(changes),
      },
    });
  },

  error: (sessionId: string, sessionType: SessionTypeEnum, userId: string, error: Error) => {
    sessionEvents.emit({
      type: SessionEventType.SESSION_ERROR,
      sessionId,
      sessionType,
      userId,
      timestamp: new Date(),
      payload: {
        message: error.message,
        stack: error.stack,
      },
    });
  },
};

/**
 * Milestone tracking
 */
export interface SessionMilestone {
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  value: number;
  target: number;
}

export class MilestoneTracker {
  private milestones: Map<string, SessionMilestone> = new Map();

  addMilestone(name: string, target: number, description: string) {
    this.milestones.set(name, {
      name,
      description,
      target,
      value: 0,
      achieved: false,
    });
  }

  updateProgress(name: string, value: number, session: Session, userId: string) {
    const milestone = this.milestones.get(name);
    if (!milestone) return;

    milestone.value = value;
    
    if (!milestone.achieved && value >= milestone.target) {
      milestone.achieved = true;
      milestone.achievedAt = new Date();
      
      // Emit milestone event
      sessionEvents.emit({
        type: SessionEventType.SESSION_MILESTONE,
        sessionId: session.id,
        sessionType: session.type as SessionTypeEnum,
        userId,
        timestamp: new Date(),
        payload: milestone,
        metadata: {
          milestoneName: name,
          target: milestone.target,
          value: value,
        },
      });
    }
  }

  getMilestones(): SessionMilestone[] {
    return Array.from(this.milestones.values());
  }

  reset() {
    this.milestones.clear();
  }
}

/**
 * Analytics event aggregator
 */
export class SessionAnalyticsAggregator {
  private metrics: Map<string, number[]> = new Map();
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getAggregates(metricName: string) {
    const values = this.metrics.get(metricName) || [];
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0, sum: 0 };
    }

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
    };
  }

  getAllAggregates() {
    const result: Record<string, ReturnType<typeof this.getAggregates>> = {};
    this.metrics.forEach((_, key) => {
      result[key] = this.getAggregates(key);
    });
    return result;
  }

  clear() {
    this.metrics.clear();
  }
}