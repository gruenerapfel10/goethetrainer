import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

// Note: This admin API route is disabled due to Gemini migration
// Bedrock knowledge base document validation is no longer available

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Document validation is not available after migration to Gemini',
      message: 'This feature required AWS Bedrock and has been disabled' 
    },
    { status: 501 }
  );
}