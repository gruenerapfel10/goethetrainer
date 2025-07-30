import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, isValidUrl } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useIsMobile } from '../hooks/use-mobile';
import { useArtifact } from '../hooks/use-artifact';

export interface StreamUpdate {
  id: string;
  type: 'plan' | 'web' | 'analysis' | 'progress';
  status: 'running' | 'completed';
  timestamp: number;
  message: string;
  plan?: {
    search_queries: Array<{
      query: string;
      rationale: string;
      source: 'web';
      priority: number;
    }>;
    required_analyses: Array<{
      type: string;
      description: string;
      importance: number;
    }>;
    special_considerations: string[];
  };
  query?: string;
  source?: string;
  results?: Array<{
    url: string;
    title: string;
    content: string;
    source: 'web';
  }>;
  findings?: Array<{
    insight: string;
    evidence: string[];
    confidence: number;
  }>;
  analysisType?: string;
  completedSteps?: number;
  totalSteps?: number;
  isComplete?: boolean;
  title?: string;
  overwrite?: boolean;
  advancedSteps?: number;
  gaps?: Array<{
    topic: string;
    reason: string;
    additional_queries: string[];
  }>;
  recommendations?: Array<{
    action: string;
    rationale: string;
    priority: number;
  }>;
  uncertainties?: string[];
}

const getUrlSrc = (url: string) => {
  if (isValidUrl(url)) {
    return `https://www.google.com/s2/favicons?domain=${
      new URL(url).hostname
    }&sz=128`;
  }
  return '/public/icons/file.svg';
};

