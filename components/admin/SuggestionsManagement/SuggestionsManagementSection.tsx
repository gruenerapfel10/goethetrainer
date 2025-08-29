'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { chatModels } from '@/lib/ai/models';

interface SuggestedMessage {
  title: string;
  label: string;
  action: string;
}

// Maximum length for title and label fields
const MAX_TITLE_LENGTH = 50;
const MAX_LABEL_LENGTH = 50;

export default function AdminSuggestedMessagesPage() {
  const t = useTranslations();
  
  // Get available models from chatModels
  const availableModels = useMemo(() => chatModels(t), [t]);
  
  // Set default selected model
  const [selectedModelId, setSelectedModelId] = useState(availableModels[0]?.id || 'general-bedrock-agent');
  const [activeTab, setActiveTab] = useState('1');
  const [messages, setMessages] = useState<Record<string, SuggestedMessage>>({
    '1': { title: '', label: '', action: '' },
    '2': { title: '', label: '', action: '' },
    '3': { title: '', label: '', action: '' },
    '4': { title: '', label: '', action: '' },
  });
  const [loading, setLoading] = useState(true);
  
  // Define positions array
  const positions = ['1', '2', '3', '4'];

  // Fetch messages when model changes
  useEffect(() => {
    async function fetchMessages() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/suggested-messages?modelId=${selectedModelId}`,
        );

        if (response.ok) {
          const data = await response.json();

          // Initialize with empty messages
          const newMessages = {
            '1': { title: '', label: '', action: '' },
            '2': { title: '', label: '', action: '' },
            '3': { title: '', label: '', action: '' },
            '4': { title: '', label: '', action: '' },
          };

          // Fill in with data from API (up to 4 messages)
          data.slice(0, 4).forEach((msg: SuggestedMessage, index: number) => {
            const position = String(index + 1) as '1' | '2' | '3' | '4';
            newMessages[position] = msg;
          });

          setMessages(newMessages);
        } else {
          console.error('Failed to fetch messages, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    }

    if (selectedModelId) {
      fetchMessages();
    }
  }, [selectedModelId]);

  const handleInputChange = (
    position: string,
    field: keyof SuggestedMessage,
    value: string,
  ) => {
    // Apply length limits to title and label fields
    let limitedValue = value;
    if (field === 'title') {
      limitedValue = value.slice(0, MAX_TITLE_LENGTH);
    } else if (field === 'label') {
      limitedValue = value.slice(0, MAX_LABEL_LENGTH);
    }

    setMessages((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        [field]: limitedValue,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Save each message position
      for (const [position, message] of Object.entries(messages)) {
        // Skip empty messages
        if (!message.title && !message.label && !message.action) {
          continue;
        }

        const response = await fetch('/api/admin/suggested-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modelId: selectedModelId,
            position,
            ...message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save message');
        }
      }

      toast.success(t('chatManagement.suggestionsSaved'));
    } catch (error) {
      console.error('Error saving messages:', error);
      toast.error(t('chatManagement.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        'Are you sure you want to reset to default suggestions? This will overwrite any changes.'
      )
    ) {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/init-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modelId: selectedModelId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reset suggestions');
        }

        toast.success(t('chatManagement.suggestionsReset'));

        // Reload the suggestions
        const fetchResponse = await fetch(
          `/api/suggested-messages?modelId=${selectedModelId}`,
        );
        
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();

          // Initialize with empty messages
          const newMessages = {
            '1': { title: '', label: '', action: '' },
            '2': { title: '', label: '', action: '' },
            '3': { title: '', label: '', action: '' },
            '4': { title: '', label: '', action: '' },
          };

          // Fill in with data from API
          data
            .slice(0, 4)
            .forEach((msg: SuggestedMessage, index: number) => {
              const position = String(index + 1) as '1' | '2' | '3' | '4';
              newMessages[position] = msg;
            });

          setMessages(newMessages);
        } else {
          throw new Error('Failed to reload suggestions after reset');
        }
      } catch (error) {
        console.error('Error resetting suggestions:', error);
        toast.error(t('chatManagement.resetFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  // Get current model display name
  const getCurrentModelDisplayName = useMemo(() => {
    const model = availableModels.find(model => model.id === selectedModelId);
    return model?.name || selectedModelId;
  }, [availableModels, selectedModelId]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {t('chatManagement.suggestedInquiries')}
      </h1>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="agent-type"
            className="block text-sm font-medium mb-1"
          >
            {t('chatManagement.selectAgentType')}
          </label>
          <Select
            value={selectedModelId}
            onValueChange={(value) => setSelectedModelId(value)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue
                placeholder={t('chatManagement.selectAgentPlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('chatManagement.editSuggestions')} —{' '}
              {getCurrentModelDisplayName}
            </h2>

            {/* Tabs with horizontal scrolling on mobile */}
            <div className="max-w-full">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="overflow-x-auto pb-2 mb-2">
                  <TabsList className="mb-2 w-max min-w-full sm:w-auto sm:min-w-0 sm:max-w-screen-sm">
                    {positions.map((number) => (
                      <TabsTrigger 
                        key={number} 
                        value={number}
                        className="px-6 min-w-[120px]"
                      >
                        {t('chatManagement.suggestion', { defaultValue: 'Suggestion' })} {number}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {positions.map((position) => (
                  <TabsContent
                    key={position}
                    value={position}
                    className="space-y-4"
                  >
                    {/* Title */}
                    <div>
                      <label
                        htmlFor={`title-${position}`}
                        className="block text-sm font-medium mb-1"
                      >
                        {t('chatManagement.suggestionTitle')}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id={`title-${position}`}
                          value={messages[position].title}
                          onChange={(e) =>
                            handleInputChange(
                              position,
                              'title',
                              e.target.value,
                            )
                          }
                          placeholder={t('chatManagement.enterTitle')}
                          disabled={loading}
                          maxLength={MAX_TITLE_LENGTH}
                        />
                        <div className="absolute bottom-2 right-2 text-xs bg-background px-1 rounded text-muted-foreground z-10">
                          {messages[position].title.length}/{MAX_TITLE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Subtitle/Label */}
                    <div>
                      <label
                        htmlFor={`subtitle-${position}`}
                        className="block text-sm font-medium mb-1"
                      >
                        {t('chatManagement.suggestionLabel')}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id={`subtitle-${position}`}
                          value={messages[position].label}
                          onChange={(e) =>
                            handleInputChange(
                              position,
                              'label',
                              e.target.value,
                            )
                          }
                          placeholder={t('chatManagement.enterLabel')}
                          disabled={loading}
                          maxLength={MAX_LABEL_LENGTH}
                        />
                        <div className="absolute bottom-2 right-2 text-xs bg-background px-1 rounded text-muted-foreground z-10">
                          {messages[position].label.length}/{MAX_LABEL_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Full inquiry text */}
                    <div>
                      <label
                        htmlFor={`action-${position}`}
                        className="block text-sm font-medium mb-1"
                      >
                        {t('chatManagement.suggestionAction')}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        id={`action-${position}`}
                        value={messages[position].action}
                        onChange={(e) =>
                          handleInputChange(
                            position,
                            'action',
                            e.target.value,
                          )
                        }
                        placeholder={t('chatManagement.enterAction')}
                        rows={5}
                        disabled={loading}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={handleReset} 
            variant="outline" 
            disabled={loading}
            className="h-10 w-full"
          >
            {t('chatManagement.resetToDefault', { defaultValue: 'Reset to Default' })}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="h-10 w-full"
          >
            {loading ? t('status.saving', { defaultValue: 'Saving...' }) : t('chatManagement.saveSuggestions', { defaultValue: 'Save Suggestions' })}
          </Button>
        </div>
      </div>
    </div>
  );
}