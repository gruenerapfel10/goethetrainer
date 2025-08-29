import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

interface UserAdoptionData {
  totalUsers: number;
  adoptionPercentage: number;
  workforce: string;
}

interface UserAdoptionProps {
  adoptionData: UserAdoptionData | null;
  isLoading: boolean;
}

const UserAdoptionSkeleton = () => {
  const t = useTranslations('dashboard.userAdoption');

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-dashboard-text-secondary" />
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

export function UserAdoption({ adoptionData, isLoading }: UserAdoptionProps) {
  const t = useTranslations('dashboard.userAdoption');

  if (isLoading || !adoptionData) {
    return <UserAdoptionSkeleton />;
  }

  return (
    <Card className="bg-card-solid border border-border rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-dashboard-text-secondary" />
          <span>{t('title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-baseline">
          <div className="text-2xl font-bold">{adoptionData.totalUsers}</div>
          <div className="text-lg font-medium text-success">
            {adoptionData.adoptionPercentage}%
          </div>
        </div>
        <p className="text-xs text-dashboard-text-secondary">{t('ofWorkforce', { workforce: adoptionData.workforce })}</p>
      </CardContent>
    </Card>
  );
}