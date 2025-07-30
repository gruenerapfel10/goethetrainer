import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
    inverse?: boolean; // For metrics where negative change is good (like costs)
  };
  suffix?: ReactNode;
  isLoading?: boolean;
}

const MetricCardSkeleton = ({
  title,
  icon: Icon,
}: Pick<MetricCardProps, 'title' | 'icon'>) => (
  <Card className="bg-card-solid border border-border rounded-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4 text-dashboard-text-secondary" />
        <span>{title}</span>
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

export function MetricCard({
  title,
  icon: Icon,
  value,
  description,
  trend,
  suffix,
  isLoading,
}: MetricCardProps) {
  if (isLoading) {
    return <MetricCardSkeleton title={title} icon={Icon} />;
  }

  // Determine if trend is positive for display purposes (accounting for inverse metrics)
  const displayPositiveTrend = trend
    ? trend.inverse
      ? trend.value < 0
      : trend.value > 0
    : null;

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-dashboard-text-secondary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {suffix && suffix === '$' && <span>{suffix}</span>}
            {value}
            {suffix && suffix !== '$' && <span>{suffix}</span>}
          </div>

          {trend && (
            <div
              className={`text-sm font-semibold py-0.5 px-2 rounded-full ${
                displayPositiveTrend
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {trend.value > 0 && '+'}
              {trend.value}%
            </div>
          )}
        </div>

        {description && (
          <p className="text-xs text-dashboard-text-secondary mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
