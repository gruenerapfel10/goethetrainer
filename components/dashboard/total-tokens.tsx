'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TotalTokensProps {
  totalCount: number | undefined;
  isLoading: boolean;
}

const TotalTokensSkeleton = () => {
  const t = useTranslations('dashboard.totalTokens');

  return (
    <Card className="bg-card-solid border border-border rounded-lg h-full">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart className="h-4 w-4 text-muted-foreground" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center flex-col p-4">
        <div className="h-16 w-24 bg-muted/30 rounded animate-pulse flex items-center justify-center">
          <BarChart className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <div className="h-4 w-20 bg-muted/30 rounded animate-pulse mx-auto mt-3" />
      </CardContent>
    </Card>
  );
};

export function TotalTokens({ totalCount, isLoading }: TotalTokensProps) {
  const t = useTranslations('dashboard.totalTokens');

  if (isLoading || totalCount === undefined) {
    return <TotalTokensSkeleton />;
  }

  return (
    <Card className="bg-card-solid border border-border rounded-lg h-full">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart className="h-4 w-4 text-muted-foreground" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center h-full p-4">
          {/* Use same height as pie charts to maintain consistency */}
          <div className="flex flex-col items-center justify-center min-h-[180px]">
            <div className="text-4xl font-bold">
              {totalCount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t('description', { defaultValue: 'Total tokens used' })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
