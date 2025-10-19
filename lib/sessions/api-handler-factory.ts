import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from './session-manager';
import { SessionTypeEnum } from './session-registry';

export type SessionApiHandler<T = any> = (params: {
  request: NextRequest;
  userId: string;
  manager: Awaited<ReturnType<typeof getSessionManager>>;
  body?: T;
  params?: Record<string, string>;
}) => Promise<any>;

export interface ApiHandlerConfig {
  requiresBody?: boolean;
  requiresSession?: boolean;
  validateBody?: (body: any) => { valid: boolean; errors?: string[] };
}

/**
 * Factory for creating standardized session API handlers
 * Centralizes auth, error handling, and response formatting
 */
export function createSessionApiHandler<T = any>(
  handler: SessionApiHandler<T>,
  config: ApiHandlerConfig = {}
) {
  return async function standardizedHandler(
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) {
    try {
      // 1. Authentication check
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      // 2. Parse params if provided
      const params = context?.params ? await context.params : {};

      // 3. Parse and validate body if required
      let body: T | undefined;
      if (config.requiresBody || request.method !== 'GET') {
        try {
          body = await request.json();
        } catch (e) {
          return NextResponse.json(
            { error: 'Invalid JSON body', code: 'INVALID_JSON' },
            { status: 400 }
          );
        }

        // Custom validation if provided
        if (config.validateBody && body) {
          const validation = config.validateBody(body);
          if (!validation.valid) {
            return NextResponse.json(
              {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: validation.errors,
              },
              { status: 400 }
            );
          }
        }
      }

      // 4. Get session manager
      let manager: Awaited<ReturnType<typeof getSessionManager>>;
      
      if (config.requiresSession && params.sessionId) {
        manager = await getSessionManager(session.user.email, params.sessionId);
      } else {
        manager = await getSessionManager(session.user.email);
      }

      // 5. Execute handler
      const result = await handler({
        request,
        userId: session.user.email,
        manager,
        body,
        params,
      });

      // 6. Return success response
      return NextResponse.json(result);
      
    } catch (error) {
      // Centralized error handling
      console.error('Session API error:', error);
      
      if (error instanceof Error) {
        // Known error types
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: error.message, code: 'NOT_FOUND' },
            { status: 404 }
          );
        }
        
        if (error.message.includes('Validation')) {
          return NextResponse.json(
            { error: error.message, code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
        
        if (error.message.includes('No active session')) {
          return NextResponse.json(
            { error: error.message, code: 'NO_ACTIVE_SESSION' },
            { status: 400 }
          );
        }

        // Default error response
        return NextResponse.json(
          {
            error: error.message,
            code: 'INTERNAL_ERROR',
          },
          { status: 500 }
        );
      }
      
      // Unknown error
      return NextResponse.json(
        { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a standard GET handler
 */
export function createGetHandler<T = any>(
  handler: SessionApiHandler<T>,
  config?: ApiHandlerConfig
) {
  return {
    GET: createSessionApiHandler(handler, config),
  };
}

/**
 * Create a standard POST handler
 */
export function createPostHandler<T = any>(
  handler: SessionApiHandler<T>,
  config?: ApiHandlerConfig
) {
  return {
    POST: createSessionApiHandler(handler, { requiresBody: true, ...config }),
  };
}

/**
 * Create a standard PATCH handler
 */
export function createPatchHandler<T = any>(
  handler: SessionApiHandler<T>,
  config?: ApiHandlerConfig
) {
  return {
    PATCH: createSessionApiHandler(handler, { requiresBody: true, ...config }),
  };
}

/**
 * Create a standard DELETE handler
 */
export function createDeleteHandler<T = any>(
  handler: SessionApiHandler<T>,
  config?: ApiHandlerConfig
) {
  return {
    DELETE: createSessionApiHandler(handler, config),
  };
}