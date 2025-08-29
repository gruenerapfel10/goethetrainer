import { type NextRequest, NextResponse } from 'next/server';
import { generateTopUseCases } from '@/lib/db/dashboard';

// Simple API key check - should be a secure random string in production
const CRON_API_KEY = process.env.CRON_API_KEY || 'your-secret-key-here';

export async function GET(request: NextRequest) {
  // Check for API key in header
  const apiKey = request.headers.get('x-cron-api-key');
  
  // Check if request is from localhost or has valid API key
  const isLocalhost = request.headers.get('host')?.includes('localhost');
  if (!isLocalhost && apiKey !== CRON_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the generation function
    const result = await generateTopUseCases();
    
    // Return success response
    return NextResponse.json({ 
      message: "Top use case generation completed successfully", 
      summary: result 
    });
  } catch (error) {
    console.error('Failed to generate top use cases:', error);
    
    // Send back error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate top use cases';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 