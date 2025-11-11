'use client';

import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageGenerationOutput, } from './utils';

interface FullscreenViewProps {
  result: ImageGenerationOutput;
  onClose: () => void;
  onDownload: () => void;
}

export function FullscreenView({ result, onClose, onDownload }: FullscreenViewProps) {
  if (!result?.imageUrl) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Close button - floating top right */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onClose}
        className="absolute top-2 sm:top-4 right-2 sm:right-4 h-8 w-8 sm:h-10 sm:w-10 bg-black/50 border-white/20 text-white hover:bg-black/70 z-10"
      >
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>

      {/* Download button - floating top right */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onDownload}
        className="absolute top-2 sm:top-4 right-12 sm:right-16 h-8 w-8 sm:h-10 sm:w-10 bg-black/50 border-white/20 text-white hover:bg-black/70 z-10"
      >
        <Download className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      {/* Main image container */}
      <motion.div
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={result.imageUrl}
          alt={result.prompt || 'Generated image'}
          className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
        />
        
        {/* Image metadata badges - bottom left overlay */}
        {(result.size || result.quality) && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex gap-1 sm:gap-2">
            {result.size && (
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-black/70 backdrop-blur-sm text-white rounded-md border border-white/20">
                {result.size}
              </span>
            )}
            {result.quality && (
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-black/70 backdrop-blur-sm text-white rounded-md border border-white/20">
                {result.quality?.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Enhanced prompt overlay - bottom full width */}
        {result.metadata?.revisedPrompt && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
            <motion.div
              className="bg-black/70 backdrop-blur-sm text-white p-2 sm:p-4 rounded-lg border border-white/20 max-h-24 sm:max-h-32 overflow-y-auto w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-[10px] sm:text-xs text-white/70 mb-1 sm:mb-2">Enhanced prompt:</p>
              <p className="text-xs sm:text-sm leading-relaxed">
                {result.metadata.revisedPrompt}
              </p>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}