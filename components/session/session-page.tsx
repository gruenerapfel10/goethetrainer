'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSessionPage } from '@/lib/sessions/session-page-context';
import { useLearningSession } from '@/lib/sessions/learning-session-context';
import { StartSessionButton } from './start-session-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  BookOpen, 
  Target, 
  Headphones, 
  PenTool, 
  Mic,
  Activity,
  TrendingUp,
  Award
} from 'lucide-react';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { SessionResultsView } from '@/components/questions/SessionResultsView';

// Icon mapping for session types
const ICON_MAP = {
  book: BookOpen,
  headphones: Headphones,
  'pen-tool': PenTool,
  mic: Mic,
  activity: Activity,
  target: Target,
  clock: Clock,
} as const;

// Color mapping for Tailwind classes
const COLOR_CLASSES = {
  blue: 'text-blue-600 bg-blue-50 border-blue-200',
  purple: 'text-purple-600 bg-purple-50 border-purple-200',
  green: 'text-green-600 bg-green-50 border-green-200',
  red: 'text-red-600 bg-red-50 border-red-200',
} as const;

function SessionContent() {
  const { sessionType, metadata, features, defaults } = useSessionPage();
  const {
    activeSession,
    stats,
    latestResults,
    clearResults,
    sessionProgress,
    sessionMetrics,
  } = useLearningSession();
  const [sessionTime, setSessionTime] = useState(0);

  // Get the icon component
  const IconComponent = ICON_MAP[metadata.icon as keyof typeof ICON_MAP] || Activity;
  const colorClasses = COLOR_CLASSES[metadata.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.blue;

  // Update session timer
  useEffect(() => {
    if (activeSession?.type === sessionType && activeSession.status === 'active') {
      const interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession, sessionType]);

  const formatTime = (seconds: number | null | undefined) => {
    const safeSeconds = Number.isFinite(seconds as number) ? Math.max(0, Number(seconds)) : 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get primary metric name for display
  const determineTargetKey = () => {
    if (sessionType === SessionTypeEnum.READING) return 'wordsRead';
    if (sessionType === SessionTypeEnum.WRITING) return 'wordCount';
    if (sessionType === SessionTypeEnum.LISTENING) return 'audioPlayed';
    if (sessionType === SessionTypeEnum.SPEAKING) return 'recordingDuration';
    return 'answeredQuestions';
  };

  const targetKey = determineTargetKey();
  const primaryMetricValueRaw =
    sessionMetrics[targetKey] ??
    (targetKey === 'answeredQuestions'
      ? sessionProgress?.answeredQuestions ?? 0
      : sessionProgress?.answeredQuestions ?? 0);
  const primaryMetricValue = typeof primaryMetricValueRaw === 'number'
    ? primaryMetricValueRaw
    : Number(primaryMetricValueRaw ?? 0);

  const getPrimaryMetricDisplay = () => {
    switch (sessionType) {
      case SessionTypeEnum.READING:
        return { label: 'Words Read', value: primaryMetricValue, unit: 'words' };
      case SessionTypeEnum.LISTENING:
        return { label: 'Audio Played', value: formatTime(primaryMetricValue), unit: '' };
      case SessionTypeEnum.WRITING:
        return { label: 'Words Written', value: primaryMetricValue, unit: 'words' };
      case SessionTypeEnum.SPEAKING:
        return { label: 'Speaking Time', value: formatTime(primaryMetricValue), unit: '' };
      default:
        return { label: 'Progress', value: primaryMetricValue, unit: '' };
    }
  };

  const primaryMetric = getPrimaryMetricDisplay();

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const target = defaults.targetMetrics?.[targetKey];
    if (target && target > 0) {
      return Math.min(100, Math.round((primaryMetricValue / target) * 100));
    }
    if (sessionProgress?.totalQuestions) {
      return Math.round(
        (sessionProgress.answeredQuestions / sessionProgress.totalQuestions) * 100
      );
    }
    return 0;
  };

  if (latestResults) {
    return (
      <div className="p-8">
        <SessionResultsView
          results={latestResults.results}
          summary={latestResults.summary}
          onClose={clearResults}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses}`}>
            <IconComponent className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">{metadata.displayName}</h1>
            <p className="text-gray-600 mt-2">{metadata.description}</p>
          </div>
        </div>
        <StartSessionButton
          type={sessionType}
          metadata={{ page: sessionType, questionCount: defaults.questionCount }}
          onSessionStart={(sessionId) => {
            console.log(`${sessionType} session started:`, sessionId);
            setSessionTime(0);
          }}
          onSessionEnd={() => {
            console.log(`${sessionType} session ended`);
            setSessionTime(0);
          }}
        />
      </div>

      {/* Active Session Stats */}
      {activeSession?.type === sessionType && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Session Time */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(sessionTime)}</div>
              <p className="text-xs text-muted-foreground">
                {activeSession.status === 'paused' ? 'Paused' : 'Active'}
              </p>
            </CardContent>
          </Card>

          {/* Primary Metric */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{primaryMetric.label}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {primaryMetric.value} {primaryMetric.unit && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {primaryMetric.unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">This session</p>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getProgressPercentage()}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    metadata.color === 'blue' ? 'bg-blue-600' :
                    metadata.color === 'purple' ? 'bg-purple-600' :
                    metadata.color === 'green' ? 'bg-green-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessionTime > 0 ? Math.round((primaryMetricValue / sessionTime) * 60) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {sessionType === SessionTypeEnum.READING || sessionType === SessionTypeEnum.WRITING 
                  ? 'words/min' 
                  : 'rate/min'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Stats */}
      {stats && !activeSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.sessionsByType?.[sessionType] || 0} {sessionType} sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalSessions > 0 
                  ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedSessions} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(stats.averageDuration ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: {formatTime(defaults.targetDuration ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {(stats.streakDays ?? 0)}
                {(stats.streakDays ?? 0) >= 7 && <Award className="h-5 w-5 text-yellow-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(stats.streakDays ?? 0) === 1 ? 'day' : 'days'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <Card className="min-h-[400px]">
        <CardContent className="p-8">
          {activeSession?.type === sessionType ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <IconComponent className="h-6 w-6" />
                {metadata.displayName} Session Active
              </h2>
              <div className="text-lg text-muted-foreground">
                Your {sessionType} session is currently active. Track your progress above.
              </div>
              
              {/* Feature indicators */}
              <div className="flex gap-2 mt-4">
                {features.supportsAudioRecording && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Audio Recording
                  </span>
                )}
                {features.supportsTextInput && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Text Input
                  </span>
                )}
                {features.supportsDictionary && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    Dictionary
                  </span>
                )}
                {features.supportsNotes && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    Notes
                  </span>
                )}
              </div>

              {/* Placeholder for session-specific content */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <p className="text-center text-gray-600">
                  Session content will be displayed here based on the {sessionType} type.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className={`p-4 rounded-full ${colorClasses} mb-4`}>
                <IconComponent className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {metadata.description}
              </p>
              <p className="text-sm text-muted-foreground">
                Click "Start Session" to begin tracking your {sessionType} progress
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
