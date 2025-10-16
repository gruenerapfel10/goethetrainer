'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface WebArtifactProps {
  artifact: ArtifactData;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '/favicon.ico';
  }
}

export function WebArtifact({ artifact, onNavigate, onClose }: WebArtifactProps) {
  const sources = artifact.sources || [];
  const currentIndex = artifact.currentSourceIndex || 0;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : sources.length - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < sources.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  };

  const currentSource = sources[currentIndex];

  return (
    <div className="w-full h-full bg-background relative">
      <iframe
        src={artifact.content}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        title={artifact.title}
      />

      {sources.length > 0 && (
        <div
          className={cn(
            "absolute top-2 left-2 right-2 z-50 flex justify-center",
            "transition-all duration-300 ease-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 py-2 bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg max-w-full overflow-hidden">
            <button
              onClick={handlePrevious}
              className="flex-shrink-0 p-1 sm:p-1.5 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
              disabled={sources.length <= 1}
              aria-label="Previous source"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[120px] sm:max-w-[200px] md:max-w-xs">
              {sources.map((source, index) => (
                <button
                  key={index}
                  onClick={() => onNavigate(index)}
                  className={cn(
                    "relative group transition-all duration-200 rounded-full overflow-hidden flex-shrink-0",
                    index === currentIndex
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "hover:scale-110"
                  )}
                  aria-label={`Go to ${source.title}`}
                  title={source.title}
                >
                  <div className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-accent/50 backdrop-blur-sm",
                    index === currentIndex && "bg-accent"
                  )}>
                    <img
                      src={getFaviconUrl(source.url)}
                      alt=""
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-[10px] sm:text-xs font-medium">${index + 1}</span>`;
                        }
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden sm:flex flex-1 min-w-0 max-w-[180px] md:max-w-xs px-1 md:px-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium truncate">{currentSource?.title}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                  {currentIndex + 1} of {sources.length}
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="flex-shrink-0 p-1 sm:p-1.5 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
              disabled={sources.length <= 1}
              aria-label="Next source"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <a
              href={currentSource?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1 sm:p-1.5 rounded-full hover:bg-accent transition-colors"
              aria-label="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>

            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 sm:p-1.5 rounded-full hover:bg-accent transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
