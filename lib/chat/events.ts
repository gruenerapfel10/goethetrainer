export const REQUEST_CHAT_PROMPT_EVENT = 'chat:requestPrompt';
export const APPLY_CHAT_INPUT_EVENT = 'chat:applyInput';

export interface ChatPromptEventDetail {
  text: string;
}

export interface ApplyChatInputDetail {
  text: string;
}

export function emitChatPromptRequest(text: string): void {
  if (typeof window === 'undefined' || !text.trim()) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ChatPromptEventDetail>(REQUEST_CHAT_PROMPT_EVENT, {
      detail: { text },
    })
  );
}

export function emitApplyChatInput(text: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ApplyChatInputDetail>(APPLY_CHAT_INPUT_EVENT, {
      detail: { text },
    })
  );
}
