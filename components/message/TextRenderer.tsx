'use client';

import { memo, useCallback, useMemo } from 'react';
import { Response } from '../ai-elements/response';
import { MessageEditor } from '../message-editor';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { PencilEditIcon } from '../icons';
import { cn, formatAIResponse } from '@/lib/utils';
import { renderTextWithMentions } from '../multimodal-input/mention-utils';
import type { UIMessage } from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';

interface ExtendedUIMessage extends Omit<UIMessage, 'annotations' | 'parts'> {
  parts?: any[];
  content?: any[];
  experimental_attachments?: any[];
  annotations?: Array<{
    type: string;
    data: any;
  }>;
  inputTokens?: number;
  outputTokens?: number;
  modelId?: string;
  agentType?: string;
  agentName?: string;
  cost?: number;
  formattedCost?: string;
}

interface TextRendererProps {
  message: ExtendedUIMessage;
  text: string;
  sources: any[];
  mode: 'view' | 'edit';
  isReadonly: boolean;
  isStreaming: boolean;
  fileMap: Map<string, { url: string }>;
  setMode: React.Dispatch<React.SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers<UIMessage>['setMessages'];
  regenerate: UseChatHelpers<UIMessage>['regenerate'];
}

const TextWithMentions = ({
  text,
  fileMap,
}: {
  text: string;
  fileMap: Map<string, { url: string }>;
}) => {
  const renderedContent = useMemo(() => {
    return renderTextWithMentions(text, fileMap);
  }, [text, fileMap]);

  return <>{renderedContent}</>;
};

const AIResponseRenderer = memo<{
  content: string;
  sources: any[];
  isStreaming?: boolean;
}>(({ content, sources, isStreaming = false }) => {
  return (
    <Response>
      {content}
    </Response>
  );
});

AIResponseRenderer.displayName = 'AIResponseRenderer';

export const TextRenderer = memo<TextRendererProps>(({
  message,
  text,
  sources,
  mode,
  isReadonly,
  isStreaming,
  fileMap,
  setMode,
  setMessages,
  regenerate,
}) => {
  const handleEditClick = useCallback(() => {
    setMode('edit');
  }, [setMode]);

  if (mode === 'edit') {
    return (
      <div className="flex flex-row gap-3 items-start">
        <div className="size-8" />
        <MessageEditor
          message={message as any}
          setMode={setMode}
          setMessages={setMessages}
          regenerate={regenerate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-3 items-start group/content">
      {message.role === 'user' && !isReadonly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full opacity-0 group-hover/content:opacity-100 transition-opacity duration-200"
              onClick={handleEditClick}
            >
              <PencilEditIcon className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit message</TooltipContent>
        </Tooltip>
      )}

      <div
        className={cn('flex flex-col gap-0 min-w-0 flex-1', {
          'bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-sm':
            message.role === 'user',
        })}
      >
        {message.role === 'user' ? (
          <div className="text-sm">
            <TextWithMentions text={text} fileMap={fileMap} />
          </div>
        ) : (
          <AIResponseRenderer
            content={formatAIResponse(text)}
            sources={sources}
            isStreaming={isStreaming}
          />
        )}
      </div>
    </div>
  );
});

TextRenderer.displayName = 'TextRenderer';