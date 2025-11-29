'use client';

import { Suspense, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useSessionPage } from '@/lib/sessions/session-page-context';
import { useLearningSession } from '@/lib/sessions/learning-session-context';
import { StartSessionButton } from './start-session-button';
import { BookOpen, Headphones, PenTool, Mic, Activity, ChevronDown } from 'lucide-react';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import { SessionResultsView } from '@/components/questions/SessionResultsView';
import { FaustBadge } from '@/components/FaustBadge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import type { QuestionResult, Question } from '@/lib/sessions/questions/question-types';
import { buildQuestionSessionSummary, type QuestionSessionSummary } from '@/lib/sessions/question-summary';
import type { Session } from '@/lib/sessions/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  ReadingAssessmentCategory,
  getReadingAssessmentCategoryDefinition,
  listReadingAssessmentCategories,
} from '@/lib/questions/assessment-categories';
import { LEVEL_PROFILES, type LevelId } from '@/lib/levels/level-profiles';

// Icon mapping for session types
const ICON_MAP = {
  'book': BookOpen,
  'book-open': BookOpen,
  'headphones': Headphones,
  'pen-tool': PenTool,
  'mic': Mic,
  'activity': Activity,
} as const;

// Color mapping for Tailwind classes
const COLOR_CLASSES = {
  blue: 'text-blue-600 bg-blue-50 border-blue-200',
  purple: 'text-purple-600 bg-purple-50 border-purple-200',
  green: 'text-green-600 bg-green-50 border-green-200',
  red: 'text-red-600 bg-red-50 border-red-200',
} as const;

type ChartPoint = { session: string; score: number };

interface SessionHistoryEntry {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  duration?: number | null;
  summary: QuestionSessionSummary;
  results: QuestionResult[];
}

interface SessionInsights {
  chart: ChartPoint[];
  history: SessionHistoryEntry[];
  color: string;
}

const ALL_FOCUS_OPTIONS: ReadingAssessmentCategory[] = listReadingAssessmentCategories();
const DEFAULT_FOCUS_SELECTION: ReadingAssessmentCategory[] = [...ALL_FOCUS_OPTIONS];
const FOCUS_STORAGE_KEY = 'goethe.focusCategories';
const FOCUS_ALLOWED_SET = new Set(ALL_FOCUS_OPTIONS);
const LEVEL_STORAGE_KEY = 'goethe.level';

const formatDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds?: number | null) => {
  if (!Number.isFinite(seconds as number)) {
    return '–';
  }
  const totalSeconds = Math.max(0, Math.floor(Number(seconds)));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const normaliseTimestamp = (value: any) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000 + (value.nanoseconds ?? 0) / 1_000_000).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const computeDurationSeconds = (startedAt?: string | Date | null, endedAt?: string | Date | null, fallback?: number | null) => {
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }
  const start = startedAt ? new Date(startedAt).getTime() : Number.NaN;
  const end = endedAt ? new Date(endedAt).getTime() : Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }
  return Math.round((end - start) / 1000);
};

const normaliseSummary = (
  session: Session,
  questions: Question[],
  results: QuestionResult[]
): QuestionSessionSummary | null => {
  if (!results.length || !questions.length) {
    return null;
  }
  try {
    return buildQuestionSessionSummary(results, questions);
  } catch (error) {
    console.warn('Failed to build summary for session', session.id, error);
    return null;
  }
};

