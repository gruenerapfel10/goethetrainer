import { type DataStreamWriter, tool } from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById, } from '@/lib/db/queries';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';

interface UpdateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      // Check if the document was created recently
      const COOLDOWN_PERIOD_MS = 10000;
      const createdAt = new Date(document.createdAt).getTime();
      const now = Date.now();
      const timeSinceCreation = now - createdAt;

      if (timeSinceCreation < COOLDOWN_PERIOD_MS) {
        // Document was created too recently, reject the update
        const waitTimeSeconds = Math.ceil(
          (COOLDOWN_PERIOD_MS - timeSinceCreation) / 1000,
        );
        return {
          error: `Please wait for user feedback before updating a newly created document. Try again in ${waitTimeSeconds} second${
            waitTimeSeconds !== 1 ? 's' : ''
          }.`,
          waitTime: waitTimeSeconds,
        };
      }

      // Proceed with the update
      dataStream.writeData({
        type: 'clear',
        content: document.title,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        session,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });
