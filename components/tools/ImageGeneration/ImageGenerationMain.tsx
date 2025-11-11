'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loading } from './Loading';
import { Loaded } from './Loaded';
import { Error } from './Error';
import { FullscreenView } from './FullscreenView';
import { 
  type ImageGenerationProps, 
  processOutput, 
  getImageFilename 
} from './utils';

export const ImageGenerationMain = memo<ImageGenerationProps>(
  ({ toolCallId, state, input, output, error }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1024, height: typeof window !== 'undefined' ? window.innerHeight : 768 });
    const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
    
    // Debug state override
    const [debugState, setDebugState] = useState<string | null>(null);
    const effectiveState = debugState || state;
    
    const isLoading = effectiveState === 'input-available' || effectiveState === 'input-streaming';
    const isComplete = effectiveState === 'output-available';
    const isError = effectiveState === 'output-error' || (isComplete && !output) || error;
    
    const result = processOutput(output) || (isError ? { success: false, error } : undefined);
    
    // Use actual data even in debug mode - no mock data
    const effectiveResult = result;
    
    // Handle window resize
    useEffect(() => {
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
      const imageUrl = effectiveResult && 'imageUrl' in effectiveResult ? effectiveResult.imageUrl : undefined;
      if (imageUrl) {
        const img = new Image();
        img.onload = () => {
          setImageLoaded(true);
          const maxWidth = Math.min(512, window.innerWidth - 32);
          const maxHeight = window.innerHeight * 0.6;
          const widthRatio = maxWidth / img.width;
          const heightRatio = maxHeight / img.height;
          const ratio = Math.min(widthRatio, heightRatio, 1);
          setImageDimensions({
            width: img.width * ratio,
            height: img.height * ratio
          });
        };
        img.src = imageUrl;
      }
    }, [effectiveResult]);

    const handleDownload = async () => {
      const downloadResult = effectiveResult || result;
      if (!downloadResult || !('imageUrl' in downloadResult) || !downloadResult.imageUrl) return;
      
      try {
        const response = await fetch(downloadResult.imageUrl!);
        
        if (!response.ok) {
          throw new (globalThis.Error)('Failed to fetch image');
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const filename = getImageFilename(downloadResult.prompt);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (error) {
        console.error('Download failed, trying alternative method:', error);
        
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = downloadResult.imageUrl! || '';
          });
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = getImageFilename(downloadResult.prompt);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              }
            }, 'image/png');
          }
        } catch (canvasError) {
          console.error('Canvas method also failed:', canvasError);
          const link = document.createElement('a');
          link.href = downloadResult.imageUrl!;
          link.download = getImageFilename(downloadResult.prompt);
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          window.open(downloadResult.imageUrl!, '_blank');
        }
      }
    };

    const getContainerStyle = useCallback(() => {
      const defaultWidth = Math.min(512, windowSize.width - 32); // 16px padding on each side
      const defaultHeight = Math.min(320, windowSize.height * 0.4);
      
      if (isLoading) {
        return {
          width: defaultWidth,
          height: defaultHeight,
        };
      }
      if (!imageLoaded && isComplete) {
        return {
          width: Math.min(imageDimensions.width || defaultWidth, windowSize.width - 32),
          height: Math.min(imageDimensions.height || defaultHeight, windowSize.height * 0.6),
        };
      }
      return {
        width: Math.min(imageDimensions.width || defaultWidth, windowSize.width - 32),
        height: Math.min(imageDimensions.height || defaultHeight, windowSize.height * 0.6),
      };
    }, [windowSize, isLoading, imageLoaded, isComplete, imageDimensions]);

    const containerStyle = getContainerStyle();

    return (
      <>
        {/* Debug Controls */}
        {isDebugMode && (
          <div className="p-2 sm:p-3 mb-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
            <div className="text-xs font-medium mb-2">Debug Mode - Override State:</div>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => setDebugState(null)}
                className={`px-1 sm:px-2 py-1 text-[10px] sm:text-xs rounded ${!debugState ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
              >
                Normal ({state})
              </button>
              <button
                onClick={() => setDebugState('input-available')}
                className={`px-1 sm:px-2 py-1 text-[10px] sm:text-xs rounded ${debugState === 'input-available' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
              >
                Loading
              </button>
              <button
                onClick={() => setDebugState('output-available')}
                className={`px-1 sm:px-2 py-1 text-[10px] sm:text-xs rounded ${debugState === 'output-available' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
              >
                Loaded
              </button>
              <button
                onClick={() => setDebugState('output-error')}
                className={`px-1 sm:px-2 py-1 text-[10px] sm:text-xs rounded ${debugState === 'output-error' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
              >
                Error
              </button>
            </div>
          </div>
        )}

        {isError ? (
          <Error 
            error={(effectiveResult && 'error' in effectiveResult ? effectiveResult.error : undefined) || error || 'Failed to generate image'}
            prompt={input?.prompt}
          />
        ) : (
          <motion.div
            className={cn(
              "relative inline-block my-2 sm:my-4",
              "max-w-full"
            )}
            animate={{
              width: containerStyle.width,
              height: containerStyle.height,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 30,
              mass: 0.8,
            }}
            initial={false}
          >
            <AnimatePresence mode="wait">
              {isLoading && (
                <Loading key="loading" prompt={input?.prompt} input={input} />
              )}
              
              {(isComplete && effectiveResult && 'imageUrl' in effectiveResult && effectiveResult.imageUrl) && (
                <Loaded 
                  key="image"
                  result={effectiveResult}
                  onDownload={handleDownload}
                  onFullscreen={() => setShowFullscreen(true)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <AnimatePresence>
          {showFullscreen && effectiveResult && 'imageUrl' in effectiveResult && effectiveResult.imageUrl && (
            <FullscreenView
              result={effectiveResult}
              onClose={() => setShowFullscreen(false)}
              onDownload={handleDownload}
            />
          )}
        </AnimatePresence>
      </>
    );
  }
);

ImageGenerationMain.displayName = 'ImageGenerationMain';