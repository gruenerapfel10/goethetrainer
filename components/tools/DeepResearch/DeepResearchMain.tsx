'use client';

import { motion, } from 'framer-motion';
import {
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import React, { useState, } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useChat } from '@/contexts/chat-context';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import { TimelineStep } from '@/components/timeline/components/timeline-step';
import { TimelineCover } from '@/components/timeline/components/timeline-cover';

export interface StreamUpdate {
  id: string;
  type: 'plan' | 'web' | 'analysis' | 'progress' | 'status';
  status: 'running' | 'completed';
  timestamp: number;
  message: string;
  data?: any;
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
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname
      }&sz=128`;
  }
  return '/public/icons/file.svg';
};

// Convert StreamUpdate to TimelineStep props
const convertStreamUpdateToTimelineStepProps = (update: StreamUpdate) => {
  // Extract actual web results from nested data structure
  const webResults = update.data?.results || update.results;
  const isWebSearch = update.id?.startsWith('search-') || (webResults && webResults.length > 0);

  // Map IDs to update types based on actual tool output
  const getTypeFromUpdate = (u: StreamUpdate): 'plan' | 'web' | 'analysis' | 'progress' | 'status' => {
    // Check if it's a plan
    if (u.id === 'research-plan') return 'plan';

    // Check if it's a web search (either has results or ID indicates search)
    if (u.id?.startsWith('search-web-') || u.id?.startsWith('gap-search-')) return 'web';

    // Check if it's an analysis (including gap analysis and synthesis)
    if (u.id?.startsWith('analysis-') || u.id === 'gap-analysis' || u.id === 'final-synthesis') return 'analysis';

    // Check if it's progress
    if (u.type === 'progress' || u.id === 'research-progress') return 'progress';

    // For status updates, check the underlying data
    if (u.type === 'status') {
      // If it has web results, it's a web search
      if (webResults && webResults.length > 0) return 'web';
      // If it has analysisType, it's an analysis
      if (u.data?.analysisType || u.analysisType) return 'analysis';
      // If it has a plan, it's a plan
      if (u.data?.plan || u.plan) return 'plan';
    }

    // Default to the actual type or 'status'
    return u.type || 'status';
  };

  const updateType = getTypeFromUpdate(update);

  const icons = {
    plan: <Search className="h-4 w-4" />,
    web: <FileText className="h-4 w-4" />,
    progress: <Loader2 className="h-4 w-4 animate-spin" />,
    analysis: <Sparkles className="h-4 w-4" />,
    'gap-search': <Search className="h-4 w-4" />,
    status: <Loader2 className="h-4 w-4 animate-spin" />,
  } as const;

  const isGapSearch = update.id?.startsWith('gap-search');

  // For web results, try to use the first result's favicon
  let icon = isGapSearch ? icons['gap-search'] : (icons[updateType] || icons.status);

  // Override with spinning loader for running states
  if (update.status === 'running') {
    icon = <Loader2 className="h-4 w-4 animate-spin" />;
  }
  if (isWebSearch && webResults && webResults.length > 0 && isValidUrl(webResults[0].url)) {
    const faviconUrl = getUrlSrc(webResults[0].url);
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
  const children: React.ReactNode[] = [];

  const planData = update.data?.plan || update.plan;
  if (updateType === 'plan' && planData) {
    children.push(
      <TimelineStep
        key={`${update.id}-queries`}
        id={`${update.id}-queries`}
        title="Search Queries"
        description={planData.search_queries.map((q: any) => `• ${q.query}: ${q.rationale}`).join('\n')}
        status={update.status === 'completed' ? 'completed' : 'running'}
        timestamp={update.timestamp || Date.now()}
        type="unified"
        position="only"
      />
    );
  }

  if (updateType === 'web' && webResults) {
    webResults.forEach((result: any, idx: number) => {
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

      // Calculate position for each child
      const position = webResults.length === 1
        ? "only"
        : idx === 0
          ? "first"
          : idx === webResults.length - 1
            ? "last"
            : "middle";

      children.push(
        <TimelineStep
          key={`${update.id}-result-${idx}`}
          id={`${update.id}-result-${idx}`}
          title={result.title}
          description={result.content}
          status="completed"
          timestamp={update.timestamp || Date.now()}
          icon={resultIcon}
          type="unified"
          position={position}
        />
      );
    });
  }

  if (update.type === 'analysis' && update.findings) {
    children.push(
      <TimelineStep
        key={`${update.id}-findings`}
        id={`${update.id}-findings`}
        title="Analysis Findings"
        description={update.findings.map(f => `• ${f.insight}`).join('\n')}
        status="completed"
        timestamp={update.timestamp || Date.now()}
        type="unified"
        position="only"
      />
    );
  }

  const title = update.title || (updateType === 'plan' ? 'Research Plan' : 'Analysis');
  let badgeText = undefined;

  if (updateType === 'plan' && planData) {
    const queries = planData.search_queries?.length || 0;
    const analyses = planData.required_analyses?.length || 0;
    if (queries > 0 || analyses > 0) {
      badgeText = `${queries} queries, ${analyses} analyses`;
      if (update.advancedSteps) {
        badgeText += `, +${update.advancedSteps} advanced`;
      }
    }
  }

  // Use smaller icons for plan, gap analysis, synthesis, and all analysis updates
  const shouldUseSmallIcon = update.id === 'research-plan' || 
                             update.id === 'gap-analysis' || 
                             update.id === 'final-synthesis' ||
                             update.id?.startsWith('analysis-') ||
                             update.type === 'analysis';

  return {
    id: update.id,
    title: title,
    description: isGapSearch ? `🔍 ${update.message}` : update.message,
    status: update.status === 'completed' ? 'completed' : update.status === 'running' ? 'running' : 'pending' as any,
    timestamp: update.timestamp || Date.now(),
    icon: icon,
    iconParams: shouldUseSmallIcon ? {
      src: null,
      alt: '',
      width: 4,
      height: 4,
      className: 'w-4 h-4'
    } : undefined,
    badgeText: badgeText,
    children: children.length > 0 ? children : undefined,
    data: update,
    type: 'tool-result' as const
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
  const { activeArtifact: artifact, artifactsState } = useArtifactsContext();
  const isArtifactVisible = artifactsState.isVisible;
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

interface DeepResearchProps {
  toolCallId: string;
  input?: {
    topic: string;
    depth?: 'basic' | 'advanced';
  };
  output?: any;
  state: string;
  message?: {
    annotations?: Array<{
      type: string;
      tool?: string;
      data?: any;
    }>;
    content?: any[];
  };
  updates?: StreamUpdate[];
}

const DeepResearch = ({ toolCallId, input, output, state, message, updates }: DeepResearchProps) => {
  // Persist updates to prevent losing them when props change
  const [persistedUpdates, setPersistedUpdates] = useState<StreamUpdate[]>([]);

  // Debug logging
  React.useEffect(() => {
    console.log('[DeepResearch] Component props:', {
      toolCallId,
      state,
      hasUpdates: !!updates,
      updatesLength: updates?.length,
      hasMessage: !!message,
      hasAnnotations: !!message?.annotations,
      annotationsLength: message?.annotations?.length,
      hasOutput: !!output,
      outputType: typeof output,
      outputKeys: output ? Object.keys(output) : [],
      outputData: output,
    });
  }, [toolCallId, state, updates, message, output]);

  // Extract updates from message annotations if not provided directly
  // Priority: props.updates > output.data.updates > output.updates > message.annotations > message.content parts
  const streamUpdates = React.useMemo(() => {
    // First check direct updates prop
    if (updates && updates.length > 0) return updates;

    // Check for accumulated updates in output (new streaming format)
    if (output?.type === 'deep_research_updates' && output?.allUpdates) {
      return output.allUpdates;
    }

    // Then check output data
    if (output?.data?.updates) return output.data.updates;
    if (output?.updates) return output.updates;

    // Check message annotations for research_update
    if (message?.annotations) {
      const researchUpdates = message.annotations
        .filter((a: any) =>
          a.type === 'research_update' ||
          a.type === 'tool_update' ||
          a.type === 'deep_research' ||
          (a.tool === 'deep_research' && a.data)
        )
        .map((a: any) => a.data);
      if (researchUpdates.length > 0) return researchUpdates;
    }

    // Check if message has content parts with research updates or final output
    if (message?.content && Array.isArray(message.content)) {
      // First check for tool-deep_research with output (saved/refreshed state)
      const deepResearchTool = message.content.find((part: any) =>
        part.type === 'tool-deep_research' && part.output
      );

      if (deepResearchTool?.output) {
        // Reconstruct timeline from saved output
        const reconstructedUpdates: StreamUpdate[] = [];
        const output = deepResearchTool.output;

        // Add plan update
        if (output.plan) {
          reconstructedUpdates.push({
            id: 'research-plan',
            type: 'plan',
            status: 'completed',
            timestamp: Date.now() - 10000,
            message: 'Research plan created',
            title: 'Research Plan',
            plan: output.plan,
            data: { plan: output.plan }
          });
        }

        // Add web search updates
        if (output.results && Array.isArray(output.results)) {
          output.results.forEach((result: any, idx: number) => {
            if (result.type === 'web' && result.query) {
              reconstructedUpdates.push({
                id: `search-web-${idx}`,
                type: 'web',
                status: 'completed',
                timestamp: Date.now() - 9000 + (idx * 100),
                message: `Searched: ${result.query.query}`,
                title: 'Web Search',
                query: result.query.query,
                results: result.results,
                data: { results: result.results }
              });
            }
          });
        }

        // Add analysis updates
        if (output.analyses && Array.isArray(output.analyses)) {
          output.analyses.forEach((analysis: any, idx: number) => {
            reconstructedUpdates.push({
              id: `analysis-${idx}`,
              type: 'analysis',
              status: 'completed',
              timestamp: Date.now() - 5000 + (idx * 100),
              message: `Analysis complete`,
              title: `Analysis of ${analysis.type}`,
              analysisType: analysis.type,
              findings: analysis.findings,
              data: {
                type: 'analysis',
                analysisType: analysis.type,
                findings: analysis.findings
              }
            });
          });
        }

        // Add gap analysis update
        if (output.gapAnalysis) {
          reconstructedUpdates.push({
            id: 'gap-analysis',
            type: 'analysis',
            status: 'completed',
            timestamp: Date.now() - 2000,
            message: `Identified ${output.gapAnalysis.limitations?.length || 0} limitations and ${output.gapAnalysis.knowledge_gaps?.length || 0} knowledge gaps`,
            title: 'Research Gaps and Limitations',
            data: {
              type: 'analysis',
              analysisType: 'gaps',
              findings: output.gapAnalysis.limitations?.map((l: any) => ({
                insight: l.description,
                evidence: l.potential_solutions || [],
                confidence: (10 - l.severity) / 10
              })) || [],
              gaps: output.gapAnalysis.knowledge_gaps,
              recommendations: output.gapAnalysis.recommended_followup
            }
          });
        }

        // Add synthesis update
        if (output.synthesis) {
          reconstructedUpdates.push({
            id: 'final-synthesis',
            type: 'analysis',
            status: 'completed',
            timestamp: Date.now() - 1000,
            message: 'Research synthesis completed',
            title: 'Final Synthesis',
            findings: output.synthesis.key_findings?.map((f: any) => ({
              insight: f.finding,
              evidence: f.supporting_evidence || [],
              confidence: f.confidence || 1
            })) || [],
            uncertainties: output.synthesis.remaining_uncertainties,
            data: {
              findings: output.synthesis.key_findings?.map((f: any) => ({
                insight: f.finding,
                evidence: f.supporting_evidence || [],
                confidence: f.confidence || 1
              })) || [],
              uncertainties: output.synthesis.remaining_uncertainties
            }
          });
        }

        if (reconstructedUpdates.length > 0) {
          return reconstructedUpdates;
        }
      }

      // Check for tool-result parts (streaming state)
      const toolParts = message.content.filter((part: any) =>
        part.type === 'tool-result' &&
        part.toolName === 'deep_research' &&
        Array.isArray(part.result)
      );

      if (toolParts.length > 0) {
        // Extract updates from tool result parts
        const extractedUpdates: any[] = [];
        for (const part of toolParts) {
          if (Array.isArray(part.result)) {
            for (const item of part.result) {
              if (item?.type === 'research_update' && item?.data) {
                extractedUpdates.push(item.data);
              } else if (item?.type === 'deep_research_updates' && item?.allUpdates) {
                // Handle accumulated updates format
                extractedUpdates.push(...item.allUpdates);
              }
            }
          }
        }
        if (extractedUpdates.length > 0) return extractedUpdates;
      }
    }

    // Check if output is directly an array of updates
    if (Array.isArray(output)) return output;

    // Default to empty array
    return [];
  }, [updates, output, message]);

  // Update persisted updates whenever we get new ones
  React.useEffect(() => {
    if (streamUpdates.length > 0) {
      setPersistedUpdates(streamUpdates);
    }
  }, [streamUpdates]);

  // Use persisted updates if current extraction is empty
  const finalUpdates = streamUpdates.length > 0 ? streamUpdates : persistedUpdates;

  // Log the extracted updates
  React.useEffect(() => {
    console.log('[DeepResearch] Extracted streamUpdates:', {
      count: streamUpdates.length,
      updates: streamUpdates,
      persistedCount: persistedUpdates.length,
      finalCount: finalUpdates.length
    });
  }, [streamUpdates, persistedUpdates, finalUpdates]);

  const [selectedTab, setSelectedTab] = useState('web');

  const planUpdateFromUpdates = React.useMemo(() => {
    return (
      finalUpdates.find((u: StreamUpdate) => u.id === 'research-plan' && u.status === 'completed') ||
      finalUpdates.find((u: StreamUpdate) => u.id === 'research-plan') ||
      finalUpdates.find((u: StreamUpdate) => (u.data?.plan || u.plan) && u.status === 'completed')
    );
  }, [finalUpdates]);

  const additionalAdvancedSteps = React.useMemo(() => {
    return finalUpdates.filter(
      (u: StreamUpdate) => u.id === 'gap-analysis' || u.id === 'final-synthesis'
    ).length;
  }, [finalUpdates]);

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
    if (planUpdate?.data?.totalSteps) return planUpdate.data.totalSteps;
    if (planUpdate?.totalSteps) return planUpdate.totalSteps;

    const plan = planUpdate?.data?.plan || planUpdate?.plan;
    if (!plan) return 0;

    const searchSteps = plan.search_queries?.length || 0;
    const analysisSteps = plan.required_analyses?.length || 0;
    const additionalSteps = finalUpdates.reduce((acc: number, u: StreamUpdate) => {
      if (u.id === 'gap-analysis') {
        return acc + 1;
      } else if (u.id === 'final-synthesis') {
        return acc + 1;
      }
      return acc;
    }, 0);

    return searchSteps + analysisSteps + additionalSteps;
  }, [planUpdate, finalUpdates]);

  const {
    completedSteps,
    runningSteps,
    totalSteps,
    progress,
    isComplete,
    showRunningIndicators,
  } = React.useMemo(() => {
    const stepsById = new Map(finalUpdates.map((u: StreamUpdate) => [u.id, u]));
    const excludedIds = new Set(['research-progress']);

    const allSteps = (Array.from(stepsById.values()) as StreamUpdate[]).filter(
      (u: StreamUpdate) => !excludedIds.has(u.id)
    );
    const completed = allSteps.filter((u: StreamUpdate) => u.status === 'completed').length;
    const running = allSteps.filter((u: StreamUpdate) => u.status === 'running').length;

    const finalSynthesis = finalUpdates.find((u: StreamUpdate) => u.id === 'final-synthesis');
    const gapAnalysis = finalUpdates.find((u: StreamUpdate) => u.id === 'gap-analysis');
    const total = finalSynthesis?.data?.totalSteps || finalSynthesis?.totalSteps || totalExpectedSteps;
    const currentProgress = total === 0 ? 0 : (completed / total) * 100;

    const progressUpdate = finalUpdates.find((u: StreamUpdate) => u.type === 'progress');

    // Trust the progress update from backend
    const complete = progressUpdate?.isComplete === true || progressUpdate?.status === 'completed';

    return {
      completedSteps: completed,
      runningSteps: running,
      totalSteps: total,
      progress: currentProgress,
      isComplete: complete,
      showRunningIndicators: !complete && running > 0,
    };
  }, [finalUpdates, totalExpectedSteps, state]);

  const dedupedUpdates = React.useMemo(() => {
    const updateMap = new Map<string, StreamUpdate>();

    const sortedUpdates = [...finalUpdates].sort(
      (a: StreamUpdate, b: StreamUpdate) => a.timestamp - b.timestamp
    );

    sortedUpdates.forEach((u: StreamUpdate) => {
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
  }, [finalUpdates]);

  const sortedUpdates = React.useMemo(() => {
    // Simply filter and sort updates - show them as they come from backend
    const filteredUpdates = dedupedUpdates.filter((u) => u.id !== 'research-progress');

    const otherUpdates = filteredUpdates
      .filter((u) => u.id !== 'research-plan') // Exclude plan from other updates since we handle it separately
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    return planUpdate ? [planUpdate, ...otherUpdates] : otherUpdates;
  }, [dedupedUpdates, planUpdate]);

  const sourceGroups = React.useMemo(() => {
    const webSources = dedupedUpdates
      .filter((u) => {
        // Check for web results in various places based on how data is structured
        const hasWebResults = (u.data?.results && u.data.results.length > 0) ||
          (u.results && u.results.length > 0);
        return u.status === 'completed' && hasWebResults;
      })
      .flatMap((u) => u.data?.results || u.results || []);

    const analysisResults = dedupedUpdates
      .filter((u) => {
        // Check for analysis data in various places
        const isAnalysis = u.data?.analysisType || u.analysisType ||
          u.id === 'gap-analysis' || u.id === 'final-synthesis' ||
          u.id?.startsWith('analysis-');
        return isAnalysis && u.status === 'completed';
      })
      .map((u) => ({
        type: u.data?.analysisType || u.analysisType ||
          (u.id === 'gap-analysis' ? 'gaps' :
            u.id === 'final-synthesis' ? 'synthesis' : 'Analysis'),
        findings: u.data?.findings || u.findings || [],
        gaps: u.data?.gaps || u.gaps,
        recommendations: u.data?.recommendations || u.recommendations,
        uncertainties: u.data?.uncertainties || u.uncertainties,
      }));

    return {
      web: webSources,
      analysis: analysisResults,
    };
  }, [dedupedUpdates]);

  const finalSynthesisDone = React.useMemo(() => {
    return dedupedUpdates.some(
      (u) => u.id === 'final-synthesis' && u.status === 'completed'
    );
  }, [dedupedUpdates]);

  const { activeArtifact: artifact, artifactsState } = useArtifactsContext();

  const isArtifactVisible = artifactsState.isVisible;

  // Convert updates to timeline step props - trust the backend status
  console.log('[DeepResearch] Timeline steps:', sortedUpdates, { isComplete });

  return (
    <div className="space-y-4 mx-auto w-full my-4">
      <TimelineCover
        showToggle={finalUpdates.length === 0 ? false : sortedUpdates.length > 3}
        defaultShowAll={false}
        maxItemsWhenCollapsed={3}
      >
        {finalUpdates.length === 0 ? (
          // Show initial state with consistent styling
          <TimelineStep
            id="initializing"
            title="Initializing Deep Research"
            description={input?.topic ? `Researching: ${input.topic}` : 'Preparing research...'}
            status="running"
            timestamp={Date.now()}
            icon={<Loader2 className="h-4 w-4 animate-spin" />}
            type="tool-result"
            position="only"
          />
        ) : (
          sortedUpdates.map((update, index) => {
            const stepProps = convertStreamUpdateToTimelineStepProps(update);
            // Determine position for proper connector rendering
            const position = sortedUpdates.length === 1
              ? "only"
              : index === 0
                ? "first"
                : index === sortedUpdates.length - 1
                  ? "last"
                  : "middle";

            return (
              <TimelineStep
                key={stepProps.id}
                {...stepProps}
                position={position}
              />
            );
          })
        )}
      </TimelineCover>

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
      ${isArtifactVisible
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
                    finalUpdates.some(
                      (u: StreamUpdate) => u.id === 'gap-analysis' && u.status === 'running'
                    ) ||
                    finalUpdates.some(
                      (u: StreamUpdate) => u.id === 'final-synthesis' && u.status === 'running'
                    ) ? (
                    <div className="space-y-1.5">
                      {sourceGroups.analysis
                        .filter(
                          (a) => a.type !== 'gaps' && a.type !== 'synthesis'
                        )
                        .map((analysis, i) => (
                          <div
                            key={i}
                            className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden"
                          >
                            <Accordion
                              type="single"
                              collapsible
                              className="w-full"
                            >
                            <AccordionItem
                              value={`analysis-${i}`}
                              className="border-none"
                            >
                              <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
                                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                    {analysis.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/50">
                                <div className="space-y-2">
                                  {analysis.findings.map((finding: any, j: number) => (
                                    <div key={j} className="flex items-start gap-2">
                                      <span className="text-neutral-400 mt-0.5">•</span>
                                      <div className="flex-1">
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                          {finding.insight}
                                        </p>
                                        {finding.evidence && finding.evidence.length > 0 && (
                                          <div className="mt-1.5 ml-3 space-y-1">
                                            {finding.evidence.map(
                                              (evidence: any, k: number) => (
                                                <p
                                                  key={k}
                                                  className="text-xs text-neutral-500 italic"
                                                >
                                                  → {evidence}
                                                </p>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                            </Accordion>
                          </div>
                        ))}

                      {sourceGroups.analysis.find((a) => a.type === 'gaps') && (
                        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                          >
                            <AccordionItem value="gaps" className="border-none">
                              <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Search className="h-3.5 w-3.5 text-neutral-500" />
                                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                    Research Gaps and Limitations
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/50">
                                <div className="space-y-2">
                                  {sourceGroups.analysis
                                    .find((a) => a.type === 'gaps')
                                    ?.findings.map((finding: any, j: number) => (
                                      <div key={j} className="flex items-start gap-2">
                                        <span className="text-neutral-400 mt-0.5">•</span>
                                        <div className="flex-1">
                                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                            {finding.insight}
                                          </p>
                                          {finding.evidence && finding.evidence.length > 0 && (
                                            <div className="mt-1.5 ml-3 space-y-1">
                                              {finding.evidence.map(
                                                (solution: any, k: number) => (
                                                  <p
                                                    key={k}
                                                    className="text-xs text-neutral-500 italic"
                                                  >
                                                    → {solution}
                                                  </p>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                  {sourceGroups.analysis
                                    .find((a) => a.type === 'gaps')
                                    ?.gaps?.map((gap: any, j: number) => (
                                      <div key={j} className="flex items-start gap-2">
                                        <span className="text-neutral-400 mt-0.5">•</span>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                            {gap.topic}
                                          </p>
                                          <p className="text-xs text-neutral-500 mt-0.5">
                                            {gap.reason}
                                          </p>
                                          {gap.additional_queries && gap.additional_queries.length > 0 && (
                                            <div className="mt-1.5 ml-3 space-y-1">
                                              {gap.additional_queries.map(
                                                (query: any, k: number) => (
                                                  <p
                                                    key={k}
                                                    className="text-xs text-neutral-500 italic"
                                                  >
                                                    → {query}
                                                  </p>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      )}

                      {sourceGroups.analysis.find(
                        (a) => a.type === 'synthesis'
                      ) && (
                          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
                            <Accordion
                              type="single"
                              collapsible
                              className="w-full"
                            >
                              <AccordionItem
                                value="synthesis"
                                className="border-none"
                              >
                                <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
                                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                      Final Research Synthesis
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/50">
                                <div className="grid gap-2.5">
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                      Key Findings
                                    </h4>
                                    <div className="space-y-2">
                                      {sourceGroups.analysis
                                        .find((a) => a.type === 'synthesis')
                                        ?.findings.map((finding: any, j: number) => (
                                          <div key={j} className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            <div className="flex-1">
                                              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                                {finding.insight}
                                              </p>
                                              {finding.evidence && finding.evidence.length > 0 && (
                                                <div className="mt-1.5 ml-3 space-y-1">
                                                  {finding.evidence.map(
                                                    (evidence: any, k: number) => (
                                                      <p
                                                        key={k}
                                                        className="text-xs text-neutral-500 italic"
                                                      >
                                                        → {evidence}
                                                      </p>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>

                                  {sourceGroups.analysis.find(
                                    (a) => a.type === 'synthesis'
                                  )?.uncertainties && (
                                      <div className="space-y-2">
                                        <h4 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                          Remaining Uncertainties
                                        </h4>
                                        <div className="space-y-2">
                                          {sourceGroups.analysis
                                            .find((a) => a.type === 'synthesis')
                                            ?.uncertainties?.map(
                                              (uncertainty: any, j: number) => (
                                                <div key={j} className="flex items-start gap-2">
                                                  <span className="text-neutral-400 mt-0.5">•</span>
                                                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
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
                                        <h4 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                          Recommendations
                                        </h4>
                                        <div className="space-y-2">
                                          {sourceGroups.analysis
                                            .find((a) => a.type === 'synthesis')
                                            ?.recommendations?.map((rec: any, j: number) => (
                                              <div key={j} className="flex items-start gap-2">
                                                <span className="text-primary mt-0.5">→</span>
                                                <div className="flex-1">
                                                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                                    {rec.action}
                                                  </p>
                                                  <p className="text-xs text-neutral-500 mt-0.5">
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
                          </div>
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

export { DeepResearch as DeepResearchMain };
export default DeepResearch;