import { google } from '@ai-sdk/google';
import { wrapLanguageModel as wrapLanguageModel } from 'ai';
import { customMiddleware } from './custom-middleware';
import { togetherai } from '@ai-sdk/togetherai';

export const customModel = (
  apiIdentifier: string,
  forReasoning = false,
) => {
  if (forReasoning) {
    return wrapLanguageModel({
      // @ts-ignore
      model: togetherai(apiIdentifier),
      middleware: customMiddleware,
    });
  }

  // Default to Google Gemini for all non-reasoning models
  return wrapLanguageModel({
    model: google('gemini-2.5-flash'),
    middleware: customMiddleware,
  });
};