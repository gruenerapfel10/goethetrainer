'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';

// Using Firebase instead of PostgreSQL
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/firebase/chat-service';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/models';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}): Promise<{
  title: string,
  inputTokens: number,
  outputTokens: number
}> {
  const { text: title, usage } = await generateText({
    model: myProvider.languageModel('haiku'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return { title, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const messages = await getMessageById({ id });

  // Return early if no message is found (database operations are stubbed)
  if (!messages) {
    console.warn(`No message found with id: ${id} (database operations disabled)`);
    return;
  }

  const message = Array.isArray(messages) ? messages[0] : messages;

  // Only proceed if message has the required properties (won't happen with stub)
  if (message && typeof message === 'object' && 'chatId' in message && 'createdAt' in message) {
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: (message as any).chatId,
      timestamp: (message as any).createdAt,
    });
  }
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
