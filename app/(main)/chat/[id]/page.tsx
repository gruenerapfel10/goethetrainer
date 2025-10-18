import { Chat } from '@/components/chat';
import type { UIMessage } from 'ai';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Chat
      id={id}
      initialMessages={[] as UIMessage[]}
      selectedChatModel="gpt-4"
      isReadonly={false}
      isAdmin={false}
      selectedVisibilityType="private"
    />
  );
}
