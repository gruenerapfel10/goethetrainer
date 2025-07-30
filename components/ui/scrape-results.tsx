'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  FileText,
  Loader2,
  Globe,
  X,
  ExternalLink,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface ScrapeResultsProps {
  url: string;
  data: string;
  title?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  description?: string;
  source?: string;
  icon?: string;
  onRetry?: () => void;
}

export function ScrapeResults({
  url,
  data,
  title = 'Scraped Content',
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to scrape content. Please try again.',
  description,
  source,
  icon,
  onRetry,
}: ScrapeResultsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contentPreview, setContentPreview] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Generate a content preview
  useEffect(() => {
    if (data) {
      // Create a preview of first ~100 characters
      const preview = data.substring(0, 100).trim();
      setContentPreview(preview + (data.length > 100 ? '...' : ''));
    }
  }, [data]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data) {
      navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hostname = url ? new URL(url).hostname : '';
  const displaySource = source || hostname;

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-4 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-sm bg-muted animate-pulse"></div>
              <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
            </div>
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
          <div className="p-4 pt-2">
            <div className="h-3 bg-muted animate-pulse rounded w-full mb-2"></div>
            <div className="h-3 bg-muted animate-pulse rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted animate-pulse rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">
                Failed to scrape content
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {errorMessage}
              </p>
              {url && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe size={12} />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-primary truncate max-w-xs"
                  >
                    {url}
                  </a>
                </div>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 text-xs bg-background hover:bg-muted px-2 py-1 rounded border border-border"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Source:</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-primary flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {displaySource}
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <div
        className="rounded-lg border border-border overflow-hidden bg-background"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex items-center justify-between w-full p-4 hover:bg-muted/40 transition-colors cursor-pointer"
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls="scrape-content"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle(e as unknown as React.MouseEvent);
            }
          }}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center justify-center size-6 shrink-0 rounded-sm bg-background ring-1 ring-border text-[10px] font-medium overflow-hidden">
              {icon ? (
                <div className="relative size-4">
                  <Image
                    src={icon}
                    alt={displaySource}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="relative size-4">
                  <Image
                    src={`https://www.google.com/s2/favicons?sz=128&domain=${url}`}
                    alt=""
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-start text-left w-full">
              <span className="text-sm font-medium flex items-center gap-1">
                {displaySource}
              </span>

              {/* Content preview - only show when not expanded */}
              {!isOpen && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 text-left w-full pr-6">
                  {contentPreview || description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-2 shrink-0">
            <div
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(e);
              }}
              className="text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-muted focus:ring-1 focus:ring-border focus:outline-none cursor-pointer"
              aria-label="Copy content"
              title="Copy to clipboard"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  copyToClipboard(e as unknown as React.MouseEvent);
                }
              }}
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </div>
            <ChevronRight
              size={16}
              className={cn(
                'text-muted-foreground transition-transform',
                isOpen && 'rotate-90',
              )}
            />
          </div>
        </div>

        <div
          id="scrape-content"
          className={cn(
            'grid transition-all duration-200',
            isOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="p-4 pt-0 grid gap-1.5 min-w-0">
              <div
                ref={contentRef}
                className="text-sm whitespace-pre-wrap break-words bg-muted/50 rounded-md p-3 max-h-96 overflow-y-auto"
              >
                {data}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/60"
                >
                  <span>View source</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={copyToClipboard}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/60"
                >
                  {copied ? (
                    <>
                      <span>Copied!</span>
                      <Check size={12} className="text-green-500" />
                    </>
                  ) : (
                    <>
                      <span>Copy text</span>
                      <Copy size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced tooltip on hover, only when not expanded */}
      {isHovered && description && !isOpen && (
        <div className="absolute z-50 w-72 p-3 bg-background shadow-lg rounded-lg border border-border mt-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center size-4 shrink-0 rounded-sm bg-background ring-1 ring-border overflow-hidden">
              {icon ? (
                <Image
                  src={icon}
                  alt={displaySource}
                  width={16}
                  height={16}
                  className="object-contain"
                />
              ) : (
                <Image
                  src={`https://www.google.com/s2/favicons?sz=128&domain=${url}`}
                  alt=""
                  width={16}
                  height={16}
                  className="object-contain"
                />
              )}
            </div>
            <h4 className="font-medium text-sm">{displaySource}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Click to expand
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View source
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
