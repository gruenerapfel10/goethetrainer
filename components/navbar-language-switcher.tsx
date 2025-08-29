import React, { useTransition } from 'react';
import { Languages } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';
import { useLocale, useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function NavbarLanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
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
          size="icon" 
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          disabled={isPending}
        >
          <span className="text-lg">{items.find(item => item.value === locale)?.emoji || '🌐'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border/30 rounded-xl bg-muted">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            className={`text-sm font-medium cursor-pointer ${
              locale === item.value
                ? "bg-blue-500/20 text-blue-600 border border-blue-500/30"
                : "text-popover-foreground hover:bg-accent focus:bg-accent"
            }`}
            onClick={() => onChange(item.value)}
          >
            <span className="text-lg mr-2">{item.emoji}</span>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}