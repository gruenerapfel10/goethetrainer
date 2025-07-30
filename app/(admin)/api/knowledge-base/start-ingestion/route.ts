import { NextResponse } from 'next/server';
import {
  BedrockAgentClient,
  StartIngestionJobCommand
} from '@aws-sdk/client-bedrock-agent';

const bedrockAgentClient = new BedrockAgentClient({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST() {
  try {
    if (!process.env.SHAREPOINT_KNOWLEDGE_BASE_ID || !process.env.SHAREPOINT_KNOWLEDGE_BASE_DATA_SOURCE_ID) {
      return NextResponse.json(
        { error: 'Missing knowledge base or data source configuration' },
        { status: 500 }
      );
    }

    const command = new StartIngestionJobCommand({
      dataSourceId: process.env.SHAREPOINT_KNOWLEDGE_BASE_DATA_SOURCE_ID,
      knowledgeBaseId: process.env.SHAREPOINT_KNOWLEDGE_BASE_ID,
      description: "Manual re-sync from admin panel"
    });

    const response = await bedrockAgentClient.send(command);

    if (!response.ingestionJob?.ingestionJobId) {
      return NextResponse.json(
        { error: 'Failed to start ingestion job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobId: response.ingestionJob.ingestionJobId,
      success: true
    });
  } catch (error) {
    console.error('Error starting ingestion job:', error);
    return NextResponse.json(
      { error: 'Failed to start ingestion job' },
      { status: 500 }
    );
  }
}