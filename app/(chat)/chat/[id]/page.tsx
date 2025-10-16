import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId, getDocumentsByChatId } from '@/lib/db/queries';
import { DEFAULT_MODEL_NAME } from '../../../../lib/ai/models';
import type { UIMessage } from 'ai';

type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
};
import type { DBMessage } from '../../../../lib/db/schema';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  try {
    const chat = await getChatById({ id });
    if (!chat) {
      return notFound()
    }

    const session = await auth();

    if (chat.visibility === 'private') {
      if (!session || !session.user) {
        return notFound()
      }

      if (session.user.id !== chat.userId) {
        return notFound()
      }
    }

    const messagesFromDb = await getMessagesByChatId({
      id,
    });
    
    const documentsFromDb = await getDocumentsByChatId({ chatId: id });

    function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {

      return messages.map((message) => {
        const attachments = (message.attachments as Array<Attachment>) ?? [];

        // Messages are stored with content in parts field
        // We need to ensure parts is always an array for v5 compatibility
        let content = message.parts;

        // Handle different storage formats
        if (!content) {
          content = [];
        } else if (typeof content === 'string') {
          // Legacy format - plain text stored as string
          content = [{ type: 'text', text: content }];
        } else if (!Array.isArray(content)) {
          // Ensure it's an array
          content = [];
        }

        // Ensure tool parts have proper state field for rendering
        if (Array.isArray(content)) {
          content = content.map((part: any) => {
            // For tool parts, ensure they have a state field
            if (part.type?.startsWith('tool-') && !part.type.includes('call') && !part.type.includes('result')) {
              // This is a v5 tool part like tool-deep_research
              // Ensure it has a state field for proper rendering
              if (!part.state) {
                // If output exists, it's output-available, otherwise input-available
                part.state = part.output ? 'output-available' : 'input-available';
              }
            }
            return part;
          });
        }

        // Fix unpaired tool-call parts (happens when stream is aborted)
        // The SDK requires every tool-call to have a corresponding tool-result
        if (Array.isArray(content)) {
          const toolCallIds = new Set();
          const toolResultIds = new Set();

          // First pass: collect all tool call and result IDs
          content.forEach((part: any) => {
            // Skip tool-TOOLNAME parts as they are v5 format and don't need pairing
            if (part.type?.startsWith('tool-') && !part.type.includes('call') && !part.type.includes('result')) {
              // This is a v5 tool part like tool-search, tool-deep_research, etc.
              // Keep it as is - it doesn't need pairing
              return;
            }

            if (part.type === 'tool-call' && part.toolCallId) {
              toolCallIds.add(part.toolCallId);
            } else if (part.type === 'tool-result' && part.toolCallId) {
              toolResultIds.add(part.toolCallId);
            }
          });

          // Second pass: filter out unpaired tool-calls
          content = content.filter((part: any) => {
            // Keep all v5 tool parts (tool-TOOLNAME format)
            if (part.type?.startsWith('tool-') && !part.type.includes('call') && !part.type.includes('result')) {
              return true;
            }

            if (part.type === 'tool-call' && part.toolCallId) {
              // Only keep tool-calls that have a corresponding result
              return toolResultIds.has(part.toolCallId);
            }
            return true; // Keep all other parts
          });
        }

        // Debug logging
        if (message.role === 'assistant') {
          const toolParts = Array.isArray(content) ?
            content.filter((p: any) => p.type?.startsWith('tool-')) : [];
        }

        // No need to check for research-progress in attachments anymore
        // Timeline states are stored directly in tool outputs
        // Annotations are not needed as tool outputs contain everything

        const uiMessage = {
          id: message.id,
          content: content,
          role: message.role as UIMessage['role'],
          createdAt: message.createdAt,
          inputTokens: message.inputTokens,
          outputTokens: message.outputTokens,
          agentType: message.agentType,
        } as any;

        return uiMessage;
      });
    }

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');
    
    // Group documents by ID to create artifacts
    const artifactMap = new Map<string, any[]>();
    documentsFromDb.forEach(doc => {
      if (!artifactMap.has(doc.id)) {
        artifactMap.set(doc.id, []);
      }
      artifactMap.get(doc.id)!.push(doc);
    });
    
    const initialArtifacts: Record<string, any> = {};
    artifactMap.forEach((docs, documentId) => {
      const sortedDocs = docs.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const latestDoc = sortedDocs[sortedDocs.length - 1];
      
      initialArtifacts[documentId] = {
        documentId,
        kind: latestDoc.kind,
        title: latestDoc.title,
        content: latestDoc.content,
        status: 'idle',
        versions: [],
        currentVersionIndex: 0,
        boundingBox: { top: 0, left: 0, width: 0, height: 0 },
      };
    });

    return (
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialArtifacts={initialArtifacts}
        selectedChatModel={chatModelFromCookie?.value || DEFAULT_MODEL_NAME}
        selectedVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        isAdmin={session?.user?.isAdmin || false}
        chat={{
          title: chat.title,
          customTitle: chat.customTitle
        }}
      />
    );
  } catch (error) {
    console.error("Error in chat page:", error);
    return redirect('/not-found-page');
  }
}