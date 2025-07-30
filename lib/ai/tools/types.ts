import { ReactNode } from 'react';

/**
 * Standardized format for timeline items that can be generated from tool results
 */
export interface TimelineResultItem {
  id: string;
  title: string;
  message?: string;
  status: 'completed' | 'running' | 'error' | 'pending';
  icon?: string; // Icon name that can be mapped to actual icons
  metadata?: Record<string, any>; // Additional data for display
  url?: string; // Optional URL for clickable items
  score?: number; // Optional relevance/confidence score
  children?: TimelineResultItem[]; // Nested items
}

/**
 * Standardized tool result format that includes timeline-ready results
 */
export interface StandardizedToolResult {
  // Core result data (tool-specific)
  data?: any;
  
  // Timeline display items (standardized)
  timelineItems?: TimelineResultItem[];
  
  // Summary information
  summary?: {
    message: string;
    itemCount?: number;
    successCount?: number;
    errorCount?: number;
  };
  
  // Error handling
  error?: string;
  
  // Cost tracking
  costInfo?: {
    toolName: string;
    modelId?: string;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number | null; // Allow null as calculateCost can return null
  };
  
  // Metadata for the timeline system
  metadata?: {
    toolName: string;
    executionTime?: number;
    resultType?: 'list' | 'analysis' | 'document' | 'query' | 'custom';
  };
}

/**
 * Helper type for tools that need to create timeline items from their results
 */
export interface TimelineItemBuilder {
  /**
   * Convert tool-specific results to standardized timeline items
   */
  buildTimelineItems(results: any[]): TimelineResultItem[];
  
  /**
   * Create a summary of the results
   */
  buildSummary(results: any[]): StandardizedToolResult['summary'];
}

/**
   * Utility functions for creating timeline items
   */
export const TimelineItemUtils = {
  /**
   * Create a document timeline item
   */
  createDocumentItem(doc: {
    id?: string;
    title: string;
    content?: string;
    url?: string;
    score?: number;
  }): TimelineResultItem {
    return {
      id: doc.id || `doc-${Date.now()}-${Math.random()}`,
      title: doc.title,
      message: doc.content ? doc.content.slice(0, 200) + (doc.content.length > 200 ? '...' : '') : undefined,
      status: 'completed',
      icon: 'document',
      url: doc.url,
      score: doc.score,
      metadata: {
        type: 'document',
        fullContent: doc.content,
      }
    };
  },

  /**
   * Create a knowledge base timeline item
   */
  createKnowledgeBaseItem(kb: {
    id: string;
    name: string;
    description?: string;
    status?: string;
  }): TimelineResultItem {
    return {
      id: `kb-${kb.id}`,
      title: kb.name,
      message: kb.description || 'No description available',
      status: 'completed',
      icon: 'database',
      metadata: {
        type: 'knowledge-base',
        kbId: kb.id,
        kbStatus: kb.status,
      }
    };
  },

  /**
   * Create a query result timeline item
   */
  createQueryResultItem(query: {
    id?: string;
    query: string;  
    results: any[];
    successful: boolean;
    error?: string;
    rowCount?: number;
  }): TimelineResultItem {
    return {
      id: query.id || `query-${Date.now()}-${Math.random()}`,
      title: query.successful ? `Query: ${query.query.slice(0, 50)}...` : `Failed Query: ${query.query.slice(0, 50)}...`,
      message: query.successful 
        ? `Retrieved ${query.rowCount || query.results.length} rows`
        : `Error: ${query.error}`,
      status: query.successful ? 'completed' : 'error',
      icon: 'database',
      metadata: {
        type: 'query-result',
        query: query.query,
        rowCount: query.rowCount || query.results.length,
        results: query.results,
      }
    };
  },

  /**
   * Create an analysis finding timeline item  
   */
  createAnalysisFindingItem(finding: {
    id?: string;
    insight: string;
    evidence: string[];
    confidence: number;
  }): TimelineResultItem {
    return {
      id: finding.id || `finding-${Date.now()}-${Math.random()}`,
      title: finding.insight,
      message: `Confidence: ${Math.round(finding.confidence * 100)}% | Evidence: ${finding.evidence.length} items`,
      status: 'completed',
      icon: 'lightbulb',
      score: finding.confidence,
      metadata: {
        type: 'analysis-finding',
        evidence: finding.evidence,
        confidence: finding.confidence,
      }
    };
  },

  /**
   * Create a generic list item
   */
  createGenericItem(item: {
    id?: string;
    title: string;
    description?: string;
    status?: 'completed' | 'running' | 'error' | 'pending';
    icon?: string;
    metadata?: Record<string, any>;
  }): TimelineResultItem {
    return {
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      title: item.title,
      message: item.description,
      status: item.status || 'completed',
      icon: item.icon || 'circle',
      metadata: {
        type: 'generic',
        ...item.metadata,
      }
    };
  },
}; 