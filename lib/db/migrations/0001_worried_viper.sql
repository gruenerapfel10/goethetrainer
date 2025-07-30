DO $$ BEGIN
 CREATE TYPE "public"."ingestion_status_enum" AS ENUM('NEW', 'SYNCED_FROM_SHAREPOINT', 'UPLOADED_TO_S3', 'METADATA_STORED', 'PENDING_INGESTION', 'INGESTION_IN_PROGRESS', 'INDEXED', 'FAILED_INGESTION', 'PENDING_DELETION', 'DELETED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"s3_bucket" varchar(255) NOT NULL,
	"s3_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_extension" varchar(32),
	"sharepoint_item_id" text,
	"sharepoint_drive_id" text,
	"sharepoint_site_id" text,
	"sharepoint_web_url" text,
	"sharepoint_etag" text,
	"sharepoint_last_modified_at" timestamp with time zone,
	"size_bytes" bigint,
	"mime_type" varchar(127),
	"s3_etag" varchar(255),
	"s3_version_id" text,
	"s3_last_modified_at" timestamp with time zone,
	"bedrock_knowledge_base_id" text,
	"bedrock_data_source_id" text,
	"bedrock_ingested_s3_object_id" text,
	"ingestion_status" "ingestion_status_enum" DEFAULT 'NEW' NOT NULL,
	"status_updated_at" timestamp with time zone DEFAULT now(),
	"last_ingestion_job_id" text,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sharepoint_sync_state" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"drive_id" text NOT NULL,
	"target_path" text,
	"delta_link" text,
	"last_synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "s3_object_unique_idx" ON "files_metadata" USING btree ("s3_bucket","s3_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_name_idx" ON "files_metadata" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingestion_status_idx" ON "files_metadata" USING btree ("ingestion_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sharepoint_item_id_idx" ON "files_metadata" USING btree ("sharepoint_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "updated_at_idx" ON "files_metadata" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "s3_last_modified_at_idx" ON "files_metadata" USING btree ("s3_last_modified_at");