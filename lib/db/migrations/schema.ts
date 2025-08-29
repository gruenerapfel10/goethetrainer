import { pgTable, foreignKey, uuid, varchar, json, timestamp, integer, boolean, text, index, unique, uniqueIndex, serial, bigint, primaryKey, pgEnum } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const ingestionStatusEnum = pgEnum("ingestion_status_enum", ['NEW', 'SYNCED_FROM_SHAREPOINT', 'UPLOADED_TO_S3', 'METADATA_STORED', 'PENDING_INGESTION', 'INGESTION_IN_PROGRESS', 'INDEXED', 'FAILED_INGESTION', 'PENDING_DELETION', 'DELETED', 'ARCHIVED', 'BEDROCK_PROCESSING'])
export const operationStatusEnum = pgEnum("operation_status_enum", ['IDLE', 'STARTED', 'PULLING_FROM_SHAREPOINT', 'UPLOADING_TO_S3', 'FLAGGING_FOR_BEDROCK', 'BEDROCK_PROCESSING_SUBMITTED', 'BEDROCK_POLLING_STATUS', 'COMPLETED', 'FAILED'])
export const operationTypeEnum = pgEnum("operation_type_enum", ['SHAREPOINT_SYNC_AND_PROCESS', 'BEDROCK_PROCESS_PENDING', 'MANUAL_UPLOAD_AND_PROCESS', 'FILE_DELETION_AND_PROCESS'])



export const message = pgTable("Message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	role: varchar().notNull(),
	parts: json().notNull(),
	attachments: json().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	agentType: varchar(),
	useCaseId: uuid(),
	modelId: varchar({ length: 255 }),
	inputTokens: integer().default(0),
	outputTokens: integer().default(0),
	processed: boolean().default(false).notNull(),
},
(table) => {
	return {
		messageChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Message_chatId_Chat_id_fk"
		}),
	}
});

export const logo = pgTable("Logo", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	url: text().notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const suggestion = pgTable("Suggestion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid().notNull(),
	documentCreatedAt: timestamp({ mode: 'string' }).notNull(),
	originalText: text().notNull(),
	suggestedText: text().notNull(),
	description: text(),
	isResolved: boolean().default(false).notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		suggestionDocumentIdDocumentCreatedAtDocumentIdCreatedAtF: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
			name: "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f"
		}),
		suggestionUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Suggestion_userId_User_id_fk"
		}),
	}
});

export const suggestedMessage = pgTable("SuggestedMessage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	modelId: varchar({ length: 255 }).notNull(),
	title: text().notNull(),
	label: text().notNull(),
	action: text().notNull(),
	position: varchar({ length: 10 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const useCase = pgTable("UseCase", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	categoryId: uuid(),
	chatId: uuid(),
	title: text().notNull(),
	description: text(),
	type: text(),
	topic: text(),
	timeSaved: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		useCaseCategoryIdUseCaseCategoryIdFk: foreignKey({
			columns: [table.categoryId],
			foreignColumns: [useCaseCategory.id],
			name: "UseCase_categoryId_UseCaseCategory_id_fk"
		}),
		useCaseChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "UseCase_chatId_Chat_id_fk"
		}),
	}
});

export const systemPrompts = pgTable("system_prompts", {
	assistantId: varchar("assistant_id", { length: 64 }).primaryKey().notNull(),
	promptText: text("prompt_text").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const chat = pgTable("Chat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	title: text().notNull(),
	userId: uuid().notNull(),
	visibility: varchar().default('private').notNull(),
	isPinned: boolean().default(false).notNull(),
},
(table) => {
	return {
		chatUserIdIdx: index("chat_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		chatUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Chat_userId_User_id_fk"
		}),
	}
});

export const user = pgTable("User", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }).notNull(),
	password: varchar({ length: 64 }),
	isAdmin: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		userEmailUnique: unique("User_email_unique").on(table.email),
	}
});

