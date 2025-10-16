import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessagesSquare,
  Users,
  ThumbsUp,
  DollarSign,
  BarChart,
  MessageSquare,
  ThumbsDown,
} from 'lucide-react';
import { UserUsageTable } from '@/components/dashboard/user-usage-table';
import { FlaggedMessagesTable } from '@/components/dashboard/flagged-messages-table';
import type { DashboardStats, UserUsage, FlaggedMessage } from '@/types/dashboard';
import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MetricCard } from './metric-card';
import { AgentTypeUsage } from './agent-type-usage';
import { TopUseCases } from './top-use-cases/top-use-cases';
import { ModelUsage } from './model-usage';
import { calculateModelPricingUSD } from '../../lib/utils';
import { TotalTokens } from './total-tokens';
import { getTranslatedAgentInfo } from '@/lib/ai/model-names';

// Skeleton Loader Components
const StatCardSkeleton = ({
  icon: Icon,
  title,
}: {
  icon: any;
  title: string;
}) => (
  <Card className="bg-card-solid border border-border rounded-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

const TableRowSkeleton = ({ columns }: { columns: number }) => (
  <tr className="border-b border-border">
    {Array(columns)
      .fill(0)
      .map((_, i) => (
        <td key={i} className="p-4">
          <div
            className="h-4 bg-muted rounded animate-pulse"
            style={{ width: i === 0 ? '200px' : '100px' }}
          />
        </td>
      ))}
  </tr>
);

const TableSkeleton = ({
  columns,
  rows,
}: {
  columns: number;
  rows: number;
}) => (
  <div className="relative w-full overflow-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          {Array(columns)
            .fill(0)
            .map((_, i) => (
              <th key={i} className="p-4">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </th>
            ))}
        </tr>
      </thead>
      <tbody>
        {Array(rows)
          .fill(0)
          .map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
      </tbody>
    </table>
  </div>
);

interface DashboardContentProps {
  stats: DashboardStats | null;
  userUsage: UserUsage[];
  flaggedMessages: FlaggedMessage[];
  isLoading: boolean;

  agentTypeUsageData: {
    agentTypeUsage: {
      agentType: string | null;
      inputTokens: number;
      outputTokens: number;
      totalCount: number;
      grandTotal: number;
      percentage: number;
      color: string;
      displayName: string;
    }[];
    totalCount: number;
  } | null;
  modelUsageData: {
    modelUsage: {
      modelId: string | null;
      inputTokens: number;
      outputTokens: number;
      totalCount: number;
      grandTotal: number;
      percentage: number;
      color: string;
      displayName: string;
    }[];
    totalCount: number;
  } | null;
}

export default function DashboardContent({
  stats,
  userUsage,
  flaggedMessages,
  modelUsageData,
  isLoading,
  agentTypeUsageData,
}: DashboardContentProps) {
  const t = useTranslations('dashboard');
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    activeUsers: 0,
    adoptionPercentage: 0,
    weeklyIncreasePercentage: 0,
    totalCost: 0,
    costPerUser: 0,
  });

  const weeklyMessagesCount =
    stats?.weeklyMessages[stats.weeklyMessages.length - 1]?.count || 0;

  // Calculate metrics based on stats
  useEffect(() => {
    if (!stats) return;

    // Calculate active users and adoption percentage
    //todo: make in useMemo

    const activeUsers = userUsage.length;
    const adoptionPercentage =
      stats.totalUsers > 0
        ? Math.round((activeUsers / stats.totalUsers) * 100)
        : 0;

    const weeklyIncreasePercentage =
      ((stats.totalMessages - weeklyMessagesCount) / weeklyMessagesCount) * 100;

    const totalCost = calculateModelPricingUSD(
      modelUsageData?.modelUsage || [],
    );
    const costPerUser =
      activeUsers > 0 ? Number.parseFloat((totalCost / activeUsers).toFixed(2)) : 0;

    setCalculatedMetrics({
      activeUsers,
      adoptionPercentage,
      weeklyIncreasePercentage,
      totalCost,
      costPerUser,
    });
  }, [stats]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-2 border border-border rounded shadow-md">
          <p className="text-sm font-medium">{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-6 p-6">
        {/* First row - metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton icon={Users} title={t('userAdoption.title')} />
          <StatCardSkeleton icon={MessagesSquare} title={t('messages.title')} />
          <StatCardSkeleton icon={DollarSign} title={t('cost.title')} />
          <StatCardSkeleton
            icon={ThumbsUp}
            title={t('stats.positiveFeedback.title')}
          />
        </div>

        {/* Second row - Top Use-Cases (60%) and User Usage (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-6">
            <Card className="bg-card-solid border border-border rounded-lg">
              <CardHeader>
                <CardTitle>{t('topUseCases.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full bg-muted/20 rounded animate-pulse flex items-center justify-center">
                  <BarChart className="h-10 w-10 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="bg-card-solid border border-border rounded-lg">
              <CardHeader>
                <CardTitle>{t('tables.userUsage.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <TableSkeleton columns={3} rows={3} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Third row - Combined Agent Type Usage, Model Usage, and Total Count */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex">
            <Card className="bg-card-solid border border-border rounded-lg w-full">
              <CardHeader>
                <CardTitle>{t('agentTypeUsage.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-44 w-full bg-muted/20 rounded animate-pulse flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 flex">
            <Card className="bg-card-solid border border-border rounded-lg w-full">
              <CardHeader>
                <CardTitle>{t('modelUsage.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-44 w-full bg-muted/20 rounded animate-pulse flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex">
            <Card className="bg-card-solid border border-border rounded-lg w-full">
              <CardHeader>
                <CardTitle>{t('totalTokens.title')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-44">
                <div className="h-16 w-24 bg-muted/20 rounded animate-pulse flex items-center justify-center">
                  <BarChart className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="h-4 w-20 bg-muted/20 rounded animate-pulse mx-auto mt-3" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fourth row - Flagged Messages */}
        <Card className="bg-card-solid border border-border rounded-lg">
          <CardHeader>
            <CardTitle>{t('tables.flaggedMessages.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={5} rows={2} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Render Assistant Usage with improved layout - chart top-right, labels bottom-left
  const AssistantUsageContent = () => {
    const t = useTranslations();

    const agentTypeData = useMemo(() => {
      if (!agentTypeUsageData?.agentTypeUsage) return [];
      
      return agentTypeUsageData.agentTypeUsage.map(usage => {
        const info = getTranslatedAgentInfo(usage.agentType, t);
        return {
          ...usage,
          name: info.name || 'Unknown',
          value: Number(usage.percentage),
          color: usage.color
        };
      });
    }, [agentTypeUsageData?.agentTypeUsage, t]);

    return (
      <Card className="bg-card-solid border border-border rounded-lg h-full">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart className="h-4 w-4 text-muted-foreground" />
            {t('assistantUsage.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[205px]">
            {/* Top-right: Pie Chart */}
            <div className="absolute top-2 right-2 h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {agentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom-left: Labels */}
            <div className="absolute bottom-2 left-3 space-y-1.5">
              {agentTypeData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {entry.name}:{' '}
                    <span className="font-medium">{entry.value}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* First row - Metrics with consistent styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* User Adoption */}
        <MetricCard
          title={t('userAdoption.title')}
          icon={Users}
          value={calculatedMetrics.activeUsers}
          description={t('userAdoption.outOfTotal')}
          trend={{
            value: calculatedMetrics.adoptionPercentage,
            isPositive: true,
          }}
          isLoading={isLoading}
        />

        {/* Messages Overview */}
        <MetricCard
          title={t('messages.title')}
          icon={MessageSquare}
          value={stats.totalMessages}
          description={`${weeklyMessagesCount} ${t('messages.thisWeek')}`}
          trend={{
            value: Number(calculatedMetrics.weeklyIncreasePercentage.toFixed(0)), // Fixed percentage as requested
            isPositive: true,
          }}
          isLoading={isLoading}
        />

        {/* Cost Overview */}
        <MetricCard
          title={t('cost.title')}
          icon={DollarSign}
          value={calculatedMetrics.totalCost.toFixed(2)}
          description={`$${calculatedMetrics.costPerUser.toFixed(2)} ${t(
            'cost.perActiveUser',
          )}`}
          suffix="$"
          isLoading={isLoading}
        />

        {/* Positive Feedback */}
        <MetricCard
          title={t('stats.positiveFeedback.title')}
          icon={ThumbsUp}
          value={stats.positivePercentage}
          suffix="%"
          description={t('stats.positiveFeedback.outOfTotal', {
            count: stats.totalMessages,
          })}
          isLoading={isLoading}
        />
      </div>

      {/* Third row - Combined Agent Type Usage, Model Usage, and Total Count */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex">
          <div className="w-full">
            <AgentTypeUsage
              usageData={agentTypeUsageData?.agentTypeUsage ?? null}
              totalCount={agentTypeUsageData?.totalCount}
              isLoading={isLoading}
            />
          </div>
        </div>
        <div className="lg:col-span-5 flex">
          <div className="w-full">
            <ModelUsage
              usageData={modelUsageData?.modelUsage ?? null}
              totalCount={modelUsageData?.totalCount}
              isLoading={isLoading}
            />
          </div>
        </div>
        <div className="lg:col-span-2 flex">
          <div className="w-full">
            <TotalTokens
              totalCount={modelUsageData?.totalCount}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Second row - Top Use-Cases (60%) and User Usage (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-6 lg:w-auto w-full">
          <TopUseCases />
        </div>

        <div className="lg:col-span-4">
          <Card className="bg-card-solid border border-border rounded-lg h-full">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('tables.userUsage.title')}
              </CardTitle>
            </CardHeader>
            <div className="p-0">
              <UserUsageTable users={userUsage} />
            </div>
          </Card>
        </div>
      </div>

      {/* Fourth row - Flagged Messages */}
      <div className="lg:col-span-10">
        <Card className="bg-card-solid border border-border rounded-lg">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-muted-foreground" />
              {t('tables.flaggedMessages.title')}
            </CardTitle>
          </CardHeader>
          <div className="p-0">
            <FlaggedMessagesTable messages={flaggedMessages} />
          </div>
        </Card>
      </div>
    </div>
  );
}
