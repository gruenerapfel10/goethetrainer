DO $$ BEGIN
 CREATE TYPE "public"."document_lock_status_enum" AS ENUM('unlocked', 'locked', 'auto_locked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_permission_enum" AS ENUM('owner', 'admin', 'write', 'comment', 'read');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_visibility_enum" AS ENUM('private', 'team', 'organization', 'public');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer,
	"activity_type" varchar(64) NOT NULL,
	"user_id" uuid,
	"is_ai_action" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" json,
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar NOT NULL,
	"cursor_position" integer,
	"selection" json,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"session_id" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"parent_comment_id" uuid,
	"range_start" integer,
	"range_end" integer,
	"quoted_text" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "document_permission_enum" NOT NULL,
	"granted_by" uuid NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"can_share" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"comment_id" uuid,
	"user_id" uuid NOT NULL,
	"emoji" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"tag" varchar(64) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "author" varchar DEFAULT 'ai' NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "isWorkingVersion" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "forkedFromVersion" integer;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "createdBy" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "lastEditedBy" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "lastEditedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "ownerId" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "visibility" "document_visibility_enum" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "lock_status" "document_lock_status_enum" DEFAULT 'unlocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "locked_by" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "lock_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "archived_by" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "chatId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_resolved_by_User_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_favorites" ADD CONSTRAINT "document_favorites_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_granted_by_User_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_reactions" ADD CONSTRAINT "document_reactions_comment_id_document_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."document_comments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_reactions" ADD CONSTRAINT "document_reactions_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_activity_doc_idx" ON "document_activity" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_activity_user_idx" ON "document_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_activity_timestamp_idx" ON "document_activity" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_activity_type_idx" ON "document_activity" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_collaborators_doc_idx" ON "document_collaborators" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_collaborators_user_idx" ON "document_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_collaborators_last_seen_idx" ON "document_collaborators" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_comments_doc_idx" ON "document_comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_comments_user_idx" ON "document_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_comments_parent_idx" ON "document_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_comments_resolved_idx" ON "document_comments" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_favorites_doc_idx" ON "document_favorites" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_favorites_user_idx" ON "document_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_permissions_doc_user_idx" ON "document_permissions" USING btree ("document_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_permissions_user_idx" ON "document_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_reactions_user_idx" ON "document_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_tags_doc_idx" ON "document_tags" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_tags_tag_idx" ON "document_tags" USING btree ("tag");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_lastEditedBy_User_id_fk" FOREIGN KEY ("lastEditedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_locked_by_User_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_archived_by_User_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_version_idx" ON "Document" USING btree ("id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_id_idx" ON "Document" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_working_version_idx" ON "Document" USING btree ("id","isWorkingVersion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_created_by_idx" ON "Document" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_owner_idx" ON "Document" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_locked_by_idx" ON "Document" USING btree ("locked_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_archived_idx" ON "Document" USING btree ("is_archived");