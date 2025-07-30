import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, FileText, Sparkles } from "lucide-react";
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
    <Card className={cn("overflow-hidden shadow-none hover:shadow-none", className)}>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer',
          'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Research Complete</h3>
          <Badge
            variant="secondary"
            className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          >
            Complete
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-neutral-500 transition-transform flex-shrink-0',
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
                <TabsList className="w-full h-10 grid grid-cols-2 bg-neutral-100/50 dark:bg-neutral-800/50 p-1 rounded-lg">
                  <TabsTrigger
                    value="web"
                    className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3" />
                      <span>Web</span>
                      {sourceGroups.web.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1">
                          {sourceGroups.web.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analysis"
                    className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      <span>Analysis</span>
                      {sourceGroups.analysis.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1">
                          {sourceGroups.analysis.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  {selectedTab === 'web' && (
                    <div className="space-y-2">
                      {sourceGroups.web.slice(0, 3).map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="h-3.5 w-3.5 text-neutral-500 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-medium leading-snug truncate">
                                {source.title}
                              </h4>
                              <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
                                {source.content}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                      {sourceGroups.web.length > 3 && (
                        <p className="text-[11px] text-neutral-500 text-center py-1">
                          +{sourceGroups.web.length - 3} more sources
                        </p>
                      )}
                    </div>
                  )}

                  {selectedTab === 'analysis' && (
                    <div className="space-y-2">
                      {sourceGroups.analysis.map((analysis, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="h-3 w-3 text-neutral-500" />
                            <span className="text-xs font-medium">{analysis.type}</span>
                          </div>
                          {analysis.findings.slice(0, 2).map((finding: any, j: number) => (
                            <div key={j} className="pl-4 mb-1">
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                • {finding.insight}
                              </p>
                            </div>
                          ))}
                          {analysis.findings.length > 2 && (
                            <p className="text-[10px] text-neutral-500 pl-4">
                              +{analysis.findings.length - 2} more findings
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}