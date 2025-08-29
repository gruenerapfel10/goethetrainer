// app/api/operations/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client'; // Adjust path to your Drizzle client
import { systemOperations, type operationStatusEnum } from '@/lib/db/schema'; // Adjust path
import { desc, eq, or, notInArray } from 'drizzle-orm'; // Added notInArray

export const dynamic = 'force-dynamic'; // Ensures this route is not cached

export async function GET() {
  try {
    // 1. Find the latest "active" operation
    // Active statuses are those that are not terminal or idle
    const activeStatuses: Array<typeof operationStatusEnum.enumValues[number]> = [
      'STARTED',
      'PULLING_FROM_SHAREPOINT',
      'UPLOADING_TO_S3',
      'FLAGGING_FOR_BEDROCK',
      'BEDROCK_PROCESSING_SUBMITTED',
      'BEDROCK_POLLING_STATUS'
    ];

    const activeOperationResult = await db
    .select()
    .from(systemOperations)
    .where(notInArray(systemOperations.currentStatus, ['COMPLETED', 'FAILED', 'IDLE']))
    .orderBy(desc(systemOperations.updatedAt))
    .limit(1);

    if (activeOperationResult && activeOperationResult.length > 0) {
      return NextResponse.json(activeOperationResult[0]);
    }

    // 2. If no active operation, find the most recent terminal (COMPLETED or FAILED) operation
    const lastTerminalOperationResult = await db
    .select()
    .from(systemOperations)
    .where(or(
      eq(systemOperations.currentStatus, 'COMPLETED'),
      eq(systemOperations.currentStatus, 'FAILED')
    ))
    // Corrected orderBy: Use .nullsLast() chained with desc()
    .orderBy(
      desc(systemOperations.endedAt),
      desc(systemOperations.updatedAt) // Secondary sort for tie-breaking or if endedAt is null
    )
    .limit(1);

    if (lastTerminalOperationResult && lastTerminalOperationResult.length > 0) {
      return NextResponse.json(lastTerminalOperationResult[0]);
    }

    // 3. If no active or recent terminal operation, return IDLE
    return NextResponse.json({
      // To match SystemOperation structure somewhat for the frontend, provide default/null values
      id: -1, // Or some indicator that this is not a real DB record
      operationType: null, // Or a default like 'NONE' if your enum supports it
      currentStatus: 'IDLE',
      startedAt: null,
      updatedAt: new Date(), // Can be current time for "last checked"
      endedAt: null,
      progressDetails: { message: "System is currently idle. No recent operations found." },
      lastBedrockJobId: null,
      errorMessage: null,
    });

  } catch (error) {
    console.error('[API Operations Status Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system operation status.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
