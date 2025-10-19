import { SessionTypeEnum, calculateSessionMetrics } from './session-registry';
import type { Session, SessionStats } from './types';

/**
 * Centralized session metrics aggregation and calculation
 * Single source of truth for all metrics calculations
 */

export interface MetricDefinition {
  name: string;
  description: string;
  unit: string;
  aggregationType: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'latest';
  calculate: (session: Session) => number;
}

export interface AggregatedMetrics {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

/**
 * Session metrics aggregator
 */
export class SessionMetricsAggregator {
  private static readonly METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
    // Universal metrics
    totalDuration: {
      name: 'Total Duration',
      description: 'Total time spent in sessions',
      unit: 'seconds',
      aggregationType: 'sum',
      calculate: (session) => session.duration,
    },
    averageSessionLength: {
      name: 'Average Session Length',
      description: 'Average duration per session',
      unit: 'seconds',
      aggregationType: 'avg',
      calculate: (session) => session.duration,
    },
    completionRate: {
      name: 'Completion Rate',
      description: 'Percentage of completed sessions',
      unit: 'percent',
      aggregationType: 'avg',
      calculate: (session) => session.status === 'completed' ? 100 : 0,
    },
    
    // Reading metrics
    totalWordsRead: {
      name: 'Total Words Read',
      description: 'Total number of words read',
      unit: 'words',
      aggregationType: 'sum',
      calculate: (session) => session.type === 'reading' ? session.data.wordsRead : 0,
    },
    readingSpeed: {
      name: 'Reading Speed',
      description: 'Average reading speed',
      unit: 'wpm',
      aggregationType: 'avg',
      calculate: (session) => {
        if (session.type !== 'reading' || session.duration === 0) return 0;
        return (session.data.wordsRead / session.duration) * 60;
      },
    },
    
    // Listening metrics
    totalAudioListened: {
      name: 'Total Audio Listened',
      description: 'Total audio content consumed',
      unit: 'seconds',
      aggregationType: 'sum',
      calculate: (session) => session.type === 'listening' ? session.data.audioPlayed : 0,
    },
    listeningComprehension: {
      name: 'Listening Comprehension',
      description: 'Average comprehension score',
      unit: 'percent',
      aggregationType: 'avg',
      calculate: (session) => session.type === 'listening' ? session.data.comprehensionScore || 0 : 0,
    },
    
    // Writing metrics
    totalWordsWritten: {
      name: 'Total Words Written',
      description: 'Total number of words written',
      unit: 'words',
      aggregationType: 'sum',
      calculate: (session) => session.type === 'writing' ? session.data.wordCount : 0,
    },
    writingAccuracy: {
      name: 'Writing Accuracy',
      description: 'Average writing accuracy',
      unit: 'percent',
      aggregationType: 'avg',
      calculate: (session) => {
        if (session.type !== 'writing' || session.data.wordCount === 0) return 0;
        const errors = (session.data.grammarErrors || 0) + (session.data.spellingErrors || 0);
        return Math.max(0, 100 - (errors / session.data.wordCount * 100));
      },
    },
    
    // Speaking metrics
    totalSpeakingTime: {
      name: 'Total Speaking Time',
      description: 'Total time spent speaking',
      unit: 'seconds',
      aggregationType: 'sum',
      calculate: (session) => session.type === 'speaking' ? session.data.recordingDuration : 0,
    },
    speakingFluency: {
      name: 'Speaking Fluency',
      description: 'Average fluency score',
      unit: 'percent',
      aggregationType: 'avg',
      calculate: (session) => session.type === 'speaking' ? session.data.fluencyScore || 0 : 0,
    },
  };

  /**
   * Calculate metrics for a single session
   */
  static calculateSessionMetrics(session: Session): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    // Use registry-based calculation first
    const registryMetrics = calculateSessionMetrics(
      session.type as SessionTypeEnum,
      session.data,
      session.duration
    );
    
    // Add universal metrics
    Object.entries(this.METRIC_DEFINITIONS).forEach(([key, definition]) => {
      metrics[key] = definition.calculate(session);
    });
    
