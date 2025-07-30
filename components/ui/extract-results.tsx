'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, FileText, Loader2, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface ExtractedData {
  url: string;
  data: any;
}

interface ExtractResultsProps {
  results: ExtractedData | ExtractedData[];
  title?: string;
  isLoading?: boolean;
}

export function ExtractResults({
  results,
  title = 'Extracted Data...',
  isLoading = false,
}: ExtractResultsProps) {
  const resultsArray = Array.isArray(results) ? results : [results];
  const [openItems, setOpenItems] = useState<Record<number, boolean>>(
    // Initialize with first item open by default for better discoverability
    resultsArray.length ? { 0: true } : {},
  );

  const handleToggle = (index: number) => {
    setOpenItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleOpenURL = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="p-6 bg-muted/30 rounded-lg border border-border flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            <span>Extracting data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!resultsArray.length) return null;

  // Format simple values with proper typography
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return value.toString();
    return JSON.stringify(value, null, 2);
  };

  // Render array items with appropriate spacing and style
  const renderArrayItems = (items: any[]) => {
    return (
      <ul className="space-y-2 list-disc list-inside pl-1">
        {items.map((item, idx) => (
          <li key={idx} className="text-base leading-relaxed">
            {typeof item === 'object' && item !== null ? (
              renderObjectValue(item)
            ) : (
              <span className="ml-1">{formatValue(item)}</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // Format objects with semantic structure and visual hierarchy
  const renderObjectValue = (obj: Record<string, any>) => {
    if (!obj) return <span className="text-muted-foreground">—</span>;

    return (
      <div className="space-y-6">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {key}
            </h3>
            <div className="pl-0">
              {Array.isArray(value) ? (
                renderArrayItems(value)
              ) : typeof value === 'object' && value !== null ? (
                renderObjectValue(value)
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md">
                  {formatValue(value)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Get a friendly display name from URL
  const getFriendlyDomainName = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./i, '');
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="space-y-3">
        {resultsArray.map((result, index) => {
          const isOpen = openItems[index] || false;
          const domain = getFriendlyDomainName(result.url);

          return (
            <div
              key={index}
              className={cn(
                'border border-border rounded-lg overflow-hidden bg-card transition-all duration-200',
                isOpen ? 'shadow-md' : 'hover:border-border/80',
              )}
            >
              <button
                onClick={() => handleToggle(index)}
                className="flex w-full items-center justify-between p-4 text-left"
                aria-expanded={isOpen}
                aria-controls={`content-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 bg-muted rounded-md text-foreground">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-medium">{domain}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-60">
                      {result.url}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    onClick={(e) => handleOpenURL(result.url, e)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    aria-label={`Open ${domain} in new tab`}
                  >
                    <ExternalLink size={16} className="text-muted-foreground" />
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn(
                      'text-muted-foreground transition-transform duration-200',
                      isOpen ? 'rotate-180' : '',
                    )}
                  />
                </div>
              </button>

              <div
                id={`content-${index}`}
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <div className="p-5 border-t border-border">
                  {renderObjectValue(result.data)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
