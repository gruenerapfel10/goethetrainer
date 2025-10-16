'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DashboardContent from '@/components/dashboard/dashboard-content';
import type { DashboardStats, FlaggedMessage, UserUsage } from '@/types/dashboard';

type FormattedModelUsage = {
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
};

type FormattedAssistantUsage = {
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
};

export default function Dashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [modelUsage, setModelUsage] = useState<FormattedModelUsage>({
    modelUsage: [],
    totalCount: 0,
  });

  const [agentTypeUsage, setAgentTypeUsage] = useState<FormattedAssistantUsage>(
    {
      agentTypeUsage: [],
      totalCount: 0,
    },
  );

  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('dashboard');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          statsData,
          userUsageData,
          flaggedMessagesData,
          modelUsageResponse,
          agentTypeUsageResponse,
          ...other
        ] = await Promise.all([
          fetch('api/stats').then((res) => res.json()),
          fetch('api/user-usage').then((res) => res.json()),
          fetch('api/flagged-messages').then((res) => res.json()),
          fetch(`api/model-usage`).then((res) => res.json()),
          fetch(`api/agent-type-usage`).then((res) => res.json()),
        ]);

        setModelUsage({
          modelUsage: modelUsageResponse.modelUsage,
          totalCount: modelUsageResponse.totalCount,
        });

        setAgentTypeUsage({
          agentTypeUsage: agentTypeUsageResponse.agentTypeUsage,
          totalCount: agentTypeUsageResponse.totalCount,
        });

        setStats(statsData);
        setUserUsage(userUsageData);
        setFlaggedMessages(flaggedMessagesData);
      } catch (error) {
        console.error(t('error.fetchFailed'), error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [t]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent"
              asChild
            >
              <Link href="/">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">{t('title')}</h1>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        <DashboardContent
          stats={stats}
          userUsage={userUsage}
          flaggedMessages={flaggedMessages}
          modelUsageData={modelUsage}
          isLoading={isLoading}
          agentTypeUsageData={agentTypeUsage}
        />
      </div>
    </div>
  );
}
