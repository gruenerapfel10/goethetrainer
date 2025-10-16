import { auth } from '@/app/(auth)/auth';
import { getDocumentsByChatId } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id: chatId } = await params;

  try {
    const documents = await getDocumentsByChatId({ chatId });
    
    // Group documents by id to get versions
    const artifactMap = new Map<string, any[]>();
    
    documents.forEach(doc => {
      if (!artifactMap.has(doc.id)) {
        artifactMap.set(doc.id, []);
      }
      artifactMap.get(doc.id)!.push(doc);
    });
    
    // Convert to artifact format
    const artifacts = Array.from(artifactMap.entries()).map(([documentId, docs]) => {
      const sortedDocs = docs.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const latestDoc = sortedDocs[sortedDocs.length - 1];
      
      return {
        documentId,
        kind: latestDoc.kind,
        title: latestDoc.title,
        content: latestDoc.content,
        versionsCount: sortedDocs.length,
      };
    });
    
    return Response.json({ artifacts });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