    // Merge with registry metrics
    return { ...metrics, ...registryMetrics };
  }

  /**
   * Aggregate metrics across multiple sessions
   */
  static aggregateMetrics(
    sessions: Session[],
    metricName: string
  ): AggregatedMetrics | null {
    const definition = this.METRIC_DEFINITIONS[metricName];
    if (!definition) return null;
    
    const values = sessions.map(s => definition.calculate(s)).filter(v => v > 0);
    
    if (values.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        trend: 'stable',
        percentChange: 0,
      };
    }
    
    // Calculate basic aggregates
    const total = values.reduce((a, b) => a + b, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate trend (comparing first half to second half)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let percentChange = 0;
    
    if (values.length >= 4) {
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (percentChange > 5) trend = 'up';
      else if (percentChange < -5) trend = 'down';
    }
    
    return {
      total,
      average,
      min,
      max,
      count: values.length,
      trend,
      percentChange,
    };
  }

  /**
   * Calculate comparative metrics between periods
   */
  static compareMetrics(
    currentSessions: Session[],
    previousSessions: Session[],
    metricName: string
  ): {
    current: AggregatedMetrics | null;
    previous: AggregatedMetrics | null;
    change: number;
    percentChange: number;
    improved: boolean;
  } {
    const current = this.aggregateMetrics(currentSessions, metricName);
    const previous = this.aggregateMetrics(previousSessions, metricName);
    
    if (!current || !previous) {
      return {
        current,
        previous,
        change: 0,
        percentChange: 0,
        improved: false,
      };
    }
    
    const change = current.average - previous.average;
    const percentChange = previous.average > 0 
      ? (change / previous.average) * 100 
      : 0;
    
    // Determine if this is an improvement based on metric type
    const definition = this.METRIC_DEFINITIONS[metricName];
    const improved = definition?.unit === 'percent' 
      ? change > 0  // Higher percentages are better
      : metricName.includes('errors') || metricName.includes('pauses')
        ? change < 0  // Fewer errors/pauses are better
        : change > 0; // Higher values are generally better
    
    return {
      current,
      previous,
      change,
      percentChange,
      improved,
    };
  }

  /**
   * Get session statistics by type
   */
  static getStatsByType(sessions: Session[]): Record<SessionTypeEnum, {
    count: number;
    totalDuration: number;
    avgDuration: number;
    completionRate: number;
  }> {
    const stats: Record<string, any> = {};
    
    Object.values(SessionTypeEnum).forEach(type => {
      const typeSessions = sessions.filter(s => s.type === type);
      const completed = typeSessions.filter(s => s.status === 'completed').length;
      const totalDuration = typeSessions.reduce((sum, s) => sum + s.duration, 0);
      
      stats[type] = {
        count: typeSessions.length,
        totalDuration,
        avgDuration: typeSessions.length > 0 ? totalDuration / typeSessions.length : 0,
        completionRate: typeSessions.length > 0 ? (completed / typeSessions.length) * 100 : 0,
      };
    });
    
    return stats as any;
  }

  /**
   * Calculate streak information
   */
  static calculateStreak(sessions: Session[]): {
    current: number;
    longest: number;
    lastSessionDate: Date | null;
  } {
    if (sessions.length === 0) {
      return { current: 0, longest: 0, lastSessionDate: null };
    }
    
    // Sort sessions by date
    const sorted = [...sessions].sort((a, b) => 
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    let lastDate = new Date(sorted[0].startedAt);
    
    for (let i = 1; i < sorted.length; i++) {
      const currentDate = new Date(sorted[i].startedAt);
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === 1) {
        tempStreak++;
      } else if (daysDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
      
      lastDate = currentDate;
    }
    
    // Check if current streak is ongoing
    const today = new Date();
    const lastSessionDate = new Date(sorted[sorted.length - 1].startedAt);
    const daysSinceLastSession = Math.floor(
      (today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastSession <= 1) {
      currentStreak = tempStreak;
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return {
      current: currentStreak,
      longest: longestStreak,
      lastSessionDate,
    };
  }

  /**
   * Generate performance insights
   */
  static generateInsights(sessions: Session[]): string[] {
    const insights: string[] = [];
    
    if (sessions.length === 0) {
      return ['Start your first learning session to begin tracking progress!'];
    }
    
    // Completion rate insight
    const completedCount = sessions.filter(s => s.status === 'completed').length;
    const completionRate = (completedCount / sessions.length) * 100;
    
    if (completionRate >= 80) {
      insights.push('Excellent completion rate! You finish most of your sessions.');
    } else if (completionRate < 50) {
      insights.push('Try to complete more sessions to maximize learning.');
    }
    
    // Session type distribution
    const typeStats = this.getStatsByType(sessions);
    const mostUsedType = Object.entries(typeStats)
      .sort((a, b) => b[1].count - a[1].count)[0];
    
    if (mostUsedType) {
      insights.push(`You practice ${mostUsedType[0]} the most. Consider balancing with other skills.`);
    }
    
    // Streak insight
    const streak = this.calculateStreak(sessions);
    if (streak.current > 7) {
      insights.push(`Amazing ${streak.current}-day streak! Keep it up!`);
    } else if (streak.current > 0) {
      insights.push(`${streak.current}-day streak. Build consistency for better results.`);
    }
    
    // Time-based insights
    const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
    if (totalHours > 10) {
      insights.push(`${Math.round(totalHours)} hours of practice completed!`);
    }
    
    return insights;
  }

  /**
   * Export metrics to different formats
   */
  static exportMetrics(
    sessions: Session[],
    format: 'json' | 'csv' | 'summary'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify({
          sessions: sessions.map(s => ({
            id: s.id,
            type: s.type,
            duration: s.duration,
            status: s.status,
            metrics: this.calculateSessionMetrics(s),
          })),
          aggregates: Object.fromEntries(
            Object.keys(this.METRIC_DEFINITIONS).map(key => [
              key,
              this.aggregateMetrics(sessions, key),
            ])
          ),
        }, null, 2);
      
      case 'csv':
        const headers = ['ID', 'Type', 'Duration', 'Status', ...Object.keys(this.METRIC_DEFINITIONS)];
        const rows = sessions.map(s => {
          const metrics = this.calculateSessionMetrics(s);
          return [
            s.id,
            s.type,
            s.duration,
            s.status,
            ...Object.keys(this.METRIC_DEFINITIONS).map(key => metrics[key] || 0),
          ].join(',');
        });
        return [headers.join(','), ...rows].join('\n');
      
      case 'summary':
        const stats = this.getStatsByType(sessions);
        const streak = this.calculateStreak(sessions);
        const insights = this.generateInsights(sessions);
        
        return `
# Session Summary

## Overview
- Total Sessions: ${sessions.length}
- Total Duration: ${Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 3600)} hours
- Current Streak: ${streak.current} days
- Longest Streak: ${streak.longest} days

## By Type
${Object.entries(stats).map(([type, data]) => 
  `- ${type}: ${data.count} sessions, ${Math.round(data.totalDuration / 60)} minutes total`
).join('\n')}

## Insights
${insights.map(i => `- ${i}`).join('\n')}
        `.trim();
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}