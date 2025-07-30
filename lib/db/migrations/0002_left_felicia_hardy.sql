ALTER TABLE "files_metadata" ALTER COLUMN "status_updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files_metadata" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sharepoint_sync_state" ALTER COLUMN "target_path" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sharepoint_sync_state" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sharepoint_sync_state" ADD COLUMN "last_sync_was_recursive_full_scan" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "files_metadata" DROP COLUMN IF EXISTS "bedrock_ingested_s3_object_id";