// Fetch real session data and transform for chart + history
async function fetchSessionInsights(sessionType: SessionTypeEnum): Promise<SessionInsights> {
  try {
    const response = await fetch(`/api/sessions/by-type?type=${sessionType}`);
    if (!response.ok) throw new Error('Failed to fetch sessions');

    const data = await response.json();
    const sessions: Session[] = Array.isArray(data.sessions) ? data.sessions : [];

    console.log(`[SessionInsights] Fetched ${sessions.length} sessions for ${sessionType}`);

    // Process ALL sessions without filtering
    const enhanced = sessions.map((session, index) => {
      const results = Array.isArray(session.data?.results) ? (session.data.results as QuestionResult[]) : [];
      const questions = Array.isArray(session.data?.questions) ? (session.data.questions as Question[]) : [];
      const storedSummary = session.data?.resultsSummary as QuestionSessionSummary | undefined;

      // Prefer server-generated summary but fall back to local computation if missing
      let summary: QuestionSessionSummary | null = storedSummary ?? null;
      if (!summary && results.length && questions.length) {
        try {
          summary = buildQuestionSessionSummary(results, questions);
        } catch (error) {
          console.warn(`Failed to build summary for session ${session.id}`, error);
        }
      }

      // If we can't build a summary, create a basic one from results
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

      const startedAtIso = normaliseTimestamp(session.startedAt ?? session.metadata?.lastUpdatedAt) ?? new Date().toISOString();
      const endedAtIso = normaliseTimestamp(session.endedAt);
      const durationSeconds = computeDurationSeconds(startedAtIso, endedAtIso, session.duration ?? null);

      return {
        session,
        summary,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        durationSeconds,
        results,
      };
    });

    const chronologicalEntries = [...enhanced].sort((a, b) => {
      const aTime = new Date(a.startedAt).getTime();
      const bTime = new Date(b.startedAt).getTime();
      return aTime - bTime;
    });

    // Create chart data from ALL sessions with results (oldest on the left, newest on the right)
    const chartData: ChartPoint[] = chronologicalEntries
      .filter(entry => entry.summary && entry.summary.percentage !== undefined) // Only include sessions with calculated scores
      .map((entry, index) => ({
        session: `S${index + 1}`,
        score: entry.summary!.percentage,
      }));

    // Create history from ALL sessions
    const history: SessionHistoryEntry[] = enhanced.map(entry => ({
      id: entry.session.id,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      duration: entry.durationSeconds,
      summary: entry.summary || {
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        unansweredQuestions: 0,
        incorrectAnswers: 0,
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
        pendingManualReview: 0,
        aiMarkedCount: 0,
        automaticMarkedCount: 0,
        teilBreakdown: [],
        moduleBreakdown: [],
      } as QuestionSessionSummary,
      results: entry.results,
    }));

    console.log(`[SessionInsights] Created ${chartData.length} chart points and ${history.length} history entries`);

    return {
      chart: chartData,
      color: 'hsl(var(--primary))',
      history,
    };
  } catch (error) {
    console.error('Error fetching session data:', error);
    // Return empty data on error
    return {
      chart: [],
      color: 'hsl(var(--primary))',
      history: [],
    };
  }
}

const chartConfig = {
  progress: {
    label: 'Progress',
    color: '#3b82f6',
  },
} as const;

