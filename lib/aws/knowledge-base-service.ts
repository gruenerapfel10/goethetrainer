// lib/aws/knowledge-base-service.ts
import {
  BedrockAgentClient,
  DeleteKnowledgeBaseDocumentsCommand, type DeleteKnowledgeBaseDocumentsResponse,
  IngestKnowledgeBaseDocumentsCommand, type IngestKnowledgeBaseDocumentsResponse,
  GetKnowledgeBaseDocumentsCommand, type GetKnowledgeBaseDocumentsResponse,
  type DocumentIdentifier,
  ContentDataSourceType,
  type KnowledgeBaseDocument,
  DocumentStatus,
} from "@aws-sdk/client-bedrock-agent";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { filesMetadata, type NewFileMetadata, type ingestionStatusEnum } from '@/lib/db/schema';
import {
  getSharePointChanges,
  type SharePointFile as SPFileGraph,
  getAccessToken
} from '../sharepoint/sharepoint-service';
import { sql, eq, or as drizzleOr, inArray, and, sql as drizzleSql } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { db } from "../db/client";

// Assuming you have these in your queries.ts or a similar file
// Adjust path as per your project structure
import { updateSystemOperation } from '../db/queries';
import { operationStatusEnum } from '../db/schema';

// --- Environment Variables ---
const REGION = process.env.AWS_REGION || "eu-central-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const DEFAULT_KB_ID = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
const DEFAULT_DS_ID = process.env.SHAREPOINT_KNOWLEDGE_BASE_DATA_SOURCE_ID;
const S3_BUCKET_NAME = process.env.SHAREPOINT_S3_BUCKET_NAME;
const S3_KEY_PREFIX_SHAREPOINT = (process.env.S3_KEY_PREFIX_SHAREPOINT || 'sharepoint_synced_files/')
.replace(/^\//, '').replace(/\/\//g, '/').replace(/([^\/])$/, '$1/');
const S3_KEY_PREFIX_MANUAL = (process.env.S3_KEY_PREFIX_MANUAL || 'manual_uploads/')
.replace(/^\//, '').replace(/\/\//g, '/');

const SHAREPOINT_DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID;
const TARGET_PATH_TO_SYNC_ENV = process.env.SHAREPOINT_TARGET_PATH || "";
const GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";

// --- AWS SDK Clients Initialization ---
// if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !DEFAULT_KB_ID || !DEFAULT_DS_ID || !S3_BUCKET_NAME || !SHAREPOINT_DRIVE_ID) {
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !DEFAULT_KB_ID || !DEFAULT_DS_ID || !S3_BUCKET_NAME) {
  throw new Error("CRITICAL_ERROR: One or more environment variables (AWS credentials, Bedrock IDs, S3 Bucket, SharePoint Drive ID) are not configured. Application cannot start.");
}

const bedrockAgentClient = new BedrockAgentClient({
  region: REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});
const s3Client = new S3Client({
  region: REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

const BEDROCK_CONCURRENT_OPERATIONS_LIMIT = 10; // Max parallel Bedrock API calls (ingest/delete/status)
const BEDROCK_INGEST_API_BATCH_SIZE = 10; // Max documents per IngestKnowledgeBaseDocuments call
const BEDROCK_DELETE_API_BATCH_SIZE = 10; // Max documents per DeleteKnowledgeBaseDocuments call
const BEDROCK_GET_STATUS_API_BATCH_SIZE = 10; // Max documents per GetKnowledgeBaseDocuments call
const MAX_PROCESSOR_LOOPS = 100000; // Safety break for processPendingBedrockOperations loop
const DELAY_BETWEEN_PROCESSOR_LOOPS_MS = 5000; // Pause between loops in Bedrock processor

interface S3UploadResult {
  s3Key: string;
  s3Bucket: string;
  eTag?: string;
  size: number;
  mimeType?: string;
}

interface BedrockProcessingResults {
  totalLoops: number;
  ingestionsSubmittedThisRun: number;
  ingestionsConfirmedFailedOrIgnoredThisRun: number;
  ingestionsFailedSubmissionThisRun: number;
  deletionsSubmittedThisRun: number;
  deletionsFailedThisRun: number;
  statusesCheckedThisRun: number;
  statusesUpdatedToTerminalThisRun: number;
  totalProcessingErrorsThisRun: number;
}

function sanitizeS3MetadataValue(value: string | undefined | null): string {
  if (value == null) return '';
  // Encode special characters and limit length for S3 metadata value constraints
  let encoded = encodeURIComponent(value);
  // S3 metadata values have a max length, often around 2KB for the total size of all metadata.
  // Individual values should be shorter. 1024 is a safe arbitrary limit here.
  if (encoded.length > 1024) {
    // Attempt to preserve prefix if it's very long by truncating from the middle
    // This is a basic strategy; more sophisticated truncation might be needed for specific use cases.
    encoded = `${encoded.substring(0, 510)}...${encoded.substring(encoded.length - 511)}`;
  }
  return encoded;
}

export async function downloadFromSharePointAndUploadToS3(
  spFile: SPFileGraph, targetS3Bucket: string, targetS3KeyPrefix: string
): Promise<S3UploadResult | null> {
  if (!spFile.id || !spFile.name) {
    console.error(`[S3 Upload] SharePoint File missing ID or Name. ID: ${spFile.id}, Name: ${spFile.name}. Cannot process.`);
    return null;
  }
  // @ts-ignore
  let effectiveDownloadUrl = spFile['@microsoft.graph.downloadUrl'] || spFile.downloadUrl; // Prefer explicit downloadUrl
  let fileDownloadStream: ReadableStream<Uint8Array> | null = null;

  if (effectiveDownloadUrl) {
    try {
      const response = await fetch(effectiveDownloadUrl);
      if (!response.ok || !response.body) {
        console.warn(`[S3 Upload] Download from direct URL ${effectiveDownloadUrl} failed for ${spFile.name}: ${response.status}. Will attempt fallback.`);
        effectiveDownloadUrl = undefined; // Clear to trigger fallback
      } else {
        fileDownloadStream = response.body;
      }
    } catch (e) {
      console.warn(`[S3 Upload] Error during direct download attempt for ${spFile.name}: ${e}. Retrying with /content endpoint.`);
      effectiveDownloadUrl = undefined; // Ensure fallback
    }
  }

  // Fallback to /content endpoint if direct downloadUrl failed or was not present
  if (!fileDownloadStream) {
    const driveId = spFile.parentReference?.driveId || SHAREPOINT_DRIVE_ID!; // Use item's driveId or default
    const contentUrl = `${GRAPH_ENDPOINT}/drives/${driveId}/items/${spFile.id}/content`;
    console.debug(`[S3 Upload] Attempting download for ${spFile.name} via /content URL: ${contentUrl}`);
    try {
      const token = await getAccessToken();
      const response = await fetch(contentUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => response.statusText);
        // Log more details for critical failures
        console.error(`[S3 Upload] CRITICAL: Download from /content for ${spFile.name} (ID: ${spFile.id}) failed: ${response.status}. Body: ${errorText.substring(0,500)}`);
        return null;
      }
      fileDownloadStream = response.body;
    } catch (error) {
      console.error(`[S3 Upload] CRITICAL: Exception during /content download for ${spFile.name} (ID: ${spFile.id}):`, error);
      return null;
    }
  }

  // Construct S3 key, ensuring no leading/trailing/double slashes
  const sharepointRelativePath = (spFile.path || "").replace(/^\/+|\/+$/g, '');
  let s3Key = sharepointRelativePath
    ? `${targetS3KeyPrefix}${sharepointRelativePath}/${spFile.name}`
    : `${targetS3KeyPrefix}${spFile.name}`;
  s3Key = s3Key.replace(/\/\//g, '/');

  const s3ContentType = (spFile.file as any)?.mimeType || 'application/octet-stream';

  console.debug(`[S3 Upload] Starting S3 upload for ${spFile.name} to s3://${targetS3Bucket}/${s3Key}`);
  try {
    // Convert Web ReadableStream to Node.js Readable stream for @aws-sdk/lib-storage
    const passThrough = Readable.fromWeb(fileDownloadStream as import('stream/web').ReadableStream<any>);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: targetS3Bucket,
        Key: s3Key,
        Body: passThrough,
        ContentType: s3ContentType,
        Metadata: { // Add relevant SharePoint metadata to S3 object
          'sharepoint-item-id': sanitizeS3MetadataValue(spFile.id),
          'sharepoint-etag': sanitizeS3MetadataValue(spFile.cTag || spFile.eTag), // cTag is preferred for content changes
          'original-filename': sanitizeS3MetadataValue(spFile.name),
          'sharepoint-path': sanitizeS3MetadataValue(spFile.parentReference?.path), // Store full SP path if available
          'sharepoint-weblink': sanitizeS3MetadataValue(spFile.webUrl),
        },
      }
    });

    const s3Result = await upload.done();
    console.info(`[S3 Upload] Successfully uploaded ${spFile.name} to s3://${targetS3Bucket}/${s3Key}`);
    return {
      s3Key,
      s3Bucket: targetS3Bucket,
      eTag: s3Result.ETag?.replace(/"/g, ''), // Remove quotes from ETag
      size: spFile.size || 0, // Use SharePoint's reported size
      mimeType: s3ContentType
    };
  } catch (error) {
    console.error(`[S3 Upload] S3 Upload client error for ${s3Key} (Original: ${spFile.name}):`, error);
    return null;
  }
}

export async function syncSharepointToS3AndFlagForBedrock(operationId?: number): Promise<{
  s3UploadsAttempted: number; s3UploadsFailed: number;
  dbRecordsUpdatedOrCreated: number; dbRecordsMarkedForDeletion: number;
  errorsInS3Sync: number;
}> {
  let s3UploadsAttempted = 0;
  let s3UploadsFailed = 0;
  let dbRecordsUpdatedOrCreated = 0;
  let dbRecordsMarkedForDeletion = 0;
  let errorsInS3Sync = 0;

  if (operationId && updateSystemOperation) {
    await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'PULLING_FROM_SHAREPOINT')!, { message: "Fetching changes from SharePoint..." });
  }

  const { changes, initialSyncPerformedByRecursive } = await getSharePointChanges(SHAREPOINT_DRIVE_ID!, TARGET_PATH_TO_SYNC_ENV);

  if (operationId && updateSystemOperation) {
    await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'UPLOADING_TO_S3')!, {
      message: `Processing ${changes.length} SharePoint changes...`,
      totalFiles: changes.length,
      processedFiles: 0,
      percent: 0
    });
  }

  let processedCount = 0;
  const logInterval = changes.length > 0 ? Math.min(100, Math.max(1, Math.floor(changes.length / 20))) || 1 : 1;

  for (const change of changes) {
    const spItem = change.item;
    processedCount++;

    if (changes.length > 0 && (processedCount % logInterval === 0 || processedCount === changes.length || changes.length < logInterval)) {
      const progressMessage = `Processing SharePoint item ${processedCount}/${changes.length}: ${spItem.name || 'N/A'}`;
      if (operationId && updateSystemOperation) {
        await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'UPLOADING_TO_S3')!, {
          message: progressMessage,
          totalFiles: changes.length,
          processedFiles: processedCount,
          currentFile: spItem.name,
          percent: changes.length > 0 ? Math.round((processedCount / changes.length) * 100) : 100
        });
      }
    }

    let s3KeyForLookup: string | undefined;
    if (spItem.name && spItem.id) {
      const relativePath = (spItem.path || "").replace(/^\/+|\/+$/g, '');
      s3KeyForLookup = relativePath ? `${S3_KEY_PREFIX_SHAREPOINT}${relativePath}/${spItem.name}` : `${S3_KEY_PREFIX_SHAREPOINT}${spItem.name}`;
      s3KeyForLookup = s3KeyForLookup.replace(/\/\//g, '/');
    } else {
      errorsInS3Sync++;
      console.warn(`[SP Sync Phase 1] SharePoint item missing name or ID. Skipping. Item: ${JSON.stringify(spItem).substring(0,200)}`);
      continue;
    }

    try {
      const existingFileRecord = (await db.select().from(filesMetadata)
      .where(drizzleOr(eq(filesMetadata.sharepointItemId, spItem.id!), sql`${filesMetadata.s3Key} = ${s3KeyForLookup}`))
      .limit(1))[0];

      if (change.type === 'delete') {
        if (existingFileRecord) {
          if (existingFileRecord.ingestionStatus !== 'PENDING_DELETION' && existingFileRecord.ingestionStatus !== 'DELETED') {
            console.info(`[SP Sync Phase 1] Marking for deletion: ${spItem.name} (S3 Key: ${existingFileRecord.s3Key})`);
            await db.update(filesMetadata).set({
              ingestionStatus: "PENDING_DELETION", statusUpdatedAt: new Date(), updatedAt: new Date(), lastErrorMessage: null
            }).where(eq(filesMetadata.id, existingFileRecord.id));
            dbRecordsMarkedForDeletion++;
          }
        } else {
          // console.debug(`[SP Sync Phase 1] Received delete for non-existent or already processed record: ${spItem.name}`);
        }
      } else if ((change.type === 'upsert' || change.type === 'recursive_initial_upsert') && (spItem.file || spItem.package)) { // Ensure it's a file/package
        if (change.type === 'upsert' && existingFileRecord?.sharepointETag === (spItem.cTag || spItem.eTag) &&
          (existingFileRecord.ingestionStatus === "INDEXED" || existingFileRecord.ingestionStatus === "BEDROCK_PROCESSING")) {
          // console.debug(`[SP Sync Phase 1] Skipping ${spItem.name}, ETag matches and status is INDEXED/BEDROCK_PROCESSING.`);
          continue;
        }

        console.debug(`[SP Sync Phase 1] Attempting S3 upload for ${spItem.name} (SP ID: ${spItem.id})`);
        s3UploadsAttempted++;
        const s3Info = await downloadFromSharePointAndUploadToS3(spItem, S3_BUCKET_NAME!, S3_KEY_PREFIX_SHAREPOINT);

        if (!s3Info) {
          s3UploadsFailed++; errorsInS3Sync++;
          console.warn(`[SP Sync Phase 1] S3 upload FAILED for ${spItem.name} (SP ID: ${spItem.id}).`);
          continue;
        }
        console.info(`[SP Sync Phase 1] S3 Upload SUCCEEDED for ${spItem.name}. S3 Key: ${s3Info.s3Key}`);

        const dbData: Partial<NewFileMetadata> = { // Use Partial for updates
          s3Bucket: s3Info.s3Bucket, s3Key: s3Info.s3Key, fileName: spItem.name!, // Name is checked above
          fileExtension: spItem.name?.split('.').pop()?.toLowerCase(),
          sharepointItemId: spItem.id,
          sharepointDriveId: spItem.parentReference?.driveId || SHAREPOINT_DRIVE_ID!,
          sharepointETag: (spItem.cTag || spItem.eTag),
          sharepointLastModifiedAt: new Date(spItem.lastModifiedDateTime),
          sharepointWebUrl: spItem.webUrl, // Store webUrl
          sizeBytes: s3Info.size,
          mimeType: s3Info.mimeType,
          s3ETag: s3Info.eTag,
          s3LastModifiedAt: new Date(), // S3 modification time is now
          bedrockKnowledgeBaseId: DEFAULT_KB_ID!,
          bedrockDataSourceId: DEFAULT_DS_ID!,
          ingestionStatus: "PENDING_INGESTION",
          statusUpdatedAt: new Date(),
          updatedAt: new Date(),
          lastErrorMessage: null,
        };

        if (existingFileRecord) {
          console.debug(`[SP Sync Phase 1] Updating DB for existing file: ${s3Info.s3Key}`);
          await db.update(filesMetadata).set(dbData).where(eq(filesMetadata.id, existingFileRecord.id));
        } else {
          console.debug(`[SP Sync Phase 1] Inserting new DB record for: ${s3Info.s3Key}`);
          await db.insert(filesMetadata).values({ ...dbData, createdAt: new Date() } as NewFileMetadata);
        }
        dbRecordsUpdatedOrCreated++;
      }
    } catch (error) {
      errorsInS3Sync++;
      console.error(`[SP Sync Phase 1] Error processing change for SP ID ${spItem.id} (Name: ${spItem.name}):`, error);
    }
  }

  if (operationId && updateSystemOperation) {
    await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'FLAGGING_FOR_BEDROCK')!, {
      message: `SharePoint sync phase complete. ${dbRecordsUpdatedOrCreated} files updated/created, ${dbRecordsMarkedForDeletion} marked for deletion. Bedrock processing will follow.`,
      s3UploadsAttempted, s3UploadsFailed, dbRecordsUpdatedOrCreated, dbRecordsMarkedForDeletion, errorsInS3Sync
    });
  }
  return { s3UploadsAttempted, s3UploadsFailed, dbRecordsUpdatedOrCreated, dbRecordsMarkedForDeletion, errorsInS3Sync };
}

