'use client';

import React from 'react';
import { TableHead } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ChevronsUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = 'title' | 'updatedAt' | 'uniqueUserCount' | 'timeSaved';
type SortDirection = 'asc' | 'desc';

interface SortableTableHeaderProps {
  label: string;
  sortKey: SortKey;
  sortConfig: {
    key: SortKey;
    direction: SortDirection;
  };
  onSort: (key: SortKey) => void;
  tooltip?: string;
  className?: string;
  isVisible?: boolean;
}

export const SortableTableHeader = ({ 
  label, 
  sortKey, 
  sortConfig, 
  onSort,
  tooltip,
  className = "",
  isVisible = true
}: SortableTableHeaderProps) => {
  const isSorted = sortConfig.key === sortKey;
  
  // If not visible, don't render anything
  if (!isVisible && sortKey !== 'title') {
    return null;
  }
  
  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none group",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/70 inline-block ml-1 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className={cn(
          "transition-colors",
          isSorted ? "text-foreground" : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
        )}>
          {isSorted ? (
            sortConfig.direction === 'asc' ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </div>
      </div>
    </TableHead>
  );
};