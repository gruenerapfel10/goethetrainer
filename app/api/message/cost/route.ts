import { NextResponse } from 'next/server';
import { getMessageById } from '@/lib/db/queries';
import { calculateCost, formatCost } from '@/lib/costs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Fetch the message from the database
    const messages = await getMessageById({ id: messageId });
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = messages[0];

    // Use Claude Sonnet 4 as default model if no modelId is stored
    const modelId = message.modelId || 'eu.anthropic.claude-sonnet-4-20250514-v1:0';
    const inputTokens = message.inputTokens || 0;
    const outputTokens = message.outputTokens || 0;

    // Calculate the cost
    const cost = calculateCost(modelId, inputTokens, outputTokens);

    return NextResponse.json({
      messageId: message.id,
      modelId,
      inputTokens,
      outputTokens,
      cost: cost !== null ? cost : 0,
      formattedCost: formatCost(cost)
    });
  } catch (error) {
    console.error('Failed to calculate message cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate message cost' },
      { status: 500 }
    );
  }
} 