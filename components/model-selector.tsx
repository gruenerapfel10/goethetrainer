'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
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
  SparklesIcon,
  BoxIcon,
  GlobeIcon,
  LineChartIcon,
  ImageIcon,
} from './icons';
import { chatModels } from '../lib/ai/models';
import { useTranslations } from 'next-intl';

// Custom icons for more professional look
const LayersIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
  >
    <path
      d="M8 2L2 5.5L8 9L14 5.5L8 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 8L8 11.5L14 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 10.5L8 14L14 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
  >
    <path
      d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 14L10.5 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Map icon names to icon components
const iconMap = {
  sparkles: SparklesIcon,
  box: BoxIcon,
  globe: GlobeIcon,
  search: SearchIcon,
  layers: LayersIcon,
  lineChart: LineChartIcon,
  image: ImageIcon,
} as const;

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const selectedChatModel = useMemo(
    () => chatModels(t).find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId, t],
  );

  const IconComponent = selectedChatModel?.icon ? iconMap[selectedChatModel.icon as keyof typeof iconMap] : SparklesIcon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px] gap-2">
          <IconComponent size={14} />
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {chatModels(t).map((chatModel) => {
          const { id, icon } = chatModel;
          const ModelIcon = iconMap[icon as keyof typeof iconMap] || SparklesIcon;

          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  setOptimisticModelId(id);
                  saveChatModelAsCookie(id);
                });
              }}
              className="gap-4 group/item flex flex-row justify-between items-center"
              data-active={id === optimisticModelId}
            >
              <div className="flex flex-row gap-3 items-start">
                <ModelIcon 
                  size={16} 
                  className={cn(
                    "mt-0.5",
                    id === optimisticModelId ? "text-foreground" : "text-muted-foreground"
                  )} 
                />
                <div className="flex flex-col gap-1 items-start">
                  <div>{chatModel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chatModel.description}
                  </div>
                </div>
              </div>

              <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}