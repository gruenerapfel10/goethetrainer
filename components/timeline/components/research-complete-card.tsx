import React, { useState } from "react";
import { ChevronDown, Sparkles, Globe, Hash, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

interface ResearchCompleteCardProps {
  updates: any[];
  className?: string;
}

export function ResearchCompleteCard({ updates, className }: ResearchCompleteCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedTab, setSelectedTab] = useState('web');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Extract sources from updates
  const sourceGroups = React.useMemo(() => {
    const webSources = updates
      .filter((u) => u.type === 'web' && u.status === 'completed' && u.results)
      .flatMap((u) => u.results || []);

    const analysisResults = updates
      .filter((u) => u.type === 'analysis' && u.status === 'completed')
      .map((u) => ({
        type: u.analysisType || 'Analysis',
        findings: u.findings || [],
        gaps: u.gaps,
        recommendations: u.recommendations,
        uncertainties: u.uncertainties,
      }));

    return {
      web: webSources,
      analysis: analysisResults,
    };
  }, [updates]);

  const hasContent = sourceGroups.web.length > 0 || sourceGroups.analysis.length > 0;

  if (!hasContent) return null;

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-800 rounded-lg", className)}>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 cursor-pointer',
          'hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors'
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Sources</h3>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-neutral-400 transition-transform',
            !isCollapsed && 'rotate-180'
          )}
        />
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="w-full h-9 grid grid-cols-2 bg-neutral-100 dark:bg-neutral-900/50 p-0.5 rounded-md">
                  <TabsTrigger
                    value="web"
                    className="h-full text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Web</span>
                      <span className="text-neutral-500">{sourceGroups.web.length}</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analysis"
                    className="h-full text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm rounded"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Analysis</span>
                      <span className="text-neutral-500">{sourceGroups.analysis.length}</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  {selectedTab === 'web' && (
                    <div className="space-y-1.5">
                      {sourceGroups.web.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Globe className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                                {source.title || new URL(source.url).hostname.replace('www.', '')}
                              </h4>
                              {source.content && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                                  {source.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {selectedTab === 'analysis' && (
                    <div className="space-y-1.5">
                      {sourceGroups.analysis.map((analysis, i) => {
                        const isExpanded = expandedItems[i] || false;
                        const getAnalysisIcon = (type: string) => {
                          if (type.toLowerCase().includes('competitive')) return <TrendingUp className="h-3.5 w-3.5" />;
                          if (type.toLowerCase().includes('business')) return <Hash className="h-3.5 w-3.5" />;
                          return <Sparkles className="h-3.5 w-3.5" />;
                        };
                        
                        return (
                          <div
                            key={i}
                            className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden"
                          >
                            <div
                              className={cn(
                                "px-3 py-2.5 cursor-pointer transition-colors",
                                "hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                              )}
                              onClick={() => setExpandedItems(prev => ({ ...prev, [i]: !prev[i] }))}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="text-neutral-500">
                                    {getAnalysisIcon(analysis.type)}
                                  </div>
                                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                    {analysis.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </span>
                                </div>
                                <ChevronDown className={cn(
                                  "h-3.5 w-3.5 text-neutral-400 transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/50">
                                    <div className="space-y-2">
                                      {analysis.findings.map((finding: any, j: number) => (
                                        <div key={j} className="flex items-start gap-2">
                                          <span className="text-neutral-400 mt-0.5">•</span>
                                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                            {finding.insight || finding}
                                          </p>
                                        </div>
                                      ))}
                                      
                                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">Recommendations</p>
                                          {analysis.recommendations.map((rec: any, k: number) => (
                                            <div key={k} className="flex items-start gap-2 mb-1">
                                              <span className="text-neutral-400 mt-0.5">→</span>
                                              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                                {rec.action || rec}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}