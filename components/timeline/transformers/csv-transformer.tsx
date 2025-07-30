"use client"

import type { TimelineStep } from "../types";
import { Database, FileText, ArrowRight } from "lucide-react";
import { AlertCircle, BarChart3 } from "lucide-react";
import React from "react";

/**
 * Transform CSV query results into timeline steps
 */
export function csvTransformer(result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] {
  if (!result.success) {
    return [{
      id: `${updateId}-error`,
      title: 'CSV Query Error',
      message: result.error || 'Unknown error occurred',
      status: 'error' as const,
      timestamp,
      icon: <AlertCircle className="h-6 w-6" />
    }];
  }
  
  const naturalLanguageQuery = toolArgs?.query || 'Unknown query';
  const sqlQuery = result.query || 'Unknown SQL';
  const tableName = toolArgs?.tableName || 'Unknown table';
  const recordCount = Array.isArray(result.result) ? result.result.length : 0;
  
  // If no results, return an empty results indicator
  if (recordCount === 0) {
    return [{
      id: `${updateId}-no-results`,
      title: 'No Results Found',
      message: `No records found for query: "${naturalLanguageQuery}"`,
      status: 'completed' as const,
      timestamp,
      icon: <BarChart3 className="h-6 w-6" />
    }];
  }

  const timelineSteps: TimelineStep[] = [];
  
  // Add SQL query as first step
  timelineSteps.push({
    id: `${updateId}-sql-query`,
    title: 'Generated SQL Query',
    message: sqlQuery,
    status: 'completed' as const,
    timestamp: timestamp,
    icon: <Database className="h-6 w-6" />,
    badgeText: `Table: ${tableName}`,
    type: 'unified' as const
  });

  // Add sample results as individual steps
  if (Array.isArray(result.result) && result.result.length > 0) {
    const sampleResults = result.result.slice(0, 5).map((record: any, index: number) => ({
      id: `${updateId}-record-${index}`,
      title: `Record ${index + 1}`,
      message: typeof record === 'object' ? Object.keys(record).join(', ') : String(record),
      status: 'completed' as const,
      timestamp: timestamp + 1 + index,
      icon: <FileText className="h-6 w-6" />,
      children: typeof record === 'object' ? Object.entries(record).slice(0, 3).map(([key, value]) => ({
        id: `${updateId}-record-${index}-${key}`,
        title: key,
        message: String(value),
        status: 'completed' as const,
        timestamp: timestamp + 1 + index + 1,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      })) : []
    }));

    timelineSteps.push(...sampleResults);

    if (result.result.length > 5) {
      timelineSteps.push({
        id: `${updateId}-more-records`,
        title: `... ${result.result.length - 5} more records`,
        message: 'Additional records not shown',
        status: 'completed' as const,
        timestamp: timestamp + 10,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      });
    }
  }
  
  return timelineSteps;
}