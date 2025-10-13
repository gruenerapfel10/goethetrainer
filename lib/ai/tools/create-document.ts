import { generateUUID } from '@/lib/utils';
import { type UIMessageStreamWriter, tool, type UIMessage } from 'ai';
import { z } from 'zod/v3';
import type { Session } from '@/types/next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

interface CreateDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter;
  userMessage: UIMessage;
}

export const createDocument = ({
  session,
  dataStream,
  userMessage,
}: CreateDocumentProps) => {
  /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
  const imageAttachments = userMessage.experimental_attachments?.map(
    (attachment) => ({
      url: attachment.url,
    }),
  );
  console.log('imageAttachmentscreatedocument', imageAttachments);
  return tool({
    description:
      'Create a document for writing, content creation, or image generation/editing. This tool will call other functions that will generate the contents of the document based on the title and kind. For image generation or editing, use kind="image".',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind, ...other }) => {
      const id = generateUUID();
      console.log('other', other);
      dataStream.write({
        'type': 'data',

        'value': [{
          type: 'kind',
          content: kind,
        }]
      });

      dataStream.write({
        'type': 'data',

        'value': [{
          type: 'id',
          content: id,
        }]
      });

      dataStream.write({
        'type': 'data',

        'value': [{
          type: 'title',
          content: title,
        }]
      });

      dataStream.write({
        'type': 'data',

        'value': [{
          type: 'clear',
          content: '',
        }]
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

      dataStream.write({
        'type': 'data',
        'value': [{ type: 'finish', content: '' }]
      });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
};
