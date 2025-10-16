'use client';

import { type ReactNode, useMemo, useState, useOptimistic, startTransition, } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
} from './icons';
import { updateChatVisibility } from '@/app/(chat)/actions';
import { useTranslations } from 'next-intl';

export type VisibilityType = 'private' | 'public';

const visibilities: (t: any) => Array<{
  id: VisibilityType;
  label: string;
  description: string;
  icon: ReactNode;
}> = (t: any) => [
  {
    id: 'private',
    label: t('privacy.private.label'),
    description: t('privacy.private.description'),
    icon: <LockIcon />,
  },
  {
    id: 'public',
    label: t('privacy.public.label'),
    description: t('privacy.public.description'),
    icon: <GlobeIcon />,
  },
];

export function VisibilitySelector({
  chatId,
  className,
  selectedVisibilityType,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  // Local state that can be updated immediately
  const [currentVisibility, setCurrentVisibility] = useState(selectedVisibilityType);
  const [optimisticVisibility, setOptimisticVisibility] = useOptimistic(currentVisibility);

  const selectedVisibility = useMemo(
    () =>
      visibilities(t).find((visibility) => visibility.id === optimisticVisibility),
    [optimisticVisibility, t],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          variant="outline"
          className="hidden md:flex md:px-2 md:h-[34px] gap-1"
        >
          {selectedVisibility?.icon}
          {selectedVisibility?.label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="start" 
        className="min-w-[300px] border-border/30 rounded-xl bg-muted"
      >
        {visibilities(t).map((visibility) => (
          <DropdownMenuItem
            key={visibility.id}
            onSelect={() => {
              setOpen(false);
              
              // Use startTransition for optimistic update
              startTransition(() => {
                setOptimisticVisibility(visibility.id);
                setCurrentVisibility(visibility.id);
                
                // Update the backend
                updateChatVisibility({
                  chatId: chatId,
                  visibility: visibility.id,
                });
              });
            }}
            className="gap-2 md:gap-4 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
            data-active={visibility.id === optimisticVisibility}
          >
            <div className="flex flex-row gap-3 items-start">
              <div className={cn(
                "mt-0.5",
                visibility.id === optimisticVisibility ? "text-foreground" : "text-muted-foreground"
              )}>
                {visibility.icon}
              </div>
              <div className="flex flex-col gap-1 items-start">
                <div>{visibility.label}</div>
                {visibility.description && (
                  <div className="text-xs text-muted-foreground">
                    {visibility.description}
                  </div>
                )}
              </div>
            </div>
            <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
              <CheckCircleFillIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
