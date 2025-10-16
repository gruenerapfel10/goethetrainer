'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Loader2, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ImageGenerationOutput } from './utils';

interface LoadedProps {
  result: ImageGenerationOutput;
  onDownload: () => void;
  onFullscreen: () => void;
}

export function Loaded({ result, onDownload, onFullscreen }: LoadedProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (result?.imageUrl) {
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
      img.src = result.imageUrl;
    }
  }, [result?.imageUrl]);

  if (!result?.imageUrl) return null;

  return (
    <motion.div
      className="relative w-full h-full group"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { type: "spring", stiffness: 200, damping: 25 }
      }}
    >
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
            "w-full h-full object-cover rounded-[12px] cursor-pointer",
            !imageLoaded && "opacity-0"
          )}
          initial={{ filter: "blur(10px)" }}
          animate={{ filter: imageLoaded ? "blur(0px)" : "blur(10px)" }}
          transition={{ duration: 0.4 }}
          onLoad={() => setImageLoaded(true)}
          onClick={onFullscreen}
        />

        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-[12px] cursor-pointer"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onClick={onFullscreen}
        >
          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex gap-1 sm:gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen();
              }}
              className="h-7 w-7 sm:h-8 sm:w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="h-7 w-7 sm:h-8 sm:w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          
          {result.metadata?.revisedPrompt && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                {result.metadata.revisedPrompt}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}