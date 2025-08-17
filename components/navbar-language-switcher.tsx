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
    },
    {
      value: 'en',
      label: t('locales.en'),
    },
    {
      value: 'ru',
      label: t('locales.ru'),
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
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            className="text-sm font-medium text-popover-foreground hover:bg-accent focus:bg-accent cursor-pointer"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}