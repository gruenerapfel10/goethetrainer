import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getAgentConfig, AgentType } from '@/lib/ai/agents';

const ASSISTANT_TO_AGENT: Record<string, AgentType> = {
  'general-assistant': AgentType.GENERAL_AGENT,
  'sharepoint-agent': AgentType.SHAREPOINT_AGENT,
  'text2sql-agent': AgentType.TEXT2SQL_AGENT,
};

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const isAdmin = session.user.isAdmin;
  if (!isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json(
        { error: 'assistantId is required' },
        { status: 400 },
      );
    }

    const agentType = ASSISTANT_TO_AGENT[assistantId];
    if (!agentType) {
      return NextResponse.json(
        { error: 'Unknown assistant ID' },
        { status: 400 },
      );
    }

    const config = getAgentConfig(agentType);
    const promptText = config.prompt;

    return NextResponse.json({ promptText });
  } catch (error) {
    console.error('Error fetching default prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default prompt' },
      { status: 500 },
    );
  }
}
