// app/api/knowledge-base/sync-sharepoint/route.ts
import { NextResponse } from 'next/server';
import {
  syncSharepointToS3AndFlagForBedrock,
  processPendingBedrockOperations
} from '@/lib/aws/knowledge-base-service';
import {
  createSystemOperation,
  updateSystemOperation,
  // getActiveSystemOperation - handled by createSystemOperation's unique constraint
} from '@/lib/db/queries';
import { type operationTypeEnum, systemOperations, operationStatusEnum } from '@/lib/db/schema';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function runSharePointSyncAndProcessInBackground(opId: number) {
  try {
    console.log(`[API Route SYNC BG] OpID ${opId}: Starting S3 Sync & DB Flagging...`);
    // syncSharepointToS3AndFlagForBedrock throws an error (migration to Gemini)
    try {
      await syncSharepointToS3AndFlagForBedrock();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateSystemOperation(opId, 'FAILED', {
        message: `SharePoint sync failed: ${errorMessage}`,
        error: errorMessage
      }, errorMessage);
      console.warn(`[API Route SYNC BG] OpID ${opId}: SharePoint sync failed. Operation marked FAILED.`);
      return;
    }

    // Check status before proceeding
    let currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, opId)).limit(1))[0];

    if (currentOp?.currentStatus === operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      console.log(`[API Route SYNC BG] OpID ${opId}: Aborting due to earlier failure.`);
      return;
    }

    console.log(`[API Route SYNC BG] OpID ${opId}: Starting Phase 2 (Bedrock Processing of all pending documents)...`);
    const bedrockProcessingResults = await processPendingBedrockOperations();
    console.log(`[API Route SYNC BG] OpID ${opId}: Phase 2 (Bedrock Processing) complete:`, bedrockProcessingResults);

    // Final success update (if not already set to FAILED by sub-processes)
    currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, opId)).limit(1))[0];
    if (currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      await updateSystemOperation(opId, 'COMPLETED', {
        message: "SharePoint sync and Bedrock processing completed successfully.",
        bedrockProcessingDetails: bedrockProcessingResults
      });
      console.log(`[API Route SYNC BG] OpID ${opId}: Marked as COMPLETED.`);
    } else {
      console.log(`[API Route SYNC BG] OpID ${opId}: Operation was already in FAILED state. Not marking as COMPLETED.`);
    }

  } catch (error: any) {
    console.error(`[API Route SYNC BG Error] (Operation ID: ${opId}):`, error);
    try {
      await updateSystemOperation(opId, 'FAILED', { message: "SharePoint sync background process encountered an unhandled error." }, error.message || String(error));
    } catch (updateError) {
      console.error(`[API Route SYNC BG Error] CRITICAL: Failed to update operation status to FAILED for op ID ${opId}:`, updateError);
    }
  }
}


export async function POST() {
  console.log('[API Route SYNC] SharePoint sync process initiation request received...');
  const operationType: typeof operationTypeEnum.enumValues[number] = 'SHAREPOINT_SYNC_AND_PROCESS';
  let operationIdToReturn: number | undefined = undefined;

  try {
    // Create System Operation Record. createSystemOperation throws if an op of this type is already active.
    const newOp = await createSystemOperation(operationType, 'STARTED', { message: "SharePoint sync process initiated." });
    if (!newOp || !newOp.id) { // Should not happen if createSystemOperation is robust
      throw new Error("Failed to create system operation record for SharePoint sync.");
    }
    operationIdToReturn = newOp.id;
    console.log(`[API Route SYNC] Operation ${operationIdToReturn} (${operationType}) created.`);

    // Run the long process in the background
    // Deliberately not awaiting this promise
    runSharePointSyncAndProcessInBackground(operationIdToReturn).catch(bgError => {
      // Log unhandled errors from the detached promise, though it should handle its own errors
      console.error(`[API Route SYNC] Unhandled error from background task for OpID ${operationIdToReturn}:`, bgError);
    });

    return NextResponse.json(
      {
        message: `SharePoint sync and processing initiated. Operation ID: ${operationIdToReturn}.`,
        operationId: operationIdToReturn,
        ...newOp // Return the initial operation details
      },
      { status: 202 } // HTTP 202 Accepted
    );

  } catch (error: any) {
    console.error(`[API Route SYNC Error - Initial Phase] (OpID: ${operationIdToReturn || 'N/A'}):`, error);
    // Handle error from createSystemOperation (e.g., unique constraint violation)
    if (error.message?.includes("already in progress")) {
      return NextResponse.json({ error: error.message, details: "An operation of this type is already active." }, { status: 429 });
    }

    // If an operation record was created but something else failed before returning 202
    if (operationIdToReturn) {
      try {
        await updateSystemOperation(operationIdToReturn, 'FAILED', { message: "SharePoint sync process failed during initiation." }, error.message || String(error));
      } catch (updateErr) {
        console.error(`[API Route SYNC Error] Failed to mark op ${operationIdToReturn} as FAILED during initiation error handling:`, updateErr);
      }
    }
    return NextResponse.json(
      { error: `Sync process failed during initiation: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}