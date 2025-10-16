'use client';

import {
  Search,
  Database,
  FileText,
  Sparkles,
  Loader2,
  FileSearch,
  FolderSearch,
  HardDrive,
} from 'lucide-react';
import React from 'react';
import type { TimelineStep } from '@/components/timeline/types';

export interface SharePointStreamUpdate {
  id: string;
  type: 'plan' | 'database' | 'semantic' | 'metadata' | 'combine' | 'progress' | 'status' | 'result' | 'error';
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
  title?: string;
  message?: string;
  data?: {
    type?: string;
    query?: string;
    searchMode?: string;
    depth?: string;
    resultCount?: number;
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
      sizeInBytes: number;
      source: 'database' | 'semantic';
    }>;
    totalResults?: number;
    uniqueDocuments?: number;
  };
  progress?: {
    current: number;
    total: number;
    percentage?: number;
  };
  overwrite?: boolean;
}

// Convert StreamUpdate to TimelineStep format
const convertStreamUpdateToTimelineStep = (update: SharePointStreamUpdate): TimelineStep => {
  const dataType = update.data?.type || update.type;
  
  // Map update types to icons
  const icons = {
    plan: <Search className="h-4 w-4" />,
    database: <Database className="h-4 w-4" />,
    semantic: <FileSearch className="h-4 w-4" />,
    metadata: <HardDrive className="h-4 w-4" />,
    combine: <FolderSearch className="h-4 w-4" />,
    progress: <Loader2 className="h-4 w-4 animate-spin" />,
    status: <Loader2 className="h-4 w-4 animate-spin" />,
    result: <FileText className="h-4 w-4" />,
    error: <Sparkles className="h-4 w-4" />,
  } as const;

  let icon = icons[dataType as keyof typeof icons] || icons.status;
  
  // Override with spinning loader for running states
  if (update.status === 'running') {
    icon = <Loader2 className="h-4 w-4 animate-spin" />;
  }

  // Build children for expandable content
  const children: TimelineStep[] = [];

  // Add results as children if available
  if (update.data?.results && update.data.results.length > 0) {
    update.data.results.slice(0, 5).forEach((result, idx) => {
      children.push({
        id: `${update.id}-result-${idx}`,
        title: result.title,
        status: 'completed',
        timestamp: update.timestamp || Date.now(),
        type: 'unified',
        message: `Score: ${result.score.toFixed(2)} | ${result.content.substring(0, 100)}...`,
        icon: <FileText className="h-4 w-4" />,
        small: true,
      });
    });
  }

  let badgeText = undefined;
  if (update.data?.resultCount && update.data.resultCount > 0) {
    badgeText = `${update.data.resultCount} results`;
  } else if (update.progress) {
    badgeText = `${update.progress.percentage || 0}%`;
  }

  return {
    id: update.id,
    title: update.title || dataType || 'Processing',
    message: update.message || '',
    status: update.status === 'completed' ? 'completed' : 
            update.status === 'running' ? 'running' : 
            update.status === 'failed' ? 'error' : 'pending',
    timestamp: update.timestamp || Date.now(),
    icon: icon,
    badgeText: badgeText,
    children: children.length > 0 ? children : undefined,
    data: update
  };
};

