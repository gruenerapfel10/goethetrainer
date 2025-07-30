import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CostData {
  totalCost: number;
  costPerUser: number;
  percentageChange: number;
  period: 'week' | 'month' | 'year';
}

interface CostOverviewProps {
  costData: CostData | null;
  isLoading: boolean;
}

const CostOverviewSkeleton = () => {
  const t = useTranslations('dashboard.cost');

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-dashboard-text-secondary" />
          <span>{t('title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
};

export function CostOverview({ costData, isLoading }: CostOverviewProps) {
  const t = useTranslations('dashboard.cost');

  if (isLoading || !costData) {
    return <CostOverviewSkeleton />;
  }

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-dashboard-text-secondary" />
          <span>{t('title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${costData.totalCost}</div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-dashboard-text-secondary">
            ${costData.costPerUser.toFixed(2)} {t('perActiveUser')}
          </p>
          <p
            className={`text-sm font-semibold py-0.5 px-1.5 rounded ${
              costData.percentageChange > 0
                ? 'bg-destructive/10 text-destructive'
                : 'bg-success/10 text-success'
            }`}
          >
            {costData.percentageChange > 0 ? '+' : ''}
            {costData.percentageChange}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
