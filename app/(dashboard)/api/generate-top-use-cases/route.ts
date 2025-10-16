import { type NextRequest, NextResponse } from 'next/server';
// Import directly from use-case-generation instead of db/dashboard 
import { generateTopUseCases, type GenerationProgress } from '@/lib/use-case-generation';
import { auth } from '@/app/(auth)/auth';

/**
 * Helper function to create a Server-Sent Event (SSE) message
 */
function createSSEMessage(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  // Add admin check if necessary
  if (!session?.user?.isAdmin) {
  // if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeProgress = request.nextUrl.searchParams.get('includeProgress') === 'true';

  // If streaming is requested, set up an SSE stream
  if (includeProgress) {
    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send an initial message
          controller.enqueue(createSSEMessage({ 
            progress: { 
              stage: 0, 
              totalStages: 7, 
              stageName: 'Initializing',
              details: 'Starting top use case generation process'
            }
          }));

          // Execute the process with a progress callback
          const result = await generateTopUseCases('timeSaved', (progress: GenerationProgress) => {
            // Send progress updates to the client
            controller.enqueue(createSSEMessage({ progress }));
          });

          // Send the final result
          controller.enqueue(createSSEMessage({ 
            message: "Top use case generation process completed.", 
            summary: result
          }));

          // Close the stream
          controller.close();
        } catch (error) {
          console.error('Failed to generate top use cases:', error);
          
          // Send error to client
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate top use cases';
          controller.enqueue(createSSEMessage({ 
            error: errorMessage
          }));
          
          // Close the stream
          controller.close();
        }
      }
    });

    // Return the stream with appropriate headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } else {
    // Use standard non-streaming response (original behavior)
    try {
      // Call the generation function without progress callback
      const result = await generateTopUseCases();
      
      // Return a success message and the summary
      return NextResponse.json({ 
        message: "Top use case generation process initiated and completed.", 
        summary: result 
      });
    } catch (error) {
      console.error('Failed to generate top use cases:', error);
      
      // Send back a more specific error message if possible
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate top use cases';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  }
} 