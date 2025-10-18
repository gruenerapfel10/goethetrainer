import { togetherai } from '@ai-sdk/togetherai';

export const customModel = (
  apiIdentifier: string,
  forReasoning = false,
) => {
  // Only using TogetherAI now (no more Bedrock)
  // @ts-ignore
  return togetherai(apiIdentifier);
};
