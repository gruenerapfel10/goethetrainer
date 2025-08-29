import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

// Auth removed - no authentication needed
// import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
// Database removed - using stub functions
// import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_MODEL_NAME } from '../../../../lib/ai/models';
import type { Attachment, UIMessage } from 'ai';
// import type { DBMessage } from '../../../../lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  try {
    // Database removed - create mock chat data
    const chat = {
      id: id,
      title: 'Chat',
      customTitle: null,
      visibility: 'public' as const,
      userId: 'anonymous'
    };

    // Auth removed - no session needed
    // const session = await auth();
    
    // No auth checks needed - all chats are now public
    // if (chat.visibility === 'private') {
    //   if (!session || !session.user) {
    //     return notFound()
    //   }
    //   if (session.user.id !== chat.userId) {
    //     return notFound()
    //   }
    // }

    // Database removed - no messages from DB
    const messagesFromDb: UIMessage[] = [];

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');

    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={messagesFromDb}
          selectedChatModel={chatModelFromCookie?.value || DEFAULT_MODEL_NAME}
          selectedVisibilityType={chat.visibility}
          isReadonly={false} // Auth removed - always editable
          isAdmin={false} // Auth removed - no admin roles
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