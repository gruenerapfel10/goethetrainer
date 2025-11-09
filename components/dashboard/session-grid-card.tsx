'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StartSessionButton } from '@/components/session/start-session-button';
import { BookOpen, Headphones, PenTool, Mic, Activity } from 'lucide-react';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { FaustBadge } from '@/components/FaustBadge';
import type { QuestionResult, Question } from '@/lib/sessions/questions/question-types';
import { buildQuestionSessionSummary, type QuestionSessionSummary } from '@/lib/sessions/question-summary';
import type { Session } from '@/lib/sessions/types';

// Icon mapping for session types
const ICON_MAP = {
  'book': BookOpen,
  'book-open': BookOpen,
  'headphones': Headphones,
  'pen-tool': PenTool,
  'mic': Mic,
  'activity': Activity,
} as const;

// Session type metadata
const SESSION_METADATA: Record<SessionTypeEnum, { displayName: string; icon: string; color: string; description: string }> = {
  [SessionTypeEnum.READING]: {
    displayName: 'Reading',
    icon: 'book-open',
    color: 'text-blue-600',
    description: 'Practice reading comprehension',
  },
  [SessionTypeEnum.WRITING]: {
    displayName: 'Writing',
    icon: 'pen-tool',
    color: 'text-purple-600',
    description: 'Practice written expression',
  },
  [SessionTypeEnum.LISTENING]: {
    displayName: 'Listening',
    icon: 'headphones',
    color: 'text-green-600',
    description: 'Practice listening comprehension',
  },
  [SessionTypeEnum.SPEAKING]: {
    displayName: 'Speaking',
    icon: 'mic',
    color: 'text-orange-600',
    description: 'Practice spoken expression',
  },
};

const chartConfig = {
  progress: {
    label: 'Progress',
    color: '#3b82f6',
  },
} as const;

type ChartPoint = { session: string; score: number };

interface SessionInsights {
  chart: ChartPoint[];
  color: string;
  totalSessions: number;
  averageScore: number;
  lastScore: number;
}

async function fetchSessionInsights(sessionType: SessionTypeEnum): Promise<SessionInsights> {
  try {
    const response = await fetch(`/api/sessions/by-type?type=${sessionType}`);
    if (!response.ok) throw new Error('Failed to fetch sessions');

    const data = await response.json();
    const sessions: Session[] = Array.isArray(data.sessions) ? data.sessions : [];

    // Process sessions to get insights
    const enhanced = sessions.map((session) => {
      const results = Array.isArray(session.data?.results) ? (session.data.results as QuestionResult[]) : [];
      const questions = Array.isArray(session.data?.questions) ? (session.data.questions as Question[]) : [];
      const storedSummary = session.data?.resultsSummary as QuestionSessionSummary | undefined;

      let summary: QuestionSessionSummary | null = storedSummary ?? null;
      if (!summary && results.length && questions.length) {
        try {
          summary = buildQuestionSessionSummary(results, questions);
        } catch (error) {
          console.warn(`Failed to build summary for session ${session.id}`, error);
        }
      }

      if (!summary && results.length > 0) {
        const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
        const maxScore = results.reduce((sum, r) => sum + (r.maxScore || 0), 0);
        const correctAnswers = results.filter(r => r.isCorrect).length;
        summary = {
          totalQuestions: results.length,
          answeredQuestions: results.length,
          correctAnswers,
          unansweredQuestions: 0,
          incorrectAnswers: results.length - correctAnswers,
          totalScore,
          maxScore,
          percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
          pendingManualReview: 0,
          aiMarkedCount: 0,
          automaticMarkedCount: results.length,
          teilBreakdown: [],
          moduleBreakdown: [],
        } as QuestionSessionSummary;
      }

      return { summary };
    });

    // Get last 5 sessions for chart
    const chartSessions = enhanced
      .filter(e => e.summary)
      .slice(-5)
      .map((e, idx) => ({
        session: `S${idx + 1}`,
        score: e.summary!.percentage,
      }));

    // Calculate averages
    const allScores = enhanced.map(e => e.summary?.percentage ?? 0).filter(s => s > 0);
    const averageScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const lastScore = allScores.length > 0 ? allScores[allScores.length - 1] : 0;

    return {
      chart: chartSessions,
      color: 'hsl(var(--primary))',
      totalSessions: sessions.length,
      averageScore,
      lastScore,
    };
  } catch (error) {
    console.error('Error fetching session data:', error);
    return {
      chart: [],
      color: 'hsl(var(--primary))',
      totalSessions: 0,
      averageScore: 0,
      lastScore: 0,
    };
  }
}

interface SessionGridCardProps {
  sessionType: SessionTypeEnum;
}

export function SessionGridCard({ sessionType }: SessionGridCardProps) {
  const [insights, setInsights] = useState<SessionInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const metadata = SESSION_METADATA[sessionType];
  const IconComponent = ICON_MAP[metadata.icon as keyof typeof ICON_MAP] || Activity;

  useEffect(() => {
    let cancelled = false;
    const loadInsights = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSessionInsights(sessionType);
        if (!cancelled) {
          setInsights(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInsights();
    return () => {
      cancelled = true;
    };
  }, [sessionType]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between pb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg">
            <IconComponent className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{metadata.displayName}</h3>
            <p className="text-xs text-muted-foreground">{metadata.description}</p>
          </div>
        </div>
        <StartSessionButton
          type={sessionType}
          metadata={{ page: sessionType, questionCount: 10 }}
          className="px-6 py-2 rounded-full h-auto flex-shrink-0"
          onSessionStart={(sessionId) => {
            console.log(`${sessionType} session started:`, sessionId);
          }}
          onSessionEnd={() => {
            console.log(`${sessionType} session ended`);
          }}
        />
      </div>

      <div className="space-y-4">
        {/* Chart with Badge */}
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            {isLoading ? (
              <div className="h-40 rounded animate-pulse bg-transparent" />
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-40">
                <LineChart data={insights?.chart || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={insights?.color || 'hsl(var(--primary))'}
                    strokeWidth={2}
                    dot={{ fill: insights?.color || 'hsl(var(--primary))', r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>

          {/* Badge on the right */}
          {!isLoading && insights ? (() => {
            if (insights.chart.length > 0) {
              const allScores = insights.chart.map(point => point.score);
              const latestScore = allScores[allScores.length - 1];
              const previousScores = allScores.slice(0, -1);

              const sumAll = allScores.reduce((sum, score) => sum + score, 0);
              const overallAverage = sumAll / allScores.length;
              const roundedAverage = Math.round(overallAverage * 10) / 10;

              const sumWithoutLatest = previousScores.reduce((sum, score) => sum + score, 0);
              const averageWithoutLatest =
                previousScores.length > 0 ? sumWithoutLatest / previousScores.length : null;

              const percentageChange =
                averageWithoutLatest !== null
                  ? Math.round((overallAverage - averageWithoutLatest) * 10) / 10
                  : 0;

              return (
                <FaustBadge
                  percentage={roundedAverage}
                  latestSessionPercentage={percentageChange}
                  className="h-40"
                />
              );
            } else {
              // Show empty badge placeholder when no sessions
              return (
                <FaustBadge
                  percentage={0}
                  latestSessionPercentage={0}
                  className="h-40"
                />
              );
            }
          })() : null}
        </div>

      </div>
    </div>
  );
}
