import { SessionTypeEnum } from './session-registry';
import type { Session } from './types';

/**
 * Centralized session hooks system
 * Allows components to hook into session lifecycle events
 */

export type SessionHookType = 
  | 'beforeStart'
  | 'afterStart'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforePause'
  | 'afterPause'
  | 'beforeResume'
  | 'afterResume'
  | 'beforeEnd'
  | 'afterEnd'
  | 'onError'
  | 'onMilestone'
  | 'onTargetMet';

export interface SessionHookContext {
  session?: Session;
  sessionId?: string;
  sessionType?: SessionTypeEnum;
  userId: string;
  data?: any;
  error?: Error;
  milestone?: {
    name: string;
    value: number;
    target: number;
  };
}

export type SessionHookHandler = (
  context: SessionHookContext
) => void | Promise<void> | { abort?: boolean; message?: string };

/**
 * Session hooks registry
 */
class SessionHooksRegistry {
  private hooks: Map<SessionHookType, Set<SessionHookHandler>> = new Map();
  private globalHooks: Set<SessionHookHandler> = new Set();

  /**
   * Register a hook for specific event
   */
  register(type: SessionHookType, handler: SessionHookHandler): () => void {
    if (!this.hooks.has(type)) {
      this.hooks.set(type, new Set());
    }
    this.hooks.get(type)!.add(handler);
    
    // Return unregister function
    return () => this.unregister(type, handler);
  }

  /**
   * Register a global hook that runs for all events
   */
  registerGlobal(handler: SessionHookHandler): () => void {
    this.globalHooks.add(handler);
    return () => this.globalHooks.delete(handler);
  }

  /**
   * Unregister a hook
   */
  unregister(type: SessionHookType, handler: SessionHookHandler) {
    this.hooks.get(type)?.delete(handler);
  }

  /**
   * Execute hooks for an event
   */
  async execute(
    type: SessionHookType,
    context: SessionHookContext
  ): Promise<{ proceed: boolean; message?: string }> {
    const handlers = [
      ...Array.from(this.globalHooks),
      ...Array.from(this.hooks.get(type) || []),
    ];

    for (const handler of handlers) {
      try {
        const result = await handler(context);
        
        // Check if hook wants to abort the operation
        if (result && typeof result === 'object' && result.abort) {
          return { 
            proceed: false, 
            message: result.message || `Operation aborted by ${type} hook` 
          };
        }
      } catch (error) {
        console.error(`Error in session hook ${type}:`, error);
        // Don't abort on hook errors, just log them
      }
    }

    return { proceed: true };
  }

  /**
   * Clear all hooks
   */
  clear() {
    this.hooks.clear();
    this.globalHooks.clear();
  }

  /**
   * Get registered hooks count
   */
  getHooksCount(): { byType: Record<string, number>; global: number } {
    const byType: Record<string, number> = {};
    this.hooks.forEach((handlers, type) => {
      byType[type] = handlers.size;
    });
    
    return {
      byType,
      global: this.globalHooks.size,
    };
  }
}

// Global hooks registry instance
export const sessionHooks = new SessionHooksRegistry();

/**
 * Built-in hooks for common functionality
 */
