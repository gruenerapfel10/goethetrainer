'use client';

import { motion } from 'framer-motion';
import { FileIcon, LightbulbIcon, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supportsFeature } from '@/lib/ai/model-capabilities';
import classNames from 'classnames';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';

interface FeatureTogglesProps {
  selectedModelId: string;
  isDeepResearchEnabled?: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
  isFileSearchEnabled?: boolean;
  onFileSearchChange?: (enabled: boolean) => void;
  isWebSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  isImageGenerationEnabled?: boolean;
  onImageGenerationChange?: (enabled: boolean) => void;
  isDragOver: boolean;
}

export function FeatureToggles({
  selectedModelId,
  isDeepResearchEnabled,
  onDeepResearchChange,
  isFileSearchEnabled,
  onFileSearchChange,
  isWebSearchEnabled,
  onWebSearchChange,
  isImageGenerationEnabled,
  onImageGenerationChange,
  isDragOver,
}: FeatureTogglesProps) {
  // Build current state for exclusivity checking
  const currentState = {
    deepSearch: isDeepResearchEnabled || false,
    imageGeneration: isImageGenerationEnabled || false,
    webSearch: isWebSearchEnabled || false,
    fileSearch: isFileSearchEnabled || false,
  };
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
      {supportsFeature(selectedModelId, 'deepSearch') && (
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: -20, scale: 0.9 }}
          animate={{
            opacity: isDragOver ? 0 : 1,
            x: 0,
            scale: 1,
          }}
          exit={{ opacity: 0, x: -20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
            opacity: { duration: 0.2 },
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onDeepResearchChange?.(!isDeepResearchEnabled)
            }
            className={classNames(
              'flex items-center gap-2 text-xs font-medium rounded-[10px] px-3.5 py-2 transition-all duration-300 border',
              isDeepResearchEnabled
                ? 'bg-foreground text-background border-transparent shadow-lg shadow-foreground/20 hover:bg-foreground hover:border-transparent hover:text-background'
                : 'bg-muted/50 text-foreground border-border/30 hover:bg-muted/80 hover:border-border/50 shadow-sm hover:shadow-md',
            )}
          >
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
              }}
            >
              <LightbulbIcon
                size={14}
                className={classNames(
                  'transition-colors',
                  isDeepResearchEnabled
                    ? 'text-background'
                    : 'text-foreground',
                )}
              />
              <span>Deep Research</span>
            </motion.div>
          </Button>
        </motion.div>
      )}
      {supportsFeature(selectedModelId, 'fileSearch') && (
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: -20, scale: 0.9 }}
          animate={{
            opacity: isDragOver ? 0 : 1,
            x: 0,
            scale: 1,
          }}
          exit={{ opacity: 0, x: -20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
            opacity: { duration: 0.2 },
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onFileSearchChange?.(!isFileSearchEnabled)
            }
            className={classNames(
              'flex items-center gap-2 text-xs font-medium rounded-[10px] px-3.5 py-2 transition-all duration-300 border',
              isFileSearchEnabled
                ? 'bg-foreground text-background border-transparent shadow-lg shadow-foreground/20 hover:bg-foreground hover:border-transparent hover:text-background'
                : 'bg-muted/50 text-foreground border-border/30 hover:bg-muted/80 hover:border-border/50 shadow-sm hover:shadow-md',
            )}
          >
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
              }}
            >
              <FileIcon
                size={14}
                className={classNames(
                  'transition-colors',
                  isFileSearchEnabled
                    ? 'text-background'
                    : 'text-foreground',
                )}
              />
              <span>File Search</span>
            </motion.div>
          </Button>
        </motion.div>
      )}
      {supportsFeature(selectedModelId, 'imageGeneration') && (
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: -20, scale: 0.9 }}
          animate={{
            opacity: isDragOver ? 0 : 1,
            x: 0,
            scale: 1,
          }}
          exit={{ opacity: 0, x: -20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
            opacity: { duration: 0.2 },
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onImageGenerationChange?.(!isImageGenerationEnabled)
            }
            className={classNames(
              'flex items-center gap-2 text-xs font-medium rounded-[10px] px-3.5 py-2 transition-all duration-300 border',
              isImageGenerationEnabled
                ? 'bg-foreground text-background border-transparent shadow-lg shadow-foreground/20 hover:bg-foreground hover:border-transparent hover:text-background'
                : 'bg-muted/50 text-foreground border-border/30 hover:bg-muted/80 hover:border-border/50 shadow-sm hover:shadow-md',
            )}
          >
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
              }}
            >
              <ImageIcon
                size={14}
                className={classNames(
                  'transition-colors',
                  isImageGenerationEnabled
                    ? 'text-background'
                    : 'text-foreground',
                )}
              />
              <span>Image Generation</span>
            </motion.div>
          </Button>
        </motion.div>
      )}
      </div>
    </TooltipProvider>
  );
}