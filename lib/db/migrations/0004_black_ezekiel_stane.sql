DO $$ BEGIN
 CREATE TYPE "public"."operation_status_enum" AS ENUM('IDLE', 'STARTED', 'PULLING_FROM_SHAREPOINT', 'UPLOADING_TO_S3', 'FLAGGING_FOR_BEDROCK', 'BEDROCK_PROCESSING_SUBMITTED', 'BEDROCK_POLLING_STATUS', 'COMPLETED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."operation_type_enum" AS ENUM('SHAREPOINT_SYNC_AND_PROCESS', 'BEDROCK_PROCESS_PENDING', 'MANUAL_UPLOAD_AND_PROCESS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_type" "operation_type_enum" NOT NULL,
	"current_status" "operation_status_enum" DEFAULT 'IDLE' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"progress_details" json,
	"last_bedrock_job_id" text,
	"error_message" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "active_operation_idx" ON "system_operations" USING btree ("operation_type") WHERE "system_operations"."current_status" NOT IN ('COMPLETED', 'FAILED', 'IDLE');