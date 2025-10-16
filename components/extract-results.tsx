'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, FileText, Loader2, ExternalLink, Globe, CheckCircle, XCircle, AlertCircle, Hash, List } from 'lucide-react';
import { useState, useMemo } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtractedData {
  url: string;
  data: any;
  success?: boolean;
  error?: string;
}

interface ExtractResultsProps {
  results: ExtractedData | ExtractedData[];
  title?: string;
  isLoading?: boolean;
  totalSources?: number;
  processedSources?: number;
}

// Generate hash from URL for unique identification
const generateUrlHash = (url: string, index: number): string => {
  try {
    const fullHash = btoa(encodeURIComponent(url));
    return `${fullHash.substring(0, 6)}-${fullHash.substring(
      fullHash.length - 6,
    )}-${index}`;
  } catch (e) {
    return `url-${index}-${url.length}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;
  }
};

// Extract friendly domain name from URL
const getFriendlyDomainName = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./i, '');
  } catch (e) {
    return url;
  }
};

// Get favicon URL for a given URL
const getUrlSrc = (url: string): string | null => {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  } catch {
    return null;
  }
};


// Modern data rendering component
const DataRenderer = ({ data }: { data: any }) => {
  if (!data) return null;
  
  // If it's a string, display it as text
  if (typeof data === 'string') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Content</span>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
          {data}
        </p>
      </div>
    );
  }
  
  // If it's an array, display as a list
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <List className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            List ({data.length} items)
          </span>
        </div>
        <ul className="space-y-1 ml-5">
          {data.slice(0, 10).map((item, index) => (
            <li key={index} className="text-xs text-neutral-600 dark:text-neutral-400">
              <span className="text-neutral-500 mr-2">•</span>
              {typeof item === 'object' ? JSON.stringify(item) : item}
            </li>
          ))}
          {data.length > 10 && (
            <li className="text-xs text-neutral-400 italic">...and {data.length - 10} more</li>
          )}
        </ul>
      </div>
    );
  }
  
  // If it's an object, display as key-value pairs
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data).filter(([_, value]) => value !== null && value !== undefined);
    
    return (
      <div className="space-y-3">
        {entries.map(([key, value], index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-start gap-2">
              <Hash className="h-3 w-3 text-neutral-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div className="mt-1">
                  {typeof value === 'string' ? (
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      {value.length > 200 ? `${value.substring(0, 200)}...` : value}
                    </p>
                  ) : Array.isArray(value) ? (
                    <ul className="space-y-0.5 mt-1">
                      {value.slice(0, 5).map((item, idx) => (
                        <li key={idx} className="text-xs text-neutral-500 flex items-start">
                          <span className="text-neutral-400 mr-2">•</span>
                          <span>{typeof item === 'object' ? JSON.stringify(item) : item}</span>
                        </li>
                      ))}
                      {value.length > 5 && (
                        <li className="text-xs text-neutral-400 italic">...and {value.length - 5} more</li>
                      )}
                    </ul>
                  ) : typeof value === 'object' && value !== null ? (
                    <div className="mt-1 ml-3 pl-3 border-l border-neutral-200 dark:border-neutral-800">
                      <DataRenderer data={value} />
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      {String(value)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Fallback to string representation
  return (
    <p className="text-xs text-neutral-600 dark:text-neutral-400">
      {String(data)}
    </p>
  );
};

// Enhanced data rendering with better formatting
const renderEnhancedData = (obj: Record<string, any>) => {
  if (!obj)
    return <span className="text-neutral-500 text-xs">No data available</span>;

  if (typeof obj !== 'object') {
    return <span className="text-neutral-500 text-xs">Invalid data format</span>;
  }

  const entries = Object.entries(obj);

  if (entries.length === 0) {
    return <span className="text-neutral-500 text-xs">No data extracted</span>;
  }

  // Use the modern DataRenderer
  return <DataRenderer data={obj} />;
};


export function ExtractResults({
  results,
  title = 'Extracted Data',
  isLoading = false,
  totalSources = 0,
  processedSources = 0,
}: ExtractResultsProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // Enhanced results processing with better unique ID generation
  const resultsArray = useMemo(() => {
    if (!results) return [];
    const array = Array.isArray(results) ? results : [results];

    if (array.length === 0) {
      return [];
    }

    const processed = array.map((result, index) => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 12);
      const urlHash = result?.url
        ? generateUrlHash(result.url, index)
        : `no-url-${index}`;
      const uniqueId = `extract-${index}-${urlHash}-${timestamp}-${random}`;

      const processedResult = {
        ...result,
        uniqueId,
        debugInfo: {
          originalIndex: index,
          timestamp,
          random,
          urlHash,
        },
      };

      return processedResult;
    });

    return processed;
  }, [results]);

  const handleToggle = (uniqueId: string) => {
    setOpenItems((prev) => ({ ...prev, [uniqueId]: !prev[uniqueId] }));
  };

  const handleOpenURL = (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  // Loading state
  if (isLoading) {
    return (
      <div className="w-full mb-4">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Loader2 size={16} className="animate-spin text-neutral-500" />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Analyzing data from {totalSources || 'multiple'} sources...
          </span>
          {totalSources > 0 && processedSources > 0 && (
            <span className="text-xs text-neutral-500 ml-auto">
              ({processedSources}/{totalSources})
            </span>
          )}
        </div>
      </div>
    );
  }

  // Early returns for empty states
  if (!results) return null;

  // Check if we have any meaningful data
  const hasAnyData = resultsArray.some(
    (result) =>
      result?.url && ((result.success && result.data) || result.error),
  );

  if (!hasAnyData) return null;

  const validResults = resultsArray.filter((result) => result?.url);

  // Calculate summary stats
  const successfulResults = validResults.filter(r => r.success !== false);
  const failedResults = validResults.filter(r => r.success === false || r.error);

  return (
    <div className="w-full mb-4 space-y-3">
      {/* Compact Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-3">
          <span className="font-medium">{validResults.length} URLs</span>
          {successfulResults.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {successfulResults.length}
            </span>
          )}
          {failedResults.length > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {failedResults.length}
            </span>
          )}
        </div>
      </div>
      
      {/* Results List */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
        {validResults.map((result, renderIndex) => {
          const isOpen = openItems[result.uniqueId] || false;
          const domain = getFriendlyDomainName(result.url);
          const hasError = result.error || result.success === false;
          const hasData = result.data && !hasError;
          const faviconSrc = getUrlSrc(result.url);

          return (
            <div
              key={result.uniqueId}
              className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
              data-debug-key={result.uniqueId}
              data-debug-url={result.url}
              data-render-index={renderIndex}
            >
              <div
                onClick={() => handleToggle(result.uniqueId)}
                className={cn(
                  "px-4 py-3 transition-colors",
                  hasData && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                )}
                aria-expanded={isOpen}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {faviconSrc ? (
                      <img
                        src={faviconSrc}
                        alt=""
                        className="w-4 h-4 rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling;
                          if (fallback) {
                            (fallback as HTMLElement).style.display = 'block';
                          }
                        }}
                      />
                    ) : null}
                    <Globe className="h-4 w-4 text-neutral-400 hidden" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{domain}</span>
                      {hasError ? (
                        <XCircle className="h-3 w-3 text-neutral-500" />
                      ) : (
                        <CheckCircle className="h-3 w-3 text-neutral-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 mt-0.5">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 truncate max-w-[400px] transition-colors flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {result.url}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    
                    {hasError && result.error && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <AlertCircle className="h-3 w-3 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{result.error}</p>
                      </div>
                    )}
                  </div>
                  
                  {hasData && (
                    <div className="flex-shrink-0">
                      <ChevronDown className={cn(
                        "h-4 w-4 text-neutral-400 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )} />
                    </div>
                  )}
                </div>
              </div>
              
              <AnimatePresence>
                {isOpen && hasData && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 border-t border-neutral-100 dark:border-neutral-800/50">
                      <div className="pt-3">
                        {renderEnhancedData(result.data)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
