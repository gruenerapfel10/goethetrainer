import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn, isValidUrl } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { GeneralTimeline } from '@/components/timeline';
import type { TimelineStep } from '@/components/timeline/types';

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

// Convert StreamUpdate to TimelineStep format
const convertStreamUpdateToTimelineStep = (update: StreamUpdate): TimelineStep => {
  const icons = {
    plan: <Search className="h-4 w-4" />,
    web: <FileText className="h-4 w-4" />,
    progress: <Loader2 className="h-4 w-4" />,
    analysis: <Sparkles className="h-4 w-4" />,
    'gap-search': <Search className="h-4 w-4" />,
  } as const;

  const isGapSearch = update.id.startsWith('gap-search');
  
  // For web results, try to use the first result's favicon
  let icon = isGapSearch ? icons['gap-search'] : icons[update.type];
  if (update.type === 'web' && update.results && update.results.length > 0 && isValidUrl(update.results[0].url)) {
    const faviconUrl = getUrlSrc(update.results[0].url);
    icon = (
      <img 
        src={faviconUrl} 
        alt="" 
        className="h-4 w-4 rounded"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          // Fallback to FileText icon
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>';
            parent.appendChild(fallback.firstChild!);
          }
        }}
      />
    );
  }

  // Build children for expandable content
  const children: TimelineStep[] = [];

  if (update.type === 'plan' && update.plan) {
    children.push({
      id: `${update.id}-queries`,
      title: 'Search Queries',
      status: update.status === 'completed' ? 'completed' : 'running',
      timestamp: update.timestamp,
      type: 'unified',
      message: update.plan.search_queries.map(q => `• ${q.query}: ${q.rationale}`).join('\n'),
      small: true,
    });
  }

  if (update.type === 'web' && update.results) {
    update.results.forEach((result, idx) => {
      const resultIcon = isValidUrl(result.url) ? (
        <img 
          src={getUrlSrc(result.url)} 
          alt="" 
          className="h-4 w-4 rounded"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : <FileText className="h-4 w-4" />;
      
      children.push({
        id: `${update.id}-result-${idx}`,
        title: result.title,
        status: 'completed',
        timestamp: update.timestamp,
        type: 'unified',
        message: result.content,
        icon: resultIcon,
        small: true,
      });
    });
  }

  if (update.type === 'analysis' && update.findings) {
    children.push({
      id: `${update.id}-findings`,
      title: 'Analysis Findings',
      status: 'completed',
      timestamp: update.timestamp,
      type: 'unified',
      message: update.findings.map(f => `• ${f.insight}`).join('\n'),
      small: true,
    });
  }

  const title = update.title || (update.type === 'plan' ? 'Research Plan' : 'Analysis');
  let badgeText = undefined;

  if (update.type === 'plan' && update.plan) {
    badgeText = `${update.plan.search_queries.length} queries, ${update.plan.required_analyses.length} analyses`;
    if (update.advancedSteps) {
      badgeText += `, +${update.advancedSteps} advanced`;
    }
  }

  return {
    id: update.id,
    title: title,
    message: isGapSearch ? `🔍 ${update.message}` : update.message,
    status: update.status === 'completed' ? 'completed' : update.status === 'running' ? 'running' : 'pending',
    timestamp: update.timestamp,
    icon: icon,
    badgeText: badgeText,
    children: children.length > 0 ? children : undefined,
    data: update
  };
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
    initial={{ opacity: 1, x: 10 }}
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

  const { artifact } = useArtifact();

  const isArtifactVisible = artifact.isVisible;

  return (
    <div className="space-y-8 mx-auto w-full">
      <GeneralTimeline 
        steps={sortedUpdates.map(convertStreamUpdateToTimelineStep)} 
        timelineId="reason-search-timeline"
      />

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
