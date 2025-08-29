import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { MessageSquare } from 'lucide-react';

interface MessagesData {
  totalMessages: number;
  thisWeekMessages: number;
  percentageChange: number;
}

interface MessagesOverviewProps {
  messagesData: MessagesData | null;
  isLoading: boolean;
}

const MessagesOverviewSkeleton = () => {
  const t = useTranslations('dashboard.messages');

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-dashboard-text-secondary" />
          <span>{t('title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
          <div className="flex justify-between mt-4">
            <div className="h-6 w-12 bg-muted/70 rounded animate-pulse" />
            <div className="h-6 w-8 bg-muted/70 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function MessagesOverview({ messagesData, isLoading }: MessagesOverviewProps) {
  const t = useTranslations('dashboard.messages');

  if (isLoading || !messagesData) {
    return <MessagesOverviewSkeleton />;
  }

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-dashboard-text-secondary" />
          <span>{t('title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{messagesData.totalMessages}</div>
        <p className="text-xs text-dashboard-text-secondary">{t('description')}</p>

        <div className="flex justify-between items-center mt-3">
          <div>
            <div className="text-xs text-dashboard-text-secondary">{t('thisWeek')}</div>
            <div className="font-semibold text-lg">{messagesData.thisWeekMessages}</div>
          </div>
          <div className={`text-sm font-semibold py-1 px-2 rounded-full ${
            messagesData.percentageChange >= 0
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {messagesData.percentageChange >= 0 ? '+' : ''}{messagesData.percentageChange}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}