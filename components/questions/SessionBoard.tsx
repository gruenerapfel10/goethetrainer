import type { ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface SessionBoardProps {
  teilNumber: number;
  teilLabel: string;
  teilLabels: Record<number, string>;
  totalTeils: number;
  generatedTeils: Set<number>;
  onTeilNavigate?: (teilNumber: number) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  isSubmitting?: boolean;
  isLastTeil?: boolean;
  canSubmit?: boolean;
  onSubmit: () => void;
  activeView: 'fragen' | 'quelle';
  onActiveViewChange: (view: 'fragen' | 'quelle') => void;
  frageContent: ReactNode;
  quelleContent?: ReactNode;
  showSourceToggle?: boolean;
}

export function SessionBoard({
  teilNumber,
  teilLabel,
  teilLabels,
  totalTeils,
  generatedTeils,
  onTeilNavigate,
  onBack,
  showBackButton = false,
  isSubmitting = false,
  isLastTeil = true,
  canSubmit = true,
  onSubmit,
  activeView,
  onActiveViewChange,
  frageContent,
  quelleContent,
  showSourceToggle = true,
}: SessionBoardProps) {
  const { theme } = useTheme();
  const teilNumbers = Array.from({ length: totalTeils }, (_, index) => index + 1);
  const handleSubmitClick = () => {
    console.log('[SessionBoard] submit click', {
      teilNumber,
      isLastTeil,
      canSubmit,
      isSubmitting,
    });
    onSubmit();
  };

  return (
    <div className="w-full h-full flex flex-col bg-background relative">
      {showSourceToggle && (
        <div className="absolute top-6 left-6 flex gap-0 z-10 border-b border-border">
          <button
            onClick={() => onActiveViewChange('fragen')}
            className={cn(
              'px-4 py-2 font-medium transition-colors',
              activeView === 'fragen'
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Fragen
          </button>
          <button
            onClick={() => onActiveViewChange('quelle')}
            className={cn(
              'px-4 py-2 font-medium transition-colors',
              activeView === 'quelle'
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
            disabled={!quelleContent}
          >
            Quelle
          </button>
        </div>
      )}

      <div className="absolute top-6 right-6 z-10 flex gap-2 border-b border-border">
        {teilNumbers.map(number => {
          const label = teilLabels[number] ?? `Teil ${number}`;
          const isCurrent = number === teilNumber;
          const isAvailable = generatedTeils.has(number) || number === teilNumber;

          return (
            <button
              key={number}
              type="button"
              onClick={() => {
                if (!isCurrent && isAvailable && !isSubmitting) {
                  onTeilNavigate?.(number);
                }
              }}
              disabled={!isAvailable || isSubmitting}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                isCurrent
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground',
                (!isAvailable || isSubmitting) && 'opacity-40 cursor-not-allowed'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {showBackButton && onBack && (
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="absolute bottom-6 left-6 px-4 py-2 bg-muted text-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-opacity z-10"
        >
          ← Zurück
        </button>
      )}

      <button
        onClick={handleSubmitClick}
        disabled={isSubmitting || !canSubmit}
        className="absolute bottom-6 right-6 px-8 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-opacity z-10"
      >
        {isSubmitting ? 'Wird gespeichert…' : isLastTeil ? 'Test abgeben' : 'Weiter'}
      </button>

      <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-sidebar">
        <div
          className="w-full h-full flex flex-col dark:bg-background"
          style={{ width: '210mm', height: '297mm', backgroundColor: 'hsl(var(--sidebar-background))' }}
        >
          <div className="flex-1 overflow-y-auto px-12 py-10">
            <div className="mb-10">
              <h2 className="text-base font-bold">{teilLabel}</h2>
            </div>
            {activeView === 'fragen' || !showSourceToggle ? frageContent : quelleContent ?? frageContent}
          </div>

          <div className="text-primary-foreground p-6 flex justify-center items-center mt-auto">
            <img
              src={theme === 'dark' ? '/logo_dark.png' : '/logo.png'}
              alt="Goethe-Institut"
              className="h-12 w-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
