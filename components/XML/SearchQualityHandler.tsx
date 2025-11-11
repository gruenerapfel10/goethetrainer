'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  ChartBar, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';

export interface SearchQuality {
  reflection: string;
  score: string;
  isPartial: boolean;
}

// Search Quality Component with streaming support
export const SearchQualityReflection = ({ 
  reflection, 
  score, 
  isStreaming = false 
}: { 
  reflection: string; 
  score: string | number; 
  isStreaming?: boolean 
}) => {
  const numScore = typeof score === 'string' ? Number.parseInt(score) : score;
  const validScore = !Number.isNaN(numScore) && numScore > 0;
  
  const getScoreColor = () => {
    if (!validScore) return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800';
    if (numScore >= 4) return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800';
    if (numScore >= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800';
    return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800';
  };

  const getScoreIcon = () => {
    if (!validScore) return <Search className="w-4 h-4 animate-pulse" />;
    if (numScore >= 4) return <CheckCircle2 className="w-4 h-4" />;
    if (numScore >= 3) return <AlertCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getScoreLabel = () => {
    if (!validScore) return isStreaming ? 'Analyzing...' : 'Pending';
    if (numScore >= 4) return 'High Quality';
    if (numScore >= 3) return 'Moderate Quality';
    return 'Low Quality';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-muted/30 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Search className="w-4 h-4" />
          <span>Search Quality Analysis</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${getScoreColor()}`}>
          {getScoreIcon()}
          <span>{getScoreLabel()}</span>
          {validScore && (
            <div className="flex items-center gap-1 ml-2">
              <ChartBar className="w-3 h-3 opacity-70" />
              <span className="font-bold">{numScore}/5</span>
            </div>
          )}
        </div>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {reflection || (isStreaming ? (
          <span className="text-muted-foreground/60 italic">Analyzing search results...</span>
        ) : (
          'No reflection available'
        ))}
        {isStreaming && reflection && (
          <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
        )}
      </div>
    </motion.div>
  );
};

// Static handler class for processing search quality
export class SearchQualityHandler {
  static process(content: string): {
    processedContent: string;
    component: React.ReactNode | null;
  } {
    let qualityReflection: string | null = null;
    let qualityScore: string | null = null;
    let processedContent = content;

    // Check for search quality reflection (complete or partial)
    const reflectionMatch = content.match(/<search_quality_reflection>(.*?)<\/search_quality_reflection>/s);
    if (reflectionMatch) {
      qualityReflection = reflectionMatch[1].trim();
      // Remove from content
      processedContent = processedContent.replace(/<search_quality_reflection>.*?<\/search_quality_reflection>/gs, '');
    } else {
      const partialReflectionMatch = content.match(/<search_quality_reflection>([^<]*)/s);
      if (partialReflectionMatch) {
        qualityReflection = partialReflectionMatch[1].trim();
        // Remove from content
        processedContent = processedContent.replace(/<search_quality_reflection>[^<]*/gs, '');
      }
    }

    // Check for search quality score (complete or partial)
    const scoreMatch = content.match(/<search_quality_score>(.*?)<\/search_quality_score>/s);
    if (scoreMatch) {
      qualityScore = scoreMatch[1].trim();
      // Remove from content
      processedContent = processedContent.replace(/<search_quality_score>.*?<\/search_quality_score>/gs, '');
    } else {
      const partialScoreMatch = content.match(/<search_quality_score>([^<]*)/s);
      if (partialScoreMatch) {
        const possibleScore = partialScoreMatch[1].trim();
        if (possibleScore && /^[1-5]$/.test(possibleScore)) {
          qualityScore = possibleScore;
          // Remove from content
          processedContent = processedContent.replace(/<search_quality_score>[^<]*/gs, '');
        }
      }
    }

    // Generate component if we have search quality data
    const searchQuality = (qualityReflection || (qualityScore && qualityScore !== '0')) ? { 
      reflection: qualityReflection || '', 
      score: qualityScore || '',
      isPartial: !content.includes('</search_quality_reflection>') || !content.includes('</search_quality_score>')
    } : null;

    const component = searchQuality ? (
      <SearchQualityReflection 
        reflection={searchQuality.reflection} 
        score={searchQuality.score}
        isStreaming={searchQuality.isPartial}
      />
    ) : null;

    return {
      processedContent,
      component
    };
  }
}