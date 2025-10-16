'use client';

import { useState, memo } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export interface InlineSourceProps {
  title: string;
  url: string;
  description?: string;
  domain: string;
  favicon?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

const InlineSourceComponent = ({
  title,
  url,
  description,
  domain,
  favicon,
  variant = 'compact',
  className = '',
}: InlineSourceProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const displayTitle = title.length > 15 ? `${title.substring(0, 15)}...` : title;

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`
          inline-flex items-center font-medium hover:underline rounded transition-colors
          ${
            variant === 'compact'
              ? 'text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 mx-0.5'
              : 'text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1'
          }
          dark:text-blue-400 dark:bg-blue-950/50 dark:hover:bg-blue-900/50
        `}
        onClick={handleClick}
        title={`Source: ${domain}`}
        aria-label={`External link to ${title}`}
      >
        {displayTitle}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 m-0 w-80 p-3 
                     bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 
                     rounded-lg shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden shrink-0">
                {favicon ? (
                  <div className="relative size-4">
                    <Image
                      src={favicon}
                      alt=""
                      fill
                      className="object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-4 h-4 text-gray-400"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <Globe size={14} className="text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                  {domain}
                </div>
                {description && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {description}
                  </div>
                )}
              </div>

              <button
                onClick={handleClick}
                className="shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                aria-label="Open link"
              >
                <ExternalLink size={14} className="text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

export const InlineSource = memo(InlineSourceComponent);