import { SessionTypeEnum, validateSessionData, getSessionConfig } from './session-registry';
import type { Session } from './types';

/**
 * Centralized session middleware for validation and error handling
 * Single place where things can go wrong - making debugging easier
 */

export interface MiddlewareContext {
  sessionId?: string;
  userId: string;
  sessionType?: SessionTypeEnum;
  data?: any;
}

export interface MiddlewareResult {
  success: boolean;
  error?: string;
  code?: string;
  details?: any;
}

/**
 * Session validation middleware
 */
export class SessionValidationMiddleware {
  /**
   * Validate session exists and belongs to user
   */
  static async validateSessionOwnership(
    sessionId: string,
    userId: string
  ): Promise<MiddlewareResult> {
    try {
      const { getSessionById } = await import('./queries');
      const session = await getSessionById(sessionId);
      
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        };
      }
      
      if (session.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to session',
          code: 'SESSION_UNAUTHORIZED',
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to validate session',
        code: 'VALIDATION_ERROR',
        details: error,
      };
    }
  }

  /**
   * Validate session is in correct state for operation
   */
  static validateSessionState(
    session: Session,
    requiredStates: Session['status'][]
  ): MiddlewareResult {
    if (!requiredStates.includes(session.status)) {
      return {
        success: false,
        error: `Session must be in one of these states: ${requiredStates.join(', ')}`,
        code: 'INVALID_SESSION_STATE',
        details: { currentState: session.status, requiredStates },
      };
    }
    return { success: true };
  }

  /**
   * Validate session data against schema
   */
  static validateSessionData(
    type: SessionTypeEnum,
    data: any
  ): MiddlewareResult {
    const validation = validateSessionData(type, data);
    
    if (!validation.valid) {
      return {
        success: false,
        error: 'Session data validation failed',
        code: 'DATA_VALIDATION_ERROR',
        details: validation.errors,
      };
    }
    
    return { success: true };
  }

  /**
   * Validate session duration constraints
   */
  static validateDurationConstraints(
    type: SessionTypeEnum,
    duration: number
  ): MiddlewareResult {
    const config = getSessionConfig(type);
    const { minDuration, maxDuration } = config.validation;
    
    if (minDuration && duration < minDuration) {
      return {
        success: false,
        error: `Session duration must be at least ${minDuration} seconds`,
        code: 'DURATION_TOO_SHORT',
        details: { duration, minDuration },
      };
    }
    
    if (maxDuration && duration > maxDuration) {
      return {
        success: false,
        error: `Session duration cannot exceed ${maxDuration} seconds`,
        code: 'DURATION_TOO_LONG',
        details: { duration, maxDuration },
      };
    }
    
    return { success: true };
  }

  /**
   * Validate update payload
   */
  static validateUpdatePayload(
    type: SessionTypeEnum,
    updates: Record<string, any>
  ): MiddlewareResult {
    const config = getSessionConfig(type);
    const validFields = Object.keys(config.schema.fields);
    
    // Check for invalid fields
    const invalidFields = Object.keys(updates).filter(
      field => !validFields.includes(field)
    );
    
    if (invalidFields.length > 0) {
      return {
        success: false,
        error: 'Update contains invalid fields',
        code: 'INVALID_FIELDS',
        details: { invalidFields, validFields },
      };
    }
    
    // Validate each field's value
    for (const [field, value] of Object.entries(updates)) {
      const fieldConfig = config.schema.fields[field];
      
      if (!fieldConfig) continue;
      
      // Type validation
      const expectedType = fieldConfig.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (expectedType !== actualType && value !== null && value !== undefined) {
        return {
          success: false,
          error: `Invalid type for field ${field}`,
          code: 'TYPE_MISMATCH',
          details: { field, expectedType, actualType },
        };
      }
      
      // Required field validation
      if (fieldConfig.required && (value === null || value === undefined)) {
        return {
          success: false,
          error: `Required field ${field} cannot be null`,
          code: 'REQUIRED_FIELD_MISSING',
          details: { field },
        };
      }
    }
    
    return { success: true };
  }
}

/**
 * Error handler middleware
 */
