'use client';

import React, { useState, useCallback } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { SearchResult, getUrlSrc } from './utils';
import { useChat } from '@/contexts/chat-context';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import { cn } from '@/lib/utils';

interface LoadedProps {
  searchResults: SearchResult[];
  isArtifactVisible: boolean;
}

export function Loaded({ 
  searchResults, 
  isArtifactVisible 
}: LoadedProps) {
  const { createArtifact, artifactsState, navigateArtifactSource } = useArtifactsContext();
  const [showAll, setShowAll] = useState(false);
  
  const INITIAL_DISPLAY = 3;
  const hasMore = searchResults.length > INITIAL_DISPLAY;
  const displayResults = showAll ? searchResults : searchResults.slice(0, INITIAL_DISPLAY);
  const remainingResults = searchResults.slice(INITIAL_DISPLAY);
  
  const handleSourceClick = useCallback((e: React.MouseEvent<HTMLElement>, sourceIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const webSources = searchResults.map(result => ({
      url: result.url,
      title: result.title,
      favicon: undefined
    }));
    
    const existingWebpageArtifacts = Object.values(artifactsState.artifacts).filter(
      (art: any) => art.kind === 'webpage'
    );
    
    if (existingWebpageArtifacts.length > 0) {
      const existingArtifact = existingWebpageArtifacts[0] as any;
      navigateArtifactSource(existingArtifact.documentId, sourceIndex);
    } else {
      const selectedSource = webSources[sourceIndex];
      createArtifact({
        documentId: `webpage-${Date.now()}`,
        kind: 'webpage' as any,
        title: selectedSource.title,
        content: selectedSource.url,
        sources: webSources,
        currentSourceIndex: sourceIndex,
      });
    }
  }, [searchResults, artifactsState.artifacts, createArtifact, navigateArtifactSource]);
  
  return (
    <div className="w-full space-y-3">
      {/* Results Container */}
      <div className="w-full">
        {/* Results Grid */}
        <div className={cn(
          "grid gap-2 sm:gap-3 transition-all duration-300",
          isArtifactVisible 
            ? "grid-cols-1 max-w-full" 
            : showAll
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4" // 2x2 on mobile, 4 across on desktop
        )}>
          {/* Result Cards */}
          {displayResults.map((source, index) => (
            <article
              key={index}
              onClick={(e) => handleSourceClick(e, index)}
              className={cn(
                "group relative flex flex-col min-h-0",
                "bg-card hover:bg-accent/5",
                "border border-border/50 hover:border-border",
                "rounded-lg overflow-hidden",
                "cursor-pointer transition-all duration-200",
                "hover:shadow-md",
                "animate-in fade-in-50 duration-300 fill-mode-backwards",
                // Ensure cards don't have minimum heights on mobile
                "h-auto"
              )}
              style={{
                animationDelay: `${Math.min(index * 30, 150)}ms`
              }}
            >
            {/* Card Content - smaller padding on mobile */}
            <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Header with favicon and title */}
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={getUrlSrc(source.url)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        const icon = document.createElement('div');
                        icon.innerHTML = '<svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>';
                        target.parentElement.appendChild(icon);
                      }
                    }}
                  />
                  <FileText className="hidden w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {source.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {new URL(source.url).hostname}
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {source.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {source.description}
                </p>
              )}
            </div>
            
            {/* Hover overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </article>
        ))}
        
        {/* "+X sources" Card - shows as 4th card when collapsed - THINNER than others */}
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className={cn(
              "group relative flex flex-col min-h-0",
              "bg-gradient-to-b from-secondary/30 to-secondary/50 hover:from-secondary/50 hover:to-secondary/70",
              "border border-dashed border-border/60 hover:border-solid hover:border-border",
              "rounded-lg overflow-hidden",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-md",
              "animate-in fade-in-50 duration-300 fill-mode-backwards",
              "h-auto items-center justify-center py-4 px-2" // Less padding = thinner appearance
            )}
            style={{
              animationDelay: `${Math.min(3 * 30, 150)}ms`
            }}
          >
            {/* Overlapping source icons - smaller */}
            <div className="flex items-center justify-center mb-1.5">
              <div className="flex -space-x-3">
                {remainingResults.slice(0, 3).map((source, idx) => (
                  <div
                    key={idx}
                    className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-card border border-border overflow-hidden shadow-sm"
                    style={{ zIndex: 3 - idx }}
                  >
                    <img
                      src={getUrlSrc(source.url)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 0v6m0-6V6m6 6v6m0-6V6" /></svg></div>';
                        }
                      }}
                    />
                  </div>
                ))}
                {remainingResults.length > 3 && (
                  <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-semibold text-primary">
                      +{remainingResults.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Text - more compact */}
            <div className="text-center">
              <p className="text-xs sm:text-sm font-semibold text-foreground/80">
                {remainingResults.length} more
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground opacity-80">
                sources
              </p>
            </div>
          </button>
        )}
        </div>
      </div>
      
      {/* Show Less Button - only shows when expanded */}
      {hasMore && showAll && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(false)}
            className={cn(
              "group flex items-center gap-2 px-4 py-2",
              "text-sm font-medium text-muted-foreground hover:text-foreground",
              "bg-secondary/50 hover:bg-secondary",
              "border border-border/50 hover:border-border",
              "rounded-full transition-all duration-200",
              "hover:shadow-sm"
            )}
          >
            <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            Show Less
          </button>
        </div>
      )}
      
      {/* Results summary */}
      <div className="text-center text-xs text-muted-foreground">
        Showing {displayResults.length} of {searchResults.length} results
      </div>
    </div>
  );
}