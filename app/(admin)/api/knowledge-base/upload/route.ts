// app/api/knowledge-base/upload/route.ts
import { NextResponse } from 'next/server';
import {
  uploadAndRegisterManualFiles,
  processPendingBedrockOperations
} from '@/lib/aws/knowledge-base-service';
import {
  createSystemOperation,
  updateSystemOperation,
} from '@/lib/db/queries';
import { type operationTypeEnum, systemOperations, operationStatusEnum } from '@/lib/db/schema';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';


const MAX_FILE_SIZE_SERVER = 100 * 1024 * 1024; // Server-side validation (should match client or be more lenient)
const MAX_FILES_SERVER = 100; // Server-side validation

export const dynamic = 'force-dynamic';

async function runManualUploadAndProcessInBackground(operationId: number, validatedFiles: File[]) {
  try {
    console.log(`[API Route UPLOAD BG] OpID ${operationId}: Starting manual file upload and registration...`);
    // uploadAndRegisterManualFiles throws an error (migration to Gemini)
    try {
      await uploadAndRegisterManualFiles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateSystemOperation(operationId, 'FAILED', {
        message: `Manual file upload failed: ${errorMessage}`,
        error: errorMessage
      }, errorMessage);
      console.warn(`[API Route UPLOAD BG] OpID ${operationId}: Manual file upload failed. Operation marked FAILED.`);
      return;
    }

    // Update status after S3 upload and DB flagging, before Bedrock processing
    await updateSystemOperation(operationId, 'FLAGGING_FOR_BEDROCK', {
      message: `Files flagged for Bedrock processing.`,
    });

    console.log(`[API Route UPLOAD BG] OpID ${operationId}: Starting Bedrock Processing for manual uploads...`);
    const bedrockProcessingResults = await processPendingBedrockOperations();
    console.log(`[API Route UPLOAD BG] OpID ${operationId}: Bedrock Processing complete:`, bedrockProcessingResults);

    // Final Success Update (if not already FAILED by sub-processes)
    const currentOp = (await db.select().from(systemOperations).where(eq(systemOperations.id, operationId)).limit(1))[0];
    if (currentOp?.currentStatus !== operationStatusEnum.enumValues.find(s => s === 'FAILED')) {
      await updateSystemOperation(operationId, 'COMPLETED', {
        message: "Manual upload and Bedrock processing completed.",
        bedrockProcessingDetails: bedrockProcessingResults
      });
      console.log(`[API Route UPLOAD BG] OpID ${operationId}: Marked as COMPLETED.`);
    } else {
      console.log(`[API Route UPLOAD BG] OpID ${operationId}: Operation was already in FAILED state. Not marking as COMPLETED.`);
    }

  } catch (error: any) {
    console.error(`[API Route UPLOAD BG Error] (Operation ID: ${operationId}):`, error);
    try {
      await updateSystemOperation(operationId, 'FAILED', { message: "Manual upload background process failed." }, error.message || String(error));
    } catch (updateError) {
      console.error(`[API Route UPLOAD BG Error] CRITICAL: Failed to update operation status to FAILED for op ID ${operationId}:`, updateError);
    }
  }
}

export async function POST(request: Request) {
  const operationType: typeof operationTypeEnum.enumValues[number] = 'MANUAL_UPLOAD_AND_PROCESS';
  let operationIdToReturn: number | undefined = undefined;

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files?.length) {
      return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
    }
    if (files.length > MAX_FILES_SERVER) {
      return NextResponse.json({ error: `Max ${MAX_FILES_SERVER} files allowed.` }, { status: 400 });
    }

    const validatedFilesForUpload: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_SERVER) {
        return NextResponse.json({ error: `File ${file.name} too large (max ${MAX_FILE_SIZE_SERVER / (1024 * 1024)}MB).` }, { status: 400 });
      }
      validatedFilesForUpload.push(file);
    }
    if (validatedFilesForUpload.length === 0) { // Should not happen if initial checks pass
      return NextResponse.json({ error: 'No valid files to upload after server validation.' }, { status: 400 });
    }

    // Create System Operation Record
    const newOp = await createSystemOperation(operationType, 'STARTED', {
      message: `Manual upload process initiated for ${validatedFilesForUpload.length} files.`,
      totalFiles: validatedFilesForUpload.length
    });
    if (!newOp || !newOp.id) {
      throw new Error("Failed to create system operation record for manual upload.");
    }
    operationIdToReturn = newOp.id;
    console.log(`[API Route UPLOAD] Operation ${operationIdToReturn} (${operationType}) created for ${validatedFilesForUpload.length} files.`);

    // Run the long process in the background
    runManualUploadAndProcessInBackground(operationIdToReturn, validatedFilesForUpload).catch(bgError => {
      console.error(`[API Route UPLOAD] Unhandled error from background task for OpID ${operationIdToReturn}:`, bgError);
    });

    return NextResponse.json(
      {
        message: `Manual upload for ${validatedFilesForUpload.length} files initiated. Operation ID: ${operationIdToReturn}.`,
        operationId: operationIdToReturn,
        ...newOp
      },
      { status: 202 }
    );

  } catch (error: any) {
    console.error(`[API Route UPLOAD Error - Initial Phase] (OpID: ${operationIdToReturn || 'N/A'}):`, error);
    if (error.message?.includes("already in progress")) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (operationIdToReturn) {
      try {
        await updateSystemOperation(operationIdToReturn, 'FAILED', { message: "Manual upload process failed during initiation." }, error.message || String(error));
      } catch (e) { /* ignore */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error during upload initiation' }, { status: 500 });
  }
}