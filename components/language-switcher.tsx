import React, { useTransition } from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { locales } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';
import { useLocale, useTranslations } from 'next-intl';
import { useSidebar, SidebarMenuButton } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LocaleSwitcherSelect({ expanded = false }: { expanded?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const { state, isMobile } = useSidebar();
  const t = useTranslations();
  const locale = useLocale();
  const isExpanded = isMobile ? true : state === 'expanded';

  const items = locales.map((loc) => ({
    value: loc,
    label: t(`locales.${loc}`),
  }));

  const currentLanguage = items.find((item) => item.value === locale)?.label;

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          disabled={isPending}
          className={`group relative h-9 px-2 py-1.5 text-foreground rounded-lg ${isExpanded ? 'justify-start' : 'justify-center'} hover:bg-primary hover:text-primary-foreground transition-colors`}
          title={currentLanguage}
        >
          <Languages className="h-4 w-4 stroke-[2] text-foreground group-hover:text-primary-foreground flex-shrink-0" />
          {isExpanded && (
            <span className="font-medium text-sm whitespace-nowrap">{currentLanguage}</span>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={0}
        className="min-w-[160px] bg-sidebar border-sidebar-border"
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            className="text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent focus:bg-sidebar-accent cursor-pointer"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
