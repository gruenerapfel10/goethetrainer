import React, { useTransition } from 'react';
import { Languages } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';
import { useLocale, useTranslations } from 'next-intl';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function LocaleSwitcherSelect() {
  const [isPending, startTransition] = useTransition();
  const { state } = useSidebar();
  const t = useTranslations();
  const locale = useLocale();

  const items = [
    {
      value: 'lt',
      label: t('locales.lt'),
    },
    {
      value: 'en',
      label: t('locales.en'),
    },
  ];

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
        <Button
          variant="ghost"
          size="sm"
          className="w-full bg-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-foreground flex items-center justify-start gap-2 px-2 py-2 h-8 text-sm font-medium rounded-md transition-colors"
          disabled={isPending}
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span className="truncate">{currentLanguage}</span>
        </Button>
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
