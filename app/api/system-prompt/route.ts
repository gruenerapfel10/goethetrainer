import { NextResponse } from 'next/server';
import { getSystemPrompt } from '@/lib/ai/prompts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentType = searchParams.get('agentType');

  if (!agentType) {
    return NextResponse.json({ error: 'agentType is required' }, { status: 400 });
  }

  try {
    const systemPrompt = await getSystemPrompt(agentType);
    return NextResponse.json({ systemPrompt });
  } catch (error) {
    console.error('Error fetching system prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompt' },
      { status: 500 }
    );
  }
} 