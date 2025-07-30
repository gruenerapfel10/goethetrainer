// app/api/knowledge-base/delete-multiple/route.ts
import { NextResponse } from 'next/server';
import {
  flagMultipleFilesForDeletion,
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

async function runMultipleDeletionAndProcessInBackground(operationId: number, documentIds: string[]) {
  try {
    console.log(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Flagging ${documentIds.length} files for deletion.`);

    // flagMultipleFilesForDeletion returns detailed results
    const flagResult = await flagMultipleFilesForDeletion(documentIds);
    console.log(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Flag result for ${documentIds.length} files:`, flagResult);

    if (!flagResult.success) {
      await updateSystemOperation(operationId, 'FAILED', {
        message: `Failed to flag files for deletion: ${flagResult.message}`,
        flagResult
      }, flagResult.message);
      console.warn(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Failed to flag files. Operation marked FAILED.`);
      return;
    }

    // Update status after flagging
    await updateSystemOperation(operationId, 'FLAGGING_FOR_BEDROCK', {
      message: `${flagResult.markedForDeletionCount} files flagged for deletion${flagResult.notFoundCount > 0 ? `, ${flagResult.notFoundCount} not found` : ''}. Processing with Bedrock.`,
      flagResult
    });

    console.log(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Starting Bedrock Processing for deletion of ${flagResult.markedForDeletionCount} files...`);
    const bedrockProcessingResults = await processPendingBedrockOperations(operationId);
    console.log(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Bedrock Processing complete for multiple file deletion.`);

    // Check if operation is still not failed before marking as completed
    const currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, operationId)).limit(1))[0];
    if (currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      await updateSystemOperation(operationId, 'COMPLETED', {
        message: `Multiple file deletion completed. ${flagResult.markedForDeletionCount} files processed, ${flagResult.notFoundCount} not found.`,
        flagResult,
        bedrockProcessingDetails: bedrockProcessingResults
      });
      console.log(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Marked as COMPLETED.`);
    } else {
      console.log(`[API Route DELETE-MULTIPLE BG] OpID ${operationId}: Operation was already FAILED. Not marking COMPLETED.`);
    }

  } catch (error: any) {
    console.error(`[API Route DELETE-MULTIPLE BG Error] (OpID: ${operationId}):`, error);
    try {
      await updateSystemOperation(operationId, 'FAILED', {
        message: `Multiple file deletion background process failed.`,
        documentCount: documentIds.length
      }, error.message || String(error));
    } catch (updateError) {
      console.error(`[API Route DELETE-MULTIPLE BG Error] CRITICAL: Failed to update operation ${operationId} status to FAILED:`, updateError);
    }
  }
}

export async function POST(request: Request) {
  const operationType: typeof operationTypeEnum.enumValues[number] = 'FILE_DELETION_AND_PROCESS';
  let operationIdToReturn: number | undefined = undefined;

  try {
    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty document IDs array.' }, { status: 400 });
    }

    // Validate that all documentIds are strings
    const invalidIds = documentIds.filter(id => typeof id !== 'string' || !id.trim());
    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: `Invalid document IDs found: ${invalidIds.length} invalid entries.`
      }, { status: 400 });
    }

    // Limit the number of files that can be deleted at once
    const MAX_BATCH_DELETE = 100;
    if (documentIds.length > MAX_BATCH_DELETE) {
      return NextResponse.json({
        error: `Too many files selected for deletion. Maximum ${MAX_BATCH_DELETE} files allowed per batch.`
      }, { status: 400 });
    }

    const newOp = await createSystemOperation(operationType, 'STARTED', {
      message: `Multiple file deletion process initiated for ${documentIds.length} files.`,
      documentCount: documentIds.length
    });

    if (!newOp || !newOp.id) {
      console.error("[API Route DELETE-MULTIPLE] Failed to create system operation record.");
      return NextResponse.json({
        error: 'Failed to initiate deletion: Could not create system_operations record.'
      }, { status: 500 });
    }

    operationIdToReturn = newOp.id;
    console.log(`[API Route DELETE-MULTIPLE] OpID ${operationIdToReturn} created for ${documentIds.length} files.`);

    // Run the deletion process in the background
    runMultipleDeletionAndProcessInBackground(operationIdToReturn, documentIds).catch(bgError => {
      console.error(`[API Route DELETE-MULTIPLE] Unhandled error from background task for OpID ${operationIdToReturn}:`, bgError);
    });

    return NextResponse.json(
      {
        message: `Multiple file deletion and processing initiated for ${documentIds.length} files. Operation ID: ${operationIdToReturn}.`,
        operationId: operationIdToReturn,
        documentCount: documentIds.length,
        ...newOp
      },
      { status: 202 }
    );

  } catch (error: any) {
    console.error(`[API Route DELETE-MULTIPLE Error - Initial Phase] (OpID: ${operationIdToReturn || 'N/A'}):`, error);

    if (error.message?.includes("already in progress")) {
      return NextResponse.json({
        error: error.message,
        details: "Another deletion operation is currently in progress."
      }, { status: 429 });
    }

    // Try to mark operation as failed if it was created
    if (operationIdToReturn) {
      try {
        await updateSystemOperation(operationIdToReturn, 'FAILED', {
          message: "Multiple file deletion failed during initiation."
        }, error.message || String(error));
      } catch (e) {
        console.error(`[API Route DELETE-MULTIPLE Error] Failed to mark operation ${operationIdToReturn} as failed:`, e);
      }
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error during multiple file deletion initiation'
    }, { status: 500 });
  }
}