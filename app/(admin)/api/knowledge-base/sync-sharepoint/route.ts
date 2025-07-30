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
    // syncSharepointToS3AndFlagForBedrock is designed to update systemOperation with its progress
    const s3SyncResults = await syncSharepointToS3AndFlagForBedrock(opId);
    console.log(`[API Route SYNC BG] OpID ${opId}: Phase 1 (S3 & DB Flagging) complete:`, s3SyncResults);

    // Check status before proceeding, as syncSharepointToS3AndFlagForBedrock might have set it to FAILED
    let currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, opId)).limit(1))[0];

    if (currentOp?.currentStatus === operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      console.log(`[API Route SYNC BG] OpID ${opId}: Aborting Bedrock processing due to earlier failure during S3 sync/flagging phase.`);
      return;
    }

    // If there were S3 errors and no files were processed/flagged by the S3 sync stage,
    // and the status hasn't already been set to FAILED by syncSharepointToS3AndFlagForBedrock
    if (s3SyncResults.errorsInS3Sync > 0 &&
      s3SyncResults.dbRecordsUpdatedOrCreated === 0 &&
      s3SyncResults.dbRecordsMarkedForDeletion === 0 &&
      currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      console.warn(`[API Route SYNC BG] OpID ${opId}: S3 sync phase had errors and processed no files. Marking operation as FAILED.`);
      await updateSystemOperation(opId, 'FAILED', {
        message: "SharePoint sync phase failed: Errors encountered and no files were processed.",
        s3SyncDetails: s3SyncResults
      }, "S3 sync errors with no files processed.");
      return;
    }


    console.log(`[API Route SYNC BG] OpID ${opId}: Starting Phase 2 (Bedrock Processing of all pending documents)...`);
    // processPendingBedrockOperations should use opId for its internal status updates related to this specific operation type
    const bedrockProcessingResults = await processPendingBedrockOperations(opId);
    console.log(`[API Route SYNC BG] OpID ${opId}: Phase 2 (Bedrock Processing) complete:`, bedrockProcessingResults);

    // Final success update (if not already set to FAILED by sub-processes)
    currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, opId)).limit(1))[0];
    if (currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      await updateSystemOperation(opId, 'COMPLETED', {
        message: "SharePoint sync and Bedrock processing completed successfully.",
        s3SyncDetails: s3SyncResults,
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