'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useTranslations } from 'next-intl';

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
}

type ApplicationStatus = 'not_applied' | 'applied' | 'accepted' | 'rejected';

interface UniversityCardProps {
  university: University;
  status?: ApplicationStatus;
  onClick: (university: University) => void;
  applicationDeadline: string;
}

export function UniversityCard({ university, status, onClick, applicationDeadline }: UniversityCardProps) {
  const t = useTranslations();

  const getApplicationStatusBadge = (status: ApplicationStatus | undefined) => {
    switch (status) {
      case 'applied':
        return (
          <Badge className="bg-blue-500 text-white dark:bg-blue-600 border-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('universities.applied')}
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-500 text-white dark:bg-green-600 border-0 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('universities.accepted')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 text-white dark:bg-red-600 border-0 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {t('universities.rejected')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t('universities.notApplied')}
          </Badge>
        );
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick(university);
  };

  return (
    <Card 
      className="h-full flex flex-col cursor-pointer group hover:shadow-lg transition-all duration-200 border hover:border-primary/20"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(university);
        }
      }}
      aria-label={`${university.name}, ranked #${university.rank} in ${university.country}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs font-medium">
              #{university.rank}
            </Badge>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {university.name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {university.country}
            </p>
          </div>
          <div className="flex-shrink-0">
            {getApplicationStatusBadge(status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Employer Rep</span>
            <span className="font-medium">#{university.employer_reputation_rank}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Academic Rep</span>
            <span className="font-medium">#{university.academic_reputation_rank}</span>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Application deadline</p>
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{applicationDeadline}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}