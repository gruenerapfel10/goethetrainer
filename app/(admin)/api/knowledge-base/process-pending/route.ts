// app/api/knowledge-base/process-pending/route.ts
import { NextResponse } from 'next/server';
import {
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

async function runProcessPendingInBackground(operationId: number) {
  try {

    // Update status to indicate we're processing
    await updateSystemOperation(operationId, 'BEDROCK_PROCESSING_SUBMITTED', {
      message: "Processing all pending documents with Bedrock..."
    });

    // Process all pending operations
    const bedrockProcessingResults = await processPendingBedrockOperations(operationId);

    // Check if operation is still not failed before marking as completed
    const currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, operationId)).limit(1))[0];
    if (currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      await updateSystemOperation(operationId, 'COMPLETED', {
        message: "Processing of pending documents completed successfully.",
        bedrockProcessingDetails: bedrockProcessingResults,
        summary: {
          totalLoops: bedrockProcessingResults.totalLoops,
          ingestionsSubmitted: bedrockProcessingResults.ingestionsSubmittedThisRun,
          deletionsSubmitted: bedrockProcessingResults.deletionsSubmittedThisRun,
          statusesChecked: bedrockProcessingResults.statusesCheckedThisRun,
          errorsEncountered: bedrockProcessingResults.totalProcessingErrorsThisRun
        }
      });
    } else {
    }

  } catch (error: any) {
    console.error(`[API Route PROCESS-PENDING BG Error] (OpID: ${operationId}):`, error);
    try {
      await updateSystemOperation(operationId, 'FAILED', {
        message: "Processing pending documents failed."
      }, error.message || String(error));
    } catch (updateError) {
      console.error(`[API Route PROCESS-PENDING BG Error] CRITICAL: Failed to update operation ${operationId} status to FAILED:`, updateError);
    }
  }
}

export async function POST() {
  const operationType: typeof operationTypeEnum.enumValues[number] = 'BEDROCK_PROCESS_PENDING';
  let operationIdToReturn: number | undefined = undefined;

  try {
    // Create System Operation Record
    const newOp = await createSystemOperation(operationType, 'STARTED', {
      message: "Pending document processing initiated."
    });

    if (!newOp || !newOp.id) {
      throw new Error("Failed to create system operation record for processing pending documents.");
    }

    operationIdToReturn = newOp.id;

    // Run the processing in the background
    runProcessPendingInBackground(operationIdToReturn).catch(bgError => {
      console.error(`[API Route PROCESS-PENDING] Unhandled error from background task for OpID ${operationIdToReturn}:`, bgError);
    });

    return NextResponse.json(
      {
        message: `Processing of pending documents initiated. Operation ID: ${operationIdToReturn}.`,
        operationId: operationIdToReturn,
        ...newOp
      },
      { status: 202 }
    );

  } catch (error: any) {
    console.error(`[API Route PROCESS-PENDING Error - Initial Phase] (OpID: ${operationIdToReturn || 'N/A'}):`, error);

    // Handle error from createSystemOperation (e.g., unique constraint violation)
    if (error.message?.includes("already in progress")) {
      return NextResponse.json({
        error: error.message,
        details: "A processing operation is already active."
      }, { status: 429 });
    }

    // If an operation record was created but something else failed
    if (operationIdToReturn) {
      try {
        await updateSystemOperation(operationIdToReturn, 'FAILED', {
          message: "Processing pending documents failed during initiation."
        }, error.message || String(error));
      } catch (updateErr) {
        console.error(`[API Route PROCESS-PENDING Error] Failed to mark op ${operationIdToReturn} as FAILED during initiation error handling:`, updateErr);
      }
    }

    return NextResponse.json(
      { error: `Processing failed during initiation: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}