'use client';

import { motion } from 'framer-motion';
import { Search, ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  source?: string;
  publishedDate?: string;
  snippet?: string;
}

interface WebSearchHandlerProps {
  result: {
    results?: WebSearchResult[];
    query?: string;
    totalResults?: number;
  };
  isLoading?: boolean;
  args?: {
    query?: string;
  };
}

export function WebSearchHandler({ result, isLoading, args }: WebSearchHandlerProps) {
  if (isLoading) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground font-medium">
            Searching the web{args?.query && ` for "${args.query}"`}...
          </span>
        </div>
      </motion.div>
    );
  }

  if (!result?.results?.length) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/10"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="text-sm">No web results found for your search.</span>
        </div>
      </motion.div>
    );
  }

  const extractHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown.source';
    }
  };

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Web Search Results
          {result.query && ` for "${result.query}"`}
          {result.totalResults && ` (${result.totalResults} results)`}
        </span>
      </div>
      
      <div className="space-y-3">
        {result.results.slice(0, 6).map((item, index) => (
          <motion.div
            key={`${item.url}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.source || extractHostname(item.url)}
                      </Badge>
                      {item.publishedDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{item.publishedDate}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description || item.snippet}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 w-8 p-0 shrink-0"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary/70 truncate">
                    {item.url}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {result.results.length > 6 && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="text-xs text-muted-foreground">
            and {result.results.length - 6} more results...
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}