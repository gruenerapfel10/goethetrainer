'use client';

import React, { memo, useMemo } from 'react';
import { ReferencesHandler } from './ReferencesHandler';
import { ReasoningHandler } from './ReasoningHandler';
import { TimelineStep } from '@/components/timeline/components/timeline-step';
import { Search } from 'lucide-react';

// XML Tag Types Enum
enum XMLTagType {
  REASONING = 'REASONING',
  SEARCH_QUALITY = 'SEARCH_QUALITY',
  REFERENCES = 'REFERENCES',
  RESULT = 'RESULT'
}

interface XMLHandlerProps {
  content: string;
  onProcessedContent?: (processedContent: string) => void;
  isStreaming?: boolean;
}

export interface XMLProcessingResult {
  processedContent: string;
  xmlComponents: React.ReactNode[];
  hasXMLContent: boolean;
  references: any[];
}

// Detect which XML tags are present in content
const detectXMLTags = (content: string): Set<XMLTagType> => {
  const tags = new Set<XMLTagType>();
  
  if (content.includes('<reasoning>') || content.includes('<reason>')) {
    tags.add(XMLTagType.REASONING);
  }
  if (content.includes('<search_quality_reflection>') || content.includes('<search_quality_score>')) {
    tags.add(XMLTagType.SEARCH_QUALITY);
  }
  if (content.includes('<references>') || content.includes('<reference ') || 
      (content.includes('[') && content.includes(']')) || content.includes('**Sources**')) {
    tags.add(XMLTagType.REFERENCES);
  }
  if (content.includes('<result>')) {
    tags.add(XMLTagType.RESULT);
  }
  
  return tags;
};

// Process content based on detected tags
const processXMLContent = (content: string, isStreaming: boolean, position?: "first" | "middle" | "last" | "only"): XMLProcessingResult => {
  const components: React.ReactNode[] = [];
  let processedContent = content;
  const allReferences: any[] = [];
  let hasXMLContent = false;

  // Preemptively remove HTML comments - both complete and incomplete ones
  // Remove complete comments
  processedContent = processedContent.replace(/<!--.*?-->/gs, '');
  // Remove incomplete comments (while streaming)
  if (isStreaming) {
    processedContent = processedContent.replace(/<!--.*$/gs, '');
  }

  const detectedTags = detectXMLTags(processedContent);
  
  // Process each detected tag type
  detectedTags.forEach(tagType => {
    switch (tagType) {
      case XMLTagType.REASONING: {
        const reasoningData = ReasoningHandler.extract(processedContent);
        if (reasoningData) {
          const component = ReasoningHandler.renderComponent(reasoningData, isStreaming, components.length, position);
          if (component) {
            components.push(component);
            processedContent = ReasoningHandler.removeFromContent(processedContent);
            hasXMLContent = true;
          }
        }
        break;
      }

      case XMLTagType.SEARCH_QUALITY: {
        // Extract search quality reflection
        const reflectionMatch = processedContent.match(/<search_quality_reflection>(.*?)<\/search_quality_reflection>/gs);
        const reflectionContent = reflectionMatch 
          ? reflectionMatch[0].replace(/<search_quality_reflection>(.*?)<\/search_quality_reflection>/gs, '$1')
          : processedContent.match(/<search_quality_reflection>\s*(.*)$/gs)
            ?.at(0)?.replace(/<search_quality_reflection>\s*(.*)$/gs, '$1');

        // Extract search quality score  
        const scoreMatch = processedContent.match(/<search_quality_score>(.*?)<\/search_quality_score>/gs);
        const scoreContent = scoreMatch
          ? scoreMatch[0].replace(/<search_quality_score>(.*?)<\/search_quality_score>/gs, '$1')
          : processedContent.match(/<search_quality_score>\s*(.*)$/gs)
            ?.at(0)?.replace(/<search_quality_score>\s*(.*)$/gs, '$1');

        if (reflectionContent?.trim() || scoreContent?.trim()) {
          const description = [
            reflectionContent?.trim(),
            scoreContent ? `Score: ${scoreContent.trim()}` : ''
          ].filter(Boolean).join('\n\n');
          
          components.push(
            <TimelineStep
              key={`search-quality-${components.length}`}
              id={`search-quality-${components.length}`}
              title="Search Quality Analysis"
              description={description}
              status={isStreaming && (!reflectionMatch || !scoreMatch) ? "running" : "completed"}
              timestamp={Date.now()}
              icon={<Search className="h-2 w-2 text-primary-foreground" />}
              iconParams={{ src: null, alt: "Search Quality", width: 4, height: 4, className: "h-4 w-4" }}
              type="tool-result"
              position={position}
              storageKey="search-quality"
            />
          );
          
          processedContent = processedContent
            .replace(/<search_quality_reflection>.*?<\/search_quality_reflection>/gs, '')
            .replace(/<search_quality_score>.*?<\/search_quality_score>/gs, '')
            .replace(/<search_quality_reflection>.*$/gs, '')
            .replace(/<search_quality_score>.*$/gs, '');
          
          hasXMLContent = true;
        }
        break;
      }

      case XMLTagType.REFERENCES: {
        const referencesResult = ReferencesHandler.process(processedContent);
        if (referencesResult.component || referencesResult.references.length > 0) {
          if (referencesResult.component) {
            components.push(referencesResult.component);
          }
          processedContent = referencesResult.processedContent;
          allReferences.push(...referencesResult.references);
          hasXMLContent = true;
        }
        break;
      }

      case XMLTagType.RESULT: {
        processedContent = processedContent
          .replace(/<result>\n([\*\#].*?)<\/result>/gs, '\n\n$1')
          .replace(/<result>(.*?)<\/result>/gs, '$1')
          .replace(/<result>(.*)$/gs, '$1');
        hasXMLContent = true;
        break;
      }
    }
  });

  // Clean up markdown formatting
  if (hasXMLContent || processedContent !== content) {
    processedContent = processedContent
      .replace(/\\n/g, '\n')
      .replace(/^(#{1,6})([^ #\n])/gm, '$1 $2')
      .replace(/^(\d+\.\s*\[(?:[^\[\]]*?))\s*\n-\s*([^\n]*?\]\([^)]+\))$/gm, '$1 - $2')
      .replace(/^(\[(?:[^\[\]]*?))\s*\n-\s*([^\n]*?\]\([^)]+\))$/gm, '$1 - $2')
      .trim();
  }

  return {
    processedContent: hasXMLContent ? processedContent : content,
    xmlComponents: components,
    hasXMLContent,
    references: allReferences
  };
};

// Main XMLHandler Component
export const XMLHandler = memo<XMLHandlerProps>(({ content, onProcessedContent, isStreaming = false }) => {
  const result = useMemo(() => 
    processXMLContent(content, isStreaming), 
    [content, isStreaming]
  );

  if (onProcessedContent && result.hasXMLContent) {
    onProcessedContent(result.processedContent);
  }

  if (!result.hasXMLContent || result.xmlComponents.length === 0) {
    return null;
  }

  return <>{result.xmlComponents}</>;
});

XMLHandler.displayName = 'XMLHandler';

// Export utility functions
export { processXMLContent, detectXMLTags };
export { processCitations } from './ReferencesHandler';
export type { Reference } from './ReferencesHandler';