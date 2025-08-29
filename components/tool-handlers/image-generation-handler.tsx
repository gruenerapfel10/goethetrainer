'use client';

import { motion } from 'framer-motion';
import { Image, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface ImageGenerationHandlerProps {
  result: {
    imageUrl?: string;
    imageUrls?: string[];
    prompt?: string;
    model?: string;
    dimensions?: string;
    seed?: number;
    error?: string;
  };
  isLoading?: boolean;
  args?: {
    prompt?: string;
    model?: string;
    size?: string;
  };
}

export function ImageGenerationHandler({ result, isLoading, args }: ImageGenerationHandlerProps) {
  const [imageError, setImageError] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground font-medium">
            Generating image{args?.prompt && ` for "${args.prompt}"`}...
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          This may take a few moments...
        </div>
      </motion.div>
    );
  }

  if (result?.error) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-destructive/5 border-destructive/10"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Image generation failed</span>
        </div>
        <p className="text-sm text-destructive/80 mt-1">{result.error}</p>
      </motion.div>
    );
  }

  const images = result?.imageUrls || (result?.imageUrl ? [result.imageUrl] : []);

  if (!images.length) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/10"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Image className="h-4 w-4" />
          <span className="text-sm">No images were generated.</span>
        </div>
      </motion.div>
    );
  }

  const handleDownload = async (imageUrl: string, index: number) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Image className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Generated Image{images.length > 1 ? 's' : ''}
        </span>
        {images.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            {images.length} images
          </Badge>
        )}
      </div>

      {(result?.prompt || args?.prompt) && (
        <motion.div
          className="mb-3 p-3 rounded-lg bg-muted/20 border"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-xs text-muted-foreground mb-1">Prompt:</div>
          <div className="text-sm text-foreground">
            {result?.prompt || args?.prompt}
          </div>
          <div className="flex gap-2 mt-2">
            {result?.model && (
              <Badge variant="outline" className="text-xs">
                {result.model}
              </Badge>
            )}
            {result?.dimensions && (
              <Badge variant="outline" className="text-xs">
                {result.dimensions}
              </Badge>
            )}
            {result?.seed && (
              <Badge variant="outline" className="text-xs">
                Seed: {result.seed}
              </Badge>
            )}
          </div>
        </motion.div>
      )}

      <div className={`grid gap-4 ${images.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {images.map((imageUrl, index) => (
          <motion.div
            key={`${imageUrl}-${index}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="relative group">
                  {!imageError ? (
                    <img
                      src={imageUrl}
                      alt={result?.prompt || args?.prompt || 'Generated image'}
                      className="w-full h-auto max-h-96 object-contain bg-muted"
                      onError={() => setImageError(true)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Failed to load image</p>
                      </div>
                    </div>
                  )}
                  
                  {!imageError && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(imageUrl, index)}
                        disabled={downloadingIndex === index}
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        {downloadingIndex === index ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="ml-1">Download</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {images.length > 1 && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-xs text-muted-foreground">
            {images.length} images generated successfully
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}