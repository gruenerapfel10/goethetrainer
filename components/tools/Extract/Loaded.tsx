'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Globe,
  ExternalLink,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Hash,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtractedResult, getUrlSrc, getHostname, formatDisplayData } from './utils';

interface LoadedProps {
  results: ExtractedResult[];
  summary?: {
    total: number;
    successful: number;
    failed: number;
    totalTokens: number;
  };
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-neutral-500" />
      ) : (
        <Copy className="h-3 w-3 text-neutral-400" />
      )}
    </button>
  );
};

// Component to render extracted data in a formatted way
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
          {data.map((item, index) => (
            <li key={index} className="text-xs text-neutral-600 dark:text-neutral-400">
              <span className="text-neutral-500 mr-2">•</span>
              {typeof item === 'object' ? JSON.stringify(item) : item}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  
  // If it's an object, display as key-value pairs
  if (typeof data === 'object' && data !== null) {
    // Check if it has a content field and prioritize it
    if (data.content) {
      return <DataRenderer data={data.content} />;
    }
    
    const entries = Object.entries(data);
    
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
                      {value}
                    </p>
                  ) : Array.isArray(value) ? (
                    <ul className="space-y-0.5 mt-1">
                      {value.map((item, idx) => (
                        <li key={idx} className="text-xs text-neutral-500 flex items-start">
                          <span className="text-neutral-400 mr-2">•</span>
                          <span>{typeof item === 'object' ? JSON.stringify(item) : item}</span>
                        </li>
                      ))}
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

const ExtractResultItem = ({ result, index }: { result: ExtractedResult; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasData = result.success && result.data;
  const hostname = useMemo(() => getHostname(result.url), [result.url]);
  const faviconSrc = getUrlSrc(result.url);
  
  // For copy functionality, we still need the raw text
  const copyText = useMemo(() => formatDisplayData(result.data) || '', [result.data]);
  
  const handleToggle = () => {
    if (hasData) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
      <div 
        className={cn(
          "px-4 py-3",
          hasData && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
        )}
        onClick={handleToggle}
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
              <span className="text-sm font-medium">{hostname}</span>
              {result.success ? (
                <CheckCircle className="h-3 w-3 text-neutral-500" />
              ) : (
                <XCircle className="h-3 w-3 text-neutral-500" />
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
            
            {result.error && (
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
                isExpanded && "rotate-180"
              )} />
            </div>
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && hasData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 ml-7 mr-4 pb-2 relative">
                <div className="absolute -top-1 right-0 z-10">
                  <CopyButton text={copyText} />
                </div>
                <div className="pr-8">
                  <DataRenderer data={result.data} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export function Loaded({ results, summary }: LoadedProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Display logic - show 3 items initially, then allow expand
  const INITIAL_DISPLAY = 3;
  const hasMore = results.length > INITIAL_DISPLAY;
  const displayResults = showAll ? results : results.slice(0, INITIAL_DISPLAY);
  const remainingCount = results.length - INITIAL_DISPLAY;
  
  // Separate successful and failed results for summary
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  const finalSummary = summary || {
    total: results.length,
    successful: successfulResults.length,
    failed: failedResults.length,
    totalTokens: 0
  };
  
  return (
    <div className="space-y-3">
      {/* Compact Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-3">
          <span>{finalSummary.total} URLs</span>
          {finalSummary.successful > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {finalSummary.successful}
            </span>
          )}
          {finalSummary.failed > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {finalSummary.failed}
            </span>
          )}
        </div>
        {finalSummary.totalTokens > 0 && (
          <span className="text-neutral-400">
            {finalSummary.totalTokens.toLocaleString()} tokens
          </span>
        )}
      </div>
      
      {/* Results List */}
      {displayResults.length > 0 && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg">
          {displayResults.map((result, idx) => (
            <ExtractResultItem key={idx} result={result} index={idx} />
          ))}
        </div>
      )}
      
      {/* Show More/Less Button */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900/50 dark:hover:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-md transition-colors"
          >
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              showAll && "rotate-180"
            )} />
            {showAll ? 'Show less' : `Show ${remainingCount} more`}
          </button>
        </div>
      )}
    </div>
  );
}