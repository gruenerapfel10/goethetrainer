import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  onGenerate: () => void;
  isLoading: boolean;
}

export function Header({ onGenerate, isLoading }: HeaderProps) {
  const t = useTranslations('dashboard.topUseCases');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          <Button
            variant="default"
            onClick={onGenerate}
            className="flex-1 sm:flex-initial gap-1.5 sm:gap-2 h-9 sm:h-10 px-3 sm:px-4"
            title={t('actions.generate')}
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('actions.generate')}</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
