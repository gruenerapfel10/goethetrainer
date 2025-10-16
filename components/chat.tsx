'use client';

import type { UIMessage } from 'ai';
import { ChatProvider } from '@/contexts/chat-context';
import { ChatContent } from './chat-content';
import type { VisibilityType } from './visibility-selector';

export function Chat({
  id,
  initialMessages,
  initialArtifacts,
  selectedChatModel,
  isReadonly,
  isAdmin,
  chat,
  selectedVisibilityType,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialArtifacts?: Record<string, any>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isAdmin: boolean;
  chat?: {
    title: string;
    customTitle?: string | null;
  };
}) {
  return (
    <ChatProvider
      chatId={id}
      initialMessages={initialMessages}
      initialModel={selectedChatModel}
      isReadonly={isReadonly}
    >
      <ChatContent
        selectedVisibilityType={selectedVisibilityType}
        isAdmin={isAdmin}
        chat={chat}
        initialArtifacts={initialArtifacts}
      />
    </ChatProvider>
  );
}