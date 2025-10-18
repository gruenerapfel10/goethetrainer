'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChat } from '@/contexts/chat-context';

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

const BookOpenIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
  >
    <path
      d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 2V13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 5H6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 8H6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 5H12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 8H12"
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
  'book-open': BookOpenIcon,
} as const;

export function ModelSelector({
  className,
  buttonVariant = "ghost",
  buttonClassName,
  chevronDirection = "up",
}: {
  buttonVariant?: "ghost" | "outline";
  buttonClassName?: string;
  chevronDirection?: "up" | "down";
} & React.ComponentProps<typeof Button>) {
  const { selectedModel, setSelectedModel } = useChat();
  const selectedModelId = selectedModel.agentType;
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const isMobile = useIsMobile();

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
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground shrink-0',
          className,
        )}
      >
        <Button 
          variant={buttonVariant} 
          className={buttonClassName || "h-8 px-3 gap-2 text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"}
        >
          <IconComponent size={14} />
          <span className="hidden sm:inline">{selectedChatModel?.name}</span>
          <ChevronDownIcon className={cn("h-4 w-4", chevronDirection === "up" && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isMobile ? "center" : "start"} 
        side="top" 
        className={cn(
          "border-border/30 rounded-xl bg-muted",
          isMobile 
            ? "w-[calc(100vw-2rem)] max-w-[300px] min-w-[250px]" 
            : "w-[400px]"
        )}
        sideOffset={4}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={16}
      >
        {chatModels(t).map((chatModel) => {
          const { id, icon } = chatModel;
          const ModelIcon = iconMap[icon as keyof typeof iconMap] || SparklesIcon;

          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  setOptimisticModelId(id as typeof selectedModelId);
                  // Save cookie client-side to avoid server re-render
                  document.cookie = `chat-model=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
                  // Update the selected model
                  setSelectedModel(id);
                });
              }}
              className="gap-2 md:gap-4 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
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