/**
 * Automatically cleanup files that have been stuck in FAILED_INGESTION with deletion-related errors
 * for more than 24 hours. This prevents the database from accumulating orphaned records.
 */
async function autoCleanupStuckDeletionFiles(): Promise<void> {
  try {

    // Find files that have been stuck in FAILED_INGESTION with deletion-related errors for over 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stuckFiles = await db.select({
      id: filesMetadata.id,
      s3Bucket: filesMetadata.s3Bucket,
      s3Key: filesMetadata.s3Key,
      lastErrorMessage: filesMetadata.lastErrorMessage,
      statusUpdatedAt: filesMetadata.statusUpdatedAt
    })
    .from(filesMetadata)
    .where(
      and(
        eq(filesMetadata.ingestionStatus, "FAILED_INGESTION"),
        drizzleSql`${filesMetadata.statusUpdatedAt} < ${twentyFourHoursAgo}`,
        drizzleSql`(${filesMetadata.lastErrorMessage} LIKE '%deletion%' OR 
                   ${filesMetadata.lastErrorMessage} LIKE '%Bedrock Delete%' OR
                   ${filesMetadata.lastErrorMessage} LIKE '%Retry attempt%')`
      )
    );

    if (stuckFiles.length === 0) {
      return;
    }


    let cleanedUp = 0;
    for (const file of stuckFiles) {
      try {
        // Try to delete from S3 (if it still exists)
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: file.s3Bucket!,
            Key: file.s3Key!
          }));
        } catch (s3Error: any) {
          if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
          } else {
            console.warn(`[Auto Cleanup] S3 deletion warning for ${file.s3Key}:`, s3Error.message);
            // Continue with DB cleanup even if S3 has issues
          }
        }

        // Delete from database
        await db.delete(filesMetadata).where(eq(filesMetadata.id, file.id));
        cleanedUp++;

      } catch (error: any) {
        console.error(`[Auto Cleanup] Failed to cleanup ${file.s3Key}:`, error.message || error);
        // Continue with other files even if one fails
      }
    }

    if (cleanedUp > 0) {
    }

  } catch (error: any) {
    console.error(`[Auto Cleanup] Auto cleanup process failed:`, error.message || error);
    // Don't throw - this is a background cleanup that shouldn't break the main process
  }
}

