// app/api/operations/cancel/route.ts
import { NextResponse } from 'next/server';
import { updateSystemOperation } from '@/lib/db/queries';
import { systemOperations, } from '@/lib/db/schema';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { operationId } = await request.json();

    if (!operationId || typeof operationId !== 'number') {
      return NextResponse.json({
        error: 'Invalid operation ID'
      }, { status: 400 });
    }

    // Get current operation
    const currentOp = await db.select()
    .from(systemOperations)
    .where(eq(systemOperations.id, operationId))
    .limit(1);

    if (!currentOp || currentOp.length === 0) {
      return NextResponse.json({
        error: 'Operation not found'
      }, { status: 404 });
    }

    const operation = currentOp[0];

    // Check if operation can be cancelled
    const cancellableStatuses = [
      'STARTED',
      'PULLING_FROM_SHAREPOINT',
      'UPLOADING_TO_S3',
      'FLAGGING_FOR_BEDROCK',
      'BEDROCK_PROCESSING_SUBMITTED',
      'BEDROCK_POLLING_STATUS'
    ];

    if (!cancellableStatuses.includes(operation.currentStatus)) {
      return NextResponse.json({
        error: `Operation cannot be cancelled. Current status: ${operation.currentStatus}`
      }, { status: 400 });
    }

    // Update operation status to cancelled/failed
    await updateSystemOperation(
      operationId,
      'FAILED',
      {
        message: 'Operation cancelled by user',
        cancelledAt: new Date().toISOString(),
        wasCancelled: true
      },
      'User cancelled operation'
    );

    console.log(`[API Cancel] Operation ${operationId} (${operation.operationType}) cancelled by user`);

    return NextResponse.json({
      message: 'Operation cancelled successfully',
      operationId,
      previousStatus: operation.currentStatus
    });

  } catch (error: any) {
    console.error('[API Cancel Error]:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error during operation cancellation'
    }, { status: 500 });
  }
}