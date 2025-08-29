'use client';

import React from 'react';
import { Folder, CalendarDays, Clock, Users, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import type { TopUseCaseCategory, UseCase } from '../common/types';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate, formatCompactDate, formatTotalTimeSaved } from '../common/utils';
import { useUseCasesByCategory } from '@/lib/use-cases/hooks/useUseCasesByCategory';
import { Skeleton } from "@/components/ui/skeleton";
import { UseCaseItem } from '../use-case-item';
import { UseCaseModal } from '../modal/use-case-modal';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface CategoryRowProps {
  category: TopUseCaseCategory;
  categoryColor: string;
  totalTimeSaved: string;
  isTimeSavedLoading: boolean;
  columnVisibility: {
    updated: boolean;
    users: boolean;
    timeSaved: boolean;
  };
  totalUseCaseCount?: number;
  index?: number;
  searchQuery?: string;
}

// Function to generate a gradient color based on index
const getGradientFromIndex = (index: number) => {
  // Use a base hue and rotate by index
  const baseHue = 200; // Start with a blue-ish hue
  const hueStep = 30; // Rotate by 30 degrees for each index
  const hue1 = (baseHue + (index * hueStep)) % 360; // Keep within 0-360 range
  const hue2 = (hue1 + 20) % 360; // Slight hue variation for gradient
  
  return `linear-gradient(90deg, hsla(${hue1}, 70%, 50%, 0.15), hsla(${hue2}, 70%, 50%, 0.15))`;
};

// Function to highlight search matches in text
const highlightSearchMatches = (text: string, searchQuery: string) => {
  if (!searchQuery || !text) return text;
  
  const regex = new RegExp(`(${searchQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return <span key={i} className="search-highlight">{part}</span>;
    }
    return part;
  });
};

// Function to highlight search matches in text with muted style
const highlightSearchMatchesMuted = (text: string, searchQuery: string) => {
  if (!searchQuery || !text) return text;
  
  const regex = new RegExp(`(${searchQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return <span key={i} className="search-highlight-muted">{part}</span>;
    }
    return part;
  });
};

