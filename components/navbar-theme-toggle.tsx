'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { themes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon } from './icons';

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function NavbarThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const { setTheme, theme } = useTheme();
  const { state, isMobile } = useSidebar();
  const t = useTranslations();
  const currentTheme = (theme || 'system') as keyof typeof themeIcons;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayTheme = (isMounted ? currentTheme : 'system') as keyof typeof themeIcons;
  const CurrentThemeIcon = themeIcons[displayTheme] || themeIcons.system;
  const isExpanded = isMobile ? true : state === 'expanded';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className={`group relative h-9 px-2 py-1.5 text-foreground rounded-lg ${isExpanded ? 'justify-start' : 'justify-center'} hover:bg-primary hover:text-primary-foreground transition-colors`}>
          <CurrentThemeIcon className="h-4 w-4 stroke-[2] text-foreground group-hover:text-primary-foreground flex-shrink-0" />
          {isExpanded && (
            <span className="font-medium text-sm whitespace-nowrap capitalize">
              {isMounted ? currentTheme : 'system'}
            </span>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="border-border/30 rounded-xl bg-muted w-[250px]"
        sideOffset={4}
      >
        {themes.map((themeOption) => {
          const ThemeIcon = themeIcons[themeOption as keyof typeof themeIcons] || themeIcons.system;
          return (
            <DropdownMenuItem
              key={themeOption}
              onSelect={() => setTheme(themeOption)}
              className="gap-3 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
              data-active={themeOption === theme}
            >
              <div className="flex flex-row gap-3 items-center">
                <ThemeIcon
                  className={cn(
                    "h-4 w-4",
                    themeOption === theme ? "text-foreground" : "text-muted-foreground"
                  )}
                />
                <div>
                  <div className="capitalize">{themeOption}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`sidebar.${themeOption}Mode`)}
                  </div>
                </div>
              </div>

              <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