export class SessionErrorHandler {
  private static readonly ERROR_CODES = {
    // Auth errors
    AUTH_REQUIRED: { status: 401, message: 'Authentication required' },
    SESSION_UNAUTHORIZED: { status: 403, message: 'Unauthorized access to session' },
    
    // Not found errors
    SESSION_NOT_FOUND: { status: 404, message: 'Session not found' },
    USER_NOT_FOUND: { status: 404, message: 'User not found' },
    
    // Validation errors
    VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
    DATA_VALIDATION_ERROR: { status: 400, message: 'Invalid session data' },
    INVALID_SESSION_STATE: { status: 400, message: 'Invalid session state' },
    INVALID_FIELDS: { status: 400, message: 'Invalid fields in request' },
    TYPE_MISMATCH: { status: 400, message: 'Type mismatch in field value' },
    REQUIRED_FIELD_MISSING: { status: 400, message: 'Required field missing' },
    DURATION_TOO_SHORT: { status: 400, message: 'Session duration too short' },
    DURATION_TOO_LONG: { status: 400, message: 'Session duration too long' },
    
    // Conflict errors
    SESSION_ALREADY_ACTIVE: { status: 409, message: 'A session is already active' },
    SESSION_ALREADY_ENDED: { status: 409, message: 'Session has already ended' },
    
    // Server errors
    DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
    INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
    UNKNOWN_ERROR: { status: 500, message: 'An unexpected error occurred' },
  };

  /**
   * Format error response
   */
  static formatError(
    code: string,
    customMessage?: string,
    details?: any
  ): {
    error: string;
    code: string;
    details?: any;
    status: number;
  } {
    const errorConfig = this.ERROR_CODES[code as keyof typeof this.ERROR_CODES] || 
                       this.ERROR_CODES.UNKNOWN_ERROR;
    
    return {
      error: customMessage || errorConfig.message,
      code,
      ...(details && { details }),
      status: errorConfig.status,
    };
  }

  /**
   * Handle and log errors
   */
  static handleError(
    error: unknown,
    context: MiddlewareContext
  ): ReturnType<typeof this.formatError> {
    // Log error with context
    console.error('Session error:', {
      error,
      context,
      timestamp: new Date().toISOString(),
    });

    // Handle known error types
    if (error instanceof Error) {
      // Parse error message for known patterns
      if (error.message.includes('not found')) {
        return this.formatError('SESSION_NOT_FOUND', error.message);
      }
      
      if (error.message.includes('Unauthorized')) {
        return this.formatError('SESSION_UNAUTHORIZED', error.message);
      }
      
      if (error.message.includes('Validation')) {
        return this.formatError('VALIDATION_ERROR', error.message);
      }
      
      if (error.message.includes('Database')) {
        return this.formatError('DATABASE_ERROR', error.message);
      }
      
      // Default error with message
      return this.formatError('INTERNAL_ERROR', error.message);
    }
    
    // Unknown error type
    return this.formatError('UNKNOWN_ERROR');
  }

  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context: MiddlewareContext
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const formattedError = this.handleError(error, context);
      throw formattedError;
    }
  }
}

/**
 * Rate limiting middleware
 */
export class SessionRateLimiter {
  private static requests: Map<string, number[]> = new Map();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_REQUESTS = 60; // 60 requests per minute

  static checkRateLimit(userId: string): MiddlewareResult {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.WINDOW_MS
    );
    
    if (validRequests.length >= this.MAX_REQUESTS) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          limit: this.MAX_REQUESTS,
          window: `${this.WINDOW_MS / 1000} seconds`,
          retryAfter: Math.ceil((validRequests[0] + this.WINDOW_MS - now) / 1000),
        },
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    
    return { success: true };
  }

  static reset(userId?: string) {
    if (userId) {
      this.requests.delete(userId);
    } else {
      this.requests.clear();
    }
  }
}

/**
 * Middleware pipeline executor
 */
export class MiddlewarePipeline {
  private middlewares: Array<(context: MiddlewareContext) => Promise<MiddlewareResult>> = [];

  add(middleware: (context: MiddlewareContext) => Promise<MiddlewareResult>) {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: MiddlewareContext): Promise<MiddlewareResult> {
    for (const middleware of this.middlewares) {
      const result = await middleware(context);
      if (!result.success) {
        return result;
      }
    }
    return { success: true };
  }
}

/**
 * Create standard middleware pipeline for session operations
 */
export function createSessionMiddlewarePipeline() {
  return new MiddlewarePipeline()
    .add(async (context) => SessionRateLimiter.checkRateLimit(context.userId))
    .add(async (context) => {
      if (context.sessionId) {
        return SessionValidationMiddleware.validateSessionOwnership(
          context.sessionId,
          context.userId
        );
      }
      return { success: true };
    })
    .add(async (context) => {
      if (context.sessionType && context.data) {
        return SessionValidationMiddleware.validateSessionData(
          context.sessionType,
          context.data
        );
      }
      return { success: true };
    });
}