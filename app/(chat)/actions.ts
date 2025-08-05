'use server';

import { generateText, type Message } from 'ai';
import { cookies } from 'next/headers';

// Database imports using stub functions (no persistence)
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries-stub';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/models';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
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

  return { title, inputTokens: usage.promptTokens, outputTokens: usage.completionTokens };
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const messages = await getMessageById({ id });

  // Return early if no message is found
  if (!messages || messages.length === 0) {
    console.warn(`No message found with id: ${id}`);
    return;
  }

  const message = messages[0]; // Get the first message since we know it exists

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
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
