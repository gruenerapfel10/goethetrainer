'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';
import { BarChart } from 'lucide-react';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { calculateModelPricingUSD } from '../../lib/utils';
import { getTranslatedAgentInfo } from '@/lib/ai/model-names';
import { useMemo } from 'react';

export interface AgentTypeUsageData {
  agentType: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCount: number;
  grandTotal: number;
  percentage: number;
  color: string;
  displayName: string;
}

interface AgentTypeUsageProps {
  usageData: AgentTypeUsageData[] | null;
  totalCount: number | undefined;
  isLoading: boolean;
}

const AgentTypeUsageSkeleton = () => {
  const tSkeleton = useTranslations('dashboard.agentTypeUsage');

  return (
    <Card className="bg-card-solid border border-border rounded-lg h-full">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart className="h-4 w-4 text-muted-foreground" />
          {tSkeleton('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-4">
        <div className="h-32 w-32 bg-muted/30 rounded-full animate-pulse flex items-center justify-center">
          <BarChart className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
};

export function AgentTypeUsage({
  usageData,
  totalCount,
  isLoading,
}: AgentTypeUsageProps) {
  const tMain = useTranslations();

  const data = useMemo(() => {
    if (!usageData) return [];
    return usageData.map((d) => {
      const info = getTranslatedAgentInfo(d.agentType, tMain);
      return {
        ...d,
        value: Number(d.percentage),
        name: info.name || 'Unknown',
        description: info.description,
        fullName: info.name || 'Unknown',
      };
    });
  }, [usageData, tMain]);

  if (isLoading || !usageData) {
    return <AgentTypeUsageSkeleton />;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-2 border border-border rounded shadow-md">
          <p className="text-sm font-medium">{payload[0].payload.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {`${
              payload[0].value
            }% (${payload[0].payload.totalCount.toLocaleString()} tokens)`}
          </p>
          <div className="text-xs mt-1">
            <div className="flex justify-between text-muted-foreground/80">
              <span>Input:</span>
              <span>{payload[0].payload.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground/80">
              <span>Output:</span>
              <span>{payload[0].payload.outputTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card-solid border border-border rounded-lg h-full">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart className="h-4 w-4 text-muted-foreground" />
          {tMain('dashboard.agentTypeUsage.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col p-4">
          {/* Legend List with fixed height and scrolling */}
          <div className="flex flex-col gap-1 mb-4 h-16 overflow-y-auto pr-1 scrollbar-thin">
            {data.map((entry, index) => (
              <div key={index} className="flex flex-col mb-1">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 max-w-[65%]">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <TooltipProvider>
                      <UiTooltip>
                        <TooltipTrigger asChild>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground flex items-center">
                              <span className="truncate font-medium">
                                {entry.name}
                              </span>
                              <span className="ml-1">{entry.percentage}%</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs mb-1">{entry.fullName}</p>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground">
                              {entry.description}
                            </p>
                          )}
                          <p className="text-xs">
                            {entry.percentage}% (
                            {entry.totalCount.toLocaleString()} tokens)
                          </p>
                          <div className="text-xs mt-1">
                            <div className="flex justify-between">
                              <span>Input:</span>
                              <span>{entry.inputTokens.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Output:</span>
                              <span>{entry.outputTokens.toLocaleString()}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </UiTooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {calculateModelPricingUSD([
                      {
                        modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
                        ...entry,
                      },
                    ])}{' '}
                    $
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Centered Pie Chart */}
          <div className="flex justify-center items-center h-40">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