export const useCaseCategory = pgTable("UseCaseCategory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const filesMetadata = pgTable("files_metadata", {
	id: serial().primaryKey().notNull(),
	s3Bucket: varchar("s3_bucket", { length: 255 }).notNull(),
	s3Key: text("s3_key").notNull(),
	fileName: text("file_name").notNull(),
	fileExtension: varchar("file_extension", { length: 32 }),
	sharepointItemId: text("sharepoint_item_id"),
	sharepointDriveId: text("sharepoint_drive_id"),
	sharepointSiteId: text("sharepoint_site_id"),
	sharepointWebUrl: text("sharepoint_web_url"),
	sharepointEtag: text("sharepoint_etag"),
	sharepointLastModifiedAt: timestamp("sharepoint_last_modified_at", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }),
	mimeType: varchar("mime_type", { length: 127 }),
	s3Etag: varchar("s3_etag", { length: 255 }),
	s3VersionId: text("s3_version_id"),
	s3LastModifiedAt: timestamp("s3_last_modified_at", { withTimezone: true, mode: 'string' }),
	bedrockKnowledgeBaseId: text("bedrock_knowledge_base_id"),
	bedrockDataSourceId: text("bedrock_data_source_id"),
	ingestionStatus: ingestionStatusEnum("ingestion_status").default('NEW').notNull(),
	statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastIngestionJobId: text("last_ingestion_job_id"),
	lastErrorMessage: text("last_error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		fileNameIdx: index("file_name_idx").using("btree", table.fileName.asc().nullsLast()),
		ingestionStatusIdx: index("ingestion_status_idx").using("btree", table.ingestionStatus.asc().nullsLast()),
		s3LastModifiedAtIdx: index("s3_last_modified_at_idx").using("btree", table.s3LastModifiedAt.asc().nullsLast()),
		s3ObjectUniqueIdx: uniqueIndex("s3_object_unique_idx").using("btree", table.s3Bucket.asc().nullsLast(), table.s3Key.asc().nullsLast()),
		sharepointItemIdIdx: index("sharepoint_item_id_idx").using("btree", table.sharepointItemId.asc().nullsLast()),
		updatedAtIdx: index("updated_at_idx").using("btree", table.updatedAt.asc().nullsLast()),
	}
});

export const sharepointSyncState = pgTable("sharepoint_sync_state", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	driveId: text("drive_id").notNull(),
	targetPath: text("target_path").notNull(),
	deltaLink: text("delta_link"),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSyncWasRecursiveFullScan: boolean("last_sync_was_recursive_full_scan").default(false).notNull(),
});

export const systemOperations = pgTable("system_operations", {
	id: serial().primaryKey().notNull(),
	operationType: operationTypeEnum("operation_type").notNull(),
	currentStatus: operationStatusEnum("current_status").default('IDLE').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	progressDetails: json("progress_details"),
	lastBedrockJobId: text("last_bedrock_job_id"),
	errorMessage: text("error_message"),
},
(table) => {
	return {
		activeOperationIdx: uniqueIndex("active_operation_idx").using("btree", table.operationType.asc().nullsLast()).where(sql`(current_status <> ALL (ARRAY['COMPLETED'::operation_status_enum, 'FAILED'::operation_status_enum, 'IDLE'::operation_status_enum]))`),
	}
});

export const vote = pgTable("Vote", {
	chatId: uuid().notNull(),
	messageId: uuid().notNull(),
	isUpvoted: boolean().notNull(),
},
(table) => {
	return {
		voteChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Vote_chatId_Chat_id_fk"
		}),
		voteMessageIdMessageIdFk: foreignKey({
			columns: [table.messageId],
			foreignColumns: [message.id],
			name: "Vote_messageId_Message_id_fk"
		}),
		voteChatIdMessageIdPk: primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_chatId_messageId_pk"}),
	}
});

export const document = pgTable("Document", {
	id: uuid().defaultRandom().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	title: text().notNull(),
	content: text().notNull(),
	kind: varchar().default('text').notNull(),
	userId: uuid().notNull(),
},
(table) => {
	return {
		documentUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Document_userId_User_id_fk"
		}),
		documentIdCreatedAtPk: primaryKey({ columns: [table.id, table.createdAt], name: "Document_id_createdAt_pk"}),
	}
});