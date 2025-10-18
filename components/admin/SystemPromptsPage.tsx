'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { SystemPrompt } from '@/lib/db/schema';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Save,
  RotateCcw,
  InfoIcon,
  AlertTriangle,
  ChevronDownIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AgentType, getAgentMetadata } from '@/lib/ai/agents';
import { chatModels } from '@/lib/ai/models';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  CheckCircleFillIcon,
  SparklesIcon,
  BoxIcon,
  GlobeIcon,
  LineChartIcon,
} from '@/components/icons';

const STORAGE_KEY = 'system-prompts-drafts';
const MAX_PROMPT_LENGTH = 5000;

const AGENT_TO_ASSISTANT_ID: Record<string, string> = {
  [AgentType.GENERAL_AGENT]: 'general-assistant',
  [AgentType.TEXT2SQL_AGENT]: 'text2sql-agent',
};

const SearchIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 14L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LayersIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 2L2 5.5L8 9L14 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 8L8 11.5L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 10.5L8 14L14 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconMap = {
  sparkles: SparklesIcon,
  box: BoxIcon,
  globe: GlobeIcon,
  search: SearchIcon,
  layers: LayersIcon,
  lineChart: LineChartIcon,
} as const;

export default function SystemPromptsPage() {
  const t = useTranslations();
  
  const availableModels = useMemo(() => chatModels(t), [t]);
  
  const [selectedAgentType, setSelectedAgentType] = useState<string>(AgentType.GENERAL_AGENT);

  const {
    data: prompts,
    isLoading,
    mutate,
  } = useSWR<SystemPrompt[]>('/api/admin/system-prompts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    onError: () => {},
  });

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [initialized, setInitialized] = useState(false);

  const currentAssistantId = useMemo(
    () => AGENT_TO_ASSISTANT_ID[selectedAgentType] || selectedAgentType,
    [selectedAgentType]
  );

  // Validate prompt text
  const validatePrompt = useCallback(
    (promptText: string): string[] => {
      const errors: string[] = [];

      if (promptText?.trim().length > 0 && promptText.trim().length < 10) {
        errors.push(
          t('errors.promptTooShort', {
            defaultValue: 'Prompt must be at least 10 characters',
          })
        );
      }

      if (promptText?.length > MAX_PROMPT_LENGTH) {
        errors.push(
          t('errors.promptTooLong', { defaultValue: 'Prompt exceeds maximum length' })
        );
      }

      return errors;
    },
    [t]
  );

  // Load drafts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEdits((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch (e) {
      console.error('Failed to load drafts', e);
    }
  }, []);

  // Save drafts to localStorage
  useEffect(() => {
    if (Object.keys(edits).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      } catch (e) {
        console.error('Failed to save drafts', e);
      }
    }
  }, [edits]);

  useEffect(() => {
    if (!initialized && !isLoading && availableModels.length > 0) {
      const init = { ...edits };
      const initErrors: Record<string, string[]> = {};

      const loadDefaults = async () => {
        for (const model of availableModels) {
          const assistantId = AGENT_TO_ASSISTANT_ID[model.id] || model.id;
          
          const savedPrompt = prompts?.find(p => p.assistantId === assistantId);
          
          if (savedPrompt?.promptText) {
            init[assistantId] = savedPrompt.promptText;
          } else if (!init[assistantId]) {
            try {
              const response = await fetch(
                `/api/admin/system-prompts/default?assistantId=${assistantId}`
              );
              if (response.ok) {
                const data = await response.json();
                if (data.promptText) {
                  init[assistantId] = data.promptText;
                }
              }
            } catch (error) {
              console.error(`Error loading default for ${assistantId}:`, error);
            }
          }

          initErrors[assistantId] = init[assistantId]?.trim().length
            ? validatePrompt(init[assistantId])
            : [];
        }

        setEdits(init);
        setErrors(initErrors);
        setInitialized(true);
      };

      loadDefaults();
    }
  }, [
    prompts,
    isLoading,
    initialized,
    edits,
    validatePrompt,
    availableModels,
  ]);

  // Update prompt text and validate
  const updatePrompt = useCallback(
    (assistantId: string, text: string) => {
      setEdits((prev) => {
        if (prev[assistantId] === text) return prev;
        return { ...prev, [assistantId]: text };
      });

      setErrors((prev) => ({
        ...prev,
        [assistantId]: text.trim().length ? validatePrompt(text) : [],
      }));
    },
    [validatePrompt]
  );

  // Save prompt to database
  const savePrompt = useCallback(
    async (assistantId: string) => {
      const promptText = edits[assistantId]?.trim() || '';
      if (!promptText) {
        toast.error(t('errors.fillAllFields'));
        return;
      }

      const validationErrors = validatePrompt(promptText);
      if (validationErrors.length) {
        setErrors((prev) => ({ ...prev, [assistantId]: validationErrors }));
        toast.error(validationErrors[0]);
        return;
      }

      setSaving((prev) => ({ ...prev, [assistantId]: true }));
      try {
        const response = await fetch('/api/admin/system-prompts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assistantId, promptText }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || t('errors.userUpdate'));
        }

        await mutate();
        const modelName = availableModels.find(m => AGENT_TO_ASSISTANT_ID[m.id] === assistantId || m.id === assistantId)?.name || getCurrentModelName();
        toast.success(t('success.promptSaved', { model: modelName }));
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : t('errors.userUpdate')
        );
      } finally {
        setSaving((prev) => ({ ...prev, [assistantId]: false }));
      }
    },
    [edits, validatePrompt, t, mutate]
  );

  // Reset prompt to default value
  const resetToDefault = useCallback(
    async (assistantId: string) => {
      setResetting((prev) => ({ ...prev, [assistantId]: true }));
      try {
        let finalPrompt = '';

        try {
          const response = await fetch(
            `/api/admin/system-prompts/default?assistantId=${assistantId}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.promptText) finalPrompt = data.promptText;
          }
        } catch (fetchError) {
          console.error('Error fetching default prompt', fetchError);
        }

        setEdits((prev) => ({ ...prev, [assistantId]: finalPrompt }));
        setErrors((prev) => ({
          ...prev,
          [assistantId]: finalPrompt.trim().length
            ? validatePrompt(finalPrompt)
            : [],
        }));

        const modelName = availableModels.find(m => AGENT_TO_ASSISTANT_ID[m.id] === assistantId || m.id === assistantId)?.name || getCurrentModelName();
        toast.success(t('success.promptReset', { model: modelName }));
      } catch (error) {
        console.error(error);
        toast.error(t('errors.userUpdate'));
      } finally {
        setResetting((prev) => ({ ...prev, [assistantId]: false }));
      }
    },
    [t, validatePrompt]
  );

  const getCurrentModelName = useCallback(() => {
    const model = availableModels.find(model => model.id === selectedAgentType);
    return model?.name || getAgentMetadata(selectedAgentType as AgentType).displayName;
  }, [availableModels, selectedAgentType]);

  const currentPrompt = useMemo(() => {
    return edits[currentAssistantId] || '';
  }, [edits, currentAssistantId]);


  // Show loading state for initial data fetch
  if (isLoading && !initialized) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{t('chat.systemPrompts')}</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  {t('chat.systemPromptsDescription', {
                    defaultValue:
                      'System prompts define the behavior, capabilities, and personality of AI assistants.',
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4 max-w-3xl mx-auto px-4">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-3 gap-2 text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full sm:w-auto">
                {(() => {
                  const model = availableModels.find(m => m.id === selectedAgentType);
                  const IconComponent = model?.icon ? iconMap[model.icon as keyof typeof iconMap] : SparklesIcon;
                  return (
                    <>
                      <IconComponent size={14} />
                      <span>{getCurrentModelName()}</span>
                      <ChevronDownIcon className="h-4 w-4" />
                    </>
                  );
                })()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="border-border/30 rounded-xl bg-muted w-[min(400px,calc(100vw-2rem))]" sideOffset={4}>
              {availableModels.map((model) => {
                const IconComponent = iconMap[model.icon as keyof typeof iconMap] || SparklesIcon;
                return (
                  <DropdownMenuItem
                    key={model.id}
                    onSelect={() => setSelectedAgentType(model.id)}
                    className="gap-2 md:gap-4 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
                    data-active={model.id === selectedAgentType}
                  >
                    <div className="flex flex-row gap-3 items-start">
                      <IconComponent
                        size={16}
                        className={cn(
                          "mt-0.5",
                          model.id === selectedAgentType ? "text-foreground" : "text-muted-foreground"
                        )}
                      />
                      <div className="flex flex-col gap-1 items-start">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {model.description}
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

          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              onClick={() => resetToDefault(currentAssistantId)}
              disabled={resetting[currentAssistantId] || saving[currentAssistantId]}
              size="sm"
            >
              {resetting[currentAssistantId] ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {t('buttons.resetToDefault', {
                defaultValue: 'Reset to Default',
              })}
            </Button>
            <Button
              onClick={() => savePrompt(currentAssistantId)}
              disabled={
                saving[currentAssistantId] ||
                resetting[currentAssistantId] ||
                errors[currentAssistantId]?.length > 0
              }
              size="sm"
            >
              {saving[currentAssistantId] ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('buttons.save')}
            </Button>
          </div>
        </div>

        <div className="w-full space-y-4">
          <div className="relative">
            <Textarea
              className={cn(
                "font-mono h-[calc(100vh-280px)] text-[13px] leading-relaxed resize-none w-full",
                "bg-muted border-border/30",
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              )}
              value={currentPrompt}
              onChange={(e) => updatePrompt(currentAssistantId, e.target.value)}
              placeholder={`Enter system prompt for ${getCurrentModelName()}...`}
            />
            {errors[currentAssistantId]?.length > 0 && (
              <div className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive font-medium">
                {errors[currentAssistantId][0]}
              </div>
            )}
            <div className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md bg-muted/80 backdrop-blur-sm text-muted-foreground font-medium">
              {currentPrompt.length} / {MAX_PROMPT_LENGTH}
            </div>
          </div>

          <div className="flex md:hidden gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => resetToDefault(currentAssistantId)}
              disabled={resetting[currentAssistantId] || saving[currentAssistantId]}
              size="sm"
              className="flex-1"
            >
              {resetting[currentAssistantId] ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {t('buttons.resetToDefault', {
                defaultValue: 'Reset to Default',
              })}
            </Button>
            <Button
              onClick={() => savePrompt(currentAssistantId)}
              disabled={
                saving[currentAssistantId] ||
                resetting[currentAssistantId] ||
                errors[currentAssistantId]?.length > 0
              }
              size="sm"
              className="flex-1"
            >
              {saving[currentAssistantId] ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('buttons.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}