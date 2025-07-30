'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import type { TopUseCaseCategory } from '../common/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { CategoryRow } from './category-row';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { SearchInput } from './search-input';

// --- Define Breakpoints (in pixels) centralized here ---
export const BREAKPOINTS = {
  sm: 480,
  md: 640,
  lg: 800,
};

// Items per page
const ITEMS_PER_PAGE = 10;

export interface UseCaseTableProps {
  categories: TopUseCaseCategory[];
  isCategoriesLoading: boolean;
  categoriesError: Error | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalTimeSavedMap: Record<string, string>;
  isTimeSavedLoading: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function UseCaseTable({
  categories,
  isCategoriesLoading,
  categoriesError,
  searchQuery,
  onSearchChange,
  totalTimeSavedMap,
  isTimeSavedLoading,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: UseCaseTableProps) {
  const t = useTranslations('dashboard.topUseCases');
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [isPageChanging, setIsPageChanging] = useState(false);

  // Calculate pagination values - use props if provided, otherwise calculate internally
  const shouldUseInternalPagination = !onPageChange;
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);

  // Reset page changing state when loading is complete
  React.useEffect(() => {
    if (!isCategoriesLoading) {
      setIsPageChanging(false);
    }
  }, [isCategoriesLoading]);

  const actualCurrentPage = shouldUseInternalPagination
    ? internalCurrentPage
    : currentPage;
  const actualTotalPages = totalPages;

  const startIndex = shouldUseInternalPagination
    ? (internalCurrentPage - 1) * ITEMS_PER_PAGE
    : 0;
  const endIndex = shouldUseInternalPagination
    ? Math.min(startIndex + ITEMS_PER_PAGE, categories.length)
    : categories.length;
  const currentCategories = shouldUseInternalPagination
    ? categories.slice(startIndex, endIndex)
    : categories;

  // Handle page change
  const handlePageChange = (page: number) => {
    // Prevent changing page if already changing or loading
    if (isPageChanging || isCategoriesLoading) {
      return;
    }

    // Set loading state
    setIsPageChanging(true);

    if (shouldUseInternalPagination) {
      setInternalCurrentPage(page);
    } else if (onPageChange) {
      onPageChange(page);
    }
  };

  // Centralized visibility state based on table width
  const [columnVisibility, setColumnVisibility] = useState({
    updated: false,
    users: false,
    timeSaved: false,
  });

  // Centralized resize observer logic
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (!entries || entries.length === 0) return;

    const width = entries[0].contentRect.width;
    setTableWidth(width);

    setColumnVisibility({
      updated: width >= BREAKPOINTS.sm,
      users: width >= BREAKPOINTS.md,
      timeSaved: width >= BREAKPOINTS.lg,
    });
  }, []);

  React.useEffect(() => {
    const element = tableRef.current;
    if (!element) return;

    const initialWidth = element.getBoundingClientRect().width;
    setTableWidth(initialWidth);
    setColumnVisibility({
      updated: initialWidth >= BREAKPOINTS.sm,
      users: initialWidth >= BREAKPOINTS.md,
      timeSaved: initialWidth >= BREAKPOINTS.lg,
    });

    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleResize]);

  // Calculate the total use case count across all categories
  const totalUseCaseCount = React.useMemo(() => {
    return categories.reduce(
      (sum, category) => sum + (category.useCaseCount || 0),
      0,
    );
  }, [categories]);

  if (isCategoriesLoading) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-2">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full sm:w-80 opacity-70 pointer-events-none"
          />

          {searchQuery && (
            <div className="text-sm text-muted-foreground flex items-center">
              <span>
                <Skeleton className="h-4 w-32" />
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-card w-full border border-border shadow-sm">
          <ScrollArea className="h-[500px] overflow-x-hidden">
            <div className="min-w-full">
              {/* Header */}
              <div className="bg-background z-10 border-b border-border">
                <div className="flex">
                  <div className="w-[45%] sm:w-[35%] pl-2 sm:pl-4 py-3 font-medium">
                    {t('table.category.title')}
                  </div>
                  {columnVisibility.updated && (
                    <div className="w-[15%] px-1 sm:px-2 py-3 font-medium">
                      {t('table.lastUpdated.title')}
                    </div>
                  )}
                  {columnVisibility.users && (
                    <div className="w-[15%] px-1 sm:px-2 py-3 font-medium">
                      {t('table.users.title')}
                    </div>
                  )}
                  {columnVisibility.timeSaved && (
                    <div className="w-[20%] px-1 sm:px-2 py-3 font-medium">
                      {t('table.timeSaved.title')}
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Category Rows for Loading State */}
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden border-b border-border last:border-b-0 bg-card"
                  >
                    <div className="flex">
                      {/* Category Title & Mobile Info Cell */}
                      <div className="w-full p-0 relative align-top">
                        <div className="flex items-start gap-3 p-2 sm:p-3 relative z-10 w-full">
                          {/* Folder Icon */}
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 mt-0.5">
                            <Skeleton className="w-4 h-4 rounded-sm" />
                          </div>
                          {/* Text Content & Mobile Stats */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Title and Case Count */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-4 w-16 rounded-full" />
                            </div>
                            {/* Description */}
                            <Skeleton className="h-4 w-48" />

                            {/* Mobile-Only Stats */}
                            <div className="pt-1 space-y-1 text-xs text-muted-foreground flex flex-wrap gap-3">
                              {!columnVisibility.updated && (
                                <div className="flex items-center gap-1.5">
                                  <Skeleton className="w-3 h-3 rounded-full" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              )}
                              {!columnVisibility.users && (
                                <div className="flex items-center gap-1.5">
                                  <Skeleton className="w-3 h-3 rounded-full" />
                                  <Skeleton className="h-3 w-16" />
                                </div>
                              )}
                              {!columnVisibility.timeSaved && (
                                <div className="flex items-center gap-1.5">
                                  <Skeleton className="w-3 h-3 rounded-full" />
                                  <Skeleton className="h-3 w-20" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columns Conditionally Displayed */}
                      {columnVisibility.updated && (
                        <div className="w-[15%] px-1 sm:px-2 text-xs sm:text-sm align-middle flex items-center">
                          <div className="flex items-center gap-1.5 relative z-10">
                            <Skeleton className="w-3.5 h-3.5 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                      )}

                      {columnVisibility.users && (
                        <div className="w-[15%] px-1 sm:px-2 text-xs sm:text-sm align-middle flex items-center">
                          <div className="flex items-center gap-1.5 relative z-10">
                            <Skeleton className="w-3.5 h-3.5 rounded-full" />
                            <Skeleton className="h-4 w-10" />
                          </div>
                        </div>
                      )}

                      {columnVisibility.timeSaved && (
                        <div className="w-[20%] px-1 sm:px-2 text-xs sm:text-sm align-middle flex items-center">
                          <div className="flex items-center gap-1.5 relative z-10">
                            <Skeleton className="w-3.5 h-3.5 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                      )}

                      {/* Expand/Collapse Chevron */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-[10]">
                        <Skeleton className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Skeleton Pagination controls to maintain layout */}
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious className="opacity-70 pointer-events-none" />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink className="opacity-70 pointer-events-none">
                1
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationLink
                isActive
                className="opacity-70 pointer-events-none"
              >
                2
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext className="opacity-70 pointer-events-none" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          className="mb-4 w-full max-w-md"
        />
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error.title')}</AlertTitle>
          <AlertDescription>{categoriesError.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-2">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full sm:w-80"
          autoFocus
        />

        {searchQuery && (
          <div className="text-sm text-muted-foreground flex items-center">
            <span>
              {categories.length}{' '}
              {categories.length === 1
                ? t('table.category.single')
                : t('table.category.plural')}{' '}
              {t('search.found')}
            </span>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <Alert className="m-4 border-dashed border-border/50">
          <AlertTitle>
            {searchQuery
              ? t('search.noResults', { query: searchQuery })
              : t('table.category.noCategories')}
          </AlertTitle>
          <AlertDescription>
            {searchQuery
              ? t('search.tryAnotherQuery')
              : t('table.category.generateHint')}
          </AlertDescription>
        </Alert>
      ) : (
        <div
          ref={tableRef}
          className="rounded-lg bg-card w-full border border-border shadow-sm overflow-hidden"
        >
          <ScrollArea className="h-[500px] overflow-x-hidden">
            <div className="min-w-full">
              {/* Header */}
              <div className="bg-background z-10 border-b border-border">
                <div className="flex">
                  <div className="w-[45%] sm:w-[35%] pl-2 sm:pl-4 py-3 font-medium">
                    {t('table.category.title')}
                  </div>
                  {columnVisibility.updated && (
                    <div className="w-[15%] px-1 sm:px-2 py-3 font-medium">
                      {t('table.lastUpdated.title')}
                    </div>
                  )}
                  {columnVisibility.users && (
                    <div className="w-[15%] px-1 sm:px-2 py-3 font-medium">
                      {t('table.users.title')}
                    </div>
                  )}
                  {columnVisibility.timeSaved && (
                    <div className="w-[20%] px-1 sm:px-2 py-3 font-medium">
                      {t('table.timeSaved.title')}
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-border">
                {currentCategories.map((category, index) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    categoryColor="rgba(0, 0, 0, 0.1)"
                    totalTimeSaved={totalTimeSavedMap[category.id] || '0'}
                    isTimeSavedLoading={isTimeSavedLoading}
                    columnVisibility={columnVisibility}
                    totalUseCaseCount={totalUseCaseCount}
                    index={index}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Pagination controls */}
      {actualTotalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  actualCurrentPage > 1 &&
                  handlePageChange(actualCurrentPage - 1)
                }
                className={cn(
                  actualCurrentPage <= 1
                    ? 'pointer-events-none opacity-50'
                    : '',
                  isPageChanging || isCategoriesLoading
                    ? 'pointer-events-none opacity-50'
                    : '',
                )}
              />
            </PaginationItem>

            {Array.from({ length: actualTotalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === actualTotalPages ||
                  (page >= actualCurrentPage - 1 &&
                    page <= actualCurrentPage + 1),
              )
              .map((page, index, array) => {
                const showEllipsisBefore =
                  index > 0 && array[index - 1] !== page - 1;
                const showEllipsisAfter =
                  index < array.length - 1 && array[index + 1] !== page + 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        isActive={page === actualCurrentPage}
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          isPageChanging || isCategoriesLoading
                            ? 'pointer-events-none opacity-50'
                            : '',
                        )}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                    {showEllipsisAfter && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </React.Fragment>
                );
              })}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  actualCurrentPage < actualTotalPages &&
                  handlePageChange(actualCurrentPage + 1)
                }
                className={cn(
                  actualCurrentPage >= actualTotalPages
                    ? 'pointer-events-none opacity-50'
                    : '',
                  isPageChanging || isCategoriesLoading
                    ? 'pointer-events-none opacity-50'
                    : '',
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

// Add the missing PaginationEllipsis component since we're using it
const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