const ResearchStep = ({
  update,
  isExpanded,
  onToggle,
  id,
}: {
  update: StreamUpdate;
  isExpanded: boolean;
  onToggle: () => void;
  id: string;
}) => {
  const icons = {
    plan: Search,
    web: FileText,
    progress: Loader2,
    analysis: Sparkles,
    'gap-search': Search,
  } as const;

  const isGapSearch = update.id.startsWith('gap-search');
  const Icon = isGapSearch ? icons['gap-search'] : icons[update.type];

  const { artifact } = useArtifact();

  const isArtifactVisible = artifact.isVisible;

  return (
    <div id={id} className="group">
      <motion.div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors duration-200',
          isExpanded
            ? 'bg-neutral-50 dark:bg-neutral-800/50'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
          isArtifactVisible && 'px-1 py-1'
        )}
        layout
      >
        <div
          className={cn(
            'flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-300',
            update.status === 'completed'
              ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900'
              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
            isArtifactVisible ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'
          )}
        >
          {update.status === 'running' ? (
            <Loader2
              className={cn(
                'animate-spin',
                isArtifactVisible ? 'h-2.5 w-2.5' : 'h-3 w-3 sm:h-4 sm:w-4'
              )}
            />
          ) : (
            <Icon
              className={cn(
                isArtifactVisible ? 'h-2.5 w-2.5' : 'h-3 w-3 sm:h-4 sm:w-4'
              )}
            />
          )}
        </div>

        <button
          onClick={onToggle}
          className="flex items-center justify-between flex-1 text-left min-w-0"
        >
          <div
            className={cn(
              'space-y-0.5 min-w-0 flex-1',
              isArtifactVisible && 'space-y-0'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span
                className={cn(
                  'font-medium break-words hyphens-auto',
                  isArtifactVisible ? 'text-xs' : 'text-sm'
                )}
              >
                {update.title ||
                  (update.type === 'plan' ? 'Research Plan' : 'Analysis')}
              </span>
              {update.type === 'plan' && update.plan && (
                <span
                  className={cn(
                    'text-neutral-500 flex-shrink-0',
                    isArtifactVisible ? 'text-[10px]' : 'text-xs'
                  )}
                >
                  ({update.plan.search_queries.length} queries,{' '}
                  {update.plan.required_analyses.length} analyses
                  {update.advancedSteps
                    ? `, +${update.advancedSteps} advanced`
                    : ''}
                  )
                </span>
              )}
            </div>
            {update.message && (
              <p
                className={cn(
                  'text-neutral-500 break-words hyphens-auto',
                  isArtifactVisible ? 'text-[10px]' : 'text-xs'
                )}
              >
                {isGapSearch ? (
                  <span className="flex items-center gap-1">
                    <Search
                      className={isArtifactVisible ? 'w-2.5 h-2.5' : 'w-3 h-3'}
                    />

                    {update.message}
                  </span>
                ) : (
                  update.message
                )}
              </p>
            )}
          </div>

          <ChevronRight
            className={cn(
              'text-neutral-400 flex-shrink-0 ml-2 transition-transform',
              isExpanded && 'rotate-90',
              isArtifactVisible ? 'h-3 w-3' : 'h-4 w-4'
            )}
          />
        </button>
      </motion.div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.2, ease: 'easeOut' },
                opacity: { duration: 0.15, delay: 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: 'easeIn' },
                opacity: { duration: 0.1 },
              },
            }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'py-2 space-y-2',
                isArtifactVisible ? 'pl-6 pr-1' : 'pl-8 pr-2'
              )}
            >
              {update.type === 'plan' && update.plan && (
                <div className="space-y-2">
                  {update.plan.search_queries.map((query, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
                        isArtifactVisible ? 'p-1.5' : 'p-2'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Search
                          className={cn(
                            'text-neutral-500 mt-1',
                            isArtifactVisible ? 'h-3 w-3' : 'h-3.5 w-3.5'
                          )}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'font-medium',
                                isArtifactVisible ? 'text-xs' : 'text-sm'
                              )}
                            >
                              {query.query}
                            </span>
                            <Badge
                              variant="secondary"
                              className={
                                isArtifactVisible ? 'text-[9px]' : 'text-[10px]'
                              }
                            >
                              {query.source}
                            </Badge>
                          </div>
                          <p
                            className={cn(
                              'text-neutral-500 mt-1',
                              isArtifactVisible ? 'text-[10px]' : 'text-xs'
                            )}
                          >
                            {query.rationale}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {update.type === 'web' && update.results && (
                <div className="space-y-2">
                  {update.results.map((result, idx) => (
                    <motion.a
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-start gap-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                        isArtifactVisible ? 'p-1.5' : 'p-2'
                      )}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <img
                          src={getUrlSrc(result.url)}
                          alt=""
                          className={isArtifactVisible ? 'w-3 h-3' : 'w-4 h-4'}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove(
                              'hidden'
                            );
                          }}
                        />
                        <div className="hidden">
                          <FileText
                            className={
                              isArtifactVisible ? 'h-3 w-3' : 'h-4 w-4'
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <h4
                          className={cn(
                            'font-medium leading-tight',
                            isArtifactVisible ? 'text-xs' : 'text-sm'
                          )}
                        >
                          {result.title}
                        </h4>
                        <p
                          className={cn(
                            'text-neutral-500 mt-1 line-clamp-2',
                            isArtifactVisible ? 'text-[10px]' : 'text-xs'
                          )}
                        >
                          {result.content}
                        </p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              )}

              {update.type === 'analysis' && update.findings && (
                <div className="space-y-2">
                  {update.findings.map((finding, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
                        isArtifactVisible ? 'p-1.5' : 'p-2'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex-shrink-0',
                            isArtifactVisible ? 'mt-1' : 'mt-1.5'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-full',
                              finding.confidence > 0.7
                                ? 'bg-neutral-900 dark:bg-neutral-50'
                                : 'bg-neutral-400 dark:bg-neutral-600',
                              isArtifactVisible ? 'w-1 h-1' : 'w-1.5 h-1.5'
                            )}
                          />
                        </div>
                        <div className="space-y-2 flex-1">
                          <p
                            className={cn(
                              'font-medium',
                              isArtifactVisible ? 'text-xs' : 'text-sm'
                            )}
                          >
                            {finding.insight}
                          </p>
                          {finding.evidence.length > 0 && (
                            <div
                              className={cn(
                                'border-l-2 border-neutral-200 dark:border-neutral-700 space-y-1.5',
                                isArtifactVisible ? 'pl-3' : 'pl-4'
                              )}
                            >
                              {finding.evidence.map((evidence, i) => (
                                <p
                                  key={i}
                                  className={cn(
                                    'text-neutral-500',
                                    isArtifactVisible
                                      ? 'text-[10px]'
                                      : 'text-xs'
                                  )}
                                >
                                  {evidence}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StepCarousel = ({ updates }: { updates: StreamUpdate[] }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScrollingRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isAutoScrollingRef.current) return;

    const container = scrollContainerRef.current;
    const currentScrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    const isAtBottom =
      Math.abs(scrollHeight - clientHeight - currentScrollTop) < 10;
    const hasScrolledUp = currentScrollTop < lastScrollTop;

    if (hasScrolledUp || !isAtBottom) {
      setUserHasScrolled(true);

      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }

      autoScrollTimeoutRef.current = setTimeout(() => {
        setUserHasScrolled(false);
      }, 8000);
    }

    setLastScrollTop(currentScrollTop);
  }, [lastScrollTop]);

  const handleToggle = (stepId: string) => {
    setExpandedSteps((current) => {
      const newSet = new Set(current);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (userHasScrolled) return;

    const runningStep = updates.find((update) => update.status === 'running');
    if (!runningStep) return;

    const stepElement = document.getElementById(`step-${runningStep.id}`);
    if (!stepElement || !scrollContainerRef.current) return;

    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    const stepRect = stepElement.getBoundingClientRect();

    const isVisible =
      stepRect.top >= containerRect.top && stepRect.top <= containerRect.bottom;

    if (!isVisible) {
      isAutoScrollingRef.current = true;

      stepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });

      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 600);
    }
  }, [updates, userHasScrolled]);

  useEffect(() => {
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">

      <div
        ref={scrollContainerRef}
        className="h-[300px] overflow-y-auto"
        onScroll={handleScroll}
      >
        {updates.map((update) => {
          const isExpanded =
            update.status === 'running' || expandedSteps.has(update.id);

          return (
            <ResearchStep
              key={update.id}
              id={`step-${update.id}`}
              update={update}
              isExpanded={isExpanded}
              onToggle={() => handleToggle(update.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

const SourcesList = ({ sources }: { sources: StreamUpdate['results'] }) => {
  return (
    <div className="space-y-2">
      {sources?.map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <img
                src={getUrlSrc(source.url)}
                alt=""
                className="w-4 h-4"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden">
                <FileText className="h-4 w-4 text-neutral-500" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium leading-tight">
                {source.title}
              </h4>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                {source.content}
              </p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

const AllSourcesView = ({
  sources,
  id,
}: {
  sources: StreamUpdate['results'];
  id?: string;
}) => {
  const { artifact } = useArtifact();
  const isArtifactVisible = artifact.isVisible;
  const isDesktop = !useIsMobile() || isArtifactVisible;

  const title = 'Web Sources';

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button id={id} className="hidden">
            Show All
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <SourcesList sources={sources} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button id={id} className="hidden">
          Show All
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          <SourcesList sources={sources} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const AnimatedTabContent = ({
  children,
  value,
  selected,
}: {
  children: React.ReactNode;
  value: string;
  selected: string;
}) => (
  <motion.div
    role="tabpanel"
    initial={{ opacity: 0, x: 10 }}
    animate={{
      opacity: value === selected ? 1 : 0,
      x: value === selected ? 0 : 10,
      pointerEvents: value === selected ? 'auto' : 'none',
    }}
    transition={{
      duration: 0.2,
      ease: 'easeOut',
    }}
    className={cn(
      'absolute top-0 left-0 right-0',
      value === selected ? 'relative' : 'hidden'
    )}
  >
    {children}
  </motion.div>
);

const EmptyState = ({ type }: { type: 'web' | 'analysis' }) => {
  const icons = {
    web: FileText,
    analysis: Sparkles,
  } as const;
  const Icon = icons[type];

  const messages = {
    web: 'Web sources will appear here once found',
    analysis: 'Analysis results will appear here once complete',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-800">
      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-neutral-400" />
      </div>
      <p className="text-sm text-neutral-500 text-center">{messages[type]}</p>
    </div>
  );
};

const ReasonSearch = ({ updates }: { updates: StreamUpdate[] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTab, setSelectedTab] = useState('web');

  const planUpdateFromUpdates = React.useMemo(() => {
    return (
      updates.find((u) => u.type === 'plan' && u.status === 'completed') ||
      updates.find((u) => u.type === 'plan')
    );
  }, [updates]);

  const additionalAdvancedSteps = React.useMemo(() => {
    return updates.filter(
      (u) => u.id === 'gap-analysis' || u.id === 'final-synthesis'
    ).length;
  }, [updates]);

  const planUpdate = React.useMemo(() => {
    if (planUpdateFromUpdates && additionalAdvancedSteps > 0) {
      return {
        ...planUpdateFromUpdates,
        advancedSteps: additionalAdvancedSteps,
      };
    }
    return planUpdateFromUpdates;
  }, [planUpdateFromUpdates, additionalAdvancedSteps]);

  const totalExpectedSteps = React.useMemo(() => {
    if (planUpdate?.totalSteps) return planUpdate.totalSteps;
    if (!planUpdate?.plan) return 0;

    const searchSteps = planUpdate.plan.search_queries.length;
    const analysisSteps = planUpdate.plan.required_analyses.length;
    const additionalSteps = updates.reduce((acc, u) => {
      if (u.id === 'gap-analysis') {
        return acc + (u.gaps ? u.gaps.length : 1);
      } else if (u.id === 'final-synthesis') {
        return acc + 1;
      }
      return acc;
    }, 0);

    return searchSteps + analysisSteps + additionalSteps;
  }, [planUpdate, updates]);

  const {
    completedSteps,
    runningSteps,
    totalSteps,
    progress,
    isComplete,
    showRunningIndicators,
  } = React.useMemo(() => {
    const stepsById = new Map(updates.map((u) => [u.id, u]));
    const excludedIds = new Set(['research-plan', 'research-progress']);

    const allSteps = Array.from(stepsById.values()).filter(
      (u) => !excludedIds.has(u.id)
    );
    const completed = allSteps.filter((u) => u.status === 'completed').length;
    const running = allSteps.filter((u) => u.status === 'running').length;

    const finalSynthesis = updates.find((u) => u.id === 'final-synthesis');
    const total = finalSynthesis?.totalSteps || totalExpectedSteps;
    const currentProgress = total === 0 ? 0 : (completed / total) * 100;

    const progressUpdate = updates.find((u) => u.type === 'progress');
    const complete =
      progressUpdate?.isComplete === true ||
      finalSynthesis?.isComplete === true ||
      finalSynthesis?.status === 'completed';

    return {
      completedSteps: completed,
      runningSteps: running,
      totalSteps: total,
      progress: currentProgress,
      isComplete: complete,
      showRunningIndicators: !complete && running > 0,
    };
  }, [updates, totalExpectedSteps]);

  const dedupedUpdates = React.useMemo(() => {
    const updateMap = new Map<string, StreamUpdate>();

    const sortedUpdates = [...updates].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    sortedUpdates.forEach((u) => {
      if (u.overwrite || !updateMap.has(u.id)) {
        updateMap.set(u.id, u);
      } else {
        const existing = updateMap.get(u.id)!;
        if (u.status === 'completed' && existing.status !== 'completed') {
          updateMap.set(u.id, u);
        }
      }
    });

    return Array.from(updateMap.values());
  }, [updates]);

  const sortedUpdates = React.useMemo(() => {
    const filteredUpdates = isComplete
      ? dedupedUpdates.filter(
          (u) =>
            (u.status === 'completed' ||
              u.type === 'plan' ||
              (u.analysisType === 'gaps' && u.status === 'running')) &&
            u.id !== 'research-progress'
        )
      : dedupedUpdates.filter((u) => u.id !== 'research-progress');

    const otherUpdates = filteredUpdates
      .filter((u) => u.type !== 'plan')
      .sort((a, b) => a.timestamp - b.timestamp);

    return planUpdate ? [planUpdate, ...otherUpdates] : otherUpdates;
  }, [dedupedUpdates, isComplete, planUpdate]);

  const sourceGroups = React.useMemo(() => {
    const webSources = updates
      .filter((u) => u.type === 'web' && u.status === 'completed' && u.results)
      .flatMap((u) => u.results || []);

    const analysisResults = updates
      .filter((u) => u.type === 'analysis' && u.status === 'completed')
      .map((u) => ({
        type: u.analysisType || 'Analysis',
        findings: u.findings || [],
        gaps: u.gaps,
        recommendations: u.recommendations,
        uncertainties: u.uncertainties,
      }));

    return {
      web: webSources,
      analysis: analysisResults,
    };
  }, [updates]);

  const finalSynthesisDone = React.useMemo(() => {
    return dedupedUpdates.some(
      (u) => u.id === 'final-synthesis' && u.status === 'completed'
    );
  }, [dedupedUpdates]);

  useEffect(() => {
    if (finalSynthesisDone) {
      setIsCollapsed(true);
    }
  }, [finalSynthesisDone]);

  const { artifact } = useArtifact();

  const isArtifactVisible = artifact.isVisible;

  return (
    <div className="space-y-8 mx-auto w-full">
      <Card className="w-full m-auto overflow-hidden shadow-none hover:shadow-none">
        <div
          className={cn(
            'flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-xl',
            isComplete && 'cursor-pointer',
            isComplete &&
              'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
          )}
          onClick={() => isComplete && setIsCollapsed(!isCollapsed)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium">
                {isComplete ? 'Research Complete' : 'Research Progress'}
              </h3>
              {isComplete ? (
                <Badge
                  variant="secondary"
                  className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                >
                  Complete
                </Badge>
              ) : (
                showRunningIndicators && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  >
                    In Progress
                  </Badge>
                )
              )}
            </div>
            <Progress
              value={progress}
              className={cn(
                'h-1 w-24 sm:w-32',
                showRunningIndicators && 'animate-pulse'
              )}
            />
          </div>
          {isComplete && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-neutral-500 transition-transform flex-shrink-0',
                isCollapsed ? 'rotate-180' : ''
              )}
            />
          )}
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isCollapsed ? 0 : 'auto',
            opacity: isCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden w-full"
        >
          <CardContent className="px-2 sm:px-4 pt-2 sm:pt-4 w-full max-w-full m-0">
            <StepCarousel updates={sortedUpdates} />
          </CardContent>
        </motion.div>
      </Card>

      {finalSynthesisDone &&
        (sourceGroups.web.length > 0 || sourceGroups.analysis.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              <h3 className="text-sm font-medium">Sources</h3>
            </div>
            <Tabs
              defaultValue="web"
              className="w-full"
              onValueChange={setSelectedTab}
              value={selectedTab}
            >
              <TabsList className="w-full h-10 grid grid-cols-2 bg-neutral-100/50 dark:bg-neutral-800/50 p-1 rounded-lg">
                <TabsTrigger
                  value="web"
                  className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    <span className="hidden sm:inline">Web</span>
                    {sourceGroups.web.length > 0 && (
                      <Badge variant="secondary" className="h-4 px-1">
                        {sourceGroups.web.length}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    <span className="hidden sm:inline">Analysis</span>
                    {sourceGroups.analysis.length > 0 && (
                      <Badge variant="secondary" className="h-4 px-1">
                        {sourceGroups.analysis.length}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="relative mt-4">
                <AnimatedTabContent value="web" selected={selectedTab}>
                  {sourceGroups.web.length > 0 ? (
                    <div className="space-y-3">
                      <div
                        className={`grid 
      ${
        isArtifactVisible
          ? 'grid-cols-1 gap-2'
          : 'grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-2'
      }
    `}
                      >
                        {sourceGroups.web.slice(0, 3).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 mt-0.5">
                                <img
                                  src={getUrlSrc(source.url)}
                                  alt=""
                                  className="w-3.5 h-3.5"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove(
                                      'hidden'
                                    );
                                  }}
                                />
                                <div className="hidden">
                                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-medium leading-snug truncate">
                                  {source.title}
                                </h4>
                                <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
                                  {source.content}
                                </p>
                              </div>
                            </div>
                          </a>
                        ))}
                        {sourceGroups.web.length > 3 && (
                          <button
                            onClick={() =>
                              document
                                .getElementById('show-all-web-sources')
                                ?.click()
                            }
                            className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                              Show {sourceGroups.web.length - 3} More Sources
                            </span>
                          </button>
                        )}
                      </div>
                      {sourceGroups.web.length > 3 && (
                        <div className="hidden">
                          <AllSourcesView
                            sources={sourceGroups.web}
                            id="show-all-web-sources"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState type="web" />
                  )}
                </AnimatedTabContent>
                <AnimatedTabContent value="analysis" selected={selectedTab}>
                  {sourceGroups.analysis.length > 0 ||
                  updates.some(
                    (u) => u.id === 'gap-analysis' && u.status === 'running'
                  ) ||
                  updates.some(
                    (u) => u.id === 'final-synthesis' && u.status === 'running'
                  ) ? (
                    <div className="space-y-2">
                      {sourceGroups.analysis
                        .filter(
                          (a) => a.type !== 'gaps' && a.type !== 'synthesis'
                        )
                        .map((analysis, i) => (
                          <Accordion
                            key={i}
                            type="single"
                            collapsible
                            className="bg-card rounded-lg border border-border"
                          >
                            <AccordionItem
                              value={`analysis-${i}`}
                              className="border-none"
                            >
                              <AccordionTrigger className="px-2 py-1 hover:no-underline text-xs">
                                <div className="flex items-center gap-1.5 text-neutral-600">
                                  <Sparkles className="h-3 w-3" />
                                  {analysis.type}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-2 pb-2">
                                <div className="grid gap-1.5">
                                  {analysis.findings.map((finding, j) => (
                                    <div
                                      key={j}
                                      className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 mt-1">
                                          <div className="w-1 h-1 rounded-full bg-primary/80" />
                                        </div>
                                        <div className="space-y-1.5 min-w-0">
                                          <p className="text-xs font-medium">
                                            {finding.insight}
                                          </p>
                                          {finding.evidence.length > 0 && (
                                            <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                              {finding.evidence.map(
                                                (evidence, k) => (
                                                  <p
                                                    key={k}
                                                    className="text-[11px] text-neutral-500"
                                                  >
                                                    {evidence}
                                                  </p>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ))}

                      {sourceGroups.analysis.find((a) => a.type === 'gaps') && (
                        <Accordion
                          type="single"
                          collapsible
                          className="bg-card rounded-lg border border-border"
                        >
                          <AccordionItem value="gaps" className="border-none">
                            <AccordionTrigger className="px-2 py-1 hover:no-underline text-xs">
                              <div className="flex items-center gap-1.5 text-neutral-600">
                                <Search className="h-3 w-3" />
                                Research Gaps and Limitations
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2 pb-2">
                              <div className="grid gap-1.5">
                                {sourceGroups.analysis
                                  .find((a) => a.type === 'gaps')
                                  ?.findings.map((finding, j) => (
                                    <div
                                      key={j}
                                      className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 mt-1">
                                          <div className="w-1 h-1 rounded-full bg-neutral-400" />
                                        </div>
                                        <div className="space-y-1.5 min-w-0">
                                          <p className="text-xs font-medium">
                                            {finding.insight}
                                          </p>
                                          {finding.evidence.length > 0 && (
                                            <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                              {finding.evidence.map(
                                                (solution, k) => (
                                                  <p
                                                    key={k}
                                                    className="text-[11px] text-neutral-500"
                                                  >
                                                    {solution}
                                                  </p>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                {sourceGroups.analysis
                                  .find((a) => a.type === 'gaps')
                                  ?.gaps?.map((gap, j) => (
                                    <div
                                      key={j}
                                      className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 mt-1">
                                          <div className="w-1 h-1 rounded-full bg-neutral-400" />
                                        </div>
                                        <div className="space-y-1.5 min-w-0">
                                          <p className="text-xs font-medium">
                                            {gap.topic}
                                          </p>
                                          <p className="text-[11px] text-neutral-500">
                                            {gap.reason}
                                          </p>
                                          {gap.additional_queries.length >
                                            0 && (
                                            <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                              {gap.additional_queries.map(
                                                (query, k) => (
                                                  <p
                                                    key={k}
                                                    className="text-[11px] text-neutral-500"
                                                  >
                                                    {query}
                                                  </p>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {sourceGroups.analysis.find(
                        (a) => a.type === 'synthesis'
                      ) && (
                        <Accordion
                          type="single"
                          collapsible
                          className="bg-card rounded-lg border border-border"
                        >
                          <AccordionItem
                            value="synthesis"
                            className="border-none"
                          >
                            <AccordionTrigger className="px-2 py-1 hover:no-underline text-xs">
                              <div className="flex items-center gap-1.5 text-neutral-600">
                                <Sparkles className="h-3 w-3" />
                                Final Research Synthesis
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2 pb-2">
                              <div className="grid gap-2.5">
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-medium text-neutral-600 px-1">
                                    Key Findings
                                  </h4>
                                  <div className="grid gap-1.5">
                                    {sourceGroups.analysis
                                      .find((a) => a.type === 'synthesis')
                                      ?.findings.map((finding, j) => (
                                        <div
                                          key={j}
                                          className="p-2 sm:p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                        >
                                          <div className="flex items-start gap-1.5 sm:gap-2">
                                            <div className="flex-shrink-0 mt-1">
                                              <div className="w-1 h-1 rounded-full bg-green-500" />
                                            </div>
                                            <div className="space-y-1.5 min-w-0">
                                              <p className="text-[11px] sm:text-xs font-medium leading-normal">
                                                {finding.insight}
                                              </p>
                                              {finding.evidence.length > 0 && (
                                                <div className="pl-2 sm:pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                                  {finding.evidence.map(
                                                    (evidence, k) => (
                                                      <p
                                                        key={k}
                                                        className="text-[10px] sm:text-[11px] text-neutral-500 leading-normal"
                                                      >
                                                        {evidence}
                                                      </p>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>

                                {sourceGroups.analysis.find(
                                  (a) => a.type === 'synthesis'
                                )?.uncertainties && (
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-medium text-neutral-600 px-1">
                                      Remaining Uncertainties
                                    </h4>
                                    <div className="grid gap-1.5">
                                      {sourceGroups.analysis
                                        .find((a) => a.type === 'synthesis')
                                        ?.uncertainties?.map(
                                          (uncertainty, j) => (
                                            <div
                                              key={j}
                                              className="p-2 sm:p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                            >
                                              <p className="text-[11px] sm:text-xs text-neutral-600 leading-normal">
                                                {uncertainty}
                                              </p>
                                            </div>
                                          )
                                        )}
                                    </div>
                                  </div>
                                )}

                                {sourceGroups.analysis.find(
                                  (a) => a.type === 'synthesis'
                                )?.recommendations && (
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-medium text-neutral-600 px-1">
                                      Recommendations
                                    </h4>
                                    <div className="grid gap-1.5">
                                      {sourceGroups.analysis
                                        .find((a) => a.type === 'synthesis')
                                        ?.recommendations?.map((rec, j) => (
                                          <div
                                            key={j}
                                            className="p-2 sm:p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                          >
                                            <div className="space-y-1">
                                              <p className="text-[11px] sm:text-xs font-medium leading-normal">
                                                {rec.action}
                                              </p>
                                              <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-normal">
                                                {rec.rationale}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  ) : (
                    <EmptyState type="analysis" />
                  )}
                </AnimatedTabContent>
              </div>
            </Tabs>
          </div>
        )}
    </div>
  );
};

export default ReasonSearch;