export const CategoryRow = ({
  category,
  categoryColor,
  totalTimeSaved,
  isTimeSavedLoading,
  columnVisibility,
  totalUseCaseCount = 0,
  index = 0,
  searchQuery = '',
}: CategoryRowProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedUseCase, setSelectedUseCase] = React.useState<UseCase | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  // Load data with caching support - only trigger when expanded
  const { 
    useCases, 
    isLoading: isUseCasesLoading, 
    error: useCasesError,
    totalPages,
    currentPage,
    handlePageChange,
    refreshUseCases,
    isCached
  } = useUseCasesByCategory(
    isExpanded ? category.id : null,
    { useCache: true }  // Enable caching
  );
  
  // Track expand/collapse for animation purposes
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  
  React.useEffect(() => {
    if (isExpanded) {
      setIsInitialLoad(false);
    }
  }, [isExpanded]);
  
  const totalMinutes = Number.parseInt(totalTimeSaved, 10) || 0;
  const displayTimeSaved = formatTotalTimeSaved(isTimeSavedLoading ? 0 : totalMinutes);
  
  // Generate a gradient color based on index
  const bgGradient = getGradientFromIndex(index);
  
  // Calculate progress percentage
  const progressPercentage = totalUseCaseCount > 0 
    ? (category.useCaseCount / totalUseCaseCount) * 100
    : 0;

  // Prevent pagination clicks while loading
  const handlePageClick = (page: number) => {
    if (!isUseCasesLoading) {
      handlePageChange(page);
    }
  };
  
  // Force refresh data - clear cache and reload
  const handleRefreshData = (e: React.MouseEvent) => {
    e.stopPropagation();  // Don't trigger row collapse
    refreshUseCases(currentPage);
  };

  // Handle use case click - open modal
  const handleUseCaseClick = (useCase: UseCase) => {
    setSelectedUseCase(useCase);
    setIsModalOpen(true);
  };

  // Handle show full chat
  const handleShowFullChat = (useCase: UseCase) => {
    // This is handled inside the modal
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUseCase(null);
  };

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden group",
          "transition-all duration-200 ease-in-out",
          "border-b border-border last:border-b-0",
          "bg-background hover:bg-muted/50",
          "cursor-pointer",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Background progress bar with gradient */}
        <div 
          className="absolute left-0 top-0 bottom-0 z-0 transition-all duration-300 ease-in-out"
          style={{ 
            width: `${progressPercentage}%`, 
            background: bgGradient,
          }}
          aria-hidden="true"
        />
        
        <div className="flex">
          {/* Category Title & Mobile Info Cell */}
          <div className="w-full p-0 relative align-top group-hover:border-l-2 group-hover:border-primary/40 group-hover:pl-0.5 transition-all duration-150">
            <div className="flex items-start gap-3 p-2 sm:p-3 relative z-10 w-full">
              {/* Folder Icon */}
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-primary bg-primary/10 group-hover:bg-primary/15 group-hover:scale-105 transition-all duration-150 mt-0.5">
                <Folder className="w-4 h-4" />
              </div>
              {/* Text Content & Mobile Stats */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* Title and Case Count */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className="text-sm sm:text-base font-semibold line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors duration-150"
                    title={category.title}
                  >
                    {highlightSearchMatches(category.title, searchQuery)}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-xs h-5 px-1.5 bg-muted/60 group-hover:bg-muted/80 transition-colors duration-150"
                  >
                    {category.useCaseCount ?? 0} {category.useCaseCount === 1 ? 'case' : 'cases'}
                  </Badge>
                </div>
                {/* Description */}
                {category.description && (
                  <div
                    className={cn(
                      "text-xs sm:text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-150",
                      isExpanded ? "line-clamp-none" : "line-clamp-1"
                    )}
                    title={category.description}
                  >
                    {highlightSearchMatchesMuted(category.description, searchQuery)}
                  </div>
                )}
                {/* Mobile-Only Stats */}
                <div className="pt-1 space-y-1 text-xs text-muted-foreground flex flex-wrap gap-3">
                  {!columnVisibility.updated && (
                    <div className="flex items-center gap-1.5" title={`Last updated: ${formatDate(category.updatedAt)}`}>
                      <CalendarDays className="w-3 h-3 text-orange-500" />
                      <span>Updated: {formatCompactDate(category.updatedAt)}</span>
                    </div>
                  )}
                  {!columnVisibility.users && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-purple-500" />
                      <span>Users: {category.uniqueUserCount ?? '-'}</span>
                    </div>
                  )}
                  {!columnVisibility.timeSaved && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-blue-500" />
                      <span>Time Saved: {displayTimeSaved}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Columns Conditionally Displayed */}
          {columnVisibility.updated && (
            <div className="w-[15%] px-1 sm:px-2 text-xs sm:text-sm text-muted-foreground align-middle group-hover:text-foreground/90 transition-colors duration-150 flex items-center">
              <div className="flex items-center gap-1.5 relative z-10 whitespace-nowrap" title={`Last updated: ${formatDate(category.updatedAt)}`}>
                <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
                {formatCompactDate(category.updatedAt)}
              </div>
            </div>
          )}
          
          {columnVisibility.users && (
            <div className="w-[15%] px-1 sm:px-2 text-xs sm:text-sm text-muted-foreground align-middle group-hover:text-foreground/90 transition-colors duration-150 flex items-center">
              <div className="flex items-center gap-1.5 relative z-10 whitespace-nowrap">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                {category.uniqueUserCount ?? '-'}
              </div>
            </div>
          )}
          
          {columnVisibility.timeSaved && (
            <div className="w-[20%] px-1 sm:px-2 text-xs sm:text-sm text-muted-foreground align-middle group-hover:text-foreground/90 transition-colors duration-150 flex items-center">
              <div className="flex items-center gap-1.5 relative z-10 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="transition-all duration-300 group-hover:scale-105">
                  {displayTimeSaved}
                </span>
              </div>
            </div>
          )}

          {/* Expand/Collapse Chevron - Now part of the flex layout */}
          <div className="flex items-center justify-center px-4 pointer-events-none">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Use Cases Section */}
      {isExpanded && (
        <div className="bg-background w-full overflow-hidden">
          <div className="p-4 space-y-4 max-w-full">
            {/* Pagination - Always show if there are pages */}
            {totalPages > 1 && (
              <Pagination className="w-full overflow-x-auto pb-2">
                <PaginationContent className="flex justify-center gap-1">
                  {/* Previous Button */}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageClick(currentPage - 1)}
                      className={cn(
                        currentPage <= 1 ? "pointer-events-none opacity-50" : "",
                        isUseCasesLoading ? "pointer-events-none opacity-50" : ""
                      )}
                      size="icon"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                  
                  {/* First Page */}
                  {currentPage > 2 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageClick(1)}
                        className={isUseCasesLoading ? "pointer-events-none opacity-50" : ""}
                        size="icon"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Left Ellipsis */}
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Previous Page */}
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageClick(currentPage - 1)}
                        className={isUseCasesLoading ? "pointer-events-none opacity-50" : ""}
                        size="icon"
                      >
                        {currentPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Current Page */}
                  <PaginationItem>
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium">
                      {currentPage}
                    </span>
                  </PaginationItem>
                  
                  {/* Next Page */}
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageClick(currentPage + 1)}
                        className={isUseCasesLoading ? "pointer-events-none opacity-50" : ""}
                        size="icon"
                      >
                        {currentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Right Ellipsis */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Last Page */}
                  {currentPage < totalPages - 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageClick(totalPages)}
                        className={isUseCasesLoading ? "pointer-events-none opacity-50" : ""}
                        size="icon"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Next Button */}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageClick(currentPage + 1)}
                      className={cn(
                        currentPage >= totalPages ? "pointer-events-none opacity-50" : "",
                        isUseCasesLoading ? "pointer-events-none opacity-50" : ""
                      )}
                      size="icon"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            {/* Content Section */}
            {isUseCasesLoading && !isCached ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-full">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex flex-col p-3 rounded-lg bg-card overflow-hidden">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : useCasesError ? (
              <div className="text-sm text-destructive">
                Failed to load use cases: {useCasesError.message}
              </div>
            ) : useCases.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No use cases found in this category.
              </div>
            ) : (
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-full",
                isCached && "staggered-grid" // Apply staggered animation for cached content
              )}>
                {useCases.map((useCase, idx) => (
                  <UseCaseItem
                    key={useCase.id}
                    useCase={useCase}
                    onClick={handleUseCaseClick}
                    index={idx}
                    isCached={isCached}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Use Case Modal */}
      {selectedUseCase && (
        <UseCaseModal
          useCase={selectedUseCase}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onShowFullChat={handleShowFullChat}
        />
      )}
    </>
  );
};