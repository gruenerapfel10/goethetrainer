'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
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
    model: myProvider.languageModel('grok-4-fast-reasoning'),
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
  const message = await getMessageById({ id });

  // Return early if no message is found
  if (!message) {
    console.warn(`No message found with id: ${id}`);
    return;
  }

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
