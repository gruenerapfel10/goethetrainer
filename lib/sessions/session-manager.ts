import 'server-only';

import { generateUUID } from '@/lib/utils';
import { 
  SessionTypeEnum,
  getSessionConfig,
  initializeSessionData,
  validateSessionData,
  calculateSessionMetrics
} from './session-registry';
import './configs'; // Import to register all configs
import type { Session, SessionStatus, SessionStats, SessionAnalytics } from './types';

export class SessionManager {
  private sessionId: string;
  private userId: string;
  private session: Session | null = null;
  private startTime: Date | null = null;
  private pausedDuration: number = 0;
  private lastPauseTime: Date | null = null;

  constructor(userId: string, sessionId?: string) {
    this.userId = userId;
    this.sessionId = sessionId || generateUUID();
  }

  async initialize(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.sessionId = sessionId;
      const { getSessionById } = await import('./queries');
      this.session = await getSessionById(sessionId);
      if (!this.session) {
        throw new Error(`Session ${sessionId} not found`);
      }
    }
  }

  async createSession(
    type: SessionTypeEnum,
    metadata?: Record<string, any>
  ): Promise<Session> {
    const config = getSessionConfig(type);
    const initialData = initializeSessionData(type);
    
    const session: Session = {
      id: this.sessionId,
      userId: this.userId,
      type: type as any, // Cast to match existing type system
      status: 'active' as SessionStatus,
      startedAt: new Date(),
      duration: 0,
      data: initialData,
      metadata: {
        ...metadata,
        config: {
          displayName: config.metadata.displayName,
          icon: config.metadata.icon,
          color: config.metadata.color,
        }
      }
    } as Session;

    const { saveSession } = await import('./queries');
    await saveSession(session);
    
    this.session = session;
    this.startTime = new Date();
    
    return session;
  }

  async updateSessionData(updates: Record<string, any>): Promise<Session> {
    if (!this.session) {
      throw new Error('No active session to update');
    }

    const type = this.session.type as SessionTypeEnum;
    
    // Merge updates with existing data
    const updatedData = {
      ...this.session.data,
      ...updates
    };

    // Validate the updated data
    const validation = validateSessionData(type, updatedData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Update session
    this.session.data = updatedData;
    this.session.duration = this.calculateDuration();

    // Calculate and store metrics
    const metrics = calculateSessionMetrics(type, updatedData, this.session.duration);
    this.session.metadata = {
      ...this.session.metadata,
      metrics
    };

    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  async pauseSession(): Promise<Session> {
    if (!this.session || this.session.status !== 'active') {
      throw new Error('No active session to pause');
    }

    this.session.status = 'paused';
    this.lastPauseTime = new Date();
    
    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  async resumeSession(): Promise<Session> {
    if (!this.session || this.session.status !== 'paused') {
      throw new Error('No paused session to resume');
    }

    if (this.lastPauseTime) {
      this.pausedDuration += Date.now() - this.lastPauseTime.getTime();
      this.lastPauseTime = null;
    }
    
    this.session.status = 'active';
    
    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  async endSession(status: 'completed' | 'abandoned' = 'completed'): Promise<Session> {
    if (!this.session) {
      throw new Error('No active session to end');
    }

    this.session.status = status;
    this.session.endedAt = new Date();
    this.session.duration = this.calculateDuration();

    // Calculate final metrics
    const type = this.session.type as SessionTypeEnum;
    const metrics = calculateSessionMetrics(type, this.session.data, this.session.duration);
    this.session.metadata = {
      ...this.session.metadata,
      metrics,
      finalMetrics: metrics
    };

    // Check if targets were met
    const config = getSessionConfig(type);
    if (config.defaults.targetMetrics) {
      const targetsAchieved: Record<string, boolean> = {};
      Object.entries(config.defaults.targetMetrics).forEach(([key, target]) => {
        const actual = this.session!.data[key] || metrics[key] || 0;
        targetsAchieved[key] = actual >= target;
      });
      this.session.metadata.targetsAchieved = targetsAchieved;
    }

    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  private calculateDuration(): number {
    if (!this.startTime) return 0;
    
    const totalTime = Date.now() - this.startTime.getTime();
    const activeDuration = totalTime - this.pausedDuration;
    
    // Add current pause duration if currently paused
    if (this.lastPauseTime) {
      const currentPauseDuration = Date.now() - this.lastPauseTime.getTime();
      return Math.round((activeDuration - currentPauseDuration) / 1000);
    }
    
    return Math.round(activeDuration / 1000);
  }

  getSession(): Session | null {
    return this.session;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getDuration(): number {
    return this.calculateDuration();
  }

  getCurrentMetrics(): Record<string, number> | null {
    if (!this.session) return null;
    
    const type = this.session.type as SessionTypeEnum;
    return calculateSessionMetrics(type, this.session.data, this.calculateDuration());
  }

  // Static helper methods
  static async getUserStats(userId: string): Promise<SessionStats> {
    const { getUserSessionStats } = await import('./queries');
    return await getUserSessionStats(userId);
  }

  static async getSessionAnalytics(userId: string, days: number = 30): Promise<SessionAnalytics> {
    const { getSessionAnalytics } = await import('./queries');
    return await getSessionAnalytics(userId, days);
  }

  static getAvailableSessionTypes(): Array<{
    type: SessionTypeEnum;
    metadata: ReturnType<typeof getSessionConfig>['metadata'];
    features: ReturnType<typeof getSessionConfig>['features'];
  }> {
    return Object.values(SessionTypeEnum).map(type => {
      const config = getSessionConfig(type);
      return {
        type,
        metadata: config.metadata,
        features: config.features
      };
    });
  }
}

// Helper function to get or create session manager
export async function getSessionManager(
  userId: string, 
  sessionId?: string
): Promise<SessionManager> {
  const manager = new SessionManager(userId, sessionId);
  if (sessionId) {
    await manager.initialize(sessionId);
  }
  return manager;
}

// Export v2 names for backwards compatibility during migration
export { SessionManager as SessionManagerV2 };
export { getSessionManager as getSessionManagerV2 };