interface SharePointRetrieveProps {
  toolCallId: string;
  input?: {
    query: string;
    topK?: number;
    searchMode?: 'semantic' | 'filename' | 'hybrid';
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
  updates?: SharePointStreamUpdate[];
}

const SharePointRetrieve = ({ toolCallId, input, output, state, message, updates }: SharePointRetrieveProps) => {

  // Extract updates from various sources
  const streamUpdates = React.useMemo(() => {
    // First check direct updates prop
    if (updates && updates.length > 0) return updates;
    
    // Check for accumulated updates in output (using deep_research_updates format from standard-tool)
    if ((output?.type === 'sharepoint_retrieve_updates' || output?.type === 'deep_research_updates') && output?.allUpdates) {
      return output.allUpdates;
    }
    
    // Then check output data
    if (output?.data?.updates) return output.data.updates;
    if (output?.updates) return output.updates;
    
    // Check message annotations
    if (message?.annotations) {
      const retrieveUpdates = message.annotations
        .filter((a: any) => 
          a.type === 'sharepoint_update' || 
          a.type === 'tool_update' || 
          (a.tool === 'sharepoint_retrieve' && a.data)
        )
        .map((a: any) => a.data);
      if (retrieveUpdates.length > 0) return retrieveUpdates;
    }
    
    // Check if message has content parts with updates
    if (message?.content && Array.isArray(message.content)) {
      const toolParts = message.content.filter((part: any) => 
        part.type === 'tool-result' && 
        part.toolName === 'sharepoint_retrieve' &&
        Array.isArray(part.result)
      );
      
      if (toolParts.length > 0) {
        const extractedUpdates: any[] = [];
        for (const part of toolParts) {
          if (Array.isArray(part.result)) {
            for (const item of part.result) {
              if (item?.type === 'sharepoint_update' && item?.data) {
                extractedUpdates.push(item.data);
              } else if ((item?.type === 'sharepoint_retrieve_updates' || item?.type === 'deep_research_updates') && item?.allUpdates) {
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
  
  const dedupedUpdates = React.useMemo(() => {
    const updateMap = new Map<string, SharePointStreamUpdate>();

    const sortedUpdates = [...streamUpdates].sort(
      (a: SharePointStreamUpdate, b: SharePointStreamUpdate) => (a.timestamp || 0) - (b.timestamp || 0)
    );

    sortedUpdates.forEach((u: SharePointStreamUpdate) => {
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
  }, [streamUpdates]);

  const sortedUpdates = React.useMemo(() => {
    return dedupedUpdates
      .filter((u) => u.id !== 'search-progress')
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [dedupedUpdates]);

  const resultGroups = React.useMemo(() => {
    type ResultItem = {
      title: string;
      url: string;
      content: string;
      score: number;
      sizeInBytes: number;
      source: 'database' | 'semantic';
    };
    
    const allResults: ResultItem[] = [];
    
    dedupedUpdates
      .filter(u => u.data?.results && u.data.results.length > 0)
      .forEach(u => {
        if (u.data?.results) {
          allResults.push(...u.data.results);
        }
      });

    const databaseResults = allResults.filter(r => r.source === 'database');
    const semanticResults = allResults.filter(r => r.source === 'semantic');

    return {
      all: allResults,
      database: databaseResults,
      semantic: semanticResults,
    };
  }, [dedupedUpdates]);

  const isSearchComplete = React.useMemo(() => {
    return dedupedUpdates.some(
      (u) => u.id === 'search-progress' && u.status === 'completed'
    ) || dedupedUpdates.some(
      (u) => u.id === 'combine-results' && u.status === 'completed'
    );
  }, [dedupedUpdates]);

  // Convert updates to timeline steps and add a final results step
  const timelineSteps = React.useMemo(() => {
    // Handle initial state
    if (streamUpdates.length === 0) {
      return [{
        id: 'initializing',
        title: 'Initializing SharePoint Search',
        message: input?.query ? `Searching for: ${input.query}` : 'Preparing search...',
        status: 'running' as const,
        timestamp: Date.now(),
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      }];
    }

    const steps = sortedUpdates.map(convertStreamUpdateToTimelineStep);
    
    // Add a final step with all the results if search is complete
    if (isSearchComplete && resultGroups.all.length > 0) {
      const resultsStep: TimelineStep = {
        id: 'search-results',
        title: 'Search Results',
        message: `Found ${resultGroups.all.length} total results (${resultGroups.database.length} database, ${resultGroups.semantic.length} semantic)`,
        status: 'completed',
        timestamp: Date.now(),
        icon: <FileText className="h-4 w-4" />,
        badgeText: `${resultGroups.all.length} results`,
        children: [
          ...resultGroups.database.slice(0, 5).map((result, idx) => ({
            id: `db-result-${idx}`,
            title: result.title,
            status: 'completed' as const,
            timestamp: Date.now(),
            type: 'unified' as const,
            message: result.content.substring(0, 150) + '...',
            icon: <Database className="h-3 w-3 text-blue-500" />,
            small: true,
            badgeText: `Score: ${result.score.toFixed(2)}`,
          })),
          ...resultGroups.semantic.slice(0, 5).map((result, idx) => ({
            id: `sem-result-${idx}`,
            title: result.title,
            status: 'completed' as const,
            timestamp: Date.now(),
            type: 'unified' as const,
            message: result.content.substring(0, 150) + '...',
            icon: <FileSearch className="h-3 w-3 text-green-500" />,
            small: true,
            badgeText: `Score: ${result.score.toFixed(2)}`,
          }))
        ]
      };
      steps.push(resultsStep);
    }
    
    return steps;
  }, [streamUpdates, sortedUpdates, isSearchComplete, resultGroups, input]);

  return (
    <div className="w-full">
      <div className="space-y-2">
        {timelineSteps.map((step, index) => (
          <div key={step.id || index} className="p-3 border border-gray-200 rounded">
            <h3 className="font-medium">{step.title}</h3>
            {step.message && <p className="text-sm text-gray-600">{step.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export { SharePointRetrieve as SharePointRetrieveMain };
export default SharePointRetrieve;