import React from 'react';
import { Clock } from 'lucide-react';
import type { UseCase } from './common/types';
import { cn } from '@/lib/utils';

interface UseCaseItemProps {
  useCase: UseCase;
  onClick: (useCase: UseCase) => void;
  index?: number;
  isCached?: boolean;
}

export function UseCaseItem({
  useCase,
  onClick,
  index = 0,
  isCached = false,
}: UseCaseItemProps) {
  return (
    <div
      key={useCase.id}
      className={cn(
        'flex flex-col p-3 rounded-lg bg-card hover:bg-muted/80 transition-colors overflow-hidden cursor-pointer',
        isCached && 'staggered-item',
      )}
      style={
        isCached
          ? ({ '--stagger-delay': `${index * 30}ms` } as React.CSSProperties)
          : undefined
      }
      onClick={() => onClick(useCase)}
    >
      <div className="font-medium text-sm">{useCase.title}</div>
      {useCase.description && (
        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {useCase.description}
        </div>
      )}
      {useCase.timeSaved && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Time Saved: {useCase.timeSaved}</span>
        </div>
      )}
    </div>
  );
}
