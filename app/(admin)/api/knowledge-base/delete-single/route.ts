// app/api/knowledge-base/delete-single/route.ts
import { NextResponse } from 'next/server';
import {
  flagSingleFileForDeletion,
  processPendingBedrockOperations
} from '@/lib/aws/knowledge-base-service';
import {
  createSystemOperation,
  updateSystemOperation,
} from '@/lib/db/queries';
import { type operationTypeEnum, systemOperations, operationStatusEnum } from '@/lib/db/schema';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function runSingleDeletionAndProcessInBackground(operationId: number, documentId: string) {
  try {
    // flagSingleFileForDeletion does not update system_operations, it returns success/message
    const flagResult = await flagSingleFileForDeletion(documentId);

    if (!flagResult.success) {
      await updateSystemOperation(operationId, 'FAILED', {
        message: `Failed to flag file ${documentId} for deletion: ${flagResult.message}`,
        flagResult
      }, flagResult.message);
      console.warn(`[API Route DELETE-SINGLE BG] OpID ${operationId}: Failed to flag file ${documentId}. Operation marked FAILED.`);
      return;
    }

    await updateSystemOperation(operationId, 'FLAGGING_FOR_BEDROCK', { // Or more specific status
      message: `File ${documentId} flagged for deletion. Processing with Bedrock.`,
      flagResult
    });

    const bedrockProcessingResults = await processPendingBedrockOperations(operationId);

    const currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, operationId)).limit(1))[0];
    if (currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      await updateSystemOperation(operationId, 'COMPLETED', {
        message: `File ${documentId} deletion and subsequent Bedrock processing completed.`,
        flagResult,
        bedrockProcessingDetails: bedrockProcessingResults
      });
    } else {
    }

  } catch (error: any) {
    console.error(`[API Route DELETE-SINGLE BG Error] (OpID: ${operationId}):`, error);
    try {
      await updateSystemOperation(operationId, 'FAILED', { message: `Single file (${documentId}) deletion background process failed.` }, error.message || String(error));
    } catch (updateError) {
      console.error(`[API Route DELETE-SINGLE BG Error] CRITICAL: Failed to update operation ${operationId} status to FAILED:`, updateError);
    }
  }
}

export async function POST(request: Request) {
  const operationType: typeof operationTypeEnum.enumValues[number] = 'FILE_DELETION_AND_PROCESS'; // Can be the same type
  let operationIdToReturn: number | undefined = undefined;

  try {
    const { documentId } = await request.json();
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'Invalid document ID (s3Key).' }, { status: 400 });
    }

    const newOp = await createSystemOperation(operationType, 'STARTED', {
      message: `Deletion process initiated for file: ${documentId}.`
    });

    if (!newOp || !newOp.id) {
      console.error("[API Route DELETE-SINGLE] Failed to create system operation record.");
      return NextResponse.json({ error: 'Failed to initiate deletion: Could not create system_operations record.' }, { status: 500 });
    }
    operationIdToReturn = newOp.id;

    runSingleDeletionAndProcessInBackground(operationIdToReturn, documentId).catch(bgError => {
      console.error(`[API Route DELETE-SINGLE] Unhandled error from background task for OpID ${operationIdToReturn}:`, bgError);
    });

    return NextResponse.json(
      {
        message: `File deletion and processing initiated for ${documentId}. Operation ID: ${operationIdToReturn}.`,
        operationId: operationIdToReturn,
        ...newOp
      },
      { status: 202 }
    );

  } catch (error: any) {
    console.error(`[API Route DELETE-SINGLE Error - Initial Phase] (OpID: ${operationIdToReturn || 'N/A'}):`, error);
    if (error.message?.includes("already in progress")) {
      // This implies another FILE_DELETION_AND_PROCESS is active.
      // Frontend might want to distinguish global "deletion busy" vs "this specific file"
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (operationIdToReturn) {
      try {
        await updateSystemOperation(operationIdToReturn, 'FAILED', { message: "Single file deletion failed during initiation." }, error.message || String(error));
      } catch (e) { /* ignore */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error during single file deletion initiation' }, { status: 500 });
  }
}