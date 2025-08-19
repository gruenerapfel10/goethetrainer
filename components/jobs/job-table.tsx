'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
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

interface UniversityTableProps {
  universities: University[];
  applicationStatuses: Record<number, ApplicationStatus>;
  applicationDeadline: string;
  onUniversityClick: (university: University) => void;
}

export function UniversityTable({ 
  universities, 
  applicationStatuses, 
  applicationDeadline, 
  onUniversityClick 
}: UniversityTableProps) {
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

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">{t('universities.rank')}</TableHead>
            <TableHead>{t('universities.university')}</TableHead>
            <TableHead>{t('universities.country')}</TableHead>
            <TableHead>{t('universities.status')}</TableHead>
            <TableHead>{t('universities.deadline')}</TableHead>
            <TableHead className="text-center">{t('universities.employerRep')}</TableHead>
            <TableHead className="text-center">{t('universities.academicRep')}</TableHead>
            <TableHead className="text-right">{t('universities.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {universities.map((university) => {
            const status = applicationStatuses[university.rank];
            return (
              <TableRow key={`${university.rank}-${university.name}`}>
                <TableCell>
                  <Badge className="bg-primary text-primary-foreground dark:bg-blue-600 dark:text-white border-0">#{university.rank}</Badge>
                </TableCell>
                <TableCell className="font-medium">{university.name}</TableCell>
                <TableCell>{university.country}</TableCell>
                <TableCell>{getApplicationStatusBadge(status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-foreground/60">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{applicationDeadline}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-primary text-primary dark:border-blue-600 dark:text-blue-400">#{university.employer_reputation_rank}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-primary text-primary dark:border-blue-600 dark:text-blue-400">#{university.academic_reputation_rank}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      onUniversityClick(university);
                    }}
                  >
                    {t('universities.viewDetails')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}