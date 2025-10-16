import { tool } from 'ai';
import { z } from 'zod';

// Reasoning control tool for debugging and visibility
const reasoningParameters = z.object({
  type: z.enum(['start', 'end']).describe('Control reasoning boundaries: start begins reasoning section, end finishes it'),
});

export const reasoningTool = tool({
  description: 'Control reasoning display boundaries for debugging. Use "start" to begin reasoning section and "end" to finish it.',
  inputSchema: reasoningParameters,
  execute: async ({ type }) => {
    // This is a UI control tool - the actual display logic is handled in the frontend
    return {
      type,
      message: type === 'start' ? 'Reasoning section started' : 'Reasoning section ended',
      timestamp: new Date().toISOString(),
    };
  },
});