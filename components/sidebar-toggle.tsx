import type { ComponentProps } from 'react';
import { type SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarLeftIcon } from './icons';
import { Button } from './ui/button';
import { useTranslations } from 'next-intl';

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();
  const t = useTranslations();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="h-10 w-10 gap-2 text-sm font-normal hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          title={t('actions.toggleSidebar')}
        >
          <SidebarLeftIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">
        {t('actions.toggleSidebar')}
      </TooltipContent>
    </Tooltip>
  );
}
