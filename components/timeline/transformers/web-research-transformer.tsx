import type { TimelineStep } from "../types";
import { FileText, Loader2, Search, Sparkles } from "lucide-react";

// Transform web research updates to timeline steps
export function transformWebResearchToTimeline(updates: any[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const processedIds = new Set<string>();

  // Sort updates by timestamp
  const sortedUpdates = [...updates].sort((a, b) => a.timestamp - b.timestamp);

  sortedUpdates.forEach(update => {
    // Skip if already processed or if it's a progress update
    if (processedIds.has(update.id) || update.id === 'research-progress') {
      return;
    }

    processedIds.add(update.id);

    // Base step properties
    const baseStep: Partial<TimelineStep> = {
      id: update.id,
      timestamp: update.timestamp,
      status: update.status === 'completed' ? 'completed' : 
              update.status === 'failed' ? 'error' : 
              update.status === 'running' ? 'running' : 'pending',
    };

    switch (update.type) {
      case 'plan':
        steps.push({
          ...baseStep,
          title: update.title || 'Research Plan',
          message: update.message || 'Planning research strategy',
          icon: <Search className="h-4 w-4" />,
          data: {
            plan: update.plan,
            advancedSteps: update.advancedSteps,
          },
          children: update.plan ? [
            ...update.plan.search_queries.map((query: any, idx: number) => ({
              id: `${update.id}-query-${idx}`,
              title: query.query,
              message: query.rationale,
              status: 'pending' as const,
              timestamp: update.timestamp,
              badgeText: query.source,
              small: true,
            })),
            ...update.plan.required_analyses.map((analysis: any, idx: number) => ({
              id: `${update.id}-analysis-${idx}`,
              title: analysis.description,
              message: `Importance: ${analysis.importance}`,
              status: 'pending' as const,
              timestamp: update.timestamp,
              badgeText: analysis.type,
              small: true,
            }))
          ] : [],
        } as TimelineStep);
        break;

      case 'web': {
        const results = update.results || [];
        steps.push({
          ...baseStep,
          title: update.title || 'Web Search',
          message: update.message || `Found ${results.length} results`,
          icon: <FileText className="h-4 w-4" />,
          data: {
            query: update.query,
            source: update.source,
            results: results,
          },
          children: results.slice(0, 3).map((result: any, idx: number) => ({
            id: `${update.id}-result-${idx}`,
            title: result.title,
            message: result.content,
            status: 'completed' as const,
            timestamp: update.timestamp,
            data: { url: result.url },
            small: true,
          })),
        } as TimelineStep);
        break;
      }

      case 'analysis': {
        const findings = update.findings || [];
        steps.push({
          ...baseStep,
          title: update.title || 'Analysis',
          message: update.message || `${update.analysisType || 'Analyzing data'}`,
          icon: <Sparkles className="h-4 w-4" />,
          data: {
            analysisType: update.analysisType,
            findings: findings,
            gaps: update.gaps,
            recommendations: update.recommendations,
            uncertainties: update.uncertainties,
          },
          children: findings.slice(0, 3).map((finding: any, idx: number) => ({
            id: `${update.id}-finding-${idx}`,
            title: finding.insight,
            message: finding.evidence.join(' • '),
            status: 'completed' as const,
            timestamp: update.timestamp,
            badgeText: `${Math.round(finding.confidence * 100)}%`,
            small: true,
          })),
        } as TimelineStep);
        break;
      }

      case 'progress':
        if (update.id !== 'research-progress') {
          steps.push({
            ...baseStep,
            title: 'Progress Update',
            message: update.message,
            icon: <Loader2 className="h-4 w-4 animate-spin" />,
            data: {
              completedSteps: update.completedSteps,
              totalSteps: update.totalSteps,
              isComplete: update.isComplete,
            },
          } as TimelineStep);
        }
        break;

      default:
        // Handle gap-search and other special cases
        if (update.id.startsWith('gap-search')) {
          steps.push({
            ...baseStep,
            title: 'Gap Analysis Search',
            message: update.message,
            icon: <Search className="h-4 w-4" />,
            data: update,
          } as TimelineStep);
        } else if (update.id === 'gap-analysis') {
          steps.push({
            ...baseStep,
            title: 'Research Gaps & Limitations',
            message: update.message || 'Identifying knowledge gaps',
            icon: <Search className="h-4 w-4" />,
            data: {
              gaps: update.gaps,
              findings: update.findings,
            },
            children: update.gaps?.map((gap: any, idx: number) => ({
              id: `${update.id}-gap-${idx}`,
              title: gap.topic,
              message: gap.reason,
              status: 'completed' as const,
              timestamp: update.timestamp,
              small: true,
            })),
          } as TimelineStep);
        } else if (update.id === 'final-synthesis') {
          steps.push({
            ...baseStep,
            title: 'Final Research Synthesis',
            message: update.message || 'Synthesizing research findings',
            icon: <Sparkles className="h-4 w-4" />,
            badgeText: update.isComplete ? 'Complete' : undefined,
            data: {
              findings: update.findings,
              recommendations: update.recommendations,
              uncertainties: update.uncertainties,
              isComplete: update.isComplete,
            },
          } as TimelineStep);
        }
        break;
    }
  });

  return steps;
}