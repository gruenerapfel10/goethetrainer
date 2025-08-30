import type { UIMessage } from 'ai';
import type { LanguageModel } from '@ai-sdk/provider';

export interface AgentMeta {
  session: any;
  userMessage: UIMessage;
  chat: any;
  titleInputTokens: number;
  titleOutputTokens: number;
  model: LanguageModel;
}