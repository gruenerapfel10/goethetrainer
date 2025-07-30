"use client"

import type { TimelineStep } from "../types";
import { AlertCircle, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import React from "react";

/**
 * Transform chart generation results into timeline steps
 */
export function chartTransformer(result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] {
  if (!result.success) {
    return [{
      id: `${updateId}-error`,
      title: 'Chart Generation Error',
      message: result.error || 'Failed to generate chart',
      status: 'error' as const,
      timestamp,
      icon: <AlertCircle className="h-6 w-6" />
    }];
  }
  
  const chartConfig = result.chartConfig;
  const metadata = result.metadata;
  
  const chartStep: TimelineStep = {
    id: `${updateId}-chart`,
    title: `${chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1)} Chart Created`,
    message: result.message || `Generated ${chartConfig.type} chart`,
    status: 'completed' as const,
    timestamp,
    icon: <BarChart3 className="h-6 w-6" />,
    badgeText: `${chartConfig.data.length} data points`,
    children: []
  };

  // Add chart details as children
  if (chartConfig.title) {
    chartStep.children?.push({
      id: `${updateId}-chart-title`,
      title: 'Chart Title',
      message: chartConfig.title,
      status: 'completed' as const,
      timestamp: timestamp + 1,
      icon: <ArrowRight className="h-6 w-6" />,
      type: 'unified' as const
    });
  }

  chartStep.children?.push({
    id: `${updateId}-chart-type`,
    title: 'Chart Type',
    message: chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1),
    status: 'completed' as const,
    timestamp: timestamp + 2,
    icon: <ArrowRight className="h-6 w-6" />,
    type: 'unified' as const
  });

  chartStep.children?.push({
    id: `${updateId}-chart-dimensions`,
    title: 'Dimensions',
    message: `${chartConfig.width}x${chartConfig.height}`,
    status: 'completed' as const,
    timestamp: timestamp + 3,
    icon: <ArrowRight className="h-6 w-6" />,
    type: 'unified' as const
  });

  // Add processing steps if available
  if (metadata?.processingSteps) {
    const processingStep: TimelineStep = {
      id: `${updateId}-processing`,
      title: 'Processing Steps',
      message: `Completed ${metadata.processingSteps.length} optimization steps`,
      status: 'completed' as const,
      timestamp: timestamp + 4,
      icon: <TrendingUp className="h-6 w-6" />,
      children: metadata.processingSteps.map((step: string, index: number) => ({
        id: `${updateId}-processing-${index}`,
        title: `Step ${index + 1}`,
        message: step,
        status: 'completed' as const,
        timestamp: timestamp + 5 + index,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      }))
    };
    
    return [processingStep, chartStep];
  }
  
  return [chartStep];
}