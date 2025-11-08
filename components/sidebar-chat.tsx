'use client';

import type { UIMessage } from 'ai';
import { ChatProvider } from '@/contexts/chat-context';
import { SidebarChatContent } from './sidebar-chat-content';
import type { VisibilityType } from './visibility-selector';

export function SidebarChat({
  id,
  initialMessages,
  initialArtifacts,
  selectedChatModel,
  isReadonly,
  isAdmin,
  chat,
  selectedVisibilityType,
  onChatChange,
  pendingPrompt,
  onPromptConsumed,
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
  onChatChange?: (chatId: string) => void;
  pendingPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  return (
    <ChatProvider
      chatId={id}
      initialMessages={initialMessages}
      initialModel={selectedChatModel}
      isReadonly={isReadonly}
      shouldUpdateUrl={false}
    >
      <SidebarChatContent
        selectedVisibilityType={selectedVisibilityType}
        isAdmin={isAdmin}
        chat={chat}
        initialArtifacts={initialArtifacts}
        onChatChange={onChatChange}
        pendingPrompt={pendingPrompt}
        onPromptConsumed={onPromptConsumed}
      />
    </ChatProvider>
  );
}
