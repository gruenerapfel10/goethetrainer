import { NextResponse } from 'next/server';
import { translateToEnglish } from '@/lib/ai/translation';

export async function POST(request: Request) {
  try {
    const { text, context } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    const translation = await translateToEnglish(text, typeof context === 'string' ? context : undefined);
    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate text.' },
      { status: 500 }
    );
  }
}
