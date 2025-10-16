import type { UIMessage, JSONValue } from 'ai';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { FileSearchResult } from '@/components/chat-header';

export interface Attachment {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
  status?: string;
  type?: string;
  messageId?: string;
  content?: string;
  thumbnailUrl?: string;
  metadata?: any;
}

export interface ExtendedUIMessage extends Omit<UIMessage, 'annotations' | 'parts'> {
  parts?: any[];
  content?: any[];
  experimental_attachments?: Attachment[];
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

export interface PreviewMessageProps {
  chatId: string;
  message: ExtendedUIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<UIMessage>['setMessages'];
  regenerate: UseChatHelpers<UIMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  selectedFiles?: FileSearchResult[];
  selectedModelId?: string;
  completedMessageIds?: Set<string>;
  messages?: UIMessage[];
  isInContext?: boolean;
  allAttachments?: Array<{
    url?: string;
    name?: string;
    contentType?: string;
    size?: number;
    status?: string;
    type?: string;
    messageId?: string;
    content?: string;
    thumbnailUrl?: string;
    metadata?: any;
  }>;
  allAttachmentsMap?: Map<string, { url: string }>;
}

export interface MessageContentProps {
  message: ExtendedUIMessage;
  mode: 'view' | 'edit';
  isReadonly: boolean;
  setMode: React.Dispatch<React.SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers<UIMessage>['setMessages'];
  regenerate: UseChatHelpers<UIMessage>['regenerate'];
  messages?: UIMessage[];
  selectedFiles?: FileSearchResult[];
  isLoading?: boolean;
  allAttachmentsMap?: Map<string, { url: string }>;
}

export interface UnifiedProcessingMessageProps {
  isProcessing?: boolean;
  delay?: number;
}

const isStructuredAnnotation = (
  annotation: JSONValue,
): annotation is { type: string; data: any } => {
  return (
    annotation !== null &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    'data' in annotation
  );
};

export const toExtendedMessage = (message: UIMessage): ExtendedUIMessage => {
  const structuredAnnotations = Array.isArray((message as any).annotations)
    ? (message as any).annotations.filter(isStructuredAnnotation)
    : undefined;

  return {
    ...message,
    content: (message as any).content,
    annotations: structuredAnnotations,
    experimental_attachments: (message as any).experimental_attachments,
    inputTokens: (message as any).inputTokens,
    outputTokens: (message as any).outputTokens,
    modelId: (message as any).modelId,
    agentType: (message as any).agentType,
    agentName: (message as any).agentName,
    cost: (message as any).cost,
    formattedCost: (message as any).formattedCost,
  } as ExtendedUIMessage;
};