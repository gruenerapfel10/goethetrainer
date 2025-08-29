'use client';

import { memo, useState } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { SettingsIcon, LightbulbIcon, FileIcon, ImageIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import classNames from 'classnames';
import { supportsFeature } from '@/lib/ai/model-capabilities';

interface SettingsButtonProps {
  status: UseChatHelpers['status'];
  selectedModelId: string;
  isWebSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  isDeepResearchEnabled?: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
  isFileSearchEnabled?: boolean;
  onFileSearchChange?: (enabled: boolean) => void;
  isImageGenerationEnabled?: boolean;
  onImageGenerationChange?: (enabled: boolean) => void;
}

function PureSettingsButton({
  status,
  selectedModelId,
  isWebSearchEnabled = true,
  onWebSearchChange,
  isDeepResearchEnabled,
  onDeepResearchChange,
  isFileSearchEnabled,
  onFileSearchChange,
  isImageGenerationEnabled,
  onImageGenerationChange,
}: SettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const supportsWebSearch = supportsFeature(selectedModelId, 'webSearch');
  const supportsDeepSearch = supportsFeature(selectedModelId, 'deepSearch');
  const supportsFileSearch = supportsFeature(selectedModelId, 'fileSearch');
  const supportsImageGeneration = supportsFeature(selectedModelId, 'imageGeneration');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="settings-button"
          className={classNames(
            'inline-flex items-center justify-center rounded-md p-2 h-8 w-8',
            'text-muted-foreground hover:text-foreground',
            'bg-muted/50 hover:bg-muted/80 border border-border/30 hover:border-border/50',
            'shadow-sm hover:shadow-md transition-all',
            status !== 'ready' && 'opacity-50 cursor-not-allowed',
          )}
          disabled={status !== 'ready'}
          title="Settings"
          type="button"
        >
          <SettingsIcon size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 bg-muted border-border" 
        align="center" 
        side="top"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Model capabilities</h4>
            <p className="text-xs text-muted-foreground">
              Manage available features
            </p>
          </div>
          
          <div className="space-y-4">
            {supportsDeepSearch && (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <LightbulbIcon size={16} className="text-muted-foreground" />
                  <Label htmlFor="deep-search" className="text-sm font-normal cursor-pointer">
                    Deep Research
                  </Label>
                </div>
                <Switch
                  id="deep-search"
                  checked={isDeepResearchEnabled}
                  onCheckedChange={onDeepResearchChange}
                  disabled={status !== 'ready'}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            )}
            {supportsFileSearch && (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <FileIcon size={16} className="text-muted-foreground" />
                  <Label htmlFor="file-search" className="text-sm font-normal cursor-pointer">
                    File Search
                  </Label>
                </div>
                <Switch
                  id="file-search"
                  checked={isFileSearchEnabled}
                  onCheckedChange={onFileSearchChange}
                  disabled={status !== 'ready'}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            )}
            {supportsWebSearch && (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 2C8 2 9.5 4 9.5 8C9.5 12 8 14 8 14" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 2C8 2 6.5 4 6.5 8C6.5 12 8 14 8 14" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 8H14" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <Label htmlFor="web-search" className="text-sm font-normal cursor-pointer">
                    Web search
                  </Label>
                </div>
                <Switch
                  id="web-search"
                  checked={isWebSearchEnabled}
                  onCheckedChange={onWebSearchChange}
                  disabled={status !== 'ready'}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            )}
            {supportsImageGeneration && (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-muted-foreground" />
                  <Label htmlFor="image-generation" className="text-sm font-normal cursor-pointer">
                    Image Generation
                  </Label>
                </div>
                <Switch
                  id="image-generation"
                  checked={isImageGenerationEnabled}
                  onCheckedChange={onImageGenerationChange}
                  disabled={status !== 'ready'}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            )}
            {!supportsDeepSearch && !supportsFileSearch && !supportsWebSearch && !supportsImageGeneration && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No additional settings available for this model
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const SettingsButton = memo(PureSettingsButton);