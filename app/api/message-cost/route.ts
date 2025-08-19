import { NextResponse } from 'next/server';
import { getMessageById } from '@/lib/firebase/chat-service';
import { calculateCost, formatCost } from '@/lib/costs';
import { chatModels } from '@/lib/ai/models';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Fetch the message from the database
    const message = await getMessageById({ id: messageId });
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Use Claude Sonnet 4 as default model if no modelId is stored
    const modelId = message.modelId || 'eu.anthropic.claude-sonnet-4-20250514-v1:0';
    const inputTokens = message.inputTokens || 0;
    const outputTokens = message.outputTokens || 0;
    const agentType = message.agentType || 'general-bedrock-agent';

    // Get the friendly name for the agent type - use a safer approach without translation
    let agentName = agentType;
    try {
      const allChatModels = chatModels();
      const agentModel = allChatModels.find(model => model.id === agentType);
      if (agentModel?.name) {
        agentName = agentModel.name;
      }
    } catch (error) {
      console.warn('Failed to get agent name from chatModels:', error);
      // Fallback to a readable version of the agent type
      agentName = agentType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Calculate the cost
    const cost = calculateCost(modelId, inputTokens, outputTokens);

    return NextResponse.json({
      messageId: message.id,
      modelId,
      inputTokens,
      outputTokens,
      agentType,
      agentName,
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