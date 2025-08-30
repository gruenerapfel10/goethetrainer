import { google } from '@ai-sdk/google';

// Create a provider instance for Gemini
export const myProvider = {
  languageModel: (modelId: string) => {
    // Map to Gemini 2.5 Flash model
    return google('gemini-2.5-flash', {
      // You can add additional configuration here if needed
    });
  }
};