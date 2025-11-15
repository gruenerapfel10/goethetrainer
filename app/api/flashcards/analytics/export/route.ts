import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardAnalytics } from '@/lib/flashcards/analytics/aggregator';
import { serializeDeckAnalytics } from '@/lib/flashcards/analytics/exporters';
import type { AnalyticsExportFormat } from '@/lib/flashcards/analytics/types';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');
    const format = (searchParams.get('format') ?? 'json') as AnalyticsExportFormat;
    if (!deckId) {
      return NextResponse.json({ error: 'deckId query parameter is required' }, { status: 400 });
    }
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'format must be json or csv' }, { status: 400 });
    }
    const analytics = await FlashcardAnalytics.getDeck(session.user.email, deckId);
    const payload = serializeDeckAnalytics(analytics, format);
    const filename = `${deckId}-analytics.${format === 'csv' ? 'csv' : 'json'}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    return new NextResponse(payload, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
