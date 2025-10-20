import { SessionTypeEnum, calculateSessionMetrics } from './session-registry';
import type { SessionStats, SessionAnalytics } from './types';

/**
 * StatisticsManager - Handles all session metrics, duration, and statistics
 * Manages time tracking, performance metrics, and analytics
 */
export class StatisticsManager {
  private startTime: Date | null = null;
  private endTime: Date | null = null;
  private duration: number = 0;
  private metrics: Record<string, number> = {};
  private sessionData: Record<string, any> = {};
  private sessionType: SessionTypeEnum;

  constructor(sessionType: SessionTypeEnum) {
    this.sessionType = sessionType;
  }

  /**
   * Start timing the session
   */
  startTiming(): void {
    this.startTime = new Date();
  }

  /**
   * End timing the session
   */
  endTiming(): void {
    this.endTime = new Date();
    this.calculateDuration();
  }

  /**
   * Calculate session duration in seconds
   */
  private calculateDuration(): void {
    if (!this.startTime) {
      this.duration = 0;
      return;
    }

    const endTime = this.endTime || new Date();
    const totalTime = endTime.getTime() - this.startTime.getTime();
    this.duration = Math.round(totalTime / 1000);
  }

  /**
   * Get current duration in seconds
   */
  getDuration(): number {
    this.calculateDuration();
    return this.duration;
  }

  /**
   * Get formatted duration string (MM:SS)
   */
  getFormattedDuration(): string {
    const mins = Math.floor(this.duration / 60);
    const secs = this.duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Update session data used for metrics calculation
   */
  updateSessionData(data: Record<string, any>): void {
    this.sessionData = { ...this.sessionData, ...data };
  }

  /**
   * Get current session data
   */
  getSessionData(): Record<string, any> {
    return this.sessionData;
  }

  /**
   * Calculate metrics for the session
   */
  calculateMetrics(): Record<string, number> {
    const currentDuration = this.getDuration();
    this.metrics = calculateSessionMetrics(this.sessionType, this.sessionData, currentDuration);
    return this.metrics;
  }

  /**
   * Get current metrics
   */
  getMetrics(): Record<string, number> {
    return this.calculateMetrics();
  }

  /**
   * Get specific metric value
   */
  getMetricValue(key: string): number | null {
    const metrics = this.getMetrics();
    return metrics[key] ?? null;
  }

  /**
   * Get score-related metrics
   */
  getScoreMetrics(): {
    currentScore: number;
    maxPossibleScore: number;
    percentage: number;
  } {
    const data = this.getSessionData();
    const currentScore = data.currentScore || 0;
    const maxPossibleScore = data.maxPossibleScore || 0;
    const percentage = maxPossibleScore > 0 ? (currentScore / maxPossibleScore) * 100 : 0;

    return {
      currentScore,
      maxPossibleScore,
      percentage
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    wordsPerMinute: number;
    averageTimePerQuestion: number;
    accuracy: number;
  } {
    const duration = this.getDuration();
    const data = this.getSessionData();
    const wordsRead = data.wordsRead || 0;
    const questionsAnswered = data.questionsAnswered || 0;

    const wordsPerMinute = duration > 0 ? Math.round((wordsRead / duration) * 60) : 0;
    const averageTimePerQuestion = questionsAnswered > 0 ? Math.round(duration / questionsAnswered) : 0;

    const maxScore = data.maxPossibleScore || 1;
    const currentScore = data.currentScore || 0;
    const accuracy = maxScore > 0 ? (currentScore / maxScore) * 100 : 0;

    return {
      wordsPerMinute,
      averageTimePerQuestion,
      accuracy
    };
  }

  /**
   * Get progress metrics
   */
  getProgressMetrics(): {
    questionsAnswered: number;
    totalQuestions: number;
    completionPercentage: number;
  } {
    const data = this.getSessionData();
    const questionsAnswered = data.questionsAnswered || 0;
    const totalQuestions = data.totalQuestions || 0;
    const completionPercentage = totalQuestions > 0 ? (questionsAnswered / totalQuestions) * 100 : 0;

    return {
      questionsAnswered,
      totalQuestions,
      completionPercentage
    };
  }

  /**
   * Check if targets were met
   */
  checkTargetsMet(targets: Record<string, number>): Record<string, boolean> {
    const targetsAchieved: Record<string, boolean> = {};
    const metrics = this.getMetrics();

    Object.entries(targets).forEach(([key, target]) => {
      const actual = metrics[key] || this.sessionData[key] || 0;
      targetsAchieved[key] = actual >= target;
    });

    return targetsAchieved;
  }

  /**
   * Export current statistics state
   */
  export(): {
    duration: number;
    metrics: Record<string, number>;
    sessionData: Record<string, any>;
    startTime: Date | null;
    endTime: Date | null;
  } {
    return {
      duration: this.duration,
      metrics: this.metrics,
      sessionData: this.sessionData,
      startTime: this.startTime,
      endTime: this.endTime
    };
  }

  /**
   * Import statistics state for persistence
   */
  import(data: {
    duration?: number;
    metrics?: Record<string, number>;
    sessionData?: Record<string, any>;
    startTime?: Date | null;
    endTime?: Date | null;
  }): void {
    if (data.duration !== undefined) this.duration = data.duration;
    if (data.metrics) this.metrics = data.metrics;
    if (data.sessionData) this.sessionData = data.sessionData;
    if (data.startTime !== undefined) this.startTime = data.startTime;
    if (data.endTime !== undefined) this.endTime = data.endTime;
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.startTime = null;
    this.endTime = null;
    this.duration = 0;
    this.metrics = {};
    this.sessionData = {};
  }

  /**
   * Get user statistics (static method for aggregate stats)
   */
  static async getUserStats(userId: string): Promise<SessionStats> {
    const { getUserSessionStats } = await import('./queries');
    return await getUserSessionStats(userId);
  }

  /**
   * Get session analytics (static method for analytics data)
   */
  static async getSessionAnalytics(userId: string, days: number = 30): Promise<SessionAnalytics> {
    const { getSessionAnalytics } = await import('./queries');
    return await getSessionAnalytics(userId, days);
  }
}
