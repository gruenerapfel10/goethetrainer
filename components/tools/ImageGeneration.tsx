'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import { Loader2, AlertCircle, Download, Maximize2, Wand2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ImageGenerationProps {
  toolCallId: string;
  state: 'input-available' | 'output-available' | 'output-error';
  input?: {
    prompt?: string;
    size?: string;
    quality?: string;
  };
  output?: {
    success: boolean;
    imageUrl?: string;
    prompt?: string;
    size?: string;
    quality?: string;
    message?: string;
    error?: string;
    metadata?: {
      model?: string;
      revisedPrompt?: string;
      timestamp?: string;
    };
  };
  error?: any;
}

export const ImageGeneration = memo<ImageGenerationProps>(
  ({ toolCallId, state, input, output, error }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    
    // Map states to old format for compatibility
    const isLoading = state === 'input-available';
    const isComplete = state === 'output-available';
    const isError = state === 'output-error' || error;
    
    // Handle wrapped JSON structure from database
    let result = output;
    if (result && (result as any).type === 'json' && (result as any).value) {
      result = (result as any).value;
    }
    if (isError) {
      result = { success: false, error: error };
    }
    
    // Debug logging
    useEffect(() => {
      console.log('[ImageGeneration] Component received:', {
        toolCallId,
        state,
        input,
        output,
        result,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : [],
        hasSuccess: result?.success,
        hasImageUrl: result?.imageUrl,
        hasError: result?.error,
      });
    }, [toolCallId, state, input, output, result]);

    // Simulate loading progress
    useEffect(() => {
      if (isLoading) {
        setLoadingProgress(0);
        const interval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            // Slower progress as it gets higher
            const increment = Math.max(1, Math.floor((100 - prev) / 10));
            return prev + increment;
          });
        }, 300);
        return () => clearInterval(interval);
      } else if (isComplete && result?.success) {
        setLoadingProgress(100);
      }
    }, [isLoading, isComplete, result]);

    // Preload image and get dimensions
    useEffect(() => {
      if (result?.imageUrl) {
        const img = new Image();
        img.onload = () => {
          setImageLoaded(true);
          // Calculate aspect ratio preserving dimensions
          const maxWidth = 512; // Max width for the image container
          const ratio = Math.min(1, maxWidth / img.width);
          setImageDimensions({
            width: img.width * ratio,
            height: img.height * ratio
          });
        };
        img.src = result.imageUrl;
      }
    }, [result?.imageUrl]);

    const handleDownload = async () => {
      if (!result?.imageUrl) return;
      
      try {
        // For DALL-E images from OpenAI, we may encounter CORS issues
        // Try to fetch the image first
        const response = await fetch(result.imageUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const blob = await response.blob();
        
        // Create a blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create filename from prompt or timestamp
        const filename = `ai-generated-${
          result.prompt?.slice(0, 30)
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase() || 'image'
        }-${Date.now()}.png`;
        
        // Create a temporary anchor element and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (error) {
        console.error('Download failed, trying alternative method:', error);
        
        // Alternative method: Use canvas to bypass CORS
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = result.imageUrl || '';
          });
          
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `ai-generated-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              }
            }, 'image/png');
          }
        } catch (canvasError) {
          console.error('Canvas method also failed:', canvasError);
          // Last resort: open in new tab with download attribute
          const link = document.createElement('a');
          link.href = result.imageUrl;
          link.download = `ai-generated-${Date.now()}.png`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          window.open(result.imageUrl, '_blank');
        }
      }
    };

    // Determine container dimensions based on state
    const getContainerStyle = () => {
      if (isLoading || !imageLoaded) {
        // Pill shape while loading
        return {
          width: 320,
          height: 48,
        };
      }
      // Final image dimensions
      return {
        width: imageDimensions.width || 320,
        height: imageDimensions.height || 320,
      };
    };

    const containerStyle = getContainerStyle();

    return (
      <>
        <motion.div
          className={cn(
            "relative inline-block my-4",
            "rounded-[14px]", // Match multimodal-input radius
            "border border-border/50",
            "bg-background/90 backdrop-blur-sm",
            "shadow-sm hover:shadow-md",
            "transition-shadow duration-200",
            "overflow-hidden",
            isLoading && "bg-gradient-to-r from-background/95 to-background/90"
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
            {isLoading ? (
              <motion.div
                key="loading"
                className="absolute inset-0 flex items-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Loading content - horizontal pill layout */}
                <div className="flex items-center gap-3 w-full">
                  {/* Animated icon */}
                  <motion.div
                    className="relative flex-shrink-0"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-primary" />
                    </div>
                    {/* Pulse effect */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/20"
                      animate={{
                        scale: [1, 1.5],
                        opacity: [0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeOut",
                      }}
                    />
                  </motion.div>

                  {/* Status text */}
                  <div className="flex-1 min-w-0">
                    <motion.p
                      className="text-sm font-medium text-foreground truncate"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      {loadingProgress < 30 ? 'Initializing...' :
                       loadingProgress < 70 ? 'Generating image...' :
                       'Finalizing...'}
                    </motion.p>
                  </div>

                  {/* Progress indicator */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/50 rounded-full"
                        animate={{ width: `${loadingProgress}%` }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      />
                    </div>
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  </div>
                </div>
              </motion.div>
            ) : result?.success && result.imageUrl ? (
              <motion.div
                key="image"
                className="relative w-full h-full group"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  opacity: { duration: 0.3 },
                  scale: { type: "spring", stiffness: 200, damping: 25 }
                }}
              >
                {/* Image container */}
                <div className="relative w-full h-full">
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                  )}
                  
                  <motion.img
                    src={result.imageUrl}
                    alt={result.prompt || 'Generated image'}
                    className={cn(
                      "w-full h-full object-cover rounded-[12px]", // Slightly smaller radius for inner content
                      !imageLoaded && "opacity-0"
                    )}
                    initial={{ filter: "blur(10px)" }}
                    animate={{ filter: imageLoaded ? "blur(0px)" : "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                    onLoad={() => setImageLoaded(true)}
                  />

                  {/* Overlay controls on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-[12px]"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setShowFullscreen(true)}
                        className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleDownload}
                        className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Prompt overlay */}
                    {result.metadata?.revisedPrompt && (
                      <div className="absolute top-3 left-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.metadata.revisedPrompt}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            ) : result && !result.success ? (
              /* Error state */
              <motion.div
                key="error"
                className="flex items-center gap-3 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Generation failed</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {result.error || 'Unable to generate image'}
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* Fullscreen modal */}
        <AnimatePresence>
          {showFullscreen && result?.imageUrl && (
            <motion.div
              className="fixed inset-0 z-[999] bg-black/20 dark:bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowFullscreen(false)}
            >
              <motion.div
                className="relative w-full max-w-4xl max-h-[90vh] flex items-center justify-center"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Container with squircle design */}
                <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-4 max-w-full max-h-full">
                  {/* Gradient border effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 via-primary/5 to-orange-500/5 pointer-events-none" />
                  
                  {/* Image container */}
                  <div className="relative flex items-center justify-center">
                    <img
                      src={result.imageUrl}
                      alt={result.prompt || 'Generated image'}
                      className="max-w-full max-h-[80vh] rounded-xl object-contain"
                    />
                    
                    {/* Image info overlay */}
                    {(result.size || result.quality) && (
                      <div className="absolute bottom-4 left-4 flex gap-2">
                        {result.size && (
                          <span className="px-2 py-1 text-xs bg-background/80 backdrop-blur-sm text-foreground/70 rounded-md border border-border/50">
                            {result.size}
                          </span>
                        )}
                        {result.quality && (
                          <span className="px-2 py-1 text-xs bg-background/80 backdrop-blur-sm text-foreground/70 rounded-md border border-border/50">
                            {result.quality?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons in top right */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleDownload}
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setShowFullscreen(false)}
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                  
                  {/* Prompt display at bottom if available */}
                  {result.metadata?.revisedPrompt && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Enhanced prompt:</p>
                      <p className="text-sm text-foreground/80">
                        {result.metadata.revisedPrompt}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);

ImageGeneration.displayName = 'ImageGeneration';