export const builtInHooks = {
  /**
   * Auto-save hook - saves session data periodically
   */
  autoSave: (intervalMs: number = 30000) => {
    const intervals = new Map<string, NodeJS.Timeout>();
    
    sessionHooks.register('afterStart', ({ session }) => {
      if (!session) return;
      
      const interval = setInterval(async () => {
        try {
          const { updateSession } = await import('./queries');
          await updateSession(session);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, intervalMs);
      
      intervals.set(session.id, interval);
    });
    
    sessionHooks.register('afterEnd', ({ session }) => {
      if (!session) return;
      const interval = intervals.get(session.id);
      if (interval) {
        clearInterval(interval);
        intervals.delete(session.id);
      }
    });
  },

  /**
   * Duration limit hook - automatically ends sessions after max duration
   */
  durationLimit: (maxDurationMs: number) => {
    const timers = new Map<string, NodeJS.Timeout>();
    
    sessionHooks.register('afterStart', ({ session }) => {
      if (!session) return;
      
      const timer = setTimeout(async () => {
        try {
          const { getSessionManager } = await import('./session-manager');
          const manager = await getSessionManager(session.userId, session.id);
          await manager.endSession('completed');
        } catch (error) {
          console.error('Auto-end failed:', error);
        }
      }, maxDurationMs);
      
      timers.set(session.id, timer);
    });
    
    sessionHooks.register('afterPause', ({ session }) => {
      if (!session) return;
      const timer = timers.get(session.id);
      if (timer) {
        clearTimeout(timer);
      }
    });
    
    sessionHooks.register('afterResume', ({ session }) => {
      if (!session) return;
      // Recalculate remaining time and set new timer
      const elapsed = session.duration * 1000;
      const remaining = maxDurationMs - elapsed;
      
      if (remaining > 0) {
        const timer = setTimeout(async () => {
          try {
            const { getSessionManager } = await import('./session-manager');
            const manager = await getSessionManager(session.userId, session.id);
            await manager.endSession('completed');
          } catch (error) {
            console.error('Auto-end failed:', error);
          }
        }, remaining);
        
        timers.set(session.id, timer);
      }
    });
    
    sessionHooks.register('afterEnd', ({ session }) => {
      if (!session) return;
      const timer = timers.get(session.id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(session.id);
      }
    });
  },

  /**
   * Validation hook - validates data before updates
   */
  validation: () => {
    sessionHooks.register('beforeUpdate', ({ sessionType, data }) => {
      if (!sessionType || !data) return;
      
      const { validateSessionData } = require('./session-registry');
      const validation = validateSessionData(sessionType, data);
      
      if (!validation.valid) {
        return {
          abort: true,
          message: `Validation failed: ${validation.errors?.join(', ')}`,
        };
      }
    });
  },

  /**
   * Analytics hook - tracks session metrics
   */
  analytics: () => {
    sessionHooks.register('afterStart', ({ session }) => {
      console.log('[Analytics] Session started:', {
        id: session?.id,
        type: session?.type,
        userId: session?.userId,
      });
    });
    
    sessionHooks.register('afterEnd', ({ session }) => {
      console.log('[Analytics] Session ended:', {
        id: session?.id,
        type: session?.type,
        duration: session?.duration,
        status: session?.status,
        metrics: session?.metadata?.metrics,
      });
    });
    
    sessionHooks.register('onMilestone', ({ session, milestone }) => {
      console.log('[Analytics] Milestone achieved:', {
        sessionId: session?.id,
        milestone,
      });
    });
  },

  /**
   * Notification hook - sends notifications for important events
   */
  notifications: (notifyFn: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void) => {
    sessionHooks.register('afterStart', ({ session }) => {
      notifyFn(`Started ${session?.type} session`, 'info');
    });
    
    sessionHooks.register('onMilestone', ({ milestone }) => {
      notifyFn(`Milestone achieved: ${milestone?.name}`, 'success');
    });
    
    sessionHooks.register('onTargetMet', ({ session }) => {
      notifyFn('Session target met!', 'success');
    });
    
    sessionHooks.register('onError', ({ error }) => {
      notifyFn(error?.message || 'Session error occurred', 'error');
    });
  },
};

/**
 * Hook utilities
 */
export class SessionHookUtils {
  /**
   * Create a conditional hook that only runs under certain conditions
   */
  static conditional(
    condition: (context: SessionHookContext) => boolean,
    handler: SessionHookHandler
  ): SessionHookHandler {
    return (context) => {
      if (condition(context)) {
        return handler(context);
      }
    };
  }

  /**
   * Create a debounced hook
   */
  static debounced(
    handler: SessionHookHandler,
    delayMs: number
  ): SessionHookHandler {
    let timeout: NodeJS.Timeout | null = null;
    
    return (context) => {
      if (timeout) clearTimeout(timeout);
      
      return new Promise((resolve) => {
        timeout = setTimeout(() => {
          resolve(handler(context));
        }, delayMs);
      });
    };
  }

  /**
   * Create a throttled hook
   */
  static throttled(
    handler: SessionHookHandler,
    limitMs: number
  ): SessionHookHandler {
    let lastCall = 0;
    
    return (context) => {
      const now = Date.now();
      if (now - lastCall >= limitMs) {
        lastCall = now;
        return handler(context);
      }
    };
  }

  /**
   * Chain multiple hooks
   */
  static chain(...handlers: SessionHookHandler[]): SessionHookHandler {
    return async (context) => {
      for (const handler of handlers) {
        const result = await handler(context);
        if (result && typeof result === 'object' && result.abort) {
          return result;
        }
      }
    };
  }
}

/**
 * React hook for using session hooks
 */
export function useSessionHook(
  type: SessionHookType,
  handler: SessionHookHandler,
  deps: any[] = []
) {
  if (typeof window !== 'undefined') {
    // Client-side only
    const { useEffect } = require('react');
    
    useEffect(() => {
      const unregister = sessionHooks.register(type, handler);
      return unregister;
    }, deps);
  }
}