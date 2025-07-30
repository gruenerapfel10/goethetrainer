"use client"

import type { TimelineStep } from "../types";
import { Search, FileText, ArrowRight, Database, AlertCircle } from "lucide-react";
import React from "react";

/**
 * Transform SharePoint document retrieval results into timeline steps
 */
export function sharepointRetrieveTransformer(result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] {
  const documents = result.data || [];
  const error = result.error;
  const query = toolArgs?.query || 'Unknown query';
  
  if (error) {
    return [{
      id: `${updateId}-error`,
      title: 'SharePoint Retrieval Error',
      message: `Error searching for "${query}": ${error}`,
      status: 'error' as const,
      timestamp,
      icon: <AlertCircle className="h-6 w-6" />
    }];
  }
  
  if (!Array.isArray(documents) || documents.length === 0) {
    return [{
      id: `${updateId}-no-results`,
      title: 'No Documents Found',
      message: `No relevant documents found for search: "${query}"`,
      status: 'completed' as const,
      timestamp,
      icon: <Search className="h-6 w-6" />
    }];
  }
  
  // Return documents directly as individual timeline steps (no wrapper)
  return documents.map((doc, index) => ({
    id: `${updateId}-doc-${index}`,
    title: doc.title || 'Unknown Document',
    message: doc.content ? doc.content.slice(0, 150) + (doc.content.length > 150 ? '...' : '') : 'No content available',
    status: 'completed' as const,
    timestamp: timestamp + index,
    icon: <FileText className="h-6 w-6" />,
    badgeText: doc.score ? `Score: ${(doc.score * 100).toFixed(1)}%` : undefined,
    children: [
      {
        id: `${updateId}-doc-${index}-title`,
        title: 'Title',
        message: doc.title || 'No title',
        status: 'completed' as const,
        timestamp: timestamp + index + 1,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      },
      {
        id: `${updateId}-doc-${index}-content`,
        title: 'Content',
        message: doc.content || 'No content available',
        status: 'completed' as const,
        timestamp: timestamp + index + 2,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      },
      ...(doc.url ? [{
        id: `${updateId}-doc-${index}-url`,
        title: 'URL',
        message: doc.url,
        status: 'completed' as const,
        timestamp: timestamp + index + 3,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      }] : [])
    ]
  }));
}

/**
 * Transform SharePoint knowledge base listing results into timeline steps
 */
export function sharepointListTransformer(result: any, updateId: string, timestamp: number, toolArgs?: any): TimelineStep[] {
  const knowledgeBases = result.data || [];
  const error = result.error;
  
  if (error) {
    return [{
      id: `${updateId}-error`,
      title: 'Knowledge Base Listing Error',
      message: error,
      status: 'error' as const,
      timestamp,
      icon: <AlertCircle className="h-6 w-6" />
    }];
  }
  
  if (!Array.isArray(knowledgeBases) || knowledgeBases.length === 0) {
    return [{
      id: `${updateId}-no-results`,
      title: 'No Knowledge Bases Found',
      message: 'No active knowledge bases were found',
      status: 'completed' as const,
      timestamp,
      icon: <Database className="h-6 w-6" />
    }];
  }
  
  return knowledgeBases.map((kb, index) => ({
    id: `${updateId}-kb-${index}`,
    title: kb.name || 'Unknown Knowledge Base',
    message: kb.description || 'No description available',
    status: 'completed' as const,
    timestamp: timestamp + index,
    icon: <Database className="h-6 w-6" />,
    badgeText: kb.status || undefined,
    children: [
      {
        id: `${updateId}-kb-${index}-id`,
        title: 'ID',
        message: kb.id || 'No ID',
        status: 'completed' as const,
        timestamp: timestamp + index + 1,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      },
      {
        id: `${updateId}-kb-${index}-name`,
        title: 'Name',
        message: kb.name || 'No name',
        status: 'completed' as const,
        timestamp: timestamp + index + 2,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      },
      {
        id: `${updateId}-kb-${index}-description`,
        title: 'Description',
        message: kb.description || 'No description',
        status: 'completed' as const,
        timestamp: timestamp + index + 3,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      },
      ...(kb.status ? [{
        id: `${updateId}-kb-${index}-status`,
        title: 'Status',
        message: kb.status,
        status: 'completed' as const,
        timestamp: timestamp + index + 4,
        icon: <ArrowRight className="h-6 w-6" />,
        type: 'unified' as const
      }] : [])
    ]
  }));
}