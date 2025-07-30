import {type InferInsertModel, type InferSelectModel, sql} from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  text,
  uuid,
  boolean,
  integer,
  primaryKey,
  foreignKey,
  json,
  index, pgEnum,
  serial,
  bigint, uniqueIndex,
} from 'drizzle-orm/pg-core';

// Add these new enums
export const operationStatusEnum = pgEnum('operation_status_enum', [
  'IDLE',
  'STARTED',
  'PULLING_FROM_SHAREPOINT',
  'UPLOADING_TO_S3',
  'FLAGGING_FOR_BEDROCK',
  'BEDROCK_PROCESSING_SUBMITTED',
  'BEDROCK_POLLING_STATUS',
  'COMPLETED',
  'FAILED'
]);

export const operationTypeEnum = pgEnum('operation_type_enum', [
  'SHAREPOINT_SYNC_AND_PROCESS', // Covers the whole flow from sync-sharepoint API
  'BEDROCK_PROCESS_PENDING',   // For dedicated calls to process pending items
  'MANUAL_UPLOAD_AND_PROCESS',  // If you want to track manual uploads similarly
  'FILE_DELETION_AND_PROCESS'
]);

// New table for system operations
export const systemOperations = pgTable('system_operations', {
  id: serial('id').primaryKey(),
  operationType: operationTypeEnum('operation_type').notNull(),
  currentStatus: operationStatusEnum('current_status').notNull().default('IDLE'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  progressDetails: json('progress_details'), // e.g., { message: "Processed 50/100 files", currentFile: "...", percent: 50 }
  lastBedrockJobId: text('last_bedrock_job_id'), // Store Bedrock's ingestionJobId
  errorMessage: text('error_message'),
}, (table) => ({
  activeOperationIdx: uniqueIndex('active_operation_idx')
  .on(table.operationType)
  .where(sql`${table.currentStatus} NOT IN ('COMPLETED', 'FAILED', 'IDLE')`), // Ensure only one active operation of a type
}));

export type SystemOperation = InferSelectModel<typeof systemOperations>;
export type NewSystemOperation = InferInsertModel<typeof systemOperations>;

// Enum for Ingestion Status
export const ingestionStatusEnum = pgEnum('ingestion_status_enum', [
  'NEW',                        // Freshly discovered, pending any processing
  'SYNCED_FROM_SHAREPOINT',   // Metadata synced from SharePoint, S3 upload might be pending or confirmed
  'UPLOADED_TO_S3',           // Confirmed present in S3
  'METADATA_STORED',          // Core metadata (S3, SP, basic) stored in this table, ready for next step
  'PENDING_INGESTION',        // Marked for Bedrock ingestion, worker will pick this up
  'INGESTION_IN_PROGRESS',    // Bedrock ingestion job is active for this file/batch
  'INDEXED',                  // Successfully indexed by Bedrock and searchable
  'FAILED_INGESTION',         // Bedrock ingestion failed for this file
  'PENDING_DELETION',         // Marked for deletion from S3/Bedrock, worker will pick this up
  'DELETED',                  // Confirmed deleted from S3 and Bedrock considered clear
  'ARCHIVED',                 // If you add an archive feature
  'BEDROCK_PROCESSING',
]);

// Table for Files Metadata
export const filesMetadata = pgTable('files_metadata', {
  id: serial('id').primaryKey(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Key: text('s3_key').notNull(),

  fileName: text('file_name').notNull(),
  fileExtension: varchar('file_extension', { length: 32 }),

  sharepointItemId: text('sharepoint_item_id'),
  sharepointDriveId: text('sharepoint_drive_id'),
  sharepointSiteId: text('sharepoint_site_id'),
  sharepointWebUrl: text('sharepoint_web_url'),
  sharepointETag: text('sharepoint_etag'), // Stores SharePoint's ETag or cTag
  sharepointLastModifiedAt: timestamp('sharepoint_last_modified_at', { withTimezone: true }),

  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  mimeType: varchar('mime_type', { length: 127 }),

  s3ETag: varchar('s3_etag', { length: 255 }),
  s3VersionId: text('s3_version_id'),
  s3LastModifiedAt: timestamp('s3_last_modified_at', { withTimezone: true }),

  bedrockKnowledgeBaseId: text('bedrock_knowledge_base_id'),
  bedrockDataSourceId: text('bedrock_data_source_id'),

  ingestionStatus: ingestionStatusEnum('ingestion_status').notNull().default('NEW'),
  statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  lastIngestionJobId: text('last_ingestion_job_id'),
  lastErrorMessage: text('last_error_message'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  s3ObjectUniqueIdx: uniqueIndex('s3_object_unique_idx').on(table.s3Bucket, table.s3Key),
  fileNameIdx: index('file_name_idx').on(table.fileName),
  ingestionStatusIdx: index('ingestion_status_idx').on(table.ingestionStatus),
  sharepointItemIdIdx: index('sharepoint_item_id_idx').on(table.sharepointItemId),
  updatedAtIdx: index('updated_at_idx').on(table.updatedAt),
  s3LastModifiedAtIdx: index('s3_last_modified_at_idx').on(table.s3LastModifiedAt),
}));

export type FileMetadata = InferSelectModel<typeof filesMetadata>;
export type NewFileMetadata = InferInsertModel<typeof filesMetadata>;


// Table for SharePoint Sync State (Delta Tokens)
export const sharepointSyncState = pgTable('sharepoint_sync_state', {
  id: varchar('id', { length: 255 }).primaryKey(),
  driveId: text('drive_id').notNull(),
  targetPath: text('target_path').notNull(),
  deltaLink: text('delta_link'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Flag to indicate if the last successful sync for this 'id' was a full recursive scan
  // This helps decide if a 0-item delta response on a subsequent "initial" attempt should trigger recursive again.
  lastSyncWasRecursiveFullScan: boolean('last_sync_was_recursive_full_scan').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export type SharePointSyncStateData = InferSelectModel<typeof sharepointSyncState>;
export type NewSharePointSyncStateData = InferInsertModel<typeof sharepointSyncState>;


// Users
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull().unique(),
  password: varchar('password', { length: 64 }),
  isAdmin: boolean('isAdmin').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});
export type User = InferSelectModel<typeof user>;

// Chats
export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdateFn(() => new Date()),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  isPinned: boolean('isPinned').notNull().default(false),
  customTitle: text('customTitle'),
}, (table) => ({
      userIdIdx: index('chat_user_id_idx').on(table.userId),
      updatedAtIdx: index('chat_updated_at_idx').on(table.updatedAt),
    })
);

export type Chat = InferSelectModel<typeof chat>;

// Use case categories and use cases
export const useCaseCategory = pgTable('UseCaseCategory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
export type UseCaseCategory = InferSelectModel<typeof useCaseCategory>;

export const useCase = pgTable('UseCase', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  categoryId: uuid('categoryId').references(() => useCaseCategory.id),
  chatId: uuid('chatId').references(() => chat.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type'),
  topic: text('topic'),
  timeSaved: text('timeSaved'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
export type UseCase = InferSelectModel<typeof useCase>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  agentType: varchar('agentType'),
  useCaseId: uuid('useCaseId'),
  modelId: varchar('modelId', { length: 255 }),
  inputTokens: integer('inputTokens').default(0),
  outputTokens: integer('outputTokens').default(0),
  processed: boolean('processed').notNull().default(false),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  }),
);
export type Vote = InferSelectModel<typeof vote>;

// Documents
export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    kind: varchar('kind', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  }),
);
export type Document = InferSelectModel<typeof document>;

// Suggestions
export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);
export type Suggestion = InferSelectModel<typeof suggestion>;

export const logo = pgTable('Logo', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  url: text('url').notNull(),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Logo = InferSelectModel<typeof logo>;

export const suggestedMessage = pgTable('SuggestedMessage', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  modelId: varchar('modelId', { length: 255 }).notNull(),
  title: text('title').notNull(),
  label: text('label').notNull(),
  action: text('action').notNull(),
  position: varchar('position', { length: 10 }).notNull(), // "1", "2", "3", or "4"
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type SuggestedMessage = InferSelectModel<typeof suggestedMessage>;

// System Prompts
export const systemPrompts = pgTable('system_prompts', {
  assistantId: varchar('assistant_id', { length: 64 }).primaryKey().notNull(),
  promptText: text('prompt_text').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
export type SystemPrompt = InferSelectModel<typeof systemPrompts>;