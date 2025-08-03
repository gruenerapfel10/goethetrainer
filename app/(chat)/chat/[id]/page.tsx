import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_MODEL_NAME } from '../../../../lib/ai/models';
import type { Attachment, UIMessage } from 'ai';
import type { DBMessage } from '../../../../lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  try {
    const chat = await getChatById({ id });
    if (!chat) {
      return notFound()
    }

    const session = await auth();
    
    if (chat.visibility === 'private') {
      if (!session || !session.user) {
        return notFound()
      }

      if (session.user.id !== chat.userId) {
        return notFound()
      }
    }

    const messagesFromDb = await getMessagesByChatId({
      id,
    });

    function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
      return messages.map((message) => ({
        id: message.id,
        parts: message.parts as UIMessage['parts'],
        role: message.role as UIMessage['role'],
        // Note: content will soon be deprecated in @ai-sdk/react
        content: '',
        createdAt: message.createdAt,
        experimental_attachments:
          (message.attachments as Array<Attachment>) ?? [],
      }));
    }

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');

    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={chatModelFromCookie?.value || DEFAULT_MODEL_NAME}
          selectedVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
          isAdmin={false} // TODO: Implement Firebase admin roles
          chat={{
            title: chat.title,
            customTitle: chat.customTitle
          }}
        />
        <DataStreamHandler id={id} />
      </>
    );
  } catch (error) {
    console.error("Error in chat page:", error);
    return redirect('/not-found-page');
  }
}