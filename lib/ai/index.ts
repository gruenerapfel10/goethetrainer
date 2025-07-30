import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
import { customMiddleware } from './custom-middleware';
import { togetherai } from '@ai-sdk/togetherai';

// Configure AWS Bedrock client
const bedrockConfig = {
  region:
    process.env.GENERAL_AWS_REGION || process.env.AWS_REGION || 'eu-central-1',
  accessKeyId:
    process.env.GENERAL_AWS_ACCESS_KEY_ID! || process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey:
    process.env.GENERAL_AWS_SECRET_ACCESS_KEY! ||
    process.env.GENERAL_AWS_SECRET_ACCESS_KEY!,
};

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

  const bedrock = createAmazonBedrock(bedrockConfig);

  return wrapLanguageModel({
    // @ts-ignore
    model: bedrock(apiIdentifier),
    middleware: customMiddleware,
  });
};
