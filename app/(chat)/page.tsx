import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_MODEL_NAME } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '@/app/(auth)/auth';

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const session = await auth();

  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={DEFAULT_MODEL_NAME}
          selectedVisibilityType="private"
          isReadonly={false}
          isAdmin={session?.user?.isAdmin || false}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie?.value || DEFAULT_MODEL_NAME}
        selectedVisibilityType="private"
        isReadonly={false}
        isAdmin={session?.user?.isAdmin || false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
