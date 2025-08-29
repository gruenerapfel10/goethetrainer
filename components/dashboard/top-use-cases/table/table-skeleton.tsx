import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useTranslations } from 'next-intl';

export function TopUseCasesSkeleton() {
  const SKELETON_ROWS = 5;
  const t = useTranslations('dashboard.topUseCases.table');

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">{t('category.title')}</TableHead>
            <TableHead className="w-[40%]">{t('category.description')}</TableHead>
            <TableHead className="w-[20%] text-right">{t('category.cases', { count: 0 })}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-10 inline-block" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
