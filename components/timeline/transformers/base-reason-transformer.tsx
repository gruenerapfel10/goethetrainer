"use client"

import type { TimelineStep, ReasonStreamUpdate } from "../types";
import { getToolDisplayName } from "@/lib/ai/tools";
import { AlertCircle } from "lucide-react";
import { ToolIcon } from "@/components/ui/tool-icon";
import React from "react";
import { csvTransformer } from "./csv-transformer";
import { sharepointRetrieveTransformer, sharepointListTransformer } from "./sharepoint-transformer";
import { chartTransformer} from "./chart-transformer";

/**
 * Transform a stream update into a timeline step
 */
export function transformReasonStreamUpdate(update: ReasonStreamUpdate, existingStep?: TimelineStep): TimelineStep | undefined {
  if (update.type === 'cost_update') return undefined;

  const baseStep = {
    id: update.id,
    timestamp: update.timestamp,
    status: update.status === 'failed' ? 'error' as const : 
            update.status === 'running' ? 'running' as const : 'completed' as const
  };

  switch (update.type) {
    case 'text-delta':
      return {
        ...(existingStep || {}),
        ...baseStep,
        type: 'unified' as const,
        title: 'Agent Reasoning',
        message: (existingStep?.message || '') + update.message,
        icon: null,
        small: true
      };

    case 'tool-call': {
      const toolName = update.details?.toolName || 'unknown';
      // Store tool arguments for later use by tool-result
      return {
        ...baseStep,
        title: `Calling: ${getToolDisplayName(toolName)}`,
        message: update.message,
        icon: <ToolIcon toolName={toolName} className="size-6" />,
        status: 'running' as const,
        data: { 
          ...update.details || {},
          toolArgs: update.details?.args // Store args for tool-result processing
        }
      };
    }

    case 'tool-result': {
      const resultToolName = update.details?.toolName;
      const result = update.details?.result;
      
      // Use standardized transformers
      const normalizedToolName = resultToolName?.replace(/_(v1|v2)$/, '');
      
      // Import tool transformers dynamically to avoid circular dependencies
      const toolTransformers = {
          csv_query: csvTransformer,
          sharepoint_retrieve: sharepointRetrieveTransformer,
          sharepoint_list: sharepointListTransformer,
          chart: chartTransformer,
      };
      const transformer = toolTransformers[normalizedToolName as keyof typeof toolTransformers];
      
      if (transformer && result) {
        // Try to get tool arguments from the corresponding tool-call
        const toolArgs = update.details?.toolArgs || existingStep?.data?.toolArgs;
        const children = transformer(result, update.id, update.timestamp, toolArgs);
        const hasError = children.some(child => child.status === 'error');
        
        // Create badge text based on tool type
        let badgeText = undefined;
        if (resultToolName === 'sharepoint_retrieve') {
          const documents = result?.data || [];
          if (Array.isArray(documents) && documents.length > 0) {
            badgeText = `${documents.length} documents`;
          }
        } else if (resultToolName === 'csv_query') {
          const records = result?.result || [];
          if (Array.isArray(records) && records.length > 0) {
            badgeText = `${records.length} records`;
          }
        }
      
        return {
          ...baseStep,
          title: `${getToolDisplayName(resultToolName)} Results`,
          // Use the detailed message from reason.ts if available, otherwise use transformer-generated message
          message: update.message || (hasError ? 'Operation failed' : 
                   children.length > 0 ? children[0].message || 'Operation completed successfully' : 'Operation completed successfully'),
          icon: <ToolIcon toolName={resultToolName} className="size-6" />,
          status: hasError ? 'error' as const : 'completed' as const,
          type: 'tool-result' as const,
          badgeText,
          children,
          data: { toolArgs }
        };
      }
      
      // Fallback for unknown tools - use the detailed message from reason.ts
      return {
        ...baseStep,
        title: resultToolName ? `${getToolDisplayName(resultToolName)} Results` : 'Tool Results',
        message: update.message || 'Operation completed successfully',
        icon: <ToolIcon toolName={resultToolName} className="size-6" />,
        type: 'tool-result' as const,
        data: update.details || {}
      };
    }

    case 'error':
      return {
        ...baseStep,
        title: `Error: ${update.details?.toolName ? getToolDisplayName(update.details.toolName) : 'Process Error'}`,
        message: update.message,
        status: 'error' as const,
        icon: <AlertCircle className="size-6" />,
        data: update.details || {}
      };

    default:
      return undefined;
  }
}