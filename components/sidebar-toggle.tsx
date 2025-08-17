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
}

export function SidebarToggle({ isOpen, onToggle, className }: SidebarToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggle}
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            {isOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent align="start">
          {isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}