'use client';

import { motion } from 'framer-motion';
import { Brain, Search, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  relevanceScore?: number;
  type?: string;
}

interface DeepResearchHandlerProps {
  result: {
    query?: string;
    sources?: ResearchSource[];
    summary?: string;
    keyFindings?: string[];
    confidence?: number;
    totalSources?: number;
    researchTime?: number;
  };
  isLoading?: boolean;
  args?: {
    query?: string;
    depth?: string;
  };
}

export function DeepResearchHandler({ result, isLoading, args }: DeepResearchHandlerProps) {
  if (isLoading) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground font-medium">
            Conducting deep research{args?.query && ` on "${args.query}"`}...
          </span>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Search className="h-3 w-3" />
            <span>Gathering sources...</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            <span>Analyzing content...</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="h-3 w-3" />
            <span>Synthesizing findings...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!result || (!result.summary && !result.sources?.length)) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/10"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span className="text-sm">Unable to complete deep research for your query.</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Deep Research Results
            {result.query && (
              <Badge variant="outline" className="text-xs font-normal">
                {result.query}
              </Badge>
            )}
          </CardTitle>
          
          {result.confidence && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <Progress value={result.confidence} className="w-20 h-2" />
              <span className="text-xs text-muted-foreground">{result.confidence}%</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {result.summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Research Summary
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {result.summary}
              </p>
            </motion.div>
          )}
          
          {result.keyFindings && result.keyFindings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Key Findings
              </h4>
              <ul className="space-y-1">
                {result.keyFindings.map((finding, index) => (
                  <motion.li
                    key={index}
                    className="text-sm text-foreground/90 flex items-start gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <span className="text-primary text-xs mt-1">•</span>
                    <span>{finding}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
          
          {result.sources && result.sources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Search className="h-3 w-3" />
                Research Sources ({result.sources.length})
                {result.totalSources && result.totalSources > result.sources.length && (
                  <span className="text-xs text-muted-foreground font-normal">
                    of {result.totalSources} analyzed
                  </span>
                )}
              </h4>
              
              <div className="space-y-2">
                {result.sources.slice(0, 4).map((source, index) => (
                  <motion.div
                    key={`${source.url}-${index}`}
                    className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium line-clamp-1 mb-1">
                          {source.title}
                        </h5>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {source.snippet}
                        </p>
                        <div className="flex items-center gap-2">
                          {source.type && (
                            <Badge variant="secondary" className="text-xs">
                              {source.type}
                            </Badge>
                          )}
                          {source.relevanceScore && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(source.relevanceScore * 100)}% relevant
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => window.open(source.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {result.sources.length > 4 && (
                <motion.div
                  className="mt-2 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className="text-xs text-muted-foreground">
                    and {result.sources.length - 4} more sources analyzed...
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
          
          {result.researchTime && (
            <motion.div
              className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span>Research completed in {result.researchTime}s</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}