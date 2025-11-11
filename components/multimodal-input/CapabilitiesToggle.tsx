'use client';

import { useState, useEffect, useMemo, memo, useRef, } from 'react';
import { motion } from 'framer-motion';
import { 
  FileIcon, 
  LightbulbIcon, 
  ImageIcon, 
  SlidersHorizontal,
  Globe,
  Search,
  Database,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import classNames from 'classnames';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslations } from "next-intl";
import { useChat } from '@/contexts/chat-context';
import { useToast } from '@/hooks/use-toast';

type CapabilitiesToggleProps = {}

// Map icons for tools and features
const getIcon = (iconName?: string) => {
  switch (iconName) {
    case 'search': return Search;
    case 'globe': return Globe;
    case 'database': return Database;
    case 'image': return ImageIcon;
    case 'brain': return Brain;
    case 'chart': return LightbulbIcon; // Using LightbulbIcon for chart
    default: return FileIcon;
  }
};


function PureCapabilitiesToggle({}: CapabilitiesToggleProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const t = useTranslations();
  const { toast } = useToast();
  
  // Get everything from context
  const { 
    agentTools,
    setAgentTools,
    agentFeatures,
    setAgentFeatures,
  } = useChat();
  
  
  
  // Build capabilities list from tools and features in context
  const capabilities = useMemo(() => {
    const caps: Array<{
      id: string;
      type: 'tool' | 'feature';
      metadata: any;
      isActive: boolean;
    }> = [];
    
    // Add toggleable features and tools
    [...Object.entries(agentFeatures), ...Object.entries(agentTools)].forEach(([name, state]) => {
      if (state.metadata?.toggle) {
        caps.push({
          id: name,
          type: name in agentFeatures ? 'feature' : 'tool',
          metadata: state.metadata,
          isActive: state.active
        });
      }
    });
    
    // Sort alphabetically by display name
    return caps.sort((a, b) => {
      const nameA = a.metadata.displayNameKey ? t(a.metadata.displayNameKey as any) : a.metadata.displayName;
      const nameB = b.metadata.displayNameKey ? t(b.metadata.displayNameKey as any) : b.metadata.displayName;
      return nameA.localeCompare(nameB);
    });
  }, [agentTools, agentFeatures, t]);
  
  const handleToggle = (id: string, isActive: boolean, type: 'tool' | 'feature') => {
    // If activating a tool/feature, check for exclusions
    if (!isActive) {
      const source = type === 'tool' ? agentTools : agentFeatures;
      const itemMetadata = source[id]?.metadata;
      
      if (itemMetadata?.exclusions && itemMetadata.exclusions.length > 0) {
        // Find any currently active exclusions
        const activeExclusions = itemMetadata.exclusions.filter((excludedId: string) => {
          // Check if the excluded item is active in either tools or features
          return agentTools[excludedId]?.active || agentFeatures[excludedId]?.active;
        });
        
        // If there are active exclusions, notify the user
        if (activeExclusions.length > 0) {
          // Get the display names of the conflicting items
          const conflictingNames = activeExclusions.map((excludedId: string) => {
            const excludedTool = agentTools[excludedId];
            const excludedFeature = agentFeatures[excludedId];
            const excludedItem = excludedTool || excludedFeature;
            
            if (excludedItem?.metadata) {
              return excludedItem.metadata.displayNameKey 
                ? t(excludedItem.metadata.displayNameKey as any) 
                : excludedItem.metadata.displayName;
            }
            return excludedId;
          });
          
          // Get the display name of the item being enabled
          const itemName = itemMetadata.displayNameKey 
            ? t(itemMetadata.displayNameKey as any) 
            : itemMetadata.displayName;
          
          // Show toast notification about the conflict
          toast({
            title: t('errors.toolConflict') || 'Tool Conflict',
            description: t('errors.toolConflictDescription', {
              tool: itemName,
              conflicts: conflictingNames.join(', ')
            }) || `${itemName} cannot be used with ${conflictingNames.join(', ')}. ${conflictingNames.join(', ')} has been disabled.`,
            variant: 'default'
          });
        }
      }
    }
    
    // Proceed with the toggle (the context will handle the exclusion logic)
    type === 'feature' ? setAgentFeatures(id, !isActive) : setAgentTools(id, !isActive);
  };
  
  const renderCapability = (cap: typeof capabilities[0], isInDropdown = false) => {
    const Icon = getIcon(cap.metadata.icon);
    const baseClasses = "flex items-center gap-2 text-xs font-medium rounded-md px-3.5 py-2 transition-all duration-300 border-0";
    const activeClasses = cap.isActive
      ? "bg-foreground text-background shadow-lg shadow-foreground/20 hover:bg-foreground/90 hover:text-background hover:scale-105"
      : "bg-transparent text-foreground hover:bg-muted/20 hover:scale-105 active:scale-95";
    
    if (isInDropdown) {
      return (
        <button
          key={cap.id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggle(cap.id, cap.isActive, cap.type);
          }}
          className={classNames("w-full", baseClasses, activeClasses)}
        >
          <Icon size={14} className="transition-colors" />
          <span>{cap.metadata.displayNameKey ? t(cap.metadata.displayNameKey as any) : cap.metadata.displayName}</span>
        </button>
      );
    }
    
    return (
      <motion.div
        key={cap.id}
        className="flex items-center gap-1 capability-button"
        initial={{ opacity: 0, x: -20, scale: 0.9 }}
        animate={{ opacity: isDragOver ? 0 : 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, opacity: { duration: 0.2 } }}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleToggle(cap.id, cap.isActive, cap.type)}
          className={classNames(baseClasses, activeClasses)}
        >
          <Icon size={14} className="transition-colors" />
          <span>{cap.metadata.displayNameKey ? t(cap.metadata.displayNameKey as any) : cap.metadata.displayName}</span>
        </Button>
      </motion.div>
    );
  };
  
  // Split capabilities based on preferHidden and how many can fit
  const hiddenCaps = capabilities.filter(cap => cap.metadata.preferHidden === true);
  const visibleCaps = capabilities.filter(cap => cap.metadata.preferHidden !== true);
  
  const outsideCaps = visibleCaps.slice(0, visibleCount);
  const dropdownCaps = [...hiddenCaps, ...visibleCaps.slice(visibleCount)];
  
  // Use ResizeObserver to calculate how many buttons fit
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Filter out capabilities that prefer to be hidden
    const visibleCapabilities = capabilities.filter(cap => cap.metadata.preferHidden !== true);
    
    if (visibleCapabilities.length === 0) {
      setVisibleCount(0);
      return;
    }
    
    const calculateVisible = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      
      // Reserve space for dropdown button
      const dropdownButtonWidth = 40;
      const gap = 4;
      
      // Available width for capability buttons (use 90% to be slightly conservative)
      const availableWidth = (containerWidth - dropdownButtonWidth) * 0.9;
      
      if (availableWidth <= 0) {
        setVisibleCount(0);
        return;
      }
      
      // Create temporary container to measure actual button widths
      let totalWidth = 0;
      let count = 0;
      
      // Create hidden measuring container
      const measureDiv = document.createElement('div');
      measureDiv.style.position = 'absolute';
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.display = 'flex';
      measureDiv.style.gap = '4px';
      document.body.appendChild(measureDiv);
      
      // Measure each visible capability button (excluding preferHidden ones)
      for (let i = 0; i < visibleCapabilities.length; i++) {
        const cap = visibleCapabilities[i];
        const tempButton = document.createElement('button');
        tempButton.className = 'flex items-center gap-2 text-xs font-medium rounded-md px-3.5 py-2';
        tempButton.textContent = cap.metadata.displayNameKey ? t(cap.metadata.displayNameKey as any) : cap.metadata.displayName;
        measureDiv.appendChild(tempButton);
        
        const buttonWidth = tempButton.offsetWidth;
        
        if (totalWidth + buttonWidth + gap <= availableWidth) {
          totalWidth += buttonWidth + gap;
          count++;
        } else {
          break;
        }
      }
      
      document.body.removeChild(measureDiv);
      setVisibleCount(count);
    };
    
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateVisible);
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Initial calculation
    setTimeout(calculateVisible, 100);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [capabilities]);
  
  return (
    <TooltipProvider>
      <div ref={containerRef} className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
        {/* Dropdown button FIRST */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="settings-button"
              className={classNames(
                'inline-flex items-center justify-center rounded-md p-2 h-8 w-8 flex-shrink-0',
                'text-muted-foreground hover:text-foreground',
                'bg-transparent hover:bg-muted/20 border-0',
                'transition-all duration-200 ease-in-out',
                'hover:scale-105 active:scale-95',
              )}
              title="Capabilities"
              type="button"
            >
              <SlidersHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className={classNames(
              "border-border/30 rounded-xl bg-muted p-0",
              isMobile 
                ? "w-[calc(100vw-2rem)] max-w-[320px] min-w-[280px]" 
                : "w-[320px]"
            )}
            align={isMobile ? "center" : "start"} 
            side="top"
            sideOffset={8}
            alignOffset={0}
            avoidCollisions={true}
            collisionPadding={16}
          >
            <div className="p-3">
              <div className="space-y-1 mb-3">
                <h4 className="font-medium text-sm">{t("assistantFeaturesModal.modelCapabilities")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("assistantFeaturesModal.manageAvailableCapabilities")}
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                {capabilities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("assistantFeaturesModal.noConfigurableCapabilities")}
                  </p>
                ) : dropdownCaps.length > 0 ? (
                  ['feature', 'tool'].map(type => {
                    const items = dropdownCaps.filter(c => c.type === type);
                    // Items are already sorted alphabetically from the main capabilities array
                    // Sort dropdown items to maintain alphabetical order
                    const sortedItems = items.sort((a, b) => {
                      const nameA = a.metadata.displayNameKey ? t(a.metadata.displayNameKey as any) : a.metadata.displayName;
                      const nameB = b.metadata.displayNameKey ? t(b.metadata.displayNameKey as any) : b.metadata.displayName;
                      return nameA.localeCompare(nameB);
                    });
                    return sortedItems.length > 0 && (
                      <div key={type} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {type === 'feature' ? t("assistantFeaturesModal.features") : t("assistantFeaturesModal.tools")}
                        </p>
                        {sortedItems.map(cap => renderCapability(cap, true))}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("assistantFeaturesModal.allCapabilitiesDisplayed")}
                  </p>
                )}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Show first 2 capabilities to the RIGHT of dropdown */}
        {outsideCaps.map(cap => renderCapability(cap, false))}
      </div>
    </TooltipProvider>
  );
}

export const CapabilitiesToggle = memo(PureCapabilitiesToggle);