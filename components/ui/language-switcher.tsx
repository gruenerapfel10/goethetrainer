import React, { useState, useTransition, useEffect } from 'react';
import { Languages, Check } from 'lucide-react';
import { Locale } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function LocaleSwitcherSelect() {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 h-[35px]"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
      >
        <Languages className="h-4 w-4" />
        <span className="text-sm hidden lg:block">{currentLanguage}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 overflow-hidden rounded-md border bg-popover shadow-md z-50">
          {items.map((item) => (
            <button
              key={item.value}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onChange(item.value)}
            >
              <div className="mr-2 w-4">
                {item.value === locale && <Check className="h-4 w-4" />}
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
