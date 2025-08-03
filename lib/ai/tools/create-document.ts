import { generateUUID } from '@/lib/utils';
import { type DataStreamWriter, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import type { Session } from '@/types/next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

interface CreateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
  userMessage: UIMessage;
}

export const createDocument = ({
  session,
  dataStream,
  userMessage,
}: CreateDocumentProps) => {
  const imageAttachments = userMessage.experimental_attachments?.map(
    (attachment) => ({
      url: attachment.url,
    }),
  );
  console.log('imageAttachmentscreatedocument', imageAttachments);
  return tool({
    description:
      'Create a document for writing, content creation, or image generation/editing. This tool will call other functions that will generate the contents of the document based on the title and kind. For image generation or editing, use kind="image".',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind, ...other }) => {
      const id = generateUUID();
      console.log('other', other);
      dataStream.writeData({
        type: 'kind',
        content: kind,
      });

      dataStream.writeData({
        type: 'id',
        content: id,
      });

      dataStream.writeData({
        type: 'title',
        content: title,
      });

      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        imageAttachments,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
};