export async function processPendingBedrockOperations(operationId?: number): Promise<BedrockProcessingResults> {
  if (operationId && updateSystemOperation) {
    await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'BEDROCK_PROCESSING_SUBMITTED')!, { message: "Initializing Bedrock processing of pending documents..." });
  }

  // Auto cleanup stuck files before processing
  await autoCleanupStuckDeletionFiles();

  const results: BedrockProcessingResults = {
    totalLoops: 0, ingestionsSubmittedThisRun: 0, ingestionsConfirmedFailedOrIgnoredThisRun: 0,
    ingestionsFailedSubmissionThisRun: 0, deletionsSubmittedThisRun: 0, deletionsFailedThisRun: 0,
    statusesCheckedThisRun: 0, statusesUpdatedToTerminalThisRun: 0, totalProcessingErrorsThisRun: 0,
  };
  let madeProgressInLastIteration: boolean;
  let currentActiveBedrockOps = 0;
  const bedrockJobIdToStore: string | null = null;

  do {
    madeProgressInLastIteration = false;
    results.totalLoops++;

    // Get current count of items actively being processed by Bedrock (according to our DB)
    currentActiveBedrockOps = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata)
    .where(eq(filesMetadata.ingestionStatus, "BEDROCK_PROCESSING")))[0]?.count || 0;

    if (operationId && updateSystemOperation) {
      const pendingDeletionsCount = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "PENDING_DELETION")))[0]?.count || 0;
      const pendingIngestionsCount = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "PENDING_INGESTION")))[0]?.count || 0;

      let progressMessage = `Bedrock Loop ${results.totalLoops}. Active (Bedrock SDK): ${currentActiveBedrockOps}. Pending Deletion: ${pendingDeletionsCount}, Pending Ingestion: ${pendingIngestionsCount}.`;
      if (results.ingestionsSubmittedThisRun > 0) progressMessage += ` Submitted Ingest: ${results.ingestionsSubmittedThisRun}.`;
      if (results.deletionsSubmittedThisRun > 0) progressMessage += ` Submitted Delete: ${results.deletionsSubmittedThisRun}.`;
      if (results.statusesCheckedThisRun > 0) progressMessage += ` Statuses Checked: ${results.statusesCheckedThisRun}.`;

      await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'BEDROCK_POLLING_STATUS')!, {
        message: progressMessage,
        totalLoops: results.totalLoops,
        activeBedrockOperations: currentActiveBedrockOps, // This is our DB's view of "BEDROCK_PROCESSING"
        pendingDeletions: pendingDeletionsCount,
        pendingIngestions: pendingIngestionsCount,
        // Include cumulative results for this run
        ingestionsSubmittedThisRun: results.ingestionsSubmittedThisRun,
        ingestionsConfirmedFailedOrIgnoredThisRun: results.ingestionsConfirmedFailedOrIgnoredThisRun,
        deletionsSubmittedThisRun: results.deletionsSubmittedThisRun,
        deletionsFailedThisRun: results.deletionsFailedThisRun,
        statusesCheckedThisRun: results.statusesCheckedThisRun,
        statusesUpdatedToTerminalThisRun: results.statusesUpdatedToTerminalThisRun,
      }, undefined , bedrockJobIdToStore);
    }

    // --- 1. Poll status of documents in "BEDROCK_PROCESSING" ---
    const docsInProcessing = await db.select({ id: filesMetadata.id, s3Bucket: filesMetadata.s3Bucket, s3Key: filesMetadata.s3Key })
    .from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "BEDROCK_PROCESSING"))
    .orderBy(drizzleSql`${filesMetadata.statusUpdatedAt}`) // Process oldest first
    .limit(BEDROCK_CONCURRENT_OPERATIONS_LIMIT * 2); // Poll generously to clear out queue

    if (docsInProcessing.length > 0) {
      console.debug(`[Bedrock Processor] Polling status for ${docsInProcessing.length} 'BEDROCK_PROCESSING' documents...`);
      results.statusesCheckedThisRun += docsInProcessing.length;
      for (let i = 0; i < docsInProcessing.length; i += BEDROCK_GET_STATUS_API_BATCH_SIZE) {
        const batchToCheck = docsInProcessing.slice(i, i + BEDROCK_GET_STATUS_API_BATCH_SIZE);
        if (batchToCheck.length === 0) continue;
        const documentIdentifiers: DocumentIdentifier[] = batchToCheck.map(f => ({
          dataSourceType: ContentDataSourceType.S3, s3: { uri: `s3://${f.s3Bucket!}/${f.s3Key!}` }
        }));
        try {
          const command = new GetKnowledgeBaseDocumentsCommand({ knowledgeBaseId: DEFAULT_KB_ID!, dataSourceId: DEFAULT_DS_ID!, documentIdentifiers });
          const response: GetKnowledgeBaseDocumentsResponse = await bedrockAgentClient.send(command);
          if (response.documentDetails) {
            for (const detail of response.documentDetails) {
              const s3Uri = detail.identifier?.s3?.uri;
              const originalDoc = batchToCheck.find(d => `s3://${d.s3Bucket!}/${d.s3Key!}` === s3Uri);
              if (originalDoc && detail.status &&
                (detail.status === DocumentStatus.INDEXED || detail.status === DocumentStatus.FAILED || detail.status === DocumentStatus.IGNORED || detail.status === DocumentStatus.NOT_FOUND)) {
                await db.update(filesMetadata).set({
                  ingestionStatus: detail.status === DocumentStatus.INDEXED ? "INDEXED" : "FAILED_INGESTION",
                  lastErrorMessage: (detail.status !== DocumentStatus.INDEXED) ? (detail.statusReason || `Status: ${detail.status}`) : null,
                  statusUpdatedAt: new Date(detail.updatedAt || Date.now())
                }).where(eq(filesMetadata.id, originalDoc.id));
                results.statusesUpdatedToTerminalThisRun++;
                madeProgressInLastIteration = true;
              }
            }
          }
        } catch (e: any) { console.error(`[Bedrock Processor] Poll Error: ${e.message || e}`); results.totalProcessingErrorsThisRun++; }
      }
      // Refresh active ops count after potential status updates from polling
      currentActiveBedrockOps = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata)
      .where(eq(filesMetadata.ingestionStatus, "BEDROCK_PROCESSING")))[0]?.count || 0;
    }

    // --- 2. Process PENDING_DELETION ---
    const availableSlotsForDeletion = BEDROCK_CONCURRENT_OPERATIONS_LIMIT - currentActiveBedrockOps;
    if (availableSlotsForDeletion > 0) {
      const docsForDeletion = await db.select({ id: filesMetadata.id, s3Bucket: filesMetadata.s3Bucket, s3Key: filesMetadata.s3Key })
      .from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "PENDING_DELETION"))
      .orderBy(drizzleSql`${filesMetadata.statusUpdatedAt}`)
      .limit(Math.min(availableSlotsForDeletion, BEDROCK_DELETE_API_BATCH_SIZE));

      if (docsForDeletion.length > 0) {
        console.debug(`[Bedrock Processor] Submitting ${docsForDeletion.length} for deletion. Available slots: ${availableSlotsForDeletion}`);
        const documentIdentifiers: DocumentIdentifier[] = docsForDeletion.map(d => ({
          dataSourceType: ContentDataSourceType.S3, s3: { uri: `s3://${d.s3Bucket!}/${d.s3Key!}` }
        }));

        try {
          const command = new DeleteKnowledgeBaseDocumentsCommand({ knowledgeBaseId: DEFAULT_KB_ID!, dataSourceId: DEFAULT_DS_ID!, documentIdentifiers });
          const response: DeleteKnowledgeBaseDocumentsResponse = await bedrockAgentClient.send(command);

          results.deletionsSubmittedThisRun += docsForDeletion.length;
          madeProgressInLastIteration = true;

          for (const docToDelete of docsForDeletion) {
            const detail = response.documentDetails?.find(d => d.identifier?.s3?.uri === `s3://${docToDelete.s3Bucket!}/${docToDelete.s3Key!}`);
            let shouldProceedWithCleanup = false;
            let bedrockStatusMessage = "No detail in Bedrock response for this document.";

            if (detail) {
              bedrockStatusMessage = `Bedrock status: ${detail.status}${detail.statusReason ? `, Reason: ${detail.statusReason}` : ''}`;

              // FIXED: Accept multiple successful deletion statuses
              if (detail.status === DocumentStatus.NOT_FOUND ||
                detail.status === DocumentStatus.DELETING) {
                shouldProceedWithCleanup = true;
              }
              // Also accept PENDING status if it's deletion-related
              else if (detail.status === DocumentStatus.PENDING &&
                detail.statusReason &&
                detail.statusReason.toLowerCase().includes('delet')) {
                shouldProceedWithCleanup = true;
              }
              // FIXED: If status is FAILED but reason suggests the document doesn't exist, proceed with cleanup
              else if (detail.status === DocumentStatus.FAILED &&
                detail.statusReason &&
                (detail.statusReason.toLowerCase().includes('not found') ||
                  detail.statusReason.toLowerCase().includes('does not exist'))) {
                shouldProceedWithCleanup = true;
                bedrockStatusMessage += " (Document not found, proceeding with cleanup)";
              }
            } else {
              // FIXED: If no detail is returned but the API call succeeded,
              // this often means the document was already deleted or doesn't exist
              console.info(`[Bedrock Processor] No detail returned for ${docToDelete.s3Key}, but API call succeeded. Proceeding with cleanup.`);
              shouldProceedWithCleanup = true;
              bedrockStatusMessage = "No detail returned from Bedrock API (likely already deleted). Proceeding with cleanup.";
            }

            if (shouldProceedWithCleanup) {
              console.info(`[Bedrock Processor] Bedrock confirmed deletion for ${docToDelete.s3Key}. ${bedrockStatusMessage}. Proceeding with S3 and DB cleanup.`);
              try {
                // Delete from S3
                try {
                  await s3Client.send(new DeleteObjectCommand({ Bucket: docToDelete.s3Bucket!, Key: docToDelete.s3Key! }));
                  console.info(`[Bedrock Processor] S3 object deleted: s3://${docToDelete.s3Bucket!}/${docToDelete.s3Key!}`);
                } catch (s3Err: any) {
                  if (s3Err.name === 'NoSuchKey' || (s3Err.$metadata && s3Err.$metadata.httpStatusCode === 404)) {
                    console.warn(`[Bedrock Processor] S3 object s3://${docToDelete.s3Bucket!}/${docToDelete.s3Key!} not found during deletion. Already deleted from S3.`);
                  } else {
                    throw s3Err;
                  }
                }

                // Delete from database
                await db.delete(filesMetadata).where(eq(filesMetadata.id, docToDelete.id));
                console.info(`[Bedrock Processor] DB record deleted from filesMetadata for ID: ${docToDelete.id}, S3 Key: ${docToDelete.s3Key}`);

              } catch (cleanupError: any) {
                results.deletionsFailedThisRun++;
                results.totalProcessingErrorsThisRun++;
                const errorMessage = `Post-KB deletion cleanup failed for ${docToDelete.s3Key}: ${cleanupError.message || cleanupError}`;
                console.error(`[Bedrock Processor] ${errorMessage}`);
                await db.update(filesMetadata).set({
                  ingestionStatus: "FAILED_INGESTION",
                  lastErrorMessage: `Bedrock deletion succeeded, but S3/DB cleanup failed: ${cleanupError.message || cleanupError}`,
                  statusUpdatedAt: new Date()
                }).where(eq(filesMetadata.id, docToDelete.id));
              }
            } else {
              // FIXED: Instead of immediately marking as failed, implement retry logic
              results.deletionsFailedThisRun++;
              console.warn(`[Bedrock Processor] Bedrock deletion not confirmed for ${docToDelete.s3Key}. ${bedrockStatusMessage}`);

              // Get current retry count from error message
              const currentRecord = await db.select({
                lastErrorMessage: filesMetadata.lastErrorMessage
              }).from(filesMetadata).where(eq(filesMetadata.id, docToDelete.id)).limit(1);

              const retryMatch = currentRecord[0]?.lastErrorMessage?.match(/Retry attempt (\d+)/);
              const currentRetryCount = retryMatch ? Number.parseInt(retryMatch[1]) + 1 : 1;
              const maxRetries = 3;

              if (currentRetryCount >= maxRetries) {
                // After max retries, mark as failed
                console.error(`[Bedrock Processor] Max retries (${maxRetries}) reached for ${docToDelete.s3Key}. Marking as failed.`);
                await db.update(filesMetadata).set({
                  ingestionStatus: "FAILED_INGESTION",
                  lastErrorMessage: `Bedrock deletion failed after ${maxRetries} attempts. Last status: ${bedrockStatusMessage}`,
                  statusUpdatedAt: new Date()
                }).where(eq(filesMetadata.id, docToDelete.id));
              } else {
                // Keep as PENDING_DELETION for another retry
                console.info(`[Bedrock Processor] Keeping ${docToDelete.s3Key} as PENDING_DELETION for retry ${currentRetryCount}/${maxRetries}`);
                await db.update(filesMetadata).set({
                  lastErrorMessage: `Bedrock deletion not confirmed. ${bedrockStatusMessage}. Retry attempt ${currentRetryCount}/${maxRetries}`,
                  statusUpdatedAt: new Date()
                }).where(eq(filesMetadata.id, docToDelete.id));
              }
            }
          }
        } catch (e: any) {
          results.totalProcessingErrorsThisRun++;
          results.deletionsFailedThisRun += docsForDeletion.length;
          console.error(`[Bedrock Processor] Error submitting delete batch to Bedrock: ${e.message || e}`);
          const errorMsg = e instanceof Error ? e.message : String(e);

          // For batch API failures, mark all as failed
          await db.update(filesMetadata)
          .set({
            ingestionStatus: "FAILED_INGESTION",
            lastErrorMessage: `Bedrock Delete Batch API call failed: ${errorMsg}`,
            statusUpdatedAt: new Date()
          })
          .where(inArray(filesMetadata.id, docsForDeletion.map(d => d.id)));
        }

        // Refresh active ops count after potential deletions
        currentActiveBedrockOps = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata)
        .where(eq(filesMetadata.ingestionStatus, "BEDROCK_PROCESSING")))[0]?.count || 0;
      }
    }

    // --- 3. Process PENDING_INGESTION ---
    const availableSlotsForIngestion = BEDROCK_CONCURRENT_OPERATIONS_LIMIT - currentActiveBedrockOps;
    if (availableSlotsForIngestion > 0) {
      const docsForIngestion = await db.select({ id: filesMetadata.id, s3Bucket: filesMetadata.s3Bucket, s3Key: filesMetadata.s3Key })
      .from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "PENDING_INGESTION"))
      .orderBy(drizzleSql`${filesMetadata.statusUpdatedAt}`)
      .limit(Math.min(availableSlotsForIngestion, BEDROCK_INGEST_API_BATCH_SIZE));

      if (docsForIngestion.length > 0) {
        console.debug(`[Bedrock Processor] Submitting ${docsForIngestion.length} for ingestion. Available slots: ${availableSlotsForIngestion}`);
        madeProgressInLastIteration = true;
        const knowledgeBaseDocuments: KnowledgeBaseDocument[] = docsForIngestion.map(d => ({
          content: { dataSourceType: ContentDataSourceType.S3, s3: { s3Location: { uri: `s3://${d.s3Bucket!}/${d.s3Key!}` } } }
        }));
        try {
          const command = new IngestKnowledgeBaseDocumentsCommand({ knowledgeBaseId: DEFAULT_KB_ID!, dataSourceId: DEFAULT_DS_ID!, documents: knowledgeBaseDocuments });
          const response: IngestKnowledgeBaseDocumentsResponse = await bedrockAgentClient.send(command);

          results.ingestionsSubmittedThisRun += docsForIngestion.length;

          for (const docToUpdate of docsForIngestion) {
            const detail = response.documentDetails?.find(d => d.identifier?.s3?.uri === `s3://${docToUpdate.s3Bucket!}/${docToUpdate.s3Key!}`);
            let finalStatus: typeof ingestionStatusEnum.enumValues[number] = "FAILED_INGESTION";
            let errMsg: string | null = "No detail in Bedrock ingest response for this document.";

            if (detail) {
              if (detail.status === DocumentStatus.FAILED || detail.status === DocumentStatus.IGNORED || detail.status === DocumentStatus.METADATA_UPDATE_FAILED) {
                errMsg = detail.statusReason || `Bedrock ingest status: ${detail.status}`;
              } else { // PENDING, INDEXING, INDEXED
                finalStatus = (detail.status === DocumentStatus.INDEXED) ? "INDEXED" : "BEDROCK_PROCESSING";
                errMsg = null; // Clear error if not failed/ignored
              }
            }
            await db.update(filesMetadata).set({ ingestionStatus: finalStatus, lastErrorMessage: errMsg, statusUpdatedAt: new Date() })
            .where(eq(filesMetadata.id, docToUpdate.id));
            if (finalStatus === "FAILED_INGESTION") results.ingestionsConfirmedFailedOrIgnoredThisRun++;
            else if (finalStatus === "BEDROCK_PROCESSING") currentActiveBedrockOps++; // Increment if successfully submitted for processing
          }
        } catch (e: any) {
          results.totalProcessingErrorsThisRun++;
          results.ingestionsConfirmedFailedOrIgnoredThisRun += docsForIngestion.length; // Assume all failed if batch call fails
          results.ingestionsFailedSubmissionThisRun += docsForIngestion.length;
          console.error(`[Bedrock Processor] Error submitting ingest batch: ${e.message || e}`);
          const errorMsg = e instanceof Error ? e.message : String(e);
          await db.update(filesMetadata)
          .set({ ingestionStatus: "FAILED_INGESTION", lastErrorMessage: `Bedrock Ingest Batch API call failed: ${errorMsg}`, statusUpdatedAt: new Date() })
          .where(inArray(filesMetadata.id, docsForIngestion.map(d=>d.id)));
        }
      }
    }

    // Check if there's still work to do for the next potential iteration
    const stillPendingDeletions = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "PENDING_DELETION")))[0]?.count || 0;
    const stillPendingIngestions = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "PENDING_INGESTION")))[0]?.count || 0;
    const stillProcessingByBedrock = (await db.select({count: drizzleSql<number>`count(*)::int`}).from(filesMetadata).where(eq(filesMetadata.ingestionStatus, "BEDROCK_PROCESSING")))[0]?.count || 0;

    console.debug(`[Bedrock Processor] Loop ${results.totalLoops} ended. Made progress: ${madeProgressInLastIteration}. Pending Del: ${stillPendingDeletions}, Pending Ing: ${stillPendingIngestions}, Actively Processing by Bedrock (DB): ${stillProcessingByBedrock}`);

    if (madeProgressInLastIteration && results.totalLoops < MAX_PROCESSOR_LOOPS) {
      console.debug(`[Bedrock Processor] Pausing for ${DELAY_BETWEEN_PROCESSOR_LOOPS_MS / 1000}s before next iteration.`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PROCESSOR_LOOPS_MS));
    } else if (!madeProgressInLastIteration && (stillPendingDeletions > 0 || stillPendingIngestions > 0 || stillProcessingByBedrock > 0) && results.totalLoops < MAX_PROCESSOR_LOOPS){
      console.debug(`[Bedrock Processor] No direct progress, but pending/processing items exist. Pausing before next polling cycle.`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PROCESSOR_LOOPS_MS * 2)); // Longer pause if just waiting on polling
      madeProgressInLastIteration = true; // Force one more loop cycle to primarily poll/check
    }

  } while (madeProgressInLastIteration && results.totalLoops < MAX_PROCESSOR_LOOPS);

  return results;
}

export async function uploadAndRegisterManualFiles(
  validatedFiles: File[], // Expecting browser File objects
  operationId?: number
): Promise<{
  message: string; uploadedFileCount: number; failedFileCount: number; success: boolean;
}> {
  let successfullyFlagged = 0; let failures = 0;
  if (!S3_BUCKET_NAME || !DEFAULT_KB_ID || !DEFAULT_DS_ID) {
    return { message: "Manual upload configuration error (env vars).", uploadedFileCount: 0, failedFileCount: validatedFiles.length, success: false };
  }

  if (operationId && updateSystemOperation) {
    await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'UPLOADING_TO_S3')!, {
      message: `Starting manual upload of ${validatedFiles.length} files...`,
      totalFiles: validatedFiles.length,
      processedFiles: 0,
      percent: 0
    });
  }

  for (const file of validatedFiles) {
    const s3Key = `${S3_KEY_PREFIX_MANUAL}${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    try {
      console.debug(`[Manual Upload] Uploading ${file.name} to S3 key: ${s3Key}`);
      const s3ContentType = file.type || 'application/octet-stream';
      // Convert File to Buffer for S3 upload body
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const s3Result = await new Upload({
        client: s3Client,
        params: {
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: s3ContentType,
          Metadata: { 'upload-source': 'manual', 'original-filename': sanitizeS3MetadataValue(file.name) }
        }
      }).done();

      console.info(`[Manual Upload] Successfully uploaded ${file.name} to S3. ETag: ${s3Result.ETag}`);

      await db.insert(filesMetadata).values({
        s3Bucket: S3_BUCKET_NAME, s3Key, fileName: file.name, fileExtension: file.name.split('.').pop()?.toLowerCase(),
        sizeBytes: file.size, mimeType: s3ContentType, s3ETag: s3Result.ETag?.replace(/"/g, ''),
        s3LastModifiedAt: new Date(), ingestionStatus: "PENDING_INGESTION",
        statusUpdatedAt: new Date(), bedrockKnowledgeBaseId: DEFAULT_KB_ID, bedrockDataSourceId: DEFAULT_DS_ID,
        createdAt: new Date(), updatedAt: new Date()
      } as NewFileMetadata);
      successfullyFlagged++;

      if (operationId && updateSystemOperation) {
        await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'UPLOADING_TO_S3')!, {
          message: `Uploaded ${file.name}. Progress: ${successfullyFlagged}/${validatedFiles.length}.`,
          totalFiles: validatedFiles.length,
          processedFiles: successfullyFlagged,
          currentFile: file.name,
          percent: Math.round((successfullyFlagged / validatedFiles.length) * 100)
        });
      }

    } catch (e: any) {
      failures++;
      console.error(`[Manual Upload] Failed to upload/register manual file ${file.name}: ${e.message || e}`);
      if (operationId && updateSystemOperation) { // Update with error for this file
        await updateSystemOperation(operationId, operationStatusEnum.enumValues.find(s => s === 'UPLOADING_TO_S3')!, {
          message: `Failed to upload ${file.name}. Progress: ${successfullyFlagged}/${validatedFiles.length}. Errors: ${failures}.`,
          totalFiles: validatedFiles.length, processedFiles: successfullyFlagged, errors: failures,
          currentFile: file.name, lastErrorForFile: e.message || String(e),
          percent: Math.round((successfullyFlagged / validatedFiles.length) * 100) // Base percent on successful ones
        });
      }
    }
  }
  let message = `${successfullyFlagged} files uploaded to S3 and flagged for Bedrock ingestion.`;
  if (failures > 0) message += ` ${failures} files failed to upload/flag.`;

  return { message, uploadedFileCount: successfullyFlagged, failedFileCount: failures, success: failures === 0 };
}

export async function flagSingleFileForDeletion(s3Key: string): Promise<{success: boolean, message: string}> {
  const record = (await db.select({id: filesMetadata.id}).from(filesMetadata).where(eq(filesMetadata.s3Key, s3Key)).limit(1))[0];
  if (!record) return { success: false, message: `File ${s3Key} not found in metadata.`};
  try {
    await db.update(filesMetadata)
    .set({ ingestionStatus: "PENDING_DELETION", statusUpdatedAt: new Date(), lastErrorMessage: null })
    .where(eq(filesMetadata.id, record.id));
    console.info(`[Deletion Flag] File ${s3Key} successfully marked for deletion.`);
    return { success: true, message: `File ${s3Key} successfully marked for deletion.`};
  } catch (error: any) {
    console.error(`[Deletion Flag] Failed to mark ${s3Key} for deletion: ${error.message || error}`);
    return { success: false, message: `Failed to mark ${s3Key} for deletion: ${error.message || error}`};
  }
}

export async function flagMultipleFilesForDeletion(s3Keys: string[]): Promise<{
  message: string; success: boolean; markedForDeletionCount: number; notFoundCount: number;
}> {
  if (!s3Keys || s3Keys.length === 0) {
    return { message: "No S3 keys provided for deletion.", success: false, markedForDeletionCount: 0, notFoundCount: 0 };
  }
  try {
    const updatedFilesResult = await db.update(filesMetadata)
    .set({ ingestionStatus: 'PENDING_DELETION', statusUpdatedAt: new Date(), updatedAt: new Date(), lastErrorMessage: null })
    .where(inArray(filesMetadata.s3Key, s3Keys))
    .returning({ s3Key: filesMetadata.s3Key });

    const updatedCount = updatedFilesResult.length;
    const foundS3Keys = updatedFilesResult.map(f => f.s3Key);
    const notFoundS3Keys = s3Keys.filter(key => !foundS3Keys.includes(key));

    let message = `${updatedCount} documents marked for deletion.`;
    if (notFoundS3Keys.length > 0) {
      message += ` ${notFoundS3Keys.length} documents not found in metadata: ${notFoundS3Keys.join(', ')}.`;
    }
    console.info(`[Deletion Flag] Batch deletion flag result: ${message}`);
    return { message, success: true, markedForDeletionCount: updatedCount, notFoundCount: notFoundS3Keys.length };
  } catch (error: any) {
    console.error(`[Deletion Flag] Error during batch marking for deletion: ${error.message || error}`);
    return { message: `Error during batch deletion flagging: ${error.message || error}`, success: false, markedForDeletionCount: 0, notFoundCount: s3Keys.length };
  }
}