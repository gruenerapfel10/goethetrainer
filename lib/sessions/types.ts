// Core session types - simplified with registry system
export type SessionType = 'reading' | 'listening' | 'writing' | 'speaking';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

// Base session interface - the registry handles type-specific data
export interface Session {
  id: string;
  userId: string;
  type: SessionType;
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date;
  duration: number; // in seconds
  data: Record<string, any>; // Type-specific data validated by registry
  metadata?: Record<string, any>;
}

// Legacy type aliases for backwards compatibility
// These are deprecated - use Session interface directly
export type ReadingSession = Session & { type: 'reading' };
export type ListeningSession = Session & { type: 'listening' };
export type WritingSession = Session & { type: 'writing' };
export type SpeakingSession = Session & { type: 'speaking' };

// Stats and analytics types
export interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  totalDuration: number; // in seconds
  averageDuration: number; // in seconds
  streakDays: number;
  lastSessionDate?: Date;
  sessionsByType: Record<SessionType, number>;
}

export interface SessionAnalytics {
  dailySessions: Array<{
    date: string;
    count: number;
    duration: number;
  }>;
  weeklyProgress: {
    sessionsThisWeek: number;
    sessionsLastWeek: number;
    percentageChange: number;
  };
  topPerformingType: SessionType | null;
  averageSessionsByDayOfWeek: Record<string, number>;
  peakActivityHour: number | null;
}

// Input types - simplified since registry handles validation
export interface UpdateSessionInput {
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}