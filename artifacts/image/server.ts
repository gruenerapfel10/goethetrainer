// Path: artifacts/image/server.ts
import { createDocumentHandler } from '@/lib/artifacts/server';
import OpenAI, { toFile } from 'openai';
import { Buffer } from 'node:buffer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream, imageAttachments }) => {
    let draftContent: any = '';
    try {
      if (imageAttachments && imageAttachments.length > 0) {
        const imageUrls = imageAttachments.map((attachment) => attachment.url);

        const tempFilePaths: string[] = [];

        for (const imageUrl of imageUrls) {
          const response = await fetch(imageUrl);
          const imageBuffer = await response.arrayBuffer();

          const tempDir = os.tmpdir();
          const tempFilePath = path.join(
            tempDir,
            `temp-image-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 15)}.png`,
          );

          fs.writeFileSync(tempFilePath, Buffer.from(imageBuffer));

          tempFilePaths.push(tempFilePath);
        }
        const editResponse: any = await openai.images.edit({
          model: 'gpt-image-1',
          image: await toFile(
            createReadStream(resolve(__dirname, tempFilePaths[0])),
            null,
            { type: 'image/png' },
          ),
          prompt: title,
          n: 1,
          size: '1024x1024',
          quality: 'high',
        });

        for (const filePath of tempFilePaths) {
          fs.unlinkSync(filePath);
        }

        draftContent = editResponse.data[0].b64_json;
      } else {
        const response: any = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: title,
          n: 1,
          size: '1024x1024',
          quality: 'high',
        });

        draftContent = response.data[0].b64_json;
      }

      dataStream.writeData({
        type: 'image-delta',
        content: draftContent,
      });

      return draftContent;
    } catch (error: any) {
      console.error('Error with image operation:', error);
      throw new Error(`Failed with image operation: ${error.message}`);
    }
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent: any = '';

    try {
      if (!document.content) {
        const response: any = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: description,
          n: 1,
          size: '1024x1024',
          quality: 'high',
        });

        draftContent = response.data[0].b64_json;
      } else {
        // Create a temporary file from the base64 string
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `temp-image-${Date.now()}.png`);

        // Convert base64 string to buffer and write to file
        const imageBuffer = Buffer.from(document.content as string, 'base64');
        fs.writeFileSync(tempFilePath, imageBuffer);

        const response: any = await openai.images.edit({
          model: 'gpt-image-1',
          image: await toFile(
            createReadStream(resolve(__dirname, tempFilePath)),
            null,
            { type: 'image/png' },
          ),
          prompt: description,
          n: 1,
          size: '1024x1024',
          quality: 'high',
        });

        fs.unlinkSync(tempFilePath);

        draftContent = response.data[0].b64_json;
      }

      dataStream.writeData({
        type: 'image-delta',
        content: draftContent,
      });

      return draftContent;
    } catch (error: any) {
      console.error('Error updating image:', error);
      throw new Error(`Failed to update image: ${error.message}`);
    }
  },
});
