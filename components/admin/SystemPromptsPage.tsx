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
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chatModels } from '@/lib/ai/models';

// Storage key for saving drafts
const STORAGE_KEY = 'system-prompts-drafts';
const MAX_PROMPT_LENGTH = 5000;

// Map model IDs to assistant IDs used in the API
const MODEL_TO_ASSISTANT_ID: Record<string, string> = {
  'general-bedrock-agent': 'general-assistant',
  'sharepoint-agent': 'sharepoint-assistant',
  'sharepoint-agent-v2': 'sharepoint-assistant',
  'csv-agent': 'csv-agent',
  'csv-agent-v2': 'csv-agent',
  'text2sql-agent': 'text2sql-agent',
  'document-agent': 'document-assistant',
  'chat-model-reasoning': 'reasoning-assistant',
};

export default function SystemPromptsPage() {
  const t = useTranslations();
  
  // Get the available models from chatModels
  const availableModels = useMemo(() => chatModels(t), [t]);
  
  const [selectedAgentType, setSelectedAgentType] = useState(availableModels[0]?.id || '');

  const {
    data: prompts,
    isLoading,
    mutate,
  } = useSWR<SystemPrompt[]>('/api/admin/system-prompts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    onError: () => console.log('Error fetching prompts'),
  });

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [initialized, setInitialized] = useState(false);

  // Get the current assistant ID based on the selected agent type
  const currentAssistantId = useMemo(
    () => MODEL_TO_ASSISTANT_ID[selectedAgentType] || selectedAgentType,
    [selectedAgentType]
  );

  // Validate prompt text
  const validatePrompt = useCallback(
    (promptText: string): string[] => {
      const errors: string[] = [];

      if (promptText?.trim().length > 0 && promptText.trim().length < 10) {
        errors.push(
          t('errors.fillAllFields', {
            defaultValue: 'Please fill in all fields',
          })
        );
      }

      if (promptText?.length > MAX_PROMPT_LENGTH) {
        errors.push(
          t('errors.invalidFiles', { defaultValue: 'File too large' })
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

  // Initialize data from server
  useEffect(() => {
    if (!initialized && !isLoading && availableModels.length > 0) {
      const init = { ...edits };
      const initErrors: Record<string, string[]> = {};

      if (prompts?.length) {
        prompts.forEach((p) => {
          if (!init[p.assistantId]) {
            init[p.assistantId] = p.promptText;
          }

          initErrors[p.assistantId] = init[p.assistantId]?.trim().length
            ? validatePrompt(init[p.assistantId])
            : [];
        });
      }

      // Initialize assistants for all available models
      availableModels.filter((model) => model.id !== 'sharepoint-agent').forEach((model) => {
        const assistantId = MODEL_TO_ASSISTANT_ID[model.id] || model.id;
        if (!init[assistantId]) init[assistantId] = '';
        if (!initErrors[assistantId]) initErrors[assistantId] = [];
      });

      setEdits(init);
      setErrors(initErrors);
      setInitialized(true);
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
        toast.success(t('success.userUpdate'));
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

        toast.success(t('success.userUpdate'));
      } catch (error) {
        console.error(error);
        toast.error(t('errors.userUpdate'));
      } finally {
        setResetting((prev) => ({ ...prev, [assistantId]: false }));
      }
    },
    [t, validatePrompt]
  );

  // Get current model display name
  const getCurrentModelName = useCallback(() => {
    const model = availableModels.find(model => model.id === selectedAgentType);
    return model?.name || selectedAgentType;
  }, [availableModels, selectedAgentType]);

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

      <div className="space-y-6">
        <div>
          <label
            htmlFor="agent-type"
            className="block text-sm font-medium mb-1"
          >
            {t('chatManagement.selectAgentType', { defaultValue: 'Select Agent Type' })}
          </label>
          <Select
            value={selectedAgentType}
            onValueChange={(value) => setSelectedAgentType(value)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue
                placeholder={t('chatManagement.selectAgentPlaceholder', { defaultValue: 'Select agent type' })}
              />
            </SelectTrigger>
            <SelectContent>
              {availableModels.filter((model) => model.id !== 'sharepoint-agent').map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/50 px-4 py-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">
              {getCurrentModelName()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="relative">
                <Textarea
                  rows={10}
                  className={`font-mono max-h-[700px] text-sm ${
                    errors[currentAssistantId]?.length ? 'border-red-500' : ''
                  } pr-16`}
                  value={edits[currentAssistantId] || ''}
                  onChange={(e) => updatePrompt(currentAssistantId, e.target.value)}
                  placeholder={`Enter system prompt for ${getCurrentModelName()}...`}
                />
                <div className="absolute bottom-2 right-6 text-xs bg-background px-1 rounded text-muted-foreground z-10">
                  {(edits[currentAssistantId] || '').length} / {MAX_PROMPT_LENGTH}
                </div>
              </div>

              {errors[currentAssistantId]?.length > 0 && (
                <Alert variant="destructive" className="mt-2 py-2 text-sm">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-sm">
                        {errors[currentAssistantId].map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => resetToDefault(currentAssistantId)}
                  disabled={resetting[currentAssistantId] || saving[currentAssistantId]}
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  {resetting[currentAssistantId] && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <RotateCcw className="mr-2 h-4 w-4" />
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
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  {saving[currentAssistantId] && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {t('buttons.save')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}