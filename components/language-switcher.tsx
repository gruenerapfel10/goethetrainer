import React, { useTransition, useState } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export default function LocaleSwitcherSelect() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const { state } = useSidebar();
  const t = useTranslations();
  const locale = useLocale();

  const items = [
    {
      value: 'lt',
      label: t('locales.lt'),
      emoji: '🇱🇹',
    },
    {
      value: 'en',
      label: t('locales.en'),
      emoji: '🇺🇸',
    },
    {
      value: 'ru',
      label: t('locales.ru'),
      emoji: '🇷🇺',
    },
  ];

  const currentLanguageItem = items.find((item) => item.value === locale);
  const currentLanguage = currentLanguageItem?.label;

  function onChange(value: string) {
    const locale = value as Locale;
    setOpen(false);
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full bg-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-foreground flex items-center justify-start gap-2 px-2 py-2 h-8 text-sm font-medium rounded-md transition-colors",
            "data-[state=open]:bg-sidebar-accent/50"
          )}
          disabled={isPending}
        >
          <span className="text-lg shrink-0">{currentLanguageItem?.emoji}</span>
          <span className="truncate">{state === 'expanded' ? currentLanguage : ''}</span>
          {state === 'expanded' && <ChevronDown className="h-3 w-3 ml-auto opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className={cn(
          "min-w-[160px] border-border/30 rounded-xl bg-muted",
          "w-[200px]"
        )}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onSelect={() => onChange(item.value)}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium cursor-pointer transition-colors duration-200",
              locale === item.value 
                ? "bg-blue-500/20 text-blue-600 border border-blue-500/30" 
                : "hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent text-muted-foreground"
            )}
            data-active={locale === item.value}
          >
            <span className="text-lg mr-2">{item.emoji}</span>
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