function SessionContent() {
  const { sessionType, metadata, defaults } = useSessionPage();
  const { latestResults, clearResults, activeSession } = useLearningSession();
  const [insights, setInsights] = useState<SessionInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [focusSelection, setFocusSelection] = useState<ReadingAssessmentCategory[]>(() => [...DEFAULT_FOCUS_SELECTION]);
  const [focusLoaded, setFocusLoaded] = useState(false);
  const [levelSelection, setLevelSelection] = useState<LevelId>('C1');
  const itemsPerPage = 5;
  const defaultQuestionCount = defaults?.questionCount ?? null;

  const startMetadata = useMemo(() => {
    const payload: Record<string, any> = {
      page: sessionType,
      questionCount: defaultQuestionCount,
    };

    if (focusSelection.length > 0) {
      payload.preferences = {
        ...(payload.preferences ?? {}),
        focus: {
          ...(payload.preferences?.focus ?? {}),
          categories: focusSelection,
        },
        level: levelSelection,
      };
    }

    return payload;
  }, [sessionType, defaultQuestionCount, focusSelection, levelSelection]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem(FOCUS_STORAGE_KEY);
      if (!raw) {
        setFocusSelection([...DEFAULT_FOCUS_SELECTION]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
      const filtered = parsed.filter((value): value is ReadingAssessmentCategory =>
        typeof value === 'string' && FOCUS_ALLOWED_SET.has(value as ReadingAssessmentCategory)
      );
        if (filtered.length > 0) {
          setFocusSelection(filtered);
          return;
        }
      }
      setFocusSelection([...DEFAULT_FOCUS_SELECTION]);
    } catch (error) {
      console.warn('Failed to load reading focus preferences', error);
      setFocusSelection([...DEFAULT_FOCUS_SELECTION]);
    } finally {
      setFocusLoaded(true);
    }
  }, [sessionType]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(LEVEL_STORAGE_KEY) as LevelId | null;
    if (stored && (stored in LEVEL_PROFILES)) {
      setLevelSelection(stored);
    }
  }, []);

  useEffect(() => {
    if (!focusLoaded) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focusSelection));
      window.localStorage.setItem(LEVEL_STORAGE_KEY, levelSelection);
    } catch (error) {
      console.warn('Failed to persist reading focus preferences', error);
    }
  }, [focusSelection, focusLoaded, sessionType, levelSelection]);

  useEffect(() => {
    let cancelled = false;
    const loadInsights = async () => {
      setIsLoadingInsights(true);
      console.log('[SessionPage] Fetching session insights', sessionType);
      try {
        const data = await fetchSessionInsights(sessionType);
        if (!cancelled) {
          setInsights(data);
          setExpandedHistoryId(null);
          setCurrentPage(1);
          console.log('[SessionPage] Insights loaded', sessionType, {
            chartPoints: data.chart.length,
            historyEntries: data.history.length,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInsights(false);
          console.log('[SessionPage] Insights fetch complete', sessionType);
        }
      }
    };

    void loadInsights();
    return () => {
      cancelled = true;
    };
  }, [sessionType]);

  if (!metadata) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading session information...</div>
      </div>
    );
  }

  // Get the icon component
  const IconComponent = ICON_MAP[metadata.icon as keyof typeof ICON_MAP] || Activity;
  const colorClasses = COLOR_CLASSES[metadata.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.blue;

  if (latestResults?.sessionType === sessionType) {
    console.log('[SessionPage] Rendering inline latest results', sessionType, latestResults.summary?.percentage);
    const issuedAtValue = activeSession?.endedAt ?? activeSession?.metadata?.completedAt ?? activeSession?.metadata?.lastUpdatedAt ?? activeSession?.startedAt ?? new Date();
    return (
      <div className="p-8">
        <SessionResultsView
          results={latestResults.results}
          summary={latestResults.summary}
          sessionType={sessionType}
          onClose={clearResults}
          issuedAt={issuedAtValue}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header with Icon, Title, Description */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <div className="p-3 rounded-lg flex-shrink-0 mt-0">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <div className="pt-2">
            <h1 className="text-4xl font-bold">{metadata.displayName}</h1>
            <p className="text-gray-600 mt-2">{metadata.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Level</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <span>{levelSelection}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(LEVEL_PROFILES) as LevelId[]).map(level => (
                  <DropdownMenuCheckboxItem
                    key={level}
                    checked={levelSelection === level}
                    onCheckedChange={() => setLevelSelection(level)}
                  >
                    {level}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <StartSessionButton
            type={sessionType}
            metadata={startMetadata}
            className="px-8 py-3 text-lg rounded-full h-auto flex-shrink-0"
            onSessionStart={(sessionId) => {
              console.log(`${sessionType} session started:`, sessionId);
            }}
            onSessionEnd={() => {
              console.log(`${sessionType} session ended`);
            }}
          />
        </div>
      </div>

      {sessionType === SessionTypeEnum.READING && (
        <ReadingCustomizationCard
          selectedCategories={focusSelection}
          availableCategories={ALL_FOCUS_OPTIONS}
          onChange={setFocusSelection}
        />
      )}

      {/* Large Centered Chart */}
      <div className="w-full pl-4">
        <h2 className="text-2xl font-semibold mb-4">Last 10 Sessions Score</h2>
        <div className="flex gap-6 items-start">
          <div className="flex-1">
            {isLoadingInsights ? (
              <div className="w-full h-96 flex items-center justify-center bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Loading chart data...</p>
              </div>
            ) : insights?.chart.length ? (
              <ChartContainer config={chartConfig} className="w-full h-96">
                <LineChart
                  data={insights.chart}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="5 5" label="Pass" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={insights.color}
                    strokeWidth={2}
                    dot={{ fill: insights.color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="w-full h-96 flex items-center justify-center bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">No sessions completed yet</p>
              </div>
            )}
          </div>
          {insights?.chart.length ? (() => {
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
                className="h-96"
              />
            );
          })() : null}
        </div>
      </div>

      {/* Session History */}
      <div className="w-full pl-4">
        <h2 className="text-2xl font-semibold mb-4">Session History</h2>
        {isLoadingInsights ? (
          <div className="space-y-2">
            <div className="h-16 bg-muted/50 rounded animate-pulse" />
            <div className="h-16 bg-muted/50 rounded animate-pulse" />
          </div>
        ) : insights?.history.length ? (
          <div className="space-y-4">
            <Accordion
              type="single"
              collapsible
              value={expandedHistoryId ?? undefined}
              onValueChange={value => setExpandedHistoryId(value || null)}
              className=""
            >
              {insights.history
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map(entry => (
                  <AccordionItem key={entry.id} value={entry.id} className="px-4">
                    <AccordionTrigger className="flex w-full items-center justify-between gap-4 py-4">
                      <div className="text-left">
                        <p className="text-base font-semibold">{formatDateTime(entry.startedAt)}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.summary.totalQuestions} Aufgaben · {formatDuration(entry.duration)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-foreground">{entry.summary.percentage}%</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.summary.totalScore} / {entry.summary.maxScore} Punkte
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
                      <SessionResultsView
                        results={entry.results}
                        summary={entry.summary}
                        sessionType={sessionType}
                        issuedAt={entry.endedAt ?? entry.startedAt}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.ceil(insights.history.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded border ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(insights.history.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(insights.history.length / itemsPerPage)}
                className="px-3 py-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground">
            Complete your first {metadata.displayName} session to unlock detailed history and analytics.
          </div>
        )}
      </div>
    </div>
  );
}

interface ReadingCustomizationCardProps {
  selectedCategories: ReadingAssessmentCategory[];
  availableCategories: ReadingAssessmentCategory[];
  onChange: Dispatch<SetStateAction<ReadingAssessmentCategory[]>>;
}

function ReadingCustomizationCard({
  selectedCategories,
  availableCategories,
  onChange,
}: ReadingCustomizationCardProps) {
  const handleSelectionChange = (
    category: ReadingAssessmentCategory,
    nextChecked: boolean | 'indeterminate'
  ) => {
    onChange(prev => {
      const alreadySelected = prev.includes(category);
      const shouldAdd = nextChecked === true;

      if (shouldAdd && !alreadySelected) {
        return [...prev, category];
      }

      if (!shouldAdd && alreadySelected) {
        if (prev.length === 1) {
          return prev; // Enforce at least one focus area
        }
        return prev.filter(item => item !== category);
      }

      return prev;
    });
  };

  const selectedDefinitions = selectedCategories.map(category => {
    const definition = getReadingAssessmentCategoryDefinition(category);
    return {
      id: category,
      label: definition?.label ?? formatCategoryLabel(category),
      description: definition?.description ?? '',
    };
  });

  return (
    <div className="rounded-2xl border bg-white/60 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Focus</p>
          <h3 className="text-xl font-bold mt-1">Choose your language focus areas</h3>
          <p className="text-sm text-muted-foreground">
            Applies to supported question types. At least one focus must remain active.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <span>{selectedCategories.length} focus area{selectedCategories.length === 1 ? '' : 's'} selected</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {availableCategories.map(category => {
              const definition = getReadingAssessmentCategoryDefinition(category);
              const checked = selectedCategories.includes(category);
              return (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={checked}
                  onCheckedChange={(value) => handleSelectionChange(category, value)}
                  className="flex flex-col gap-1 py-2"
                >
                  <span className="text-sm font-medium">{definition?.label ?? formatCategoryLabel(category)}</span>
                  {definition?.description && (
                    <span className="text-xs text-muted-foreground leading-snug">
                      {definition.description}
                    </span>
                  )}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {selectedDefinitions.map(definition => (
          <Badge key={definition.id} variant="secondary" className="px-3 py-1 text-xs">
            {definition.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function formatCategoryLabel(category: ReadingAssessmentCategory): string {
  return category
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
