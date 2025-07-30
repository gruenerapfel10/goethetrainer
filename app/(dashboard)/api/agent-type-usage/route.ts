import { type NextRequest, NextResponse } from 'next/server';
import { countAgentTypeTokenUsage } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const rawAgentTypeUsage = await countAgentTypeTokenUsage();

    const getAgentColor = (agentId: string): string => {
      switch (agentId) {
        case 'general-bedrock-agent':
          return '#4D7FEA'; // Blue color for standard agent
        case 'sharepoint-agent':
          return '#31A354'; // Green color for SharePoint agent v1
        case 'sharepoint-agent-v2':
          return '#2D8F47'; // Darker green for SharePoint agent v2
        case 'csv-agent':
          return '#E74C3C'; // Red color for CSV agent v1
        case 'csv-agent-v2':
          return '#C0392B'; // Darker red for CSV agent v2
        case 'text2sql-agent':
          return '#FF9500'; // Orange color for SQL assistant
        case 'document-agent':
          return '#16A085'; // Teal color for document agent
        default:
          return '#CCCCCC'; // Default gray color for any undefined agents
      }
    };

    const json = {
      agentTypeUsage: rawAgentTypeUsage.map((usage) => ({
        ...usage,
        color: getAgentColor(usage.agentType || ''),
      })),
      totalCount: rawAgentTypeUsage?.[0]?.grandTotal ?? 0,
    };

    return NextResponse.json(json);
  } catch (error) {
    console.error(
      `[/api/agent-type-usage] Error fetching messages by agent type:`,
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: `Failed to fetch total tokens by agent type` },
      { status: 500 },
    );
  }
}
