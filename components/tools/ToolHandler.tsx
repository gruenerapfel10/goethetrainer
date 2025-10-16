'use client';

import React, { memo } from 'react';
import { ToolName } from '@/lib/ai/tools/tool-registry';

// Import existing tool components
import { WebSearch } from './WebSearch';
import { DeepResearchMain as DeepResearch } from './DeepResearch/DeepResearchMain';
import { ImageGeneration } from './ImageGeneration/index';
import { DocumentCreate } from './DocumentCreate';
import { DocumentUpdate } from './DocumentUpdate';
import { ScrapeResults } from '../scrape-results';
import { ExtractMain } from './Extract/ExtractMain';
import { Weather } from '../weather';
import ChartRenderer from '../chart-renderer';
import { TimelineStep } from '../timeline/components/timeline-step';
import { RunSqlPreview } from '../sql/run-sql-preview';
import { AlertCircleIcon } from 'lucide-react';
import Image from 'next/image';

interface ToolHandlerProps {
  toolName: string;
  toolCallId: string;
  state: string;
  input?: any;
  output?: any;
  error?: any;
  message?: any; // For annotations
  position?: "first" | "middle" | "last" | "only";
}


export const ToolHandler = memo<ToolHandlerProps>(({
  toolName,
  toolCallId,
  state,
  input,
  output,
  error,
  message,
  position
}) => {
  const { useArtifactsContext } = require('@/contexts/artifacts-context');
  const { createArtifact, setArtifactsVisible } = useArtifactsContext?.() || {};

  // Map v5 states to simpler flags
  const isLoading = state === 'input-available' || state === 'input-streaming';
  const isComplete = state === 'output-available';
  const isError = state === 'output-error' || error;


  if (toolName === ToolName.SHAREPOINT_RETRIEVE) {
    console.log("*** SharePoint output:", {
      toolName,
      isComplete,
      outputType: typeof output,
      outputIsArray: Array.isArray(output),
      outputDocs: output?.documents,
      outputDocsIsArray: Array.isArray(output?.documents),
      firstDoc: output?.documents?.[0]
    });
  }

  // Handle tools by name
  switch (toolName) {
    case ToolName.DEEP_RESEARCH:
      // Extract streaming updates from annotations
      const deepResearchUpdates = message?.annotations
        ?.filter((a: any) => 
          a.type === 'research_update' || 
          a.type === 'tool_update' || 
          a.type === 'deep_research' ||
          (a.tool === 'deep_research' && a.data)
        )
        .map((a: any) => a.data) || [];
      
      // Handle both streaming updates and final output
      let researchUpdates = deepResearchUpdates;
      if (deepResearchUpdates.length === 0 && output) {
        // Check if output has the new format with updates
        if (output.type === 'deep_research_updates' && output.allUpdates) {
          researchUpdates = output.allUpdates;
        } else if (output.updates && Array.isArray(output.updates)) {
          researchUpdates = output.updates;
        } else if (output.data?.updates) {
          researchUpdates = output.data.updates;
        } else if (Array.isArray(output)) {
          researchUpdates = output;
        } else {
          researchUpdates = [];
        }
      }
      
      return (
        <DeepResearch
          toolCallId={toolCallId}
          input={input}
          output={output}
          state={state}
          message={message}
          updates={researchUpdates}
        />
      );
    case ToolName.SEARCH:
      return (
        <WebSearch
          toolCallId={toolCallId}
          input={input}
          output={output}
          state={state as any}
        />
      );

    case ToolName.EXTRACT:
      return (
        <ExtractMain
          toolCallId={toolCallId}
          input={input}
          output={output}
          state={state}
          message={message}
        />
      );

    case ToolName.SCRAPE:
      if (isLoading) {
        return (
          <ScrapeResults
            url={input?.url || ''}
            data=""
            isLoading={true}
          />
        );
      }
      if (isComplete) {
        return (
          <ScrapeResults
            url={input?.url || ''}
            data={output?.data}
            isLoading={false}
          />
        );
      }
      break;

    case ToolName.CHART:
      if (isLoading) {
        return (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border border-muted-foreground border-t-transparent" />
            <span>Generating chart...</span>
          </div>
        );
      }
      if (isComplete) {
        if (output?.success && output?.chartConfig) {
          return <ChartRenderer config={output.chartConfig} />;
        }
        if (output?.error || isError) {
          return (
            <div className="flex items-center gap-2 p-2 text-sm text-destructive bg-destructive/5 rounded">
              <AlertCircleIcon className="h-3 w-3" />
              <span>Chart generation failed: {output?.error || error}</span>
            </div>
          );
        }
      }
      break;

    case ToolName.GET_WEATHER:
      if (isLoading) {
        return <Weather />;
      }
      if (isComplete) {
        return <Weather weatherAtLocation={output} />;
      }
      break;

    case ToolName.GENERATE_IMAGE:

      return (
        <ImageGeneration
          toolCallId={toolCallId}
          state={isComplete ? 'output-available' : isError ? 'output-error' : 'input-available'}
          input={input}
          output={output}
          error={error}
        />
      );

    case ToolName.TEXT2SQL:
      const wrenUpdates = message?.annotations
        ?.filter((a: any) => a.type === 'wren_update' && a.toolCallId === toolCallId)
        .map((a: any) => a.data) || [];
      return (
       <div></div>
      );

    case ToolName.RUN_SQL:
      if (isComplete) {
        return <RunSqlPreview result={output} />;
      }
      break;

    case ToolName.REQUEST_SUGGESTIONS:
      // REQUEST_SUGGESTIONS no longer handled here - should be processed elsewhere
      return null;

    case ToolName.SHAREPOINT_RETRIEVE:
      const sharePointIconParams = {
        src: "/sharepoint.svg",
        alt: "SharePoint",
        width: 6,
        height: 6,
        className: "w-6 h-6"
      };

      // Handle different states properly
      const searchQuery = input?.query || output?.query || "";
      let description = searchQuery 
        ? `Searching for "${searchQuery}" across knowledgebases...`
        : "Searching SharePoint documents...";
      let status = "running";  // Changed from "in-progress" to "running" for timeline compatibility
      let outputData: any[] = [];

      if (isComplete && Array.isArray(output?.documents)) {
        outputData = output.documents;
        description = searchQuery
          ? `Found ${outputData.length} documents for "${searchQuery}"`
          : `Found ${outputData.length} documents`;
        status = "completed";
      } else if (isComplete && Array.isArray(output)) {
        outputData = output;
        description = searchQuery
          ? `Found ${outputData.length} documents for "${searchQuery}"`
          : `Found ${outputData.length} documents`;
        status = "completed";
      } else if (isError) {
        description = "Error retrieving documents";
        status = "error";
      }

      // Disabled: Click to trigger artifacts
      // const handleDocumentClick = (data?: Record<string, any>) => {
      //   if (!data || !createArtifact || !setArtifactsVisible) return;
      //   
      //   const fileExt = data.title?.split('.').pop()?.toLowerCase();
      //   let kind: 'pdf' | 'docx' | 'xlsx' | 'csv' | null = null;
      //   
      //   if (fileExt === 'pdf') kind = 'pdf';
      //   else if (fileExt === 'docx') kind = 'docx';
      //   else if (fileExt === 'xlsx' || fileExt === 'xls') kind = 'xlsx';
      //   else if (fileExt === 'csv') kind = 'csv';
      //   
      //   if (!kind) return;
      //   
      //   createArtifact({
      //     documentId: `sharepoint-${data.url}`,
      //     kind,
      //     title: data.title,
      //     content: data.url,
      //   });
      //   setArtifactsVisible(true);
      // };

      return (
        <TimelineStep
          id={`sharepoint-${toolCallId}`}
          title="SharePoint Document Retrieval"
          description={description}
          status={status as any}
          timestamp={Date.now()}
          iconParams={sharePointIconParams}
          position={position}
        >
          {outputData.length > 0 ? outputData.map((doc: any, index: number) => (
            <TimelineStep
              key={doc.id || index}
              id={doc.id || `sharepoint-child-${index}`}
              title={doc.title || "Unknown Document"}
              description={doc.content || doc.message || `Score: ${doc.score || 0} | Size: ${doc.sizeInBytes ? (doc.sizeInBytes / 1024).toFixed(1) + ' KB' : 'Unknown'}`}
              status="completed"
              timestamp={Date.now()}
              iconParams={sharePointIconParams}
              badgeText={doc.score ? `${(doc.score * 100).toFixed(0)}%` : undefined}
              data={doc}
              type="tool-result"
              // onClick={handleDocumentClick}
            />
          )) : undefined}
        </TimelineStep>
      );

    case ToolName.CREATE_DOCUMENT:
      return (
        <DocumentCreate
          toolCallId={toolCallId}
          state={isComplete ? 'output-available' : isError ? 'output-error' : 'input-available'}
          input={input}
          output={output}
          error={error}
          message={message}
        />
      );

    case ToolName.UPDATE_DOCUMENT:
      return (
        <DocumentUpdate
          toolCallId={toolCallId}
          state={isComplete ? 'output-available' : isError ? 'output-error' : 'input-available'}
          input={input}
          output={output}
          error={error}
          message={message}
        />
      );

  }

  return null;
});

ToolHandler.displayName = 'ToolHandler';