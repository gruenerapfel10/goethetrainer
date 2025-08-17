import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  showText?: boolean;
}

export function SidebarToggle({ isOpen, onToggle, className, showText = false }: SidebarToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggle}
            variant="ghost"
            size={showText ? "default" : "icon"}
            className={`gap-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground ${
              showText ? "justify-start w-full" : ""
            } ${className}`}
          >
            {isOpen ? <PanelLeftClose className="w-4 h-4 flex-shrink-0" /> : <PanelLeft className="w-4 h-4 flex-shrink-0" />}
            {showText && <span className="truncate">{isOpen ? 'Collapse sidebar' : 'Expand sidebar'}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent align="start" className="flex items-center gap-2">
          <span>{isOpen ? 'Collapse sidebar' : 'Expand sidebar'}</span>
          <kbd className="px-1.5 py-0.5 text-xs rounded bg-muted font-mono opacity-70">
            {navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'} B
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}