'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from 'next-intl';

export const LoadingSkeleton = () => {
  const t = useTranslations('dashboard.topUseCases');
  return (
    <div className="rounded-lg bg-background w-full border border-border/10">
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card/90 backdrop-blur-sm z-10 border-b border-border/10">
            <TableRow>
              <TableHead className="w-[45%] sm:w-[35%] pl-4">{t('table.category.title')}</TableHead>
              <TableHead className="w-[15%] px-2">{t('table.lastUpdated.title')}</TableHead>
              <TableHead className="w-[15%] px-2">{t('table.users.title')}</TableHead>
              <TableHead className="w-[20%] px-2">{t('table.timeSaved.title')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i} className="relative overflow-hidden">
                <TableCell className="w-[45%] sm:w-[35%] p-0">
                  <div className="flex items-center gap-3 p-3 bg-card/50">
                    <Skeleton className="w-8 h-8 rounded-lg bg-muted" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-5 w-[200px] bg-muted" />
                      <Skeleton className="h-4 w-[300px] bg-muted" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-[15%] px-2">
                  <Skeleton className="h-4 w-[100px] bg-muted" />
                </TableCell>
                <TableCell className="w-[15%] px-2">
                  <Skeleton className="h-4 w-[50px] bg-muted" />
                </TableCell>
                <TableCell className="w-[20%] px-2">
                  <Skeleton className="h-4 w-[80px] bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};
