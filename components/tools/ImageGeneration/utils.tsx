export interface ImageGenerationInput {
  prompt?: string;
  size?: string;
  quality?: string;
}

export interface ImageGenerationOutput {
  success: boolean;
  imageUrl?: string;
  prompt?: string;
  size?: string;
  quality?: string;
  message?: string;
  error?: string;
  metadata?: {
    model?: string;
    revisedPrompt?: string;
    timestamp?: string;
  };
}

export interface ImageGenerationProps {
  toolCallId: string;
  state: 'input-available' | 'output-available' | 'output-error';
  input?: ImageGenerationInput;
  output?: ImageGenerationOutput | { data?: ImageGenerationOutput; success?: boolean; error?: string; };
  error?: any;
}

export const getImageFilename = (prompt?: string): string => {
  const baseText = prompt?.slice(0, 30)
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase() || 'image';
  return `ai-generated-${baseText}-${Date.now()}.png`;
};

export const processOutput = (output: any): ImageGenerationOutput | undefined => {
  if (!output) return undefined;
  
  console.log('[processOutput] Raw output:', output);
  
  // Handle new native format first (direct ImageGenerationOutput)
  if (output?.imageUrl || output?.success !== undefined) {
    console.log('[processOutput] Native format - output is result directly:', output);
    return output as ImageGenerationOutput;
  }
  
  // Handle legacy wrapped format with data field
  if (output?.data) {
    console.log('[processOutput] Legacy format - found data field:', output.data);
    if (output.data?.imageUrl || output.data?.success !== undefined) {
      return {
        success: true,
        ...output.data
      } as ImageGenerationOutput;
    }
    return output.data as ImageGenerationOutput;
  }
  
  // Handle wrapped JSON structure from database (legacy)
  if (output?.type === 'json' && output?.value) {
    console.log('[processOutput] Database JSON wrapper format:', output.value);
    
    if (output.value?.data) {
      console.log('[processOutput] Found data field in JSON value:', output.value.data);
      return {
        success: true,
        ...output.value.data
      } as ImageGenerationOutput;
    }
    
    if (output.value?.imageUrl || output.value?.success !== undefined) {
      console.log('[processOutput] JSON value has image data directly:', output.value);
      return output.value as ImageGenerationOutput;
    }
    
    return output.value as ImageGenerationOutput;
  }
  
  console.log('[processOutput] Returning output as-is:', output);
  return output as ImageGenerationOutput;
};