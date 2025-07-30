import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// Schemas for AI responses
const AIResponseSchema = z.object({
  type: z.enum(['success', 'error', 'info']),
  message: z.string(),
  data: z.any().optional(),
})

export type AIResponse = z.infer<typeof AIResponseSchema>;

export async function processAIRequest(prompt: string): Promise<AIResponse> {
  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: AIResponseSchema,
      prompt: `Process this request and provide a helpful response: ${prompt}`,
    });

    return object;
  } catch (error) {
    console.error('Error processing AI request:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error processing your request.',
    };
  }
} 