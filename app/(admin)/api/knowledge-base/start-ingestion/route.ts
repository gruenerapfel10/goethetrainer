import { NextResponse } from 'next/server';

// Note: This admin API route is disabled due to Gemini migration
// Bedrock knowledge base ingestion is no longer available

export async function POST() {
  return NextResponse.json(
    { 
      error: 'Knowledge base ingestion is not available after migration to Gemini',
      message: 'This feature required AWS Bedrock and has been disabled' 
    },
    { status: 501 }
  );
}