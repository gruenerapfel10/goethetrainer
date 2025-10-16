import { z } from 'zod';
import { tool, experimental_generateImage as generateImage } from 'ai';
import { uploadFileAdmin } from '@/lib/firebase/storage-utils';
import { v4 as uuidv4 } from 'uuid';
import { myProvider } from '@/lib/ai/models';

// Simplified image generation schema that's compatible with Bedrock validation
const imageGenerationSchema = z.object({
  prompt: z.string().describe('Detailed image description. For photorealistic results, include subject details, environment, lighting, camera settings, and style.'),
  
  // Enhanced prompt modifiers (optional string fields to avoid complex nesting)
  scene_description: z.string().optional().describe('Detailed scene overview with textures, materials, and visual elements'),
  subject_details: z.string().optional().describe('Hyperdetailed subject description including features, clothing, pose, expression'),
  camera_settings: z.string().optional().describe('Professional camera settings (e.g., "85mm f/1.4 lens, shallow depth of field, eye-level angle")'),
  lighting_setup: z.string().optional().describe('Lighting conditions (e.g., "golden hour lighting, soft shadows, 5600K daylight")'),
  visual_style: z.string().optional().describe('Style and mood (e.g., "hyperrealistic, cinematic, color graded")'),
  composition: z.string().optional().describe('Composition details (e.g., "rule of thirds, leading lines, balanced")'),
  
  // Standard DALL-E parameters - using string literals instead of enums for Bedrock compatibility
  size: z.string().optional().describe('The size of the generated image (1024x1024, 1792x1024, or 1024x1792)'),
  quality: z.string().optional().describe('Quality level: low, medium, high, or auto (default: high)'),
});

function buildEnhancedPrompt(params: z.infer<typeof imageGenerationSchema>): string {
  const promptParts = [];
  
  // Always start with photorealistic keywords for better results
  const photorealisticKeywords = 'Hyperrealistic, photorealistic, high resolution, intricate details, professional photography';
  
  // Start with the basic prompt
  promptParts.push(`${photorealisticKeywords}, ${params.prompt}`);
  
  // Add optional enhancements if provided
  if (params.scene_description) {
    promptParts.push(`Scene: ${params.scene_description}`);
  }
  
  if (params.subject_details) {
    promptParts.push(`Subject: ${params.subject_details}`);
  }
  
  if (params.camera_settings) {
    promptParts.push(`Camera: ${params.camera_settings}`);
  } else {
    // Add default camera settings for photorealism
    promptParts.push('Camera: 85mm f/1.4 lens, shallow depth of field, eye-level angle');
  }
  
  if (params.lighting_setup) {
    promptParts.push(`Lighting: ${params.lighting_setup}`);
  } else {
    // Add default lighting for photorealism
    promptParts.push('Lighting: golden hour lighting, soft shadows');
  }
  
  if (params.visual_style) {
    promptParts.push(`Style: ${params.visual_style}`);
  } else {
    // Add default style
    promptParts.push('Style: hyperrealistic, cinematic, color graded');
  }
  
  if (params.composition) {
    promptParts.push(`Composition: ${params.composition}`);
  }
  
  // If no enhancements provided, add comprehensive defaults
  if (!params.scene_description && !params.subject_details && !params.camera_settings && 
      !params.lighting_setup && !params.visual_style && !params.composition) {
    return `${photorealisticKeywords}, ${params.prompt}, shot with 85mm lens f/1.4, shallow depth of field, golden hour lighting, cinematic color grading, 8K resolution, ultra detailed`;
  }
  
  // Combine all parts into enhanced prompt with final quality keywords
  const finalKeywords = 'Ultra high quality, 8K resolution, extremely detailed, professional color grading, sharp focus';
  const enhancedPrompt = `${promptParts.join('. ')}. ${finalKeywords}`;
  return enhancedPrompt;
}

export const imageGeneration = () => {
  return tool({
    description: `Generate hyperrealistic, professional photography-style images with DALL-E 3. 
      IMPORTANT: Always provide detailed parameters for photorealistic results:
      - Include specific camera settings (lens, aperture, ISO)
      - Describe lighting conditions (golden hour, studio lighting, etc.)
      - Add texture and material details for subjects
      - Specify composition and depth of field
      - Use cinematic color grading descriptions
      Default style is hyperrealistic with professional photography aesthetics.`,
    inputSchema: imageGenerationSchema,
    
    execute: async (input) => {
      const enhancedPrompt = buildEnhancedPrompt(input);
      
      const validSizes = ['1024x1024', '1792x1024', '1024x1536'];
      const validQualities = ['low', 'medium', 'high', 'auto'];
      
      const size = validSizes.includes(input.size || '') ? input.size : '1024x1024';
      const quality = validQualities.includes(input.quality || '') ? input.quality : 'high';
      
      try {
        console.log('[Image Generation] Starting image generation with gpt-image-1');
        console.log('[Image Generation] Enhanced prompt:', enhancedPrompt);
        console.log('[Image Generation] Size:', size, 'Quality:', quality);
        
        const { image } = await generateImage({
          model: myProvider.imageModel('gpt-image-1'),
          prompt: enhancedPrompt,
          size: size as any,
          providerOptions: {
            openai: { 
              quality: quality as any,
            },
          },
        });
        
        console.log('[Image Generation] Image generated successfully');
        
        const imageBuffer = image.uint8Array;
        if (!imageBuffer) {
          throw new Error('No image data returned from image generation API');
        }
        
        console.log('[Image Generation] Uploading image buffer to Firebase Storage...');
        
        const sanitizedPrompt = input.prompt
          .slice(0, 30)
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase();
        const filename = `${sanitizedPrompt}-${uuidv4()}.png`;
        
        // Upload to Firebase Storage using admin SDK
        const { downloadURL, filePath } = await uploadFileAdmin(
          Buffer.from(imageBuffer.buffer),
          filename,
          'ai-generated-images'
        );
        
        console.log('[Image Generation] Image uploaded successfully to Firebase Storage:', downloadURL);
        
        console.log('[Image Generation] Returning success response');
        return {
          imageUrl: downloadURL,
          prompt: enhancedPrompt,
          originalPrompt: input.prompt,
          size: size,
          quality: quality,
          message: `Successfully generated image and uploaded to Firebase Storage`,
          metadata: {
            model: 'gpt-image-1',
            timestamp: new Date().toISOString(),
            structuredParams: input,
            enhancedPrompt: enhancedPrompt,
            permanentUrl: downloadURL,
            filePath: filePath,
            storage: 'firebase'
          }
        };
      } catch (error) {
        console.error('[Image Generation] Error occurred:', error);
        console.error('[Image Generation] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new Error(
          `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
};