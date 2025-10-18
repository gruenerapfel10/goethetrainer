import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import type { UIMessage } from 'ai';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  let initialMessages: UIMessage[] = [];
  let chatTitle: string | undefined;

  try {
    const chat = await getChatById({ id });
    if (chat) {
      chatTitle = chat.title;
      const messages = await getMessagesByChatId({ id });
      if (messages && Array.isArray(messages)) {
        initialMessages = messages;
      }
    }
  } catch (error) {
    console.error('Failed to fetch chat:', error);
  }

  return (
    <Chat
      id={id}
      initialMessages={initialMessages}
      selectedChatModel="gpt-4"
      isReadonly={false}
      isAdmin={false}
      selectedVisibilityType="private"
      chat={chatTitle ? { title: chatTitle } : undefined}
    />
  );
}
