import { getNewsTopicFromPool } from '@/lib/news/news-topic-pool';

export async function GET() {
  const topic = await getNewsTopicFromPool();
  return Response.json({ topic